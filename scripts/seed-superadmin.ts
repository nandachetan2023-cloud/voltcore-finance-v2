/**
 * Seed the erp_superadmin database with:
 *  1. SuperAdmin login (you)
 *  2. Voltcore tenant (admin DB)
 *  3. Upasana Associates tenant (demo DB)
 *  4. Migrate existing users from both DBs into TenantUser
 *
 * Run: bun scripts/seed-superadmin.ts
 */

import { PrismaClient as SuperAdminClient } from '@prisma/superadmin-client'
import { PrismaClient as MainClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const superadminDb = new SuperAdminClient({
  datasources: { db: { url: process.env.SUPERADMIN_DATABASE_URL } },
})

const adminDb = new MainClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

const demoDb = new MainClient({
  datasources: { db: { url: process.env.DEMO_DATABASE_URL } },
})

async function main() {
  console.log('🚀 Seeding erp_superadmin...\n')

  // ── 1. SuperAdmin user ──────────────────────────────────────
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
      },
    })
    console.log(`✅ SuperAdmin created: ${superAdminEmail} / ${superAdminPassword}`)
  } else {
    console.log(`ℹ️  SuperAdmin already exists: ${superAdminEmail}`)
  }

  // ── 2. Voltcore tenant (admin DB) ───────────────────────────
  let voltcore = await superadminDb.tenant.findUnique({ where: { slug: 'voltcore' } })
  if (!voltcore) {
    voltcore = await superadminDb.tenant.create({
      data: {
        name: 'Voltcore',
        slug: 'voltcore',
        dbUrl: process.env.DATABASE_URL!,
        status: 'active',
        notes: 'Main admin company',
      },
    })
    console.log(`✅ Tenant created: Voltcore (slug: voltcore)`)
  } else {
    console.log(`ℹ️  Tenant already exists: Voltcore`)
  }

  // ── 3. Upasana Associates tenant (demo DB) ──────────────────
  let upasana = await superadminDb.tenant.findUnique({ where: { slug: 'upasana' } })
  if (!upasana) {
    upasana = await superadminDb.tenant.create({
      data: {
        name: 'Upasana Associates',
        slug: 'upasana',
        dbUrl: process.env.DEMO_DATABASE_URL!,
        status: 'active',
        notes: 'Demo client',
      },
    })
    console.log(`✅ Tenant created: Upasana Associates (slug: upasana)`)
  } else {
    console.log(`ℹ️  Tenant already exists: Upasana Associates`)
  }

  // ── 4. Migrate Voltcore users ───────────────────────────────
  console.log('\n📦 Migrating Voltcore users...')
  try {
    const adminUsers = await adminDb.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, password: true, phone: true },
    })

    for (const u of adminUsers) {
      const exists = await superadminDb.tenantUser.findUnique({
        where: { tenantId_email: { tenantId: voltcore.id, email: u.email } },
      })
      if (!exists) {
        await superadminDb.tenantUser.create({
          data: {
            tenantId: voltcore.id,
            name: u.name,
            email: u.email,
            password: u.password, // already hashed
            phone: u.phone || '',
            allowedModules: 'all',
          },
        })
        console.log(`  ✅ Migrated: ${u.email} → Voltcore (all modules)`)
      } else {
        console.log(`  ℹ️  Already exists: ${u.email} in Voltcore`)
      }
    }
  } catch (e) {
    console.error('  ⚠️  Could not migrate Voltcore users:', e)
  }

  // ── 5. Migrate Upasana (demo) users ────────────────────────
  console.log('\n📦 Migrating Upasana users...')
  try {
    const demoUsers = await demoDb.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, password: true, phone: true },
    })

    for (const u of demoUsers) {
      const exists = await superadminDb.tenantUser.findUnique({
        where: { tenantId_email: { tenantId: upasana.id, email: u.email } },
      })
      if (!exists) {
        await superadminDb.tenantUser.create({
          data: {
            tenantId: upasana.id,
            name: u.name,
            email: u.email,
            password: u.password, // already hashed
            phone: u.phone || '',
            allowedModules: 'organization,hrms',
          },
        })
        console.log(`  ✅ Migrated: ${u.email} → Upasana (organization,hrms)`)
      } else {
        console.log(`  ℹ️  Already exists: ${u.email} in Upasana`)
      }
    }
  } catch (e) {
    console.error('  ⚠️  Could not migrate Upasana users:', e)
  }

  console.log('\n✅ Superadmin seed complete!')
  console.log('\n📋 Login credentials:')
  console.log(`   SuperAdmin : superadmin@voltcore.com / superadmin@123`)
  console.log(`   Voltcore   : (your existing admin email/password)`)
  console.log(`   Upasana    : admin@upasanaassociate.com / demo@1234`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => {
    await superadminDb.$disconnect()
    await adminDb.$disconnect()
    await demoDb.$disconnect()
  })
