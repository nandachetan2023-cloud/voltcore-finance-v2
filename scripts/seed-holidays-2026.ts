#!/usr/bin/env tsx
/**
 * Seed Holidays for 2026
 * Creates common Indian public holidays for testing
 */

import { db } from '../src/lib/db'

const holidays2026 = [
  {
    name: 'Republic Day',
    date: new Date('2026-01-26'),
    type: 'public',
    description: 'National Holiday - Republic Day of India',
    isRecurring: true,
  },
  {
    name: 'Holi',
    date: new Date('2026-03-14'),
    type: 'public',
    description: 'Festival of Colors',
    isRecurring: true,
  },
  {
    name: 'Good Friday',
    date: new Date('2026-04-03'),
    type: 'public',
    description: 'Christian Holiday',
    isRecurring: true,
  },
  {
    name: 'Eid ul-Fitr',
    date: new Date('2026-04-21'),
    type: 'public',
    description: 'Islamic Festival',
    isRecurring: true,
  },
  {
    name: 'Independence Day',
    date: new Date('2026-08-15'),
    type: 'public',
    description: 'National Holiday - Independence Day of India',
    isRecurring: true,
  },
  {
    name: 'Janmashtami',
    date: new Date('2026-08-31'),
    type: 'public',
    description: 'Birth of Lord Krishna',
    isRecurring: true,
  },
  {
    name: 'Gandhi Jayanti',
    date: new Date('2026-10-02'),
    type: 'public',
    description: 'National Holiday - Birth Anniversary of Mahatma Gandhi',
    isRecurring: true,
  },
  {
    name: 'Dussehra',
    date: new Date('2026-10-22'),
    type: 'public',
    description: 'Victory of Good over Evil',
    isRecurring: true,
  },
  {
    name: 'Diwali',
    date: new Date('2026-11-05'),
    type: 'public',
    description: 'Festival of Lights',
    isRecurring: true,
  },
  {
    name: 'Diwali Holiday',
    date: new Date('2026-11-06'),
    type: 'public',
    description: 'Day after Diwali',
    isRecurring: true,
  },
  {
    name: 'Christmas',
    date: new Date('2026-12-25'),
    type: 'public',
    description: 'Christian Holiday - Birth of Jesus Christ',
    isRecurring: true,
  },
]

async function seedHolidays() {
  console.log('='.repeat(60))
  console.log('Seeding Holidays for 2026')
  console.log('='.repeat(60))

  try {
    let created = 0
    let skipped = 0

    for (const holiday of holidays2026) {
      // Check if holiday already exists
      const existing = await db.Holiday.findFirst({
        where: {
          name: holiday.name,
          date: holiday.date,
        },
      })

      if (existing) {
        console.log(`⏭️  Skipped: ${holiday.name} (${holiday.date.toISOString().split('T')[0]}) - Already exists`)
        skipped++
        continue
      }

      await db.Holiday.create({
        data: {
          ...holiday,
          applicableTo: 'all',
          branchId: null, // Company-wide holiday
          isActive: true,
          updatedAt: new Date(),
        },
      })

      console.log(`✅ Created: ${holiday.name} (${holiday.date.toISOString().split('T')[0]})`)
      created++
    }

    console.log('\n' + '='.repeat(60))
    console.log(`Summary:`)
    console.log(`  Created: ${created}`)
    console.log(`  Skipped: ${skipped}`)
    console.log(`  Total: ${holidays2026.length}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error seeding holidays:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

seedHolidays()
  .then(() => {
    console.log('\n✅ Holiday seeding completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Holiday seeding failed:', error)
    process.exit(1)
  })
