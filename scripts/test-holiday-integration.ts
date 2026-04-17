#!/usr/bin/env tsx
/**
 * Test Holiday Integration
 * Tests the holiday service and validates integration across modules
 */

import { db } from '../src/lib/db'
import { 
  isHoliday, 
  getHolidaysInRange, 
  calculateWorkingDays,
  getHolidayDates 
} from '../src/lib/services/holiday-service'

async function testHolidayIntegration() {
  console.log('='.repeat(60))
  console.log('Holiday Integration Test')
  console.log('='.repeat(60))

  try {
    // Test 1: Check if a specific date is a holiday
    console.log('\n1. Testing isHoliday() function:')
    const testDate = '2026-08-15' // Independence Day
    const result = await isHoliday(testDate)
    console.log(`   Date: ${testDate}`)
    console.log(`   Is Holiday: ${result.isHoliday}`)
    if (result.holiday) {
      console.log(`   Holiday Name: ${result.holiday.name}`)
      console.log(`   Type: ${result.holiday.type}`)
    }

    // Test 2: Get holidays in a range
    console.log('\n2. Testing getHolidaysInRange() function:')
    const startDate = '2026-01-01'
    const endDate = '2026-12-31'
    const holidays = await getHolidaysInRange(startDate, endDate)
    console.log(`   Date Range: ${startDate} to ${endDate}`)
    console.log(`   Holidays Found: ${holidays.length}`)
    holidays.forEach(h => {
      console.log(`   - ${h.date.toISOString().split('T')[0]}: ${h.name} (${h.type})`)
    })

    // Test 3: Calculate working days
    console.log('\n3. Testing calculateWorkingDays() function:')
    const workStartDate = '2026-08-01'
    const workEndDate = '2026-08-31'
    const workingDays = await calculateWorkingDays(workStartDate, workEndDate)
    console.log(`   Date Range: ${workStartDate} to ${workEndDate}`)
    console.log(`   Working Days: ${workingDays}`)
    console.log(`   (Excludes weekends and holidays)`)

    // Test 4: Get holiday dates
    console.log('\n4. Testing getHolidayDates() function:')
    const holidayDates = await getHolidayDates('2026-08-01', '2026-08-31')
    console.log(`   Holiday Dates in August 2026:`)
    if (holidayDates.length > 0) {
      holidayDates.forEach(date => console.log(`   - ${date}`))
    } else {
      console.log(`   - No holidays found`)
    }

    // Test 5: Check database holiday count
    console.log('\n5. Database Holiday Statistics:')
    const totalHolidays = await db.holiday.count()
    const activeHolidays = await db.holiday.count({ where: { isActive: true } })
    const companyWide = await db.holiday.count({ 
      where: { isActive: true, branchId: null } 
    })
    const branchSpecific = await db.holiday.count({ 
      where: { isActive: true, branchId: { not: null } } 
    })
    
    console.log(`   Total Holidays: ${totalHolidays}`)
    console.log(`   Active Holidays: ${activeHolidays}`)
    console.log(`   Company-wide: ${companyWide}`)
    console.log(`   Branch-specific: ${branchSpecific}`)

    // Test 6: Upcoming holidays
    console.log('\n6. Upcoming Holidays (Next 90 days):')
    const today = new Date()
    const next90Days = new Date()
    next90Days.setDate(today.getDate() + 90)
    
    const upcomingHolidays = await getHolidaysInRange(
      today.toISOString().split('T')[0],
      next90Days.toISOString().split('T')[0]
    )
    
    if (upcomingHolidays.length > 0) {
      upcomingHolidays.forEach(h => {
        const daysUntil = Math.ceil(
          (h.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
        console.log(`   - ${h.date.toISOString().split('T')[0]}: ${h.name} (in ${daysUntil} days)`)
      })
    } else {
      console.log(`   - No upcoming holidays in the next 90 days`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Holiday Integration Test Completed Successfully')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Error during testing:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// Run the test
testHolidayIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })
