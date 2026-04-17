#!/usr/bin/env tsx
import { calculateWorkingDays, getHolidaysInRange } from '../src/lib/services/holiday-service'
import { db } from '../src/lib/db'

async function testWorkingDays() {
  console.log('Testing Working Days Calculation')
  console.log('='.repeat(60))
  
  const startDate = '2026-04-17'
  const endDate = '2026-04-23'
  
  console.log(`\nDate Range: ${startDate} to ${endDate}`)
  console.log('\nBreakdown:')
  console.log('  April 17 (Thu) - Working day')
  console.log('  April 18 (Fri) - Working day')
  console.log('  April 19 (Sat) - Weekend')
  console.log('  April 20 (Sun) - Weekend')
  console.log('  April 21 (Mon) - Eid ul-Fitr (Holiday)')
  console.log('  April 22 (Tue) - Working day')
  console.log('  April 23 (Wed) - Working day')
  console.log('\nExpected: 4 working days')
  
  // Check holidays
  const holidays = await getHolidaysInRange(startDate, endDate)
  console.log(`\nHolidays found: ${holidays.length}`)
  holidays.forEach(h => {
    console.log(`  - ${h.date.toISOString().split('T')[0]}: ${h.name}`)
  })
  
  // Calculate working days
  const workingDays = await calculateWorkingDays(startDate, endDate)
  console.log(`\nCalculated working days: ${workingDays}`)
  
  if (workingDays === 4) {
    console.log('✅ CORRECT')
  } else {
    console.log(`❌ INCORRECT - Expected 4, got ${workingDays}`)
  }
  
  // Manual calculation
  console.log('\nManual verification:')
  const start = new Date(startDate)
  const end = new Date(endDate)
  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]))
  
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = holidayDates.has(dateStr)
    const isWorking = !isWeekend && !isHoliday
    
    console.log(`  ${dateStr} (${dayName}): ${isWeekend ? 'Weekend' : isHoliday ? 'Holiday' : 'Working'} ${isWorking ? '✓' : ''}`)
    
    if (isWorking) count++
    current.setDate(current.getDate() + 1)
  }
  
  console.log(`\nManual count: ${count}`)
  
  await db.$disconnect()
}

testWorkingDays()
