/**
 * Where in an approval chain a request was rejected.
 *
 * The employee who raised a request should be able to see not just WHY it was
 * rejected but WHO rejected it — "rejected at step 2 of 3 by Manager" is
 * actionable in a way that a bare "Rejected" is not.
 *
 * The position is resolved at REJECTION TIME and stored on the row, never
 * re-derived on read. Approval chains are editable: re-resolving later would
 * name whoever holds that step today, which may be a different role entirely
 * from the one that actually rejected. A stored snapshot stays true.
 *
 * Shared by leave, tour and employee-requests so the three modules describe a
 * rejection identically.
 */
import { superadminDb } from '@/lib/superadmin-db'

export interface RejectionPosition {
  /** 1-based chain step, or null when there was no chain to speak of. */
  step: number | null
  /** Approver role name at that step, or 'Administrator' for an admin override. */
  roleName: string | null
  /** Total steps in the chain at rejection time, for "step 2 of 3". */
  totalSteps: number | null
}

const NONE: RejectionPosition = { step: null, roleName: null, totalSteps: null }

/**
 * Resolve the chain position a request is sitting at, for the requester's role.
 *
 * `isFullAdmin` short-circuits: an admin can reject at any point, so the step
 * they happen to be on is less meaningful than the fact an administrator
 * overrode it. That is what the employee needs to know.
 */
export async function resolveRejectionPosition(
  tenantId: string | null | undefined,
  requesterEmployeeId: number,
  currentStep: number | null | undefined,
  isFullAdmin: boolean,
): Promise<RejectionPosition> {
  if (isFullAdmin) return { step: currentStep ?? null, roleName: 'Administrator', totalSteps: null }
  if (!tenantId) return NONE

  try {
    const requesterUser = await superadminDb.tenantUser.findFirst({
      where: { tenantId, employeeId: requesterEmployeeId, isActive: true },
      select: { orgRoleId: true },
    })
    if (!requesterUser?.orgRoleId) return NONE

    const chain = await superadminDb.approvalChain.findFirst({
      where: { tenantId, requesterRoleId: requesterUser.orgRoleId, isActive: true },
      include: { steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } } },
    })
    if (!chain || chain.steps.length === 0) return NONE

    const step = currentStep || 1
    const def = chain.steps.find((s: any) => s.stepNumber === step)
    return {
      step,
      roleName: def?.approverRole?.name ?? null,
      totalSteps: chain.steps.length,
    }
  } catch {
    // Never let a superadmin-DB hiccup block a rejection the approver asked for.
    return NONE
  }
}

// Presentation helpers live in a client-safe module (no Prisma import) and are
// re-exported here so server code can import everything from one place.
export { formatRejectionPosition, rejectionPositionLabel } from '@/lib/rejection-position-format'
