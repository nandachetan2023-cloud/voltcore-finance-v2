import { superadminDb } from '@/lib/superadmin-db'

export interface ApprovalStage {
  currentStep: number
  totalSteps: number
  approverRole: string // who the request is waiting on right now
}

/**
 * Annotate a requester's OWN pending requests with the stage they're currently
 * at — i.e. which approver/level the request is waiting on. Shared by the leave,
 * tour and employee-request "my ___" views so the requester can see progress.
 *
 * Requests that aren't pending are returned unchanged.
 */
export async function annotateRequesterStage<T extends { status: string; currentStep?: number | null }>(
  tenantId: string | null,
  employeeId: number,
  requests: T[],
): Promise<(T & { approvalStage?: ApprovalStage })[]> {
  if (!tenantId) return requests

  const requesterUser = await superadminDb.tenantUser.findFirst({
    where: { tenantId, employeeId, isActive: true },
    select: { orgRoleId: true },
  }).catch(() => null)

  const requesterRole = requesterUser?.orgRoleId
    ? await superadminDb.orgRole.findUnique({ where: { id: requesterUser.orgRoleId }, select: { level: true } }).catch(() => null)
    : null
  const isLevel1 = !requesterRole || requesterRole.level === 1

  // Resolve the chain's step → approver-role-name map once (all requests share it).
  let totalSteps = 1
  const stepRoleName = new Map<number, string>()
  if (!isLevel1 && requesterUser?.orgRoleId) {
    const chain = await superadminDb.approvalChain.findFirst({
      where: { tenantId, requesterRoleId: requesterUser.orgRoleId, isActive: true },
      include: { steps: { include: { approverRole: { select: { name: true } } }, orderBy: { stepNumber: 'asc' } } },
    }).catch(() => null)
    if (chain && chain.steps.length) {
      totalSteps = chain.steps.length
      for (const s of chain.steps) stepRoleName.set(s.stepNumber, (s as any).approverRole?.name || 'Approver')
    }
  }

  return requests.map(r => {
    if (r.status !== 'pending') return r
    const step = r.currentStep || 1
    const approverRole = (isLevel1 || stepRoleName.size === 0)
      ? 'Admin'
      : (stepRoleName.get(step) || 'Approver')
    return { ...r, approvalStage: { currentStep: step, totalSteps, approverRole } }
  })
}
