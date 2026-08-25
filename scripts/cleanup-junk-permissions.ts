/**
 * One-off cleanup: deletes the junk FinPermission rows that the now-removed
 * "Role Management" screen (role-management.tsx, backed by the also-removed
 * /api/fin/role-matrix route) created — one MODULE_VIEW-style permission per
 * raw UI module key (e.g. LEDGER_VIEW, SALES_ORDERS_VIEW). These never
 * matched the real Finance RBAC catalog (GL/AP/AR/PettyCash/Purchase/
 * Payroll/Inventory/Reports × CREATE/VIEW/EDIT/APPROVE/DELETE/EXPORT) that
 * assertPermission() actually enforces, so they only cluttered the
 * Permissions tab in Finance Access Control. Cascades to delete any
 * FinRolePermission bindings on them too (schema: onDelete: Cascade).
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const CANONICAL_MODULES = new Set(['GL', 'AP', 'AR', 'PettyCash', 'Purchase', 'Payroll', 'Inventory', 'Reports'])

async function main() {
  const all = await db.finPermission.findMany()
  const junk = all.filter((p) => !CANONICAL_MODULES.has(p.module))
  if (junk.length === 0) { console.log('No junk permissions found.'); return }
  console.log(`Deleting ${junk.length} junk permission(s):`, junk.map((p) => p.code).join(', '))
  await db.finPermission.deleteMany({ where: { id: { in: junk.map((p) => p.id) } } })
  console.log('✅ Cleanup complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
