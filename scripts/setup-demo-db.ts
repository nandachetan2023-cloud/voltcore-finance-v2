/**
 * Setup Demo Database
 *
 * This script creates the demo database and seeds it with a demo user.
 * Run with: npx ts-node scripts/setup-demo-db.ts
 * Or with bun: bun scripts/setup-demo-db.ts
 *
 * Prerequisites:
 *   - DEMO_DATABASE_URL must be set in .env
 *   - The demo database (erp_demo) must already exist in PostgreSQL
 *     CREATE DATABASE erp_demo;
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const demoDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DEMO_DATABASE_URL,
    },
  },
})

async function main() {
  console.log('🚀 Setting up demo database...\n')

  // Check connection
  try {
    await demoDb.$connect()
    console.log('✅ Connected to demo database:', process.env.DEMO_DATABASE_URL?.replace(/:[^:@]+@/, ':***@'))
  } catch (err) {
    console.error('❌ Failed to connect to demo database.')
    console.error('   Make sure DEMO_DATABASE_URL is set in .env and the database exists.')
    console.error('   Run in psql: CREATE DATABASE erp_demo;')
    process.exit(1)
  }

  // Create demo user
  const demoEmail = 'admin@upasanaassociate.com'
  const demoPassword = 'demo@1234'

  const existing = await demoDb.user.findUnique({ where: { email: demoEmail } })

  if (existing) {
    console.log(`ℹ️  Demo user already exists: ${demoEmail}`)
  } else {
    const hashedPassword = await bcrypt.hash(demoPassword, 12)
    const user = await demoDb.user.create({
      data: {
        name: 'Demo User',
        email: demoEmail,
        password: hashedPassword,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    console.log(`✅ Demo user created:`)
    console.log(`   ID    : ${user.id}`)
    console.log(`   Name  : ${user.name}`)
    console.log(`   Email : ${user.email}`)
    console.log(`   Pass  : ${demoPassword}`)
  }

  console.log('\n📋 Demo user access:')
  console.log('   Modules : Organization, HRMS')
  console.log('   Database: erp_demo (isolated from admin data)')
  console.log('\n✅ Demo database setup complete!')
}

main()
  .catch((e) => {
    console.error('Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await demoDb.$disconnect()
  })
