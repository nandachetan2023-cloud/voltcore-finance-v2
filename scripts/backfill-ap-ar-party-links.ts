import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Backfills the siteId/partyId/poId foreign keys added to AccountsPayable and
// AccountsReceivable onto existing rows, by matching their legacy free-text
// vendor/client strings against FinParty.name (case-insensitive, trimmed).
// Legacy free-text fields (vendor, vendorCode, client, clientCode) are left
// untouched — this only fills in the new FK columns where a confident match
// is found, so existing UI relying on the free-text fields keeps working.
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  const parties = await db.finParty.findMany()
  const byName = new Map(parties.map((p) => [normalize(p.name), p]))
  const byShortName = new Map(
    parties.filter((p) => p.shortName).map((p) => [normalize(p.shortName as string), p])
  )

  function matchParty(freeText: string) {
    const key = normalize(freeText)
    return byName.get(key) || byShortName.get(key) || null
  }

  console.log('── Backfilling AccountsPayable.partyId ──')
  const payables = await db.accountsPayable.findMany({ where: { partyId: null } })
  let apMatched = 0
  for (const bill of payables) {
    const match = matchParty(bill.vendor)
    if (match) {
      await db.accountsPayable.update({ where: { id: bill.id }, data: { partyId: match.id } })
      apMatched++
    }
  }
  console.log(`  ${apMatched} matched / ${payables.length - apMatched} unmatched (of ${payables.length} rows without a partyId)`)

  console.log('── Backfilling AccountsReceivable.partyId ──')
  const receivables = await db.accountsReceivable.findMany({ where: { partyId: null } })
  let arMatched = 0
  for (const inv of receivables) {
    const match = matchParty(inv.client)
    if (match) {
      await db.accountsReceivable.update({ where: { id: inv.id }, data: { partyId: match.id } })
      arMatched++
    }
  }
  console.log(`  ${arMatched} matched / ${receivables.length - arMatched} unmatched (of ${receivables.length} rows without a partyId)`)

  console.log('\nNote: siteId and poId are not backfilled here — AccountsPayable/AccountsReceivable')
  console.log('store no free-text site or PO reference reliable enough to auto-match; set those')
  console.log('going forward via the updated form dropdowns.')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
