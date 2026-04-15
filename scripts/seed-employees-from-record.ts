import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting employee seed from emp_record.md...')

  // Read the emp_record.md file
  const recordPath = path.join(process.cwd(), 'excels', 'emp_record.md')
  const content = fs.readFileSync(recordPath, 'utf-8')

  // Parse employee records (format: 0002 - Dipak kumar roul)
  const employeeLines = content
    .split('\n')
    .filter(line => line.trim().length > 0 && /^\d{4}/.test(line.trim()))
    .map(line => {
      const trimmed = line.trim()
      const match = trimmed.match(/^(\d{4})\s*-\s*(.+)$/)
      if (match) {
        return {
          code: match[1],
          name: match[2].trim(),
        }
      }
      return null
    })
    .filter(Boolean) as Array<{ code: string; name: string }>

  console.log(`Found ${employeeLines.length} employees in emp_record.md`)
  if (employeeLines.length > 0) {
    console.log('Sample:', employeeLines[0])
  }

  // Get or create default department, designation, and branch
  let department = await prisma.department.findFirst()
  if (!department) {
    console.log('Creating default department...')
    department = await prisma.department.create({
      data: {
        name: 'General',
        code: 'GEN',
        description: 'General Department',
      },
    })
  }

  let designation = await prisma.designation.findFirst()
  if (!designation) {
    console.log('Creating default designation...')
    designation = await prisma.designation.create({
      data: {
        name: 'Worker',
        description: 'General Worker',
      },
    })
  }

  let branch = await prisma.branch.findFirst()
  if (!branch) {
    console.log('Creating default branch...')
    branch = await prisma.branch.create({
      data: {
        name: 'Main Branch',
        code: 'MAIN',
        address: 'Main Office',
        city: 'City',
        state: 'State',
        pincode: '000000',
      },
    })
  }

  console.log(`Using Department: ${department.name}, Designation: ${designation.name}, Branch: ${branch.name}`)

  // Check existing employees
  const existingEmployees = await prisma.employee.findMany({
    select: { employeeCode: true },
  })
  const existingCodes = new Set(existingEmployees.map(e => e.employeeCode))

  let created = 0
  let skipped = 0

  // Create employees
  for (const emp of employeeLines) {
    const empCodeWithPrefix = `EMP${emp.code}` // Add EMP prefix
    
    if (existingCodes.has(empCodeWithPrefix)) {
      console.log(`Skipping ${empCodeWithPrefix} - ${emp.name} (already exists)`)
      skipped++
      continue
    }

    try {
      // Parse name
      const nameParts = emp.name.split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0]
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null

      // Generate email
      const email = `${emp.code}@company.com`

      // Create employee
      await prisma.employee.create({
        data: {
          employeeCode: empCodeWithPrefix, // Use EMP prefix
          firstName,
          middleName,
          lastName,
          email,
          phone: '0000000000', // Placeholder
          dateOfBirth: new Date('1990-01-01'), // Placeholder
          gender: 'male',
          currentAddress: 'Address',
          currentCity: 'City',
          currentState: 'State',
          currentPincode: '000000',
          departmentId: department.id,
          designationId: designation.id,
          branchId: branch.id,
          dateOfJoining: new Date('2020-01-01'), // Placeholder
          employmentType: 'permanent',
          employmentStatus: 'active',
          isActive: true,
          isDeleted: false,
        },
      })

      console.log(`✓ Created ${empCodeWithPrefix} - ${emp.name}`)
      created++
    } catch (error) {
      console.error(`✗ Failed to create ${empCodeWithPrefix} - ${emp.name}:`, error)
    }
  }

  console.log('\n=== Seed Summary ===')
  console.log(`Total employees in file: ${employeeLines.length}`)
  console.log(`Created: ${created}`)
  console.log(`Skipped (already exist): ${skipped}`)
  console.log(`Failed: ${employeeLines.length - created - skipped}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
