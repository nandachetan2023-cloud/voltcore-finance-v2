/**
 * Shared module-access helpers (server + client safe — no React, no store deps).
 *
 * Two layers of module access:
 *  1. Tenant-wide cap (Tenant.enabledModules) — set by the SUPERADMIN. This is an
 *     absolute ceiling: no role/user in the tenant can access a module the
 *     superadmin has not enabled.
 *  2. Role/user access (OrgRole.moduleAccess / TenantUser.allowedModules) — set by
 *     the tenant admin, but always bounded by the tenant cap above.
 *
 * Effective access = intersection(role/user access, tenant cap).
 *
 * Value format for all access strings: "all" | comma-separated keys.
 * Keys may be group-level ("hrms") or sub-module level ("employees,attendance").
 */

// Canonical module tree: group key → its sub-module keys.
// Keep in sync with MODULE_TREE in src/store/erp-store.ts and FULL_MODULE_TREE in module-select.tsx.
export const MODULE_GROUPS: Record<string, string[]> = {
  organization: ['departments', 'designations', 'holidays', 'leave-policies', 'attendance-rules', 'checklist-templates', 'employee-documents', 'roles-access'],
  hrms: ['employee-analytics', 'employees', 'attendance', 'biometric', 'leave', 'tour-requests', 'shift', 'timesheet', 'payroll', 'training', 'recruitment', 'onboarding', 'offboarding', 'exit-management'],
  procurement: ['purchases', 'expenses'],
  finance: ['finance-dashboard', 'ledger', 'accounts-payable', 'accounts-receivable', 'journal-entries', 'bank-cash', 'taxation', 'budget', 'financial-reports'],
  projects: ['project-list', 'sites'],
  assets: ['equipment', 'permits', 'safety', 'subcontractors'],
  system: ['reports', 'settings', 'user-management', 'onboarding-approvals', 'requests', 'notice-board'],
  reports: ['report-manpower', 'report-attendance', 'report-payroll', 'report-leave', 'report-tour', 'report-late-fine', 'report-onboarding', 'report-turnover', 'report-training', 'report-notices', 'report-dispatch'],
  'self-service': ['my-dashboard', 'my-attendance', 'my-leave', 'my-tours', 'my-requests', 'my-profile', 'my-notices', 'my-payslips', 'my-documents', 'my-shifts'],
}

/**
 * Expand an access string into the flat set of concrete sub-module keys it grants.
 * A group key expands to all its sub-modules (plus the group key itself).
 */
export function expandAccess(access: string): Set<string> {
  const out = new Set<string>()
  if (!access) return out
  const keys = access.split(',').map(s => s.trim()).filter(Boolean)
  for (const key of keys) {
    out.add(key)
    const subs = MODULE_GROUPS[key]
    if (subs) subs.forEach(s => out.add(s))
  }
  return out
}

/** Full universe of all keys (every group + every sub-module). */
function allKeys(): Set<string> {
  const out = new Set<string>()
  for (const [group, subs] of Object.entries(MODULE_GROUPS)) {
    out.add(group)
    subs.forEach(s => out.add(s))
  }
  return out
}

/**
 * Collapse a flat set of sub-module keys back into the most compact access string.
 * If every key is present → "all". If a whole group is present → use the group key.
 */
function collapse(keys: Set<string>): string {
  if (keys.size === 0) return ''
  const universe = allKeys()
  // "all" if every concrete key is covered
  let coversAll = true
  for (const k of universe) {
    if (!keys.has(k)) { coversAll = false; break }
  }
  if (coversAll) return 'all'

  const result: string[] = []
  const consumed = new Set<string>()
  for (const [group, subs] of Object.entries(MODULE_GROUPS)) {
    if (subs.length > 0 && subs.every(s => keys.has(s))) {
      result.push(group)
      consumed.add(group)
      subs.forEach(s => consumed.add(s))
    }
  }
  // Add any remaining standalone keys not folded into a group
  for (const k of keys) {
    if (consumed.has(k)) continue
    if (MODULE_GROUPS[k]) continue // a group key whose subs weren't all present — skip the bare group
    result.push(k)
  }
  return result.length ? result.join(',') : ''
}

/**
 * Compute the effective access string = intersection(roleAccess, tenantCap).
 * - tenantCap === 'all' (or empty) → no cap → return roleAccess unchanged.
 * - roleAccess === 'all' → user gets everything the tenant cap allows → return cap.
 * - otherwise → intersect the two expanded sets.
 */
export function intersectAccess(roleAccess: string, tenantCap: string): string {
  const capUnlimited = !tenantCap || tenantCap === 'all'
  if (capUnlimited) return roleAccess || 'all'

  const capSet = expandAccess(tenantCap)
  if (!roleAccess || roleAccess === 'all') {
    // role gets everything within the cap
    return collapse(capSet)
  }
  const roleSet = expandAccess(roleAccess)
  const inter = new Set<string>()
  for (const k of roleSet) {
    if (capSet.has(k)) inter.add(k)
  }
  return collapse(inter)
}

/**
 * Returns true if `tenantCap` permits `moduleKey` (group or sub-module).
 */
export function tenantAllowsModule(moduleKey: string, tenantCap: string): boolean {
  if (!tenantCap || tenantCap === 'all') return true
  return expandAccess(tenantCap).has(moduleKey)
}
