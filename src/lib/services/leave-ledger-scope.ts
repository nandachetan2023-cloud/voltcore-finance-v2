import { superadminDb } from '@/lib/superadmin-db'
import { isInScope } from '@/lib/services/approval-scope'

/**
 * Which employees' leave ledger a caller may see, following the role hierarchy.
 *
 * Level 1 is the highest authority (just below admin); higher numbers are lower
 * positions. A caller sees their own ledger plus everyone strictly BELOW them —
 * never peers or superiors.
 *
 *  - Full admin (role cookie 'admin', no org-role): everyone.
 *  - Caller with an org-role at level L: themselves + employees whose level > L.
 *    If that role is restricted to departments, those employees must also be
 *    in one of them (matched by name, case-insensitively; an employee with no
 *    department fails closed). The role's designation/site restrictions are not
 *    applied here.
 *  - Anyone else: only themselves.
 *
 * Employees are ranked by the org-role of their linked tenant user. An employee
 * with no login, or whose login has no org-role, ranks on the lowest rung (the
 * tenant's highest level number) — unless that login is an admin, which ranks
 * above every role. When an employee has several logins, the most senior wins,
 * so a ledger is never exposed through a secondary account.
 */
export type LedgerScope =
  | { kind: 'all' }
  | { kind: 'some'; canSee: (employeeId: number, departmentName: string | null) => boolean }

const ADMIN_LEVEL = 0

export async function resolveLedgerScope(
  tenantId: string | null,
  callerEmail: string | undefined,
  callerRole: string | undefined,
): Promise<LedgerScope> {
  // No tenant means no role system to consult — only an admin gets a view.
  if (!tenantId || !callerEmail) {
    return callerRole === 'admin' ? { kind: 'all' } : { kind: 'some', canSee: () => false }
  }

  const caller = await superadminDb.tenantUser.findFirst({
    where: { tenantId, email: callerEmail, isActive: true },
    select: { employeeId: true, orgRoleId: true },
  }).catch(() => null)

  const selfId = caller?.employeeId ?? null
  const onlySelf: LedgerScope = { kind: 'some', canSee: id => selfId !== null && id === selfId }

  if (callerRole === 'admin' && !caller?.orgRoleId) return { kind: 'all' }
  if (!caller?.orgRoleId) return onlySelf

  const roles = await superadminDb.orgRole.findMany({
    where: { tenantId },
    select: { id: true, level: true, isActive: true, departments: true },
  }).catch(() => [])
  const levelOf = new Map(roles.map(r => [r.id, r.level] as [string, number]))

  const callerLevel = levelOf.get(caller.orgRoleId)
  if (callerLevel === undefined) return onlySelf
  const callerDepartments = roles.find(r => r.id === caller.orgRoleId)?.departments ?? ''

  const activeLevels = roles.filter(r => r.isActive).map(r => r.level)
  const lowestRung = activeLevels.length > 0 ? Math.max(...activeLevels) : callerLevel

  const users = await superadminDb.tenantUser.findMany({
    where: { tenantId, isActive: true, employeeId: { not: null } },
    select: { employeeId: true, orgRoleId: true, allowedModules: true, createdBySuperadmin: true },
  }).catch(() => [])

  const empLevel = new Map<number, number>()
  for (const u of users) {
    const level = u.orgRoleId
      ? (levelOf.get(u.orgRoleId) ?? lowestRung)
      : (u.allowedModules === 'all' || u.createdBySuperadmin) ? ADMIN_LEVEL : lowestRung
    const prev = empLevel.get(u.employeeId as number)
    if (prev === undefined || level < prev) empLevel.set(u.employeeId as number, level)
  }

  return {
    kind: 'some',
    canSee: (id, departmentName) =>
      id === selfId || (
        (empLevel.get(id) ?? lowestRung) > callerLevel &&
        isInScope(
          { departments: callerDepartments, designations: '', branches: '' },
          { departmentName, designationName: null, branchName: null },
        )
      ),
  }
}
