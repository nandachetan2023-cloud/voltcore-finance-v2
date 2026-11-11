// Backfills the contractor master fields the Contractors Management wizard
// captures (code, type, legal name, tax ids, location, banking, terms) onto
// contractors that already exist in the database.
//
// A fresh `prisma/seed.ts` already includes them; this script is for an
// existing database, so the master is complete without a destructive reseed.
//
// Safe & idempotent — it only fills fields that are still empty, and never
// overwrites a value someone has already edited.
//
//   npx tsx scripts/backfill-contractor-master.ts
import { PrismaClient } from '@prisma/client'
import { VENDOR_DETAILS } from '../prisma/vendor-master-data'

async function main() {
  const db = new PrismaClient()

  const vendors = await db.finVendor.findMany()
  let touched = 0

  for (const v of vendors) {
    const details = VENDOR_DETAILS[v.name]
    if (!details) continue

    const data: Record<string, any> = {}
    for (const [key, value] of Object.entries(details)) {
      const current = (v as any)[key]
      // 'Contractor' is the column default, so it cannot be told apart from
      // "never set" — treat it as empty for these known seeded contractors.
      const isDefaultType = key === 'vendorType' && current === 'Contractor';
      if (isDefaultType || current === null || current === undefined || current === '') data[key] = value
    }
    if (!Object.keys(data).length) continue

    await db.finVendor.update({ where: { id: v.id }, data })
    touched++
    console.log(`✓ ${v.name} — filled ${Object.keys(data).length} field(s)`)
  }

  console.log(`\nDone. ${touched} contractor(s) updated out of ${vendors.length}.`)
  await db.$disconnect()
}

main().catch(async (e) => { console.error(e); process.exit(1) })
