/**
 * Seeds 3 employees from ERP_DATA_NEW.xlsx into erp_demo database.
 * Syncs biometric sites from superadmin as branches, then assigns them randomly.
 * Run: bun scripts/seed-demo-employees.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaClient as SuperAdminClient } from '@prisma/superadmin-client'

const db = new PrismaClient({
  datasources: { db: { url: process.env.DEMO_DATABASE_URL } },
})

const superadminDb = new SuperAdminClient({
  datasources: { db: { url: process.env.SUPERADMIN_DATABASE_URL } },
})

// Tenant ID for Upasana Associate
const TENANT_ID = 'cmov3u3j80000ts2wmcakef6i'

async function main() {
  console.log('🌱 Seeding demo employees...\n')

  // ── 1. Sync biometric sites as branches ──────────────────────
  console.log('📡 Syncing biometric sites as branches...')
  const biometricSites = await superadminDb.biometricSiteConfig.findMany({
    where: { tenantId: TENANT_ID, isActive: true },
    select: { siteId: true, siteName: true },
  })

  const branches: Array<{ id: number; name: string }> = []
  for (const site of biometricSites) {
    let branch = await db.branch.findFirst({ where: { name: site.siteName } })
    if (!branch) {
      branch = await db.branch.create({
        data: { name: site.siteName, address: `Site ID: ${site.siteId}` },
      })
      console.log(`  ✅ Branch created: ${branch.name} (id: ${branch.id})`)
    } else {
      console.log(`  ℹ️  Branch exists: ${branch.name} (id: ${branch.id})`)
    }
    branches.push({ id: branch.id, name: branch.name })
  }

  if (branches.length === 0) {
    console.error('❌ No biometric sites found. Configure sites in superadmin first.')
    process.exit(1)
  }

  console.log(`\n✅ Available sites: ${branches.map(b => b.name).join(', ')}\n`)

  // ── 2. Ensure Grade exists ───────────────────────────────────
  let grade = await db.grade.findFirst({ where: { code: 'HS' } })
  if (!grade) {
    grade = await db.grade.create({
      data: {
        name: 'High Skilled',
        code: 'HS',
        level: 3,
        minSalary: 15000,
        maxSalary: 50000,
        updatedAt: new Date(),
      },
    })
    console.log(`✅ Grade created: ${grade.name} (id: ${grade.id})`)
  } else {
    console.log(`ℹ️  Grade exists: ${grade.name} (id: ${grade.id})`)
  }

  // ── 3. Fetch department and designations ─────────────────────
  const mechanical = await db.department.findFirst({ where: { name: 'Mechanical' } })
  if (!mechanical) throw new Error('Department "Mechanical" not found. Run db:push first.')

  const desigs = await db.designation.findMany()
  const designationMap: Record<string, number> = {}
  for (const d of desigs) {
    designationMap[d.name.toLowerCase()] = d.id
  }
  console.log('\nDesignations found:', Object.keys(designationMap).join(', '))

  // ── 4. Employee data from ERP_DATA_NEW.xlsx ──────────────────
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
      dateOfJoining: new Date('2018-03-01'),
      confirmationDate: new Date('2018-02-01'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      probationMonths: 6,
      noticePeriodDays: 30,
    },
  ]

  // ── 5. Insert employees with random site assignment ──────────
  console.log('\n👷 Creating employees...')
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i]

    const designationId = designationMap[emp.designationName.toLowerCase()]
    if (!designationId) {
      console.warn(`⚠️  Designation "${emp.designationName}" not found, skipping ${emp.employeeCode}`)
      continue
    }

    // Assign sites randomly (round-robin across available sites)
    const assignedBranch = branches[i % branches.length]

    const existing = await db.employee.findUnique({ where: { employeeCode: emp.employeeCode } })
    if (existing) {
      console.log(`ℹ️  Employee already exists: ${emp.employeeCode} — skipping`)
      continue
    }

    const created = await db.employee.create({
      data: {
        employeeCode: emp.employeeCode,
        firstName: emp.firstName.trim(),
        middleName: emp.middleName || null,
        lastName: emp.lastName.trim(),
        email: emp.email.trim(),
        personalEmail: emp.personalEmail?.trim() || null,
        phone: emp.phone.toString(),
        dateOfBirth: emp.dateOfBirth,
        gender: emp.gender,
        maritalStatus: emp.maritalStatus || null,
        bloodGroup: emp.bloodGroup || null,
        fatherName: (emp as any).fatherName || null,
        currentAddress: emp.currentAddress,
        currentCity: emp.currentCity,
        currentState: emp.currentState,
        currentPincode: emp.currentPincode.toString(),
        departmentId: mechanical.id,
        designationId,
        branchId: assignedBranch.id,
        gradeId: grade.id,
        dateOfJoining: emp.dateOfJoining,
        confirmationDate: emp.confirmationDate || null,
        employmentType: emp.employmentType,
        employmentStatus: emp.employmentStatus,
        probationMonths: emp.probationMonths,
        noticePeriodDays: emp.noticePeriodDays,
        uanNumber: (emp as any).uanNumber?.toString() || null,
        esicNumber: (emp as any).esicNumber?.toString() || null,
        bankName: (emp as any).bankName || null,
        bankAccount: (emp as any).bankAccount?.toString() || null,
        bankIfsc: (emp as any).bankIfsc || null,
        updatedAt: new Date(),
      },
    })
    console.log(`  ✅ ${created.employeeCode} — ${created.firstName} ${created.lastName} | ${emp.designationName} | Site: ${assignedBranch.name}`)
  }

  console.log('\n🎉 Done! Employees seeded into erp_demo.')
  console.log('\n📋 Summary:')
  const count = await db.employee.count()
  console.log(`   Total employees: ${count}`)
  const branchCounts = await db.branch.findMany({
    include: { _count: { select: { Employee: true } } },
  })
  for (const b of branchCounts) {
    console.log(`   ${b.name}: ${b._count.Employee} employee(s)`)
  }
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
  .finally(async () => {
    await db.$disconnect()
    await superadminDb.$disconnect()
  })
