import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const now = new Date()
  const admin = await prisma.user.upsert({
    where: { email: 'admin@voltcore.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@voltcore.com',
      password: hashedPassword,
      phone: '1234567890',
      isActive: true,
      updatedAt: now,
    },
  })
  console.log('✅ Admin user created')

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: 'Engineering' },
      update: {},
      create: { name: 'Engineering', code: 'ENG' },
    }),
    prisma.department.upsert({
      where: { name: 'Human Resources' },
      update: {},
      create: { name: 'Human Resources', code: 'HR' },
    }),
    prisma.department.upsert({
      where: { name: 'Finance' },
      update: {},
      create: { name: 'Finance', code: 'FIN' },
    }),
    prisma.department.upsert({
      where: { name: 'Operations' },
      update: {},
      create: { name: 'Operations', code: 'OPS' },
    }),
  ])
  console.log('✅ Departments created')

  // Create designations
  const designations = await Promise.all([
    prisma.designation.upsert({
      where: { name: 'Manager' },
      update: {},
      create: { name: 'Manager' },
    }),
    prisma.designation.upsert({
      where: { name: 'Engineer' },
      update: {},
      create: { name: 'Engineer' },
    }),
    prisma.designation.upsert({
      where: { name: 'Technician' },
      update: {},
      create: { name: 'Technician' },
    }),
    prisma.designation.upsert({
      where: { name: 'Executive' },
      update: {},
      create: { name: 'Executive' },
    }),
  ])
  console.log('✅ Designations created')

  // Create branches
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { name: 'Mumbai HQ' },
      update: {},
      create: { name: 'Mumbai HQ', address: 'BKC, Mumbai 400051' },
    }),
    prisma.branch.upsert({
      where: { name: 'Delhi Office' },
      update: {},
      create: { name: 'Delhi Office', address: 'Connaught Place, Delhi 110001' },
    }),
    prisma.branch.upsert({
      where: { name: 'Bangalore Office' },
      update: {},
      create: { name: 'Bangalore Office', address: 'Whitefield, Bangalore 560066' },
    }),
  ])
  console.log('✅ Branches created')

  // Create sample employees
  const employees = [
    {
      employeeCode: 'EMP001',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.kumar@voltcore.com',
      phone: '9876543210',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'male',
      currentAddress: '123 MG Road',
      currentCity: 'Mumbai',
      currentState: 'Maharashtra',
      currentPincode: '400001',
      departmentId: departments[0].id,
      designationId: designations[0].id,
      branchId: branches[0].id,
      dateOfJoining: new Date('2020-01-15'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      updatedAt: now,
    },
    {
      employeeCode: 'EMP002',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@voltcore.com',
      phone: '9876543211',
      dateOfBirth: new Date('1992-08-20'),
      gender: 'female',
      currentAddress: '456 Park Street',
      currentCity: 'Delhi',
      currentState: 'Delhi',
      currentPincode: '110001',
      departmentId: departments[1].id,
      designationId: designations[1].id,
      branchId: branches[1].id,
      dateOfJoining: new Date('2021-03-10'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      updatedAt: now,
    },
    {
      employeeCode: 'EMP003',
      firstName: 'Amit',
      lastName: 'Patel',
      email: 'amit.patel@voltcore.com',
      phone: '9876543212',
      dateOfBirth: new Date('1988-12-05'),
      gender: 'male',
      currentAddress: '789 Brigade Road',
      currentCity: 'Bangalore',
      currentState: 'Karnataka',
      currentPincode: '560001',
      departmentId: departments[2].id,
      designationId: designations[2].id,
      branchId: branches[2].id,
      dateOfJoining: new Date('2019-06-20'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      updatedAt: now,
    },
    {
      employeeCode: 'EMP004',
      firstName: 'Sneha',
      lastName: 'Reddy',
      email: 'sneha.reddy@voltcore.com',
      phone: '9876543213',
      dateOfBirth: new Date('1995-03-25'),
      gender: 'female',
      currentAddress: '321 Banjara Hills',
      currentCity: 'Mumbai',
      currentState: 'Maharashtra',
      currentPincode: '400002',
      departmentId: departments[3].id,
      designationId: designations[3].id,
      branchId: branches[0].id,
      dateOfJoining: new Date('2022-09-01'),
      employmentType: 'contract',
      employmentStatus: 'active',
      updatedAt: now,
    },
    {
      employeeCode: 'EMP005',
      firstName: 'Vikram',
      lastName: 'Singh',
      email: 'vikram.singh@voltcore.com',
      phone: '9876543214',
      dateOfBirth: new Date('1991-07-10'),
      gender: 'male',
      currentAddress: '555 Sector 18',
      currentCity: 'Delhi',
      currentState: 'Delhi',
      currentPincode: '110002',
      departmentId: departments[0].id,
      designationId: designations[1].id,
      branchId: branches[1].id,
      dateOfJoining: new Date('2020-11-15'),
      employmentType: 'permanent',
      employmentStatus: 'active',
      updatedAt: now,
    },
  ]

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { employeeCode: emp.employeeCode },
      update: {},
      create: emp,
    })
  }
  console.log('✅ Sample employees created')

  // Create some attendance logs
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const allEmployees = await prisma.employee.findMany()
  
  for (const emp of allEmployees) {
    // Check if attendance log already exists for this employee and date
    const existingLog = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: emp.id,
        logDate: {
          gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          lt: new Date(yesterday.setHours(23, 59, 59, 999)),
        },
      },
    })

    if (!existingLog) {
      await prisma.attendanceLog.create({
        data: {
          employeeId: emp.id,
          logDate: yesterday,
          punchIn: new Date(yesterday.setHours(9, 0, 0)),
          punchOut: new Date(yesterday.setHours(18, 0, 0)),
          status: 'present',
          updatedAt: now,
        },
      })
    }
  }
  console.log('✅ Attendance logs created')

  // Create customers
  const customers = [
    {
      name: 'ABC Corporation',
      contactPerson: 'John Doe',
      email: 'john@abc.com',
      phone: '9999999991',
      city: 'Mumbai',
      state: 'Maharashtra',
      updatedAt: now,
    },
    {
      name: 'XYZ Industries',
      contactPerson: 'Jane Smith',
      email: 'jane@xyz.com',
      phone: '9999999992',
      city: 'Delhi',
      state: 'Delhi',
      updatedAt: now,
    },
  ]

  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({
      where: { name: customer.name },
    })
    if (!existing) {
      await prisma.customer.create({ data: customer })
    }
  }
  console.log('✅ Customers created')

  // Create UOM
  const uoms = [
    { name: 'Pieces', code: 'PCS' },
    { name: 'Kilograms', code: 'KG' },
    { name: 'Meters', code: 'MTR' },
    { name: 'Liters', code: 'LTR' },
  ]

  for (const uom of uoms) {
    await prisma.uom.upsert({
      where: { name: uom.name },
      update: {},
      create: uom,
    })
  }
  console.log('✅ UOMs created')

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
