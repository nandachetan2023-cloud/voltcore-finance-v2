/**
 * Create the finance_admin@voltcore.in login with full finance authority.
 *
 *   email    : finance_admin@voltcore.in
 *   password : taken from FINANCE_ADMIN_PASSWORD, otherwise a random one is
 *              generated and printed once by this run. Never hardcode it here —
 *              a literal in the repo is a committed credential.
 *
 * What it gets:
 *   • superadmin DB — a TenantUser on the `voltcore` tenant with an OrgRole
 *     "Finance Admin" (moduleAccess = all). createdBySuperadmin = true so the
 *     session role is `admin`, which also unlocks Finance Access Control
 *     (the Admin-module bypass in src/lib/fin-rbac.ts).
 *   • tenant DB     — DIRECTOR at all-sites scope: every finance module × every
 *     action (CREATE/VIEW/EDIT/APPROVE/DELETE/EXPORT), so it can approve petty
 *     cash, journal entries, AP/AR, purchase and inventory at any site. Its
 *     existing FINANCE_MGR / SITE_MGR assignments are left in place.
 *
 * Segregation-of-Duties is still checked: the script refuses to add a role that
 * conflicts with one this user already holds.
 *
 *   FINANCE_ADMIN_PASSWORD='<your password>' npx tsx scripts/seed-finance-admin-user.ts
 *   npx tsx scripts/seed-finance-admin-user.ts        # generates one for you
 */
import { randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaClient as SuperadminClient } from '../node_modules/@prisma/superadmin-client'
import bcrypt from 'bcryptjs'

function loadEnv() {
  try {
    for (const line of readFileSync(join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m || process.env[m[1]]) continue
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {}
}
loadEnv()

const TENANT_SLUG = 'voltcore'
const EMAIL = 'finance_admin@voltcore.in'
const NAME = 'Finance Admin'

/**
 * Password source, in order: FINANCE_ADMIN_PASSWORD, else a freshly generated
 * one. Rerunning without the env var therefore ROTATES the password — the run
 * prints the new value, which is the only place it appears.
 */
function resolvePassword(): { value: string; generated: boolean } {
  const fromEnv = process.env.FINANCE_ADMIN_PASSWORD?.trim()
  if (fromEnv) return { value: fromEnv, generated: false }
  // url-safe, no ambiguous characters to mistype
  const raw = randomBytes(18).toString('base64').replace(/[^A-Za-z0-9]/g, '')
  return { value: `Fin-${raw.slice(0, 16)}`, generated: true }
}
const ROLE_NAME = 'Finance Admin'
// Highest finance authority: every module × every action at every site.
const FIN_ROLE = 'DIRECTOR'

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL! } } })
const sadb = new SuperadminClient({ datasources: { db: { url: process.env.SUPERADMIN_DATABASE_URL! } } })

async function main() {
  const tenant = await sadb.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) throw new Error(`Tenant "${TENANT_SLUG}" not found — run scripts/seed-admin-user.ts first.`)

  const orgRole = await sadb.orgRole.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: ROLE_NAME } },
    update: { moduleAccess: 'all', isActive: true },
    create: {
      tenantId: tenant.id,
      name: ROLE_NAME,
      level: 90,
      maxUsers: 0,
      moduleAccess: 'all',
      color: '#00e676',
      isActive: true,
    },
  })

  const { value: password, generated } = resolvePassword()
  const passwordHash = await bcrypt.hash(password, 10)
  await sadb.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: EMAIL } },
    update: {
      name: NAME,
      password: passwordHash,
      allowedModules: 'all',
      orgRoleId: orgRole.id,
      isActive: true,
      onboardingStatus: 'approved',
      createdBySuperadmin: true,
    },
    create: {
      tenantId: tenant.id,
      name: NAME,
      email: EMAIL,
      password: passwordHash,
      allowedModules: 'all',
      orgRoleId: orgRole.id,
      isActive: true,
      onboardingStatus: 'approved',
      createdBySuperadmin: true,
    },
  })
  console.log(`✓ Login: ${EMAIL} / ${password} (OrgRole ${ROLE_NAME}, modules=all)`)
  if (generated) console.log('  ↑ generated for this run — save it now, it is not stored anywhere else.')

  const role = await db.finRole.findUnique({ where: { code: FIN_ROLE } })
  if (!role) throw new Error(`FinRole ${FIN_ROLE} missing — run scripts/seed-fin-rbac.ts first.`)

  // SoD guard: never silently create a forbidden role combination.
  const held = await db.finUserRole.findMany({
    where: { userEmail: EMAIL, isActive: true },
    include: { role: { select: { code: true } } },
  })
  const heldCodes = new Set(held.map((h) => h.role?.code).filter(Boolean) as string[])
  const rules = await db.finSodRule.findMany({ where: { isActive: true } })
  for (const r of rules) {
    const pair = [r.roleACode, r.roleBCode]
    const hasA = pair[0] === FIN_ROLE || heldCodes.has(pair[0])
    const hasB = pair[1] === FIN_ROLE || heldCodes.has(pair[1])
    if (hasA && hasB) throw new Error(`SoD violation: ${pair[0]} + ${pair[1]} — ${r.description ?? ''}`)
  }

  // All-sites scope (siteCode = null) — satisfies any site in hasPermission().
  const existing = await db.finUserRole.findFirst({ where: { userEmail: EMAIL, roleId: role.id, siteCode: null } })
  if (existing) {
    await db.finUserRole.update({ where: { id: existing.id }, data: { userName: NAME, isActive: true } })
  } else {
    await db.finUserRole.create({ data: { userEmail: EMAIL, roleId: role.id, siteCode: null, userName: NAME, isActive: true } })
  }

  const perms = await db.finRolePermission.count({ where: { roleId: role.id } })
  const all = await db.finUserRole.findMany({
    where: { userEmail: EMAIL, isActive: true },
    include: { role: { select: { code: true, name: true, level: true } } },
    orderBy: { id: 'asc' },
  })
  console.log(`✓ Finance roles for ${EMAIL}:`)
  for (const a of all) console.log(`    ${a.role?.code} (level ${a.role?.level}) @ ${a.siteCode ?? 'ALL SITES'}`)
  console.log(`\n✅ ${FIN_ROLE} carries ${perms} permissions — every module × CREATE/VIEW/EDIT/APPROVE/DELETE/EXPORT.`)
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(async () => { await db.$disconnect(); await sadb.$disconnect() })
