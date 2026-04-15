import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing biometric employee matching...\n')

  // Get a sample raw log
  const rawLog = await prisma.biometricRawLog.findFirst({
    where: { processed: true },
  })

  if (!rawLog) {
    console.log('No raw logs found')
    return
  }

  console.log(`Testing with raw log: ${rawLog.empCode} - ${rawLog.name}`)

  // Try to find employee with EMP prefix
  let employee = await prisma.employee.findUnique({
    where: { employeeCode: `EMP${rawLog.empCode}` },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  })

  if (employee) {
    console.log(`✓ Found with EMP prefix: ${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`)
  } else {
    console.log(`✗ Not found with EMP prefix: EMP${rawLog.empCode}`)
    
    // Try without prefix
    employee = await prisma.employee.findUnique({
      where: { employeeCode: rawLog.empCode },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
    })
    
    if (employee) {
      console.log(`✓ Found without prefix: ${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`)
    } else {
      console.log(`✗ Not found without prefix: ${rawLog.empCode}`)
    }
  }

  // Check attendance records
  const attendanceCount = await prisma.attendanceLog.count({
    where: {
      employee: {
        employeeCode: {
          startsWith: 'EMP',
        },
      },
    },
  })

  console.log(`\nAttendance records with EMP prefix employees: ${attendanceCount}`)

  // Sample employees
  const employees = await prisma.employee.findMany({
    take: 5,
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  })

  console.log('\nSample employees:')
  employees.forEach(emp => {
    console.log(`  ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`)
  })
}

main()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
