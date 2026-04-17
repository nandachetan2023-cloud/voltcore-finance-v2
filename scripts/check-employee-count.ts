#!/usr/bin/env tsx
import { db } from '../src/lib/db'

async function checkEmployeeCount() {
  try {
    const totalCount = await db.employee.count()
    const activeCount = await db.employee.count({ where: { isDeleted: false } })
    const deletedCount = await db.employee.count({ where: { isDeleted: true } })
    
    console.log('Employee Count Analysis:')
    console.log('========================')
    console.log(`Total employees in DB: ${totalCount}`)
    console.log(`Active employees (isDeleted=false): ${activeCount}`)
    console.log(`Soft-deleted employees (isDeleted=true): ${deletedCount}`)
    
    if (deletedCount > 0) {
      console.log('\nSoft-deleted employees:')
      const deleted = await db.employee.findMany({
        where: { isDeleted: true },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          updatedAt: true
        }
      })
      deleted.forEach(emp => {
        console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${emp.email}) - deleted on ${emp.updatedAt}`)
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkEmployeeCount()
