import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ModuleTest {
  name: string
  test: () => Promise<{ success: boolean; count: number; sample?: any; error?: string }>
}

const tests: ModuleTest[] = [
  {
    name: 'Employees',
    test: async () => {
      try {
        const employees = await prisma.employee.findMany({
          take: 3,
          include: {
            department: true,
            designation: true,
            branch: true,
          },
        })
        return {
          success: true,
          count: await prisma.employee.count(),
          sample: employees[0] ? {
            code: employees[0].employeeCode,
            name: `${employees[0].firstName} ${employees[0].lastName}`,
            department: employees[0].department.name,
            designation: employees[0].designation.name,
            branch: employees[0].branch.name,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Departments',
    test: async () => {
      try {
        const departments = await prisma.department.findMany({ take: 3 })
        return {
          success: true,
          count: await prisma.department.count(),
          sample: departments[0] ? {
            name: departments[0].name,
            code: departments[0].code,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Designations',
    test: async () => {
      try {
        const designations = await prisma.designation.findMany({ take: 3 })
        return {
          success: true,
          count: await prisma.designation.count(),
          sample: designations[0] ? {
            name: designations[0].name,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Attendance',
    test: async () => {
      try {
        const attendance = await prisma.attendanceLog.findMany({
          take: 3,
          include: {
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { logDate: 'desc' },
        })
        return {
          success: true,
          count: await prisma.attendanceLog.count(),
          sample: attendance[0] ? {
            employee: `${attendance[0].employee.employeeCode} - ${attendance[0].employee.firstName} ${attendance[0].employee.lastName}`,
            date: attendance[0].logDate.toISOString().split('T')[0],
            punchIn: attendance[0].punchIn?.toLocaleTimeString() || 'N/A',
            punchOut: attendance[0].punchOut?.toLocaleTimeString() || 'N/A',
            status: attendance[0].status,
            source: attendance[0].source,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Shifts',
    test: async () => {
      try {
        const shifts = await prisma.shift.findMany({ take: 3 })
        return {
          success: true,
          count: await prisma.shift.count(),
          sample: shifts[0] ? {
            name: shifts[0].name,
            type: shifts[0].type,
            startTime: shifts[0].startTime,
            endTime: shifts[0].endTime,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Shift Assignments',
    test: async () => {
      try {
        const assignments = await prisma.shiftAssignment.findMany({
          take: 3,
          include: {
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
            shift: {
              select: {
                name: true,
              },
            },
          },
        })
        return {
          success: true,
          count: await prisma.shiftAssignment.count(),
          sample: assignments[0] ? {
            employee: `${assignments[0].employee.employeeCode} - ${assignments[0].employee.firstName} ${assignments[0].employee.lastName}`,
            shift: assignments[0].shift.name,
            effectiveFrom: assignments[0].effectiveFrom.toISOString().split('T')[0],
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Payroll Runs',
    test: async () => {
      try {
        const runs = await prisma.payrollRun.findMany({ take: 3 })
        return {
          success: true,
          count: await prisma.payrollRun.count(),
          sample: runs[0] ? {
            name: runs[0].name,
            month: runs[0].month,
            year: runs[0].year,
            status: runs[0].status,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Payroll Items',
    test: async () => {
      try {
        const items = await prisma.payrollItem.findMany({
          take: 3,
          include: {
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
            payrollRun: {
              select: {
                name: true,
              },
            },
          },
        })
        return {
          success: true,
          count: await prisma.payrollItem.count(),
          sample: items[0] ? {
            employee: `${items[0].employee.employeeCode} - ${items[0].employee.firstName} ${items[0].employee.lastName}`,
            payrollRun: items[0].payrollRun.name,
            grossEarning: items[0].grossEarning.toString(),
            netPay: items[0].netPay.toString(),
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Salary Components',
    test: async () => {
      try {
        const components = await prisma.salaryComponent.findMany({ take: 3 })
        return {
          success: true,
          count: await prisma.salaryComponent.count(),
          sample: components[0] ? {
            name: components[0].name,
            code: components[0].code,
            type: components[0].type,
            defaultValue: components[0].defaultValue.toString(),
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Salary Structures',
    test: async () => {
      try {
        const structures = await prisma.salaryStructure.findMany({ take: 3 })
        return {
          success: true,
          count: await prisma.salaryStructure.count(),
          sample: structures[0] ? {
            name: structures[0].name,
            description: structures[0].description,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Biometric Raw Logs',
    test: async () => {
      try {
        const logs = await prisma.biometricRawLog.findMany({
          take: 3,
          orderBy: { punchDate: 'desc' },
        })
        return {
          success: true,
          count: await prisma.biometricRawLog.count(),
          sample: logs[0] ? {
            empCode: logs[0].empCode,
            name: logs[0].name,
            punchDate: logs[0].punchDate.toISOString(),
            processed: logs[0].processed,
            siteId: logs[0].siteId,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Biometric Sync Logs',
    test: async () => {
      try {
        const logs = await prisma.biometricSyncLog.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
        })
        return {
          success: true,
          count: await prisma.biometricSyncLog.count(),
          sample: logs[0] ? {
            siteId: logs[0].siteId,
            syncType: logs[0].syncType,
            recordsFetched: logs[0].recordsFetched,
            recordsProcessed: logs[0].recordsProcessed,
            status: logs[0].status,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
  {
    name: 'Branches',
    test: async () => {
      try {
        const branches = await prisma.branch.findMany({ take: 3 })
        return {
          success: true,
          count: await prisma.branch.count(),
          sample: branches[0] ? {
            name: branches[0].name,
            address: branches[0].address,
          } : null,
        }
      } catch (error) {
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  },
]

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║         HRMS MODULE DATA VERIFICATION TEST                     ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const results: Array<{ name: string; success: boolean; count: number; error?: string }> = []

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}...`.padEnd(40))
    
    const result = await test.test()
    results.push({ name: test.name, success: result.success, count: result.count, error: result.error })

    if (result.success) {
      console.log(`✓ ${result.count} records`)
      if (result.sample) {
        console.log(`  Sample:`, JSON.stringify(result.sample, null, 2).split('\n').join('\n  '))
      }
    } else {
      console.log(`✗ FAILED`)
      if (result.error) {
        console.log(`  Error: ${result.error}`)
      }
    }
    console.log()
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║                        SUMMARY                                 ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalRecords = results.reduce((sum, r) => sum + r.count, 0)

  console.log(`Total Modules Tested: ${tests.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total Records: ${totalRecords}`)

  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║                    MODULE BREAKDOWN                            ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  results.forEach(r => {
    const status = r.success ? '✓' : '✗'
    const countStr = r.count.toString().padStart(6)
    console.log(`${status} ${r.name.padEnd(25)} ${countStr} records`)
  })

  if (failed > 0) {
    console.log('\n⚠️  Some modules have issues. Check the errors above.')
    process.exit(1)
  } else {
    console.log('\n✓ All modules are working correctly!')
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Test suite failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
