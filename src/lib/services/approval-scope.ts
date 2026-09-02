/**
 * Role-scope enforcement for approvals and their notifications.
 *
 * An OrgRole carries three scope axes — `departments`, `designations` and
 * `branches` — each a comma-separated list of names, where "" means
 * "unrestricted on this axis". Before this module they were stored and
 * displayed but never enforced: `findUsersForRole` returned every holder of an
 * approver role tenant-wide, so a site-scoped approver saw and could action
 * requests from every other site.
 *
 * WHAT THE SCOPE DESCRIBES — read this before changing anything.
 *
 * The three axes describe WHO THE ROLE-HOLDER IS, not who they may act upon.
 * A role "Sr. Supervisor (GAP)" scoped to dept OPERATION, desig SENIOR
 * SUPERVISOR, site GAP Lapanga means: holders of this role are the senior
 * supervisors in Operation at GAP Lapanga. So an approval step naming that
 * role resolves to the users who actually match that description.
 *
 * The first version of this module had it backwards: it tested the approver
 * role's scope against the REQUESTER's department/designation/site. That asked
 * "is the technician who filed this request themselves a Senior Supervisor in
 * Operation?" — always false — so every scoped step found zero approvers and
 * escalated to admin, making a correctly-built chain look broken.
 *
 * Non-blank axes are ANDed; a blank axis is unrestricted. This governs three
 * things that must never disagree:
 *
 *   1. which pending requests appear in an approver's list  (visibility)
 *   2. whether a given approver may PUT an approve/reject   (authorization)
 *   3. who receives the "approval needed" notification      (fan-out)
 *
 * If those three drift apart you get either a phantom queue (visible but
 * un-approvable) or a silent hole (approvable but never surfaced), so every
 * caller resolves scope through this one module.
 *
 * Cross-DB note: roles live in the superadmin DB and employees in the tenant
 * DB, so scope cannot be a SQL join. We compare on NAME, case-insensitively —
 * the same convention the employee bulk import uses when resolving departments
 * and designations.
 */
import { superadminDb } from '@/lib/superadmin-db'

/** The employee attributes a scope test is evaluated against. */
export interface ScopeSubject {
  departmentName: string | null
  designationName: string | null
  branchName: string | null
}

/** The three scope axes carried by an OrgRole. */
export interface RoleScope {
  departments: string
  designations: string
  branches: string
}

/** Parse a stored scope field into a normalised lookup set. */
function parseScope(field: string | null | undefined): Set<string> {
  if (!field) return new Set()
  return new Set(
    field.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  )
}

/**
 * Does a single axis admit this value?
 *
 * A blank axis is universal and admits everything, including a null value. A
 * non-blank axis with a null value is a MISS: if a role is restricted to
 * branch "Mumbai" and the employee has no branch recorded, we cannot show that
 * the employee is in Mumbai, so we must not grant access. Failing closed here
 * is what keeps an incomplete employee record from silently widening a scope.
 */
function axisAdmits(scopeField: string | null | undefined, value: string | null): boolean {
  const allowed = parseScope(scopeField)
  if (allowed.size === 0) return true
  if (!value) return false
  return allowed.has(value.trim().toLowerCase())
}

/**
 * Is `subject` inside `role`'s scope? All three axes must admit.
 * A fully-blank role scope is universal and admits every subject.
 */
export function isInScope(role: RoleScope | null | undefined, subject: ScopeSubject): boolean {
  if (!role) return true
  return (
    axisAdmits(role.departments, subject.departmentName) &&
    axisAdmits(role.designations, subject.designationName) &&
    axisAdmits(role.branches, subject.branchName)
  )
}

/** True when a role places no restriction on any axis. */
export function isUniversalScope(role: RoleScope | null | undefined): boolean {
  if (!role) return true
  return !role.departments?.trim() && !role.designations?.trim() && !role.branches?.trim()
}

/** Human-readable scope, for notification text and audit messages. */
export function describeScope(role: RoleScope | null | undefined): string {
  if (isUniversalScope(role)) return 'all employees'
  const parts: string[] = []
  if (role!.departments?.trim()) parts.push(`dept: ${role!.departments}`)
  if (role!.designations?.trim()) parts.push(`desig: ${role!.designations}`)
  if (role!.branches?.trim()) parts.push(`site: ${role!.branches}`)
  return parts.join(' · ')
}

/**
 * Load the scope-relevant attributes of the employees behind a set of ids.
 * Returns a map keyed by employee id. `db` is the tenant client.
 */
export async function loadScopeSubjects(
  db: any,
  employeeIds: number[],
): Promise<Map<number, ScopeSubject>> {
  const out = new Map<number, ScopeSubject>()
  const ids = [...new Set(employeeIds)].filter(id => typeof id === 'number')
  if (ids.length === 0) return out

  const employees = await db.employee.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      Department: { select: { name: true } },
      Designation: { select: { name: true } },
      Branch: { select: { name: true } },
    },
  }).catch(() => [])

  for (const e of employees) {
    out.set(e.id, {
      departmentName: e.Department?.name ?? null,
      designationName: e.Designation?.name ?? null,
      branchName: e.Branch?.name ?? null,
    })
  }
  return out
}

/** Load one employee's scope subject. Null when the employee can't be read. */
export async function loadScopeSubject(db: any, employeeId: number | null | undefined): Promise<ScopeSubject | null> {
  if (!employeeId) return null
  const map = await loadScopeSubjects(db, [employeeId])
  return map.get(employeeId) ?? null
}

/** Fetch a role's scope axes by id. Null when missing/unreadable. */
export async function getRoleScope(roleId: string | null | undefined): Promise<RoleScope | null> {
  if (!roleId) return null
  return await superadminDb.orgRole.findUnique({
    where: { id: roleId },
    select: { departments: true, designations: true, branches: true },
  }).catch(() => null) as RoleScope | null
}

/**
 * Does the caller personally match their own role's scope?
 *
 * Used as the authorization gate for chain approvers. Being the named approver
 * for the current step is what grants the right to act; this only additionally
 * confirms the caller really is the person the role describes — so a user
 * wrongly holding "Sr. Supervisor (GAP Lapanga)" while posted elsewhere cannot
 * approve on that role's behalf.
 *
 * NOTE: this deliberately does NOT test the requester. An earlier version did,
 * which rejected every approver whose own attributes differed from the person
 * they were meant to approve for — i.e. nearly always.
 *
 * An unreadable/unlinked caller record passes, matching
 * findScopedApproversForStep: the admin's explicit role assignment stands.
 */
export async function callerMatchesOwnRoleScope(
  db: any,
  callerRoleId: string | null | undefined,
  callerEmployeeId: number | null | undefined,
): Promise<boolean> {
  const scope = await getRoleScope(callerRoleId)
  if (isUniversalScope(scope)) return true
  if (!callerEmployeeId) return true
  const subject = await loadScopeSubject(db, callerEmployeeId)
  if (!subject) return true
  return isInScope(scope, subject)
}

export interface ScopedApprover {
  email: string
  name?: string
}

/**
 * Resolve the users who should be notified for a chain step.
 *
 * The approver role's scope is matched against EACH CANDIDATE APPROVER's own
 * department/designation/site — it describes who they are. It is deliberately
 * NOT matched against the requester: an approver's whole purpose is to action
 * requests from people unlike themselves, so testing the requester against an
 * approver-shaped scope rejected everyone.
 *
 * A holder whose employee record cannot be read is still accepted when the
 * role is scoped, because the admin explicitly assigned them this role;
 * dropping them would silently unstaff a correctly-built chain. A holder whose
 * record IS readable and contradicts the scope is dropped.
 *
 * Returns `{ approvers, fellBackToAdmin }`. `fellBackToAdmin` is true only
 * when nobody at all is eligible, so callers route to the tenant admin and the
 * request never becomes invisibly stuck.
 */
export async function findScopedApproversForStep(
  db: any,
  tenantId: string,
  approverRoleId: string,
  requesterEmployeeId: number,
): Promise<{ approvers: ScopedApprover[]; fellBackToAdmin: boolean }> {
  const users = await superadminDb.tenantUser.findMany({
    where: { tenantId, orgRoleId: approverRoleId, isActive: true },
    select: { email: true, name: true, employeeId: true },
  }).catch(() => [] as any[])

  if (users.length === 0) return { approvers: [], fellBackToAdmin: true }

  // An approver must never be the requester on their own request.
  let eligible = users.filter((u: any) => u.employeeId !== requesterEmployeeId)
  if (eligible.length === 0) return { approvers: [], fellBackToAdmin: true }

  const scope = await getRoleScope(approverRoleId)

  // Scoped role — keep only holders who match the description themselves.
  if (!isUniversalScope(scope)) {
    const ids = eligible.map((u: any) => u.employeeId).filter((id: any) => typeof id === 'number')
    const subjects = await loadScopeSubjects(db, ids)
    eligible = eligible.filter((u: any) => {
      const subj = u.employeeId ? subjects.get(u.employeeId) : undefined
      if (!subj) return true // unlinked/unreadable — trust the explicit assignment
      return isInScope(scope, subj)
    })
    if (eligible.length === 0) return { approvers: [], fellBackToAdmin: true }
  }

  return {
    approvers: eligible.map((u: any) => ({ email: u.email, name: u.name })),
    fellBackToAdmin: false,
  }
}

/**
 * Tenant admins, used as the fallback recipient when a scoped step has no
 * eligible approver. Admins are the top authority and are never scoped.
 */
export async function findTenantAdmins(tenantId: string): Promise<ScopedApprover[]> {
  const admins = await superadminDb.tenantUser.findMany({
    where: { tenantId, isActive: true, orgRoleId: null },
    select: { email: true, name: true },
  }).catch(() => [] as any[])
  return admins.map((a: any) => ({ email: a.email, name: a.name }))
}

/**
 * Notification recipients for a step, with the admin fallback already applied.
 * `note` is a suffix explaining the escalation, empty when none happened.
 */
export async function resolveStepRecipients(
  db: any,
  tenantId: string,
  approverRoleId: string,
  requesterEmployeeId: number,
): Promise<{ recipients: ScopedApprover[]; escalated: boolean; note: string }> {
  const { approvers, fellBackToAdmin } = await findScopedApproversForStep(
    db, tenantId, approverRoleId, requesterEmployeeId,
  )

  if (!fellBackToAdmin && approvers.length > 0) {
    return { recipients: approvers, escalated: false, note: '' }
  }

  const admins = await findTenantAdmins(tenantId)
  const scope = await getRoleScope(approverRoleId)
  return {
    recipients: admins,
    escalated: true,
    note: ` (No approver was available within scope — ${describeScope(scope)}; escalated to admin.)`,
  }
}
