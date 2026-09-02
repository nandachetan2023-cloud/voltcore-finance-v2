/**
 * Required vs. informational approval steps.
 *
 * An ApprovalStep has an `isRequired` flag, exposed in Roles & Access as the
 * "Approval required" tick box. Until now nothing read it: unticking the box
 * persisted a false and changed nothing about how a request flowed.
 *
 * WHAT UNTICKING MEANS
 *
 * An optional step is INFORMATIONAL. Its approvers are notified that the
 * request exists and passed through them, but the request does not stop and
 * wait for them — it continues to the next step that IS required. If no
 * required step remains, the request is fully approved.
 *
 * So a chain of Supervisor(optional) → Manager(required) → HR(optional) means:
 * on submission the Supervisor is told for information only and the request
 * lands on the Manager; when the Manager approves, HR is told for information
 * and the request is approved outright.
 *
 * A chain whose steps are ALL optional approves on submission, informing
 * everyone. That is the honest reading of "nobody's approval is required", and
 * it is what the tick box now promises.
 *
 * WHY currentStep STILL POINTS AT REQUIRED STEPS ONLY
 *
 * `currentStep` means "the step whose approval we are waiting for". Parking it
 * on an optional step would make the request look pending on someone whose
 * approval is not needed, and would let that person block it by doing nothing.
 * Optional steps are therefore stepped over, never landed on.
 */

import { resolveStepRecipients } from '@/lib/services/approval-scope'

export interface ChainStepLike {
  stepNumber: number
  approverRoleId: string
  isRequired?: boolean | null
  approverRole?: { name?: string | null } | null
}

/** A step counts as required unless explicitly flagged otherwise. */
export function stepIsRequired(step: ChainStepLike | null | undefined): boolean {
  return step?.isRequired !== false
}

/**
 * The first required step at or after `from`, or null when none remains.
 * Steps are assumed sorted by stepNumber; callers already order them that way.
 */
export function nextRequiredStep(
  steps: ChainStepLike[],
  from: number,
): ChainStepLike | null {
  for (const s of steps) {
    if (s.stepNumber >= from && stepIsRequired(s)) return s
  }
  return null
}

/**
 * Every optional step in [from, until) — the informational steps skipped over
 * on the way to the next required one. `until` is exclusive; pass
 * Number.MAX_SAFE_INTEGER to sweep to the end of the chain.
 */
export function informationalStepsBetween(
  steps: ChainStepLike[],
  from: number,
  until: number,
): ChainStepLike[] {
  return steps.filter(s => s.stepNumber >= from && s.stepNumber < until && !stepIsRequired(s))
}

export interface AdvanceOutcome {
  /** Step to wait at, or null when the request is fully approved. */
  nextStep: number | null
  /** Optional steps passed on the way, whose approvers get an FYI. */
  informed: ChainStepLike[]
  /** True when no required step remains and the request should be approved. */
  fullyApproved: boolean
}

/**
 * Where a request goes once the step at `fromStep` is satisfied.
 *
 * Pass `fromStep = 1` with `inclusive = true` at submission time to ask "where
 * does this request START", which correctly skips a leading optional step.
 * Pass `inclusive = false` after an approval to ask "where does it go NEXT".
 */
export function resolveAdvance(
  steps: ChainStepLike[],
  fromStep: number,
  inclusive: boolean,
): AdvanceOutcome {
  const searchFrom = inclusive ? fromStep : fromStep + 1
  const target = nextRequiredStep(steps, searchFrom)
  const until = target ? target.stepNumber : Number.MAX_SAFE_INTEGER
  return {
    nextStep: target ? target.stepNumber : null,
    informed: informationalStepsBetween(steps, searchFrom, until),
    fullyApproved: target === null,
  }
}

/**
 * True when the chain requires nobody's approval at all — every step is
 * informational, so a submitted request is approved immediately.
 */
export function chainIsFullyOptional(steps: ChainStepLike[]): boolean {
  return steps.length > 0 && steps.every(s => !stepIsRequired(s))
}

/**
 * Send the FYI notification to the approvers of every informational step that
 * was stepped over. These people are NOT being asked to act — the wording has
 * to make that unambiguous, or an optional approver will sit waiting for a
 * button that never applies to them.
 *
 * Best-effort throughout: an informational notification must never be able to
 * fail an approval that has already been decided.
 */
export async function informOptionalSteps(
  db: any,
  tenantId: string,
  steps: ChainStepLike[],
  requesterEmployeeId: number,
  entityId: number,
  summary: string,
  entityType: 'leave' | 'tour' | 'request' = 'leave',
): Promise<void> {
  if (!steps.length) return

  for (const step of steps) {
    try {
      const { recipients } = await resolveStepRecipients(
        db, tenantId, step.approverRoleId, requesterEmployeeId,
      )
      for (const r of recipients) {
        await db.notification.create({
          data: {
            userId: 0,
            userEmail: r.email,
            title: 'For Your Information — No Action Needed',
            message: `${summary} Your step (${step.stepNumber}) is informational, so no approval was required from you.`,
            type: 'info',
            link: '',
            entityType,
            entityId,
          },
        }).catch(() => {})
      }
    } catch {
      // One unresolvable role must not stop the others being told.
      continue
    }
  }
}
