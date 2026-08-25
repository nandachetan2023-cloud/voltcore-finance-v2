/**
 * Finance RBAC seed + one-time data migration.
 *
 * 1. Creates the hierarchical role catalog (level 1..5 + read-only Auditor).
 * 2. Seeds the full permission catalog (8 modules × CREATE/VIEW/EDIT/APPROVE/DELETE/EXPORT)
 *    with canonical UPPERCASE codes (e.g. REPORTS_VIEW, PETTYCASH_APPROVE).
 * 3. Binds role → permission sets.
 * 4. Seeds the default Segregation-of-Duties rules.
 * 5. Migrates any legacy FinApprovalRole rows into the new FinUserRole mapping.
 *
 * Re-runnable: roles/permissions/sod rules are upserted by unique key; legacy
 * migration only runs while the FinApprovalRole table still exists.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const MODULES = ['GL', 'AP', 'AR', 'PettyCash', 'Purchase', 'Payroll', 'Inventory', 'Reports', 'Admin']
const ACTIONS = ['CREATE', 'VIEW', 'EDIT', 'APPROVE', 'DELETE', 'EXPORT']

// ── Role catalog: level = authority (higher wins). readOnly = view/export only. ──
const ROLES = [
  { code: 'REQUESTER', name: 'Requester', level: 1, readOnly: false, color: '#8899aa', desc: 'Submits requests/vouchers' },
  { code: 'CUSTODIAN', name: 'Site Incharge (Custodian)', level: 2, readOnly: false, color: '#f5a623', desc: 'Holds the site petty-cash float; enters vouchers' },
  { code: 'SITE_MGR', name: 'Site Manager', level: 2, readOnly: false, color: '#00e676', desc: 'Approves site-level petty cash expense requests, scoped to their site(s)' },
  { code: 'DEPT_HEAD', name: 'Department Head', level: 3, readOnly: false, color: '#00d4ff', desc: 'Line approvals' },
  { code: 'FIN_EXEC', name: 'Finance Executive', level: 3, readOnly: false, color: '#00d4ff', desc: 'Finance check / site-level approvals' },
  { code: 'FINANCE_MGR', name: 'Finance Head', level: 4, readOnly: false, color: '#00e676', desc: 'Final finance approval' },
  { code: 'DIRECTOR', name: 'Director', level: 5, readOnly: false, color: '#7c5cff', desc: 'Highest authority' },
  { code: 'AUDITOR', name: 'Auditor', level: 5, readOnly: true, color: '#ff3d3d', desc: 'Read-only compliance view' },
]

// Which modules each role can touch, and with which actions.
// 'all' means every module in MODULES.
const ROLE_PERMISSIONS: Record<string, string[] | 'all'> = {
  REQUESTER: ['PettyCash:CREATE', 'PettyCash:VIEW', 'Purchase:CREATE', 'Purchase:VIEW', 'GL:VIEW', 'Reports:VIEW'],
  // Site storekeeper: runs day-to-day Site Store ops (GRN/MRS/Issue/Returns/Tools/Gate Pass/Equipment/Scrap/Physical Verification).
  CUSTODIAN: ['PettyCash:CREATE', 'PettyCash:VIEW', 'PettyCash:EDIT', 'Purchase:VIEW', 'Inventory:VIEW', 'Inventory:CREATE', 'Inventory:EDIT', 'Inventory:DELETE', 'GL:VIEW', 'Reports:VIEW'],
  // Site Manager: approves the storekeeper's MRS requisitions (SOP approval workflow).
  SITE_MGR: ['PettyCash:VIEW', 'PettyCash:APPROVE', 'Purchase:VIEW', 'Inventory:VIEW', 'Inventory:APPROVE', 'Reports:VIEW'],
  DEPT_HEAD: ['Purchase:CREATE', 'Purchase:VIEW', 'Purchase:EDIT', 'Purchase:APPROVE', 'PettyCash:VIEW', 'Inventory:VIEW', 'Reports:VIEW'],
  FIN_EXEC: ['AP:CREATE', 'AP:VIEW', 'AP:EDIT', 'AR:CREATE', 'AR:VIEW', 'AR:EDIT', 'PettyCash:VIEW', 'PettyCash:APPROVE', 'GL:VIEW', 'Purchase:VIEW', 'Inventory:VIEW', 'Reports:VIEW'],
  // Finance Head also administers Finance Access Control itself: manage the
  // role catalog, site-scoped user assignments, and SoD rules (but not
  // Reports:CREATE — that permission is unrelated and was previously
  // (mis)reused to gate RBAC admin actions).
  FINANCE_MGR: ['AP:VIEW', 'AP:APPROVE', 'AP:EXPORT', 'AR:VIEW', 'AR:APPROVE', 'AR:EXPORT', 'PettyCash:VIEW', 'PettyCash:APPROVE', 'PettyCash:EXPORT', 'GL:CREATE', 'GL:VIEW', 'GL:EDIT', 'GL:APPROVE', 'Purchase:VIEW', 'Purchase:APPROVE', 'Payroll:VIEW', 'Inventory:VIEW', 'Inventory:APPROVE', 'Inventory:EXPORT', 'Reports:VIEW', 'Reports:EXPORT', 'Admin:VIEW', 'Admin:CREATE', 'Admin:EDIT', 'Admin:DELETE'],
  DIRECTOR: 'all',
  AUDITOR: 'all', // enforced read-only at the gate via role.readOnly
}

// Segregation-of-Duties: pairs that can never be held by the same person.
const SOD_RULES = [
  { roleA: 'CUSTODIAN', roleB: 'FINANCE_MGR', desc: 'Custodian cannot also be Finance Head (prevents petty-cash self-approval).' },
  { roleA: 'CUSTODIAN', roleB: 'AUDITOR', desc: 'Custodian cannot audit their own float.' },
  { roleA: 'REQUESTER', roleB: 'SITE_MGR', desc: 'A site employee (Requester) cannot also be the Site Manager approving their own expense requests.' },
  { roleA: 'REQUESTER', roleB: 'FINANCE_MGR', desc: 'Requester cannot approve their own requests at Finance level.' },
  { roleA: 'FIN_EXEC', roleB: 'FINANCE_MGR', desc: 'Finance Executive and Finance Head must be different people.' },
]

async function upsertAssignment(db: PrismaClient, email: string, name: string | null, roleId: number, siteCode: string | null) {
  const natural = { userEmail: email, roleId }
  if (siteCode) {
    const existing = await db.finUserRole.findFirst({ where: { ...natural, siteCode } })
    if (existing) {
      await db.finUserRole.update({ where: { id: existing.id }, data: { userName: name ?? null, isActive: true } })
    } else {
      await db.finUserRole.create({ data: { userEmail: email, roleId, siteCode, userName: name ?? null, isActive: true } })
    }
    return
  }
  const existing = await db.finUserRole.findFirst({ where: natural })
  if (existing) {
    await db.finUserRole.update({ where: { id: existing.id }, data: { userName: name ?? null, isActive: true } })
  } else {
    await db.finUserRole.create({ data: { userEmail: email, roleId, siteCode: null, userName: name ?? null, isActive: true } })
  }
}

async function main() {
  console.log('🌱 Seeding Finance RBAC...')

  // 1. Roles
  const roleIds: Record<string, number> = {}
  for (const r of ROLES) {
    const row = await db.finRole.upsert({
      where: { code: r.code },
      update: { name: r.name, level: r.level, readOnly: r.readOnly, color: r.color, isActive: true },
      create: { code: r.code, name: r.name, level: r.level, readOnly: r.readOnly, color: r.color },
    })
    roleIds[r.code] = row.id
  }

  // 2. Permissions (full catalog)
  const permIds: Record<string, number> = {}
  for (const m of MODULES) {
    for (const a of ACTIONS) {
      const code = `${m}_${a}`.toUpperCase()
      const row = await db.finPermission.upsert({
        where: { code },
        update: {},
        create: { code, module: m, action: a, description: `${a} on ${m} module` },
      })
      permIds[code] = row.id
    }
  }

  // 3. Role ↔ permission bindings. Bind exactly the "Module:Action" pairs
  // listed — NOT the cross-product of every module and every action that
  // appears anywhere in the role's list (a prior bug here silently granted
  // e.g. FIN_EXEC's PettyCash:APPROVE + AP:VIEW as AP:APPROVE too, since
  // both AP and APPROVE showed up somewhere in the same role's spec).
  // Clear existing bindings first so a stale over-grant from that bug
  // doesn't survive a re-run (upsert alone would only ever add, never remove).
  await db.finRolePermission.deleteMany({ where: { roleId: { in: Object.values(roleIds) } } })
  for (const [roleCode, spec] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds[roleCode]
    const pairs = spec === 'all' ? MODULES.flatMap((m) => ACTIONS.map((a) => `${m}:${a}`)) : spec
    for (const pair of pairs) {
      const code = pair.replace(':', '_').toUpperCase()
      await db.finRolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permIds[code] } },
        update: {},
        create: { roleId, permissionId: permIds[code] },
      })
    }
  }

  // 4. SoD rules
  for (const s of SOD_RULES) {
    await db.finSodRule.upsert({
      where: { roleACode_roleBCode: { roleACode: s.roleA, roleBCode: s.roleB } },
      update: { description: s.desc, isActive: true },
      create: { roleACode: s.roleA, roleBCode: s.roleB, description: s.desc },
    })
  }

  // 5. Restore known assignments (the legacy FinApprovalRole table was migrated
  // once when the model existed; these demo rows are restored deterministically).
  const demoAssignments: Array<{ email: string; name: string | null; role: string; siteCode: string | null }> = [
    { email: 'finance_admin@voltcore.com', name: null, role: 'FINANCE_MGR', siteCode: null },
    { email: 'finance_admin@voltcore.com', name: null, role: 'SITE_MGR', siteCode: 'SITE-004' },
    { email: 'custodian@test.com', name: 'Test Custodian', role: 'CUSTODIAN', siteCode: 'SITE-004' },
    { email: 'sitemanager@voltcore.com', name: 'Ankit Verma', role: 'SITE_MGR', siteCode: 'SITE-004' },
  ]
  for (const a of demoAssignments) {
    const roleId = roleIds[a.role]
    if (!roleId) continue
    await upsertAssignment(db, a.email, a.name, roleId, a.siteCode)
  }

  const totalPerms = await db.finPermission.count()
  const totalAssignments = await db.finUserRole.count()
  console.log(`✅ RBAC ready — ${ROLES.length} roles, ${totalPerms} permissions, ${totalAssignments} assignments, ${SOD_RULES.length} SoD rules.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())