/**
 * Create one petty-cash site login per FinSite.
 *
 * Credentials are derived from the employee code + site name, so they are
 * reproducible and self-describing:
 *
 *   employeeCode = "SI" + the numeric part of the siteCode   (SITE-004 → SI004)
 *   email        = <empcode>.<site-name-slug>@voltcore.in    (si004.balco-smelter-korba@voltcore.in)
 *   password     = <EMPCODE>@<site digits>                   (SI004@004)
 *
 * What each site user gets:
 *   • tenant DB  — a Branch for the site, an Employee row (Site Incharge) and a
 *                  CUSTODIAN FinUserRole scoped to that site only.
 *   • superadmin — a TenantUser login on the `voltcore` tenant bound to a
 *                  "Site Incharge" OrgRole whose moduleAccess is the Petty Cash
 *                  group only (plus self-service).
 *
 * CUSTODIAN grants PettyCash CREATE/VIEW/EDIT at that siteCode — enough to raise
 * and edit vouchers, never to approve them (SoD: custodian ≠ approver).
 *
 * Re-runnable: everything is upserted by its natural key.
 *
 *   npx tsx scripts/seed-site-petty-cash-users.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaClient as SuperadminClient } from '../node_modules/@prisma/superadmin-client'
import bcrypt from 'bcryptjs'

// tsx does not load .env on its own — read it once so the URLs below are the
// same ones the app uses.
function loadEnv() {
  try {
    for (const line of readFileSync(join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m) continue
      const key = m[1]
      if (process.env[key]) continue
      process.env[key] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {}
}
loadEnv()

const TENANT_SLUG = 'voltcore'
const ROLE_NAME = 'Site Incharge'
// Petty Cash group = custodian dashboard + vouchers + approval queue + replenishment
// (see MODULE_TREE in src/store/erp-store.ts). self-service = their own profile.
const MODULE_ACCESS = 'petty-cash,self-service'
const DEPARTMENT = { name: 'Project Execution', code: 'PROJ' }
const DESIGNATION = 'Site Incharge'

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL! } } })
const sadb = new SuperadminClient({ datasources: { db: { url: process.env.SUPERADMIN_DATABASE_URL! } } })

async function main() {
  const sites = await db.finSite.findMany({ where: { status: 'Active' }, orderBy: { siteCode: 'asc' } })
  if (!sites.length) throw new Error('No active FinSite rows — seed finance sites first.')

  const tenant = await sadb.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) throw new Error(`Tenant "${TENANT_SLUG}" not found — run scripts/seed-admin-user.ts first.`)

  const orgRole = await sadb.orgRole.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: ROLE_NAME } },
    update: { moduleAccess: MODULE_ACCESS, isActive: true },
    create: {
      tenantId: tenant.id,
      name: ROLE_NAME,
      level: 20,
      maxUsers: 0,
      moduleAccess: MODULE_ACCESS,
      designations: DESIGNATION,
      color: '#f5a623',
      isActive: true,
    },
  })
  console.log(`✓ OrgRole: ${ROLE_NAME} (moduleAccess=${MODULE_ACCESS})`)

  const dept = await db.department.upsert({
    where: { name: DEPARTMENT.name },
    update: {},
    create: DEPARTMENT,
  })
  const desig = await db.designation.upsert({
    where: { name: DESIGNATION },
    update: {},
    create: { name: DESIGNATION },
  })

  const custodian = await db.finRole.findUnique({ where: { code: 'CUSTODIAN' } })
  if (!custodian) throw new Error('FinRole CUSTODIAN missing — run scripts/seed-fin-rbac.ts first.')

  const created: Array<{ site: string; code: string; email: string; password: string }> = []

  for (const site of sites) {
    const digits = (site.siteCode.match(/\d+/)?.[0] ?? '000').padStart(3, '0')
    const empCode = `SI${digits}`
    const siteSlug = slug(site.name)
    const email = `${empCode.toLowerCase()}.${siteSlug}@voltcore.in`
    const password = `${empCode}@${digits}`
    const name = `${site.name} Site Incharge`

    // 1. Branch mirroring the finance site (Employee.branchId is required).
    const branch = await db.branch.upsert({
      where: { name: site.name },
      update: {},
      create: { name: site.name, address: `Site Code: ${site.siteCode}` },
    })

    // 2. Employee record — the identity behind the login.
    const employee = await db.employee.upsert({
      where: { employeeCode: empCode },
      update: { email, branchId: branch.id, departmentId: dept.id, designationId: desig.id, updatedAt: new Date() },
      create: {
        employeeCode: empCode,
        firstName: site.name.split(' ')[0] || 'Site',
        lastName: 'Incharge',
        email,
        departmentId: dept.id,
        designationId: desig.id,
        branchId: branch.id,
        dateOfJoining: new Date(),
        employmentStatus: 'Active',
        employmentType: 'Fixed',
        updatedAt: new Date(),
      },
    })

    // 3. Login on the superadmin DB, bound to that employee.
    await sadb.tenantUser.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {
        name,
        password: await bcrypt.hash(password, 10),
        allowedModules: MODULE_ACCESS,
        orgRoleId: orgRole.id,
        employeeId: employee.id,
        isActive: true,
        onboardingStatus: 'approved',
      },
      create: {
        tenantId: tenant.id,
        name,
        email,
        password: await bcrypt.hash(password, 10),
        allowedModules: MODULE_ACCESS,
        orgRoleId: orgRole.id,
        employeeId: employee.id,
        isActive: true,
        onboardingStatus: 'approved',
        // false on purpose: a site custodian is NOT a tenant admin, so it must
        // not inherit the Finance "Admin module" bypass in src/lib/fin-rbac.ts.
        createdBySuperadmin: false,
      },
    })

    // 4. Finance RBAC: CUSTODIAN, scoped to this site only.
    const existing = await db.finUserRole.findFirst({
      where: { userEmail: email, roleId: custodian.id, siteCode: site.siteCode },
    })
    if (existing) {
      await db.finUserRole.update({ where: { id: existing.id }, data: { userName: name, isActive: true } })
    } else {
      await db.finUserRole.create({
        data: { userEmail: email, roleId: custodian.id, siteCode: site.siteCode, userName: name, isActive: true },
      })
    }

    created.push({ site: `${site.siteCode} ${site.name}`, code: empCode, email, password })
  }

  console.log(`\n✅ ${created.length} petty-cash site logins ready:\n`)
  for (const c of created) {
    console.log(`  ${c.site}`)
    console.log(`    emp code : ${c.code}`)
    console.log(`    email    : ${c.email}`)
    console.log(`    password : ${c.password}`)
  }
  console.log(`\n  role: ${ROLE_NAME} → CUSTODIAN (PettyCash CREATE/VIEW/EDIT at own site; no approval)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect(); await sadb.$disconnect() })
