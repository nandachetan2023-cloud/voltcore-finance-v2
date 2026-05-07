/**
 * Full State Seed Script
 * ─────────────────────────────────────────────────────────────────
 * Replicates the current local database state onto a fresh server.
 * Run this AFTER pushing the Prisma schemas:
 *
 *   bun run db:push
 *   npx prisma db push --schema=prisma/superadmin.prisma
 *   bun scripts/seed-full-state.ts
 *
 * What it seeds:
 *   Superadmin DB:
 *     - SuperAdmin login account
 *     - Upasana Associate tenant
 *     - Biometric site configs (Head Office, Site2)
 *     - Tenant user (UA ADMIN)
 *
 *   Demo tenant DB (erp_demo):
 *     - Department: Mechanical
 *     - Designations: Site in charge, Safety officer, HR
 *     - Branches (synced from biometric sites): Head Office, Site2
 *     - Grade: High Skilled
 *     - Employees: UA0001, UA0002, UA0003
 */

import { PrismaClient as SuperAdminClient } from '@prisma/superadmin-client'
import { PrismaClient as TenantClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const superadminDb = new SuperAdminClient({
  datasources: { db: { url: process.env.SUPERADMIN_DATABASE_URL } },
})

const demoDb = new TenantClient({
  datasources: { db: { url: process.env.DEMO_DATABASE_URL } },
})

// ── Helpers ──────────────────────────────────────────────────────
function log(msg: string) { console.log(msg) }
function ok(msg: string)  { console.log(`  ✅ ${msg}`) }
function skip(msg: string){ console.log(`  ℹ️  ${msg}`) }

async function upsertOrSkip<T>(
  label: string,
  findFn: () => Promise<T | null>,
  createFn: () => Promise<T>
): Promise<T> {
  const existing = await findFn()
  if (existing) { skip(`${label} already exists`); return existing }
  const created = await createFn()
  ok(`${label} created`)
  return created
}

// ════════════════════════════════════════════════════════════════
// SUPERADMIN DATABASE
// ════════════════════════════════════════════════════════════════
async function seedSuperadmin() {
  log('\n📦 Seeding superadmin database...')

  // ── 1. SuperAdmin user ──────────────────────────────────────
  const SA_EMAIL    = 'admin@techpioneerhub.in'
  const SA_PASSWORD = 'superadmin@123'

  await upsertOrSkip(
    `SuperAdmin (${SA_EMAIL})`,
    () => superadminDb.superAdminUser.findUnique({ where: { email: SA_EMAIL } }),
    async () => superadminDb.superAdminUser.create({
      data: {
        email: SA_EMAIL,
        password: await bcrypt.hash(SA_PASSWORD, 12),
        name: 'Super Admin',
        isActive: true,
      },
    })
  )

  // ── 2. Tenant: Upasana Associate ────────────────────────────
  const DEMO_DB_URL = process.env.DEMO_DATABASE_URL!
  const tenant = await upsertOrSkip(
    'Tenant: Upasana Associate',
    () => superadminDb.tenant.findUnique({ where: { slug: 'ua' } }),
    () => superadminDb.tenant.create({
      data: {
        name: 'Upasana Associate',
        slug: 'ua',
        dbUrl: DEMO_DB_URL,
        status: 'active',
        notes: 'for demo',
      },
    })
  )

  // ── 3. Biometric site configs ───────────────────────────────
  const biometricSites = [
    {
      siteId: 'Site1',
      siteName: 'Head Office',
      baseUrl: 'https://api.etimeoffice.com/api',
      corporateId: 'UA568',
      username: 'Sudhir567',
      password: 'Sudhir567',  // placeholder — update with real password
    },
    {
      siteId: 'Site2',
      siteName: 'Site2',
      baseUrl: 'https://api.etimeoffice.com/api',
      corporateId: 'UA567',
      username: 'Sudhir567',
      password: 'Sudhir567',  // placeholder — update with real password
    },
  ]

  for (const site of biometricSites) {
    await upsertOrSkip(
      `Biometric site: ${site.siteName} (${site.siteId})`,
      () => superadminDb.biometricSiteConfig.findUnique({
        where: { tenantId_siteId: { tenantId: tenant.id, siteId: site.siteId } },
      }),
      () => superadminDb.biometricSiteConfig.create({
        data: { tenantId: tenant.id, isActive: true, ...site },
      })
    )
  }

  // ── 4. Tenant user: UA ADMIN ────────────────────────────────
  const UA_ADMIN_EMAIL    = 'associateupasana@gmail.com'
  const UA_ADMIN_PASSWORD = 'admin@123'  // set a real password on server

  await upsertOrSkip(
    `Tenant user: ${UA_ADMIN_EMAIL}`,
    () => superadminDb.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: UA_ADMIN_EMAIL } },
    }),
    () => superadminDb.tenantUser.create({
      data: {
        tenantId: tenant.id,
        name: 'UA ADMIN',
        email: UA_ADMIN_EMAIL,
        password: bcrypt.hashSync(UA_ADMIN_PASSWORD, 12),
        phone: '',
        allowedModules: 'organization,hrms,system,reports,self-service',
        isActive: true,
        createdBySuperadmin: true,
      },
    })
  )

  log('\n✅ Superadmin database seeded.')
  log(`   SuperAdmin login : ${SA_EMAIL} / ${SA_PASSWORD}`)
  log(`   Tenant admin     : ${UA_ADMIN_EMAIL} / ${UA_ADMIN_PASSWORD}`)
  log('   ⚠️  Change passwords after first login!')
}

// ════════════════════════════════════════════════════════════════
// DEMO TENANT DATABASE
// ════════════════════════════════════════════════════════════════
async function seedDemoTenant() {
  log('\n📦 Seeding demo tenant database (erp_demo)...')

  // ── 1. Department ───────────────────────────────────────────
  const mechanical = await upsertOrSkip(
    'Department: Mechanical',
    () => demoDb.department.findFirst({ where: { name: 'Mechanical' } }),
    () => demoDb.department.create({ data: { name: 'Mechanical', code: 'MECH' } })
  )

  // ── 2. Designations ─────────────────────────────────────────
  const designationData = [
    { name: 'Site in charge' },
    { name: 'Safety officer' },
    { name: 'HR' },
  ]

  const designationMap: Record<string, number> = {}
  for (const d of designationData) {
    const desig = await upsertOrSkip(
      `Designation: ${d.name}`,
      () => demoDb.designation.findFirst({ where: { name: d.name } }),
      () => demoDb.designation.create({ data: { name: d.name } })
    )
    designationMap[d.name.toLowerCase()] = desig.id
  }

  // ── 3. Branches (from biometric sites) ──────────────────────
  const branchData = [
    { name: 'Head Office', address: 'Site ID: Site1' },
    { name: 'Site2',       address: 'Site ID: Site2' },
  ]

  const branchMap: Record<string, number> = {}
  for (const b of branchData) {
    const branch = await upsertOrSkip(
      `Branch: ${b.name}`,
      () => demoDb.branch.findFirst({ where: { name: b.name } }),
      () => demoDb.branch.create({ data: b })
    )
    branchMap[b.name] = branch.id
  }

  // ── 4. Grade ─────────────────────────────────────────────────
  const grade = await upsertOrSkip(
    'Grade: High Skilled',
    () => demoDb.grade.findFirst({ where: { code: 'HS' } }),
    () => demoDb.grade.create({
      data: {
        name: 'High Skilled',
        code: 'HS',
        level: 3,
        minSalary: 15000,
        maxSalary: 50000,
        updatedAt: new Date(),
      },
    })
  )

  // ── 5. Employees ─────────────────────────────────────────────
  const employees = [
    {
      employeeCode: 'UA0001',
      firstName: 'Gopal',
      middleName: '',
      lastName: 'Mukharjee',
      email: 'gopal.mukherjee@upasanaassociate.com',
      personalEmail: 'gopal.mukherjee@upasanaassociate.com',
      phone: '7894051591',
      dateOfBirth: new Date('1985-01-25'),
      gender: 'male',
      maritalStatus: 'married',
      bloodGroup: 'O+',
      currentAddress: 'Lapanga',
      currentCity: 'Sambalpur',
      currentState: 'Odisha',
      currentPincode: '768212',
      designationName: 'Site in charge',
      branchName: 'Head Office',
      dateOfJoining: new Date('2017-05-24'),
      confirmationDate: new Date('2017-04-22'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      probationMonths: 6,
      noticePeriodDays: 30,
      uanNumber: '4403572453',
      esicNumber: '100735389015',
      bankName: 'BANDHAN BANK',
      bankAccount: '52200042860529',
      bankIfsc: 'BDBL0001747',
    },
    {
      employeeCode: 'UA0002',
      firstName: 'Preeti',
      middleName: '',
      lastName: 'Bhoi',
      email: 'preeti.bhoi@upasanaassociate.com',
      personalEmail: 'preeti.bhoi@upasanaassociate.com',
      phone: '9776890599',
      dateOfBirth: new Date('1998-09-19'),
      gender: 'female',
      maritalStatus: 'single',
      bloodGroup: 'O+',
      fatherName: 'SRIBATSA BHOI',
      currentAddress: 'Lapanga',
      currentCity: 'Sambalpur',
      currentState: 'Odisha',
      currentPincode: '768212',
      designationName: 'Safety officer',
      branchName: 'Site2',
      dateOfJoining: new Date('2017-05-26'),
      confirmationDate: new Date('2017-04-29'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      probationMonths: 6,
      noticePeriodDays: 30,
      uanNumber: '8500009728',
      esicNumber: '101634066966',
      bankName: 'CENTRAL BANK OF INDIA',
      bankAccount: '4063588045',
      bankIfsc: 'CBIN0280998',
    },
    {
      employeeCode: 'UA0003',
      firstName: 'Dipak',
      middleName: 'Kumar',
      lastName: 'Roul',
      email: 'hr.lapanaga@upasanaassociate.com',
      personalEmail: 'hr.lapanaga@upasanaassociate.com',
      phone: '9437123456',
      dateOfBirth: new Date('1990-06-15'),
      gender: 'male',
      maritalStatus: 'married',
      bloodGroup: 'B+',
      currentAddress: 'Lapanga',
      currentCity: 'Sambalpur',
      currentState: 'Odisha',
      currentPincode: '768212',
      designationName: 'HR',
      branchName: 'Head Office',
      dateOfJoining: new Date('2018-03-01'),
      confirmationDate: new Date('2018-02-01'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      probationMonths: 6,
      noticePeriodDays: 30,
    },
  ]

  for (const emp of employees) {
    const designationId = designationMap[emp.designationName.toLowerCase()]
    const branchId = branchMap[emp.branchName]

    if (!designationId) { console.warn(`  ⚠️  Designation not found: ${emp.designationName}`); continue }
    if (!branchId)      { console.warn(`  ⚠️  Branch not found: ${emp.branchName}`); continue }

    await upsertOrSkip(
      `Employee: ${emp.employeeCode} — ${emp.firstName} ${emp.lastName} (${emp.designationName} @ ${emp.branchName})`,
      () => demoDb.employee.findUnique({ where: { employeeCode: emp.employeeCode } }),
      () => demoDb.employee.create({
        data: {
          employeeCode: emp.employeeCode,
          firstName: emp.firstName.trim(),
          middleName: emp.middleName || null,
          lastName: emp.lastName.trim(),
          email: emp.email.trim(),
          personalEmail: emp.personalEmail?.trim() || null,
          phone: emp.phone,
          dateOfBirth: emp.dateOfBirth,
          gender: emp.gender,
          maritalStatus: emp.maritalStatus || null,
          bloodGroup: emp.bloodGroup || null,
          fatherName: (emp as any).fatherName || null,
          currentAddress: emp.currentAddress,
          currentCity: emp.currentCity,
          currentState: emp.currentState,
          currentPincode: emp.currentPincode,
          departmentId: mechanical.id,
          designationId,
          branchId,
          gradeId: grade.id,
          dateOfJoining: emp.dateOfJoining,
          confirmationDate: emp.confirmationDate || null,
          employmentType: emp.employmentType,
          employmentStatus: emp.employmentStatus,
          probationMonths: emp.probationMonths,
          noticePeriodDays: emp.noticePeriodDays,
          uanNumber: (emp as any).uanNumber || null,
          esicNumber: (emp as any).esicNumber || null,
          bankName: (emp as any).bankName || null,
          bankAccount: (emp as any).bankAccount || null,
          bankIfsc: (emp as any).bankIfsc || null,
          updatedAt: new Date(),
        },
      })
    )
  }

  log('\n✅ Demo tenant database seeded.')
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
async function main() {
  console.log('🚀 Full state seed starting...\n')
  console.log('   This will replicate your local DB state onto the server.')
  console.log('   Safe to run multiple times — skips existing records.\n')

  await seedSuperadmin()
  await seedDemoTenant()

  console.log('\n🎉 All done! Your server DB now matches your local state.')
  console.log('\n📋 Next steps on the server:')
  console.log('   1. Update biometric site passwords in superadmin panel')
  console.log('   2. Change the superadmin and tenant admin passwords')
  console.log('   3. Update DEMO_DATABASE_URL in .env to point to the server DB')
}

main()
  .catch(e => { console.error('\n❌ Seed failed:', e.message); process.exit(1) })
  .finally(async () => {
    await superadminDb.$disconnect()
    await demoDb.$disconnect()
  })
