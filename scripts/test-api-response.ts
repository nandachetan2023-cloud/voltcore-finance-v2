#!/usr/bin/env tsx
import { db } from '../src/lib/db'

async function testAPIResponse() {
  try {
    // Simulate what the API returns
    const where = { isDeleted: false }
    
    const employees = await db.employee.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        employmentStatus: true,
        isDeleted: true,
      },
      take: 1000,
    })
    
    console.log(`API would return ${employees.length} employees`)
    console.log('\nBreakdown by status:')
    const statusCounts = employees.reduce((acc, emp) => {
      acc[emp.employmentStatus] = (acc[emp.employmentStatus] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

testAPIResponse()
