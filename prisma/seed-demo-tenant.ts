// Demo tenant seeder — additive, safe to run. Creates demo-erp tenant + demo logins.
// Run: bun run prisma/seed-demo-tenant.ts  (or: npx tsx prisma/seed-demo-tenant.ts)
// After you add tenantId to models, extend this to seed demo data with tenantId.
// Reference pattern from EduCore Tenant/Plan/Subscription.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DEMO_SLUG = process.env.DEMO_TENANT_SLUG || 'demo-erp'

async function main() {
  console.log(`Seeding demo tenant: ${DEMO_SLUG} ...`)

  // 1. Tenant upsert — works once Tenant model is added to schema.prisma
  try {
    const tenant = await (prisma as any).tenant.upsert({
      where: { slug: DEMO_SLUG },
      update: {},
      create: {
        slug: DEMO_SLUG,
        name: 'Demo Construction Co (SaaS Trial)',
        plan: 'trial',
        status: 'active',
      },
    })
    console.log('Tenant:', tenant.slug)

    await (prisma as any).subscription.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        plan: 'trial',
        seats: 10,
        status: 'trialing',
      },
    })
    console.log('Subscription: trial / 10 seats')
  } catch (e: any) {
    console.log('NOTE: Tenant model not yet migrated. Run: npx prisma migrate dev --name add-tenancy')
    console.log('Skip reason:', e?.message?.slice(0, 200))
    return
  }

  console.log('Next: run existing seed (prisma/seed.ts) then backfill tenantId:')
  console.log(`  UPDATE Employee SET tenantId=(SELECT id FROM Tenant WHERE slug='${DEMO_SLUG}') WHERE tenantId IS NULL;`)
  console.log('Demo logins to publish on /pricing + /login:')
  console.log('  admin@demo.in / admin123 (admin)')
  console.log('  manager@demo.in / manager123 (manager)')
  console.log('  staff@demo.in / staff123 (staff)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
