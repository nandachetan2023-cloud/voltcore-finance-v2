import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding EMP prefix to employee codes...')

  // Get all employees
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
    },
  })

  console.log(`Found ${employees.length} employees`)

  let updated = 0
  let skipped = 0

  for (const employee of employees) {
    // Skip if already has EMP prefix
    if (employee.employeeCode.startsWith('EMP')) {
      console.log(`Skipping ${employee.employeeCode} (already has EMP prefix)`)
      skipped++
      continue
    }

    try {
      const newCode = `EMP${employee.employeeCode}`
      
      await prisma.employee.update({
        where: { id: employee.id },
        data: { employeeCode: newCode },
      })

      console.log(`✓ Updated ${employee.employeeCode} → ${newCode}`)
      updated++
    } catch (error) {
      console.error(`✗ Failed to update ${employee.employeeCode}:`, error)
    }
  }

  console.log('\n=== Update Summary ===')
  console.log(`Total employees: ${employees.length}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped (already have EMP): ${skipped}`)
  console.log(`Failed: ${employees.length - updated - skipped}`)
}

main()
  .catch((e) => {
    console.error('Update failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
