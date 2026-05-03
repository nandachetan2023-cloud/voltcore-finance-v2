/**
 * Minimal seed script for superadmin database only.
 * Creates the superadmin login account.
 * Everything else (tenants, users, etc.) is managed through the superadmin UI.
 * 
 * Run: bun run db:seed
 */

import { PrismaClient as SuperAdminClient } from '@prisma/superadmin-client'
import bcrypt from 'bcryptjs'

const superadminDb = new SuperAdminClient({
  datasources: { db: { url: process.env.SUPERADMIN_DATABASE_URL } },
})

async function main() {
  console.log('🌱 Seeding superadmin database...\n')

  // Create the superadmin login account
  const superAdminEmail = 'superadmin@voltcore.com'
  const superAdminPassword = 'superadmin@123'

  const existingSA = await superadminDb.superAdminUser.findUnique({
    where: { email: superAdminEmail },
  })

  if (!existingSA) {
    const hash = await bcrypt.hash(superAdminPassword, 12)
    await superadminDb.superAdminUser.create({
      data: {
        email: superAdminEmail,
        password: hash,
        name: 'Super Admin',
        isActive: true,
      },
    })
    console.log('✅ SuperAdmin account created')
    console.log(`   Email:    ${superAdminEmail}`)
    console.log(`   Password: ${superAdminPassword}`)
  } else {
    console.log('ℹ️  SuperAdmin account already exists')
    console.log(`   Email:    ${superAdminEmail}`)
    console.log(`   Password: ${superAdminPassword}`)
  }

  console.log('\n🎉 Seed complete!')
  console.log('\n📋 Next steps:')
  console.log('   1. Login at /superadmin with the credentials above')
  console.log('   2. Create tenants (companies) from the superadmin dashboard')
  console.log('   3. Create users for each tenant')
  console.log('   4. Assign roles and modules to users')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await superadminDb.$disconnect()
  })
