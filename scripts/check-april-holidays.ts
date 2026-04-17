#!/usr/bin/env tsx
import { db } from '../src/lib/db'

async function checkAprilHolidays() {
  const holidays = await db.Holiday.findMany({
    where: {
      isActive: true,
      date: {
        gte: new Date('2026-04-01'),
        lte: new Date('2026-04-30'),
      }
    },
    orderBy: { date: 'asc' }
  })
  
  console.log('Holidays in April 2026:')
  console.log('======================')
  if (holidays.length === 0) {
    console.log('No holidays found')
  } else {
    holidays.forEach(h => {
      console.log(`${h.date.toISOString().split('T')[0]}: ${h.name}`)
    })
  }
  
  await db.$disconnect()
}

checkAprilHolidays()
