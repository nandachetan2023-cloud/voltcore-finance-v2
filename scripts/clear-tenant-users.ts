#!/usr/bin/env tsx
import { superadminDb } from '../src/lib/superadmin-db'

const TENANT_SLUG = 'ua'

async function main() {
  const tenant = await superadminDb.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) {
    console.error(`Tenant with slug "${TENANT_SLUG}" not found`)
    process.exit(1)
  }

  console.log(`Found tenant: ${tenant.name} (id: ${tenant.id})`)

  const users = await superadminDb.tenantUser.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, email: true, createdBySuperadmin: true },
  })

  const toDelete = users.filter(u => !u.createdBySuperadmin)
  const toKeep = users.filter(u => u.createdBySuperadmin)

  console.log(`Total users for tenant: ${users.length}`)
  console.log(`Will delete ${toDelete.length} user(s):`)
  toDelete.forEach(u => console.log(`  - ${u.name} (${u.email})`))
  console.log(`Will keep ${toKeep.length} superadmin-created user(s):`)
  toKeep.forEach(u => console.log(`  - ${u.name} (${u.email})`))

  if (toDelete.length === 0) {
    console.log('No users to delete.')
    return
  }

  const result = await superadminDb.tenantUser.deleteMany({
    where: {
      tenantId: tenant.id,
      createdBySuperadmin: false,
    },
  })

  console.log(`Deleted ${result.count} user(s) for tenant "${TENANT_SLUG}".`)
}

main()
  .catch(console.error)
  .finally(() => superadminDb.$disconnect())
