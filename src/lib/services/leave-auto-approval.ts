/**
 * 24-hour auto-approval for stalled leave approval steps.
 *
 * WHAT THIS DOES — read this before changing the window or the semantics.
 *
 * A leave request that sits unactioned at one step for longer than
 * AUTO_APPROVE_AFTER_MS is advanced PAST THAT STEP as if the approver had
 * approved it. It advances exactly ONE step per expiry: the next approver then
 * gets their own fresh 24 hours. A three-step chain therefore takes ~72h to
 * auto-approve end to end, and every approver in the chain still gets a real
 * chance to act. The alternative — approving the whole request outright on the
 * first expiry — would let a single unresponsive approver bypass everyone
 * above them, which is why it is not what this does.
 *
 * The timer is per-step, not per-request. `stepEnteredAt` is rewritten on every
 * advance (manual or automatic), so the window always measures "how long has
 * THIS approver had it", never "how old is the request".
 *
 * WHAT THIS DELIBERATELY DOES NOT DO:
 *   - It never auto-REJECTS. Silence advances a request; it never kills one.
 *   - It never touches a request that is already approved, rejected or deleted.
 *   - It never auto-approves the FINAL step of a chain. Somebody must actually
 *     grant the leave. An expired final step is escalated to the tenant admin
 *     instead, and stays pending until a human acts. Without this, nobody ever
 *     sees the request and leave is granted with literally no approval.
 *   - It does not apply to tour or employee requests. Only leave, by request.
 *
 * Rows whose `stepEnteredAt` is NULL (submitted before the column existed) fall
 * back to `appliedDate`, so they are not immortal.
 */
import { superadminDb } from '@/lib/superadmin-db'
import { resolveStepRecipients } from '@/lib/services/approval-scope'

/** How long one step may sit unactioned before it is passed automatically. */
export const AUTO_APPROVE_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * Guard against two concurrent sweeps (e.g. cron firing while a request-driven
 * sweep is mid-flight) doing the same work twice. Per-process and best-effort:
 * correctness does not depend on it, because each row is claimed with a
 * conditional update below.
 */
const inFlight = new Map<string, Promise<AutoApprovalResult>>()

export interface AutoApprovalResult {
  /** Steps advanced because their 24h window expired. */
  advanced: number
  /** Final steps that expired and were escalated to admin instead of approved. */
  escalated: number
  /** Requests examined. */
  examined: number
}

const EMPTY: AutoApprovalResult = { advanced: 0, escalated: 0, examined: 0 }

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Advance every leave request whose current step has been pending longer than
 * the window. Safe to call concurrently and safe to call often.
 *
 * `tenantId` is needed to resolve approval chains, which live in the superadmin
 * DB. Without it we cannot know how many steps a chain has, so we do nothing
 * rather than guess.
 */
export async function runLeaveAutoApproval(
  db: any,
  tenantId: string | null | undefined,
  now: Date = new Date(),
): Promise<AutoApprovalResult> {
  if (!db || !tenantId) return EMPTY

  const existing = inFlight.get(tenantId)
  if (existing) return existing

  const run = sweep(db, tenantId, now).finally(() => inFlight.delete(tenantId))
  inFlight.set(tenantId, run)
  return run
}

async function sweep(db: any, tenantId: string, now: Date): Promise<AutoApprovalResult> {
  const cutoff = new Date(now.getTime() - AUTO_APPROVE_AFTER_MS)
  const result: AutoApprovalResult = { advanced: 0, escalated: 0, examined: 0 }

  let candidates: any[]
  try {
    candidates = await db.leaveRequest.findMany({
      where: {
        status: 'pending',
        isDeleted: false,
        // NULL stepEnteredAt (pre-migration rows) fall back to appliedDate.
        OR: [
          { stepEnteredAt: { lt: cutoff } },
          { stepEnteredAt: null, appliedDate: { lt: cutoff } },
        ],
      },
      select: {
        id: true, employeeId: true, leaveType: true, fromDate: true, toDate: true,
        currentStep: true, stepEnteredAt: true, appliedDate: true, autoApprovedSteps: true,
        Employee: { select: { firstName: true, lastName: true, email: true } },
      },
      // Bounded so a large backlog cannot stall a request that triggered the
      // sweep; the remainder is picked up by the next one.
      take: 200,
      orderBy: { appliedDate: 'asc' },
    })
  } catch {
    // Columns missing (migration not yet run) — behave as if the feature is off.
    return EMPTY
  }

  result.examined = candidates.length
  if (candidates.length === 0) return result

  // Chains are keyed by the REQUESTER's role, so cache per requester role to
  // avoid one superadmin round-trip per request in a backlog.
  const chainCache = new Map<string, any>()

  for (const leave of candidates) {
    try {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, employeeId: leave.employeeId, isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)

      const roleId = requesterUser?.orgRoleId || null
      if (!roleId) continue // no role → no chain → nothing to advance through

      if (!chainCache.has(roleId)) {
        chainCache.set(roleId, await superadminDb.approvalChain.findFirst({
          where: { tenantId, requesterRoleId: roleId, isActive: true },
          include: { steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } } },
        }).catch(() => null))
      }
      const chain = chainCache.get(roleId)
      if (!chain || chain.steps.length === 0) continue

      const currentStep = leave.currentStep || 1
      const totalSteps = chain.steps.length
      const empName = `${leave.Employee?.firstName || ''} ${leave.Employee?.lastName || ''}`.trim() || 'An employee'
      const range = `${fmt(leave.fromDate)} – ${fmt(leave.toDate)}`

      if (currentStep >= totalSteps) {
        // FINAL step expired. Auto-approving here would grant leave with no
        // human approval at all, so escalate and leave it pending instead.
        const escalatedAt = await claim(db, leave, now)
        if (!escalatedAt) continue
        result.escalated++

        await db.notification.create({
          data: {
            userId: 0, userEmail: '__admin_broadcast__',
            title: `Leave Awaiting Final Approval — Overdue`,
            message: `${empName}'s ${leave.leaveType} leave (${range}) has been waiting at the final approval step for over 24 hours. It needs a decision — it will not auto-approve.`,
            type: 'warning', link: '', entityType: 'leave', entityId: leave.id,
          },
        }).catch(() => {})
        continue
      }

      // Intermediate step expired — advance one step.
      const nextStep = currentStep + 1
      const claimed = await claim(db, leave, now, nextStep, currentStep)
      if (!claimed) continue // another sweep got there first
      result.advanced++

      // Tell the requester.
      await db.notification.create({
        data: {
          userId: 0, userEmail: leave.Employee?.email || '',
          title: `Leave — Step ${currentStep} Auto-Approved`,
          message: `Your ${leave.leaveType} leave (${range}) passed step ${currentStep} of ${totalSteps} automatically after 24 hours without a response. Awaiting step ${nextStep} approval.`,
          type: 'info', link: '', entityType: 'leave', entityId: leave.id,
        },
      }).catch(() => {})

      // Tell the approver who missed it, so the skip is visible rather than silent.
      const missed = chain.steps.find((s: any) => s.stepNumber === currentStep)
      if (missed) {
        const { recipients } = await resolveStepRecipients(db, tenantId, missed.approverRoleId, leave.employeeId)
        for (const r of recipients) {
          await db.notification.create({
            data: {
              userId: 0, userEmail: r.email,
              title: `Leave Auto-Approved — Step ${currentStep}`,
              message: `${empName}'s ${leave.leaveType} leave (${range}) was pending your approval for over 24 hours and has been passed to step ${nextStep} automatically.`,
              type: 'warning', link: '', entityType: 'leave', entityId: leave.id,
            },
          }).catch(() => {})
        }
      }

      // Tell the next approver it is now theirs.
      const next = chain.steps.find((s: any) => s.stepNumber === nextStep)
      if (next) {
        const { recipients, escalated, note } = await resolveStepRecipients(
          db, tenantId, next.approverRoleId, leave.employeeId,
        )
        for (const r of recipients) {
          await db.notification.create({
            data: {
              userId: 0, userEmail: r.email,
              title: escalated
                ? `Leave Escalated — Step ${nextStep}`
                : `Leave Request — Step ${nextStep} Approval Needed`,
              message: `${empName}'s ${leave.leaveType} leave (${range}) was auto-approved at step ${currentStep} after 24 hours and now requires your approval.${note}`,
              type: escalated ? 'warning' : 'info',
              link: '', entityType: 'leave', entityId: leave.id,
            },
          }).catch(() => {})
        }
        if (recipients.length === 0) {
          await db.notification.create({
            data: {
              userId: 0, userEmail: '__admin_broadcast__',
              title: `Leave Escalated — Step ${nextStep}`,
              message: `${empName}'s ${leave.leaveType} leave needs step ${nextStep} approval after an auto-approval at step ${currentStep}. No users found for the required role.${note}`,
              type: 'warning', link: '', entityType: 'leave', entityId: leave.id,
            },
          }).catch(() => {})
        }
      }
    } catch {
      // One bad row must not abort the sweep.
      continue
    }
  }

  return result
}

/**
 * Claim a row for this sweep with a conditional update, so two concurrent
 * sweeps cannot advance the same request twice. The `where` re-asserts the
 * step and pending status we read; if another sweep (or a real approver) got
 * there first, `count` is 0 and we skip the row.
 *
 * Passing `nextStep` advances; omitting it only refreshes the timer, which is
 * what the escalated final step needs so it re-notifies once a day rather than
 * on every sweep.
 */
async function claim(
  db: any,
  leave: any,
  now: Date,
  nextStep?: number,
  autoApprovedStep?: number,
): Promise<boolean> {
  const data: any = { stepEnteredAt: now, updatedAt: now }
  if (nextStep !== undefined) data.currentStep = nextStep
  if (autoApprovedStep !== undefined) {
    const prior = (leave.autoApprovedSteps || '').split(',').filter(Boolean)
    data.autoApprovedSteps = [...prior, String(autoApprovedStep)].join(',')
  }

  try {
    const { count } = await db.leaveRequest.updateMany({
      where: {
        id: leave.id,
        status: 'pending',
        isDeleted: false,
        currentStep: leave.currentStep || 1,
        // Re-assert the expiry so a manual approval landing between the read
        // and this write is not clobbered.
        OR: [
          { stepEnteredAt: leave.stepEnteredAt },
          { stepEnteredAt: null },
        ],
      },
      data,
    })
    return count > 0
  } catch {
    return false
  }
}
