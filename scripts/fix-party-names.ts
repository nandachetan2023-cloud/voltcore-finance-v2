import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const LOOKUP: Record<string, { name: string; shortName: string; partyType: string }> = {
  'L&T Construction': { name: 'L&T Construction', shortName: 'L&T', partyType: 'Customer' },
  'Siemens India Ltd': { name: 'Siemens India Ltd', shortName: 'Siemens', partyType: 'Vendor' },
  'Tata Projects': { name: 'Tata Projects', shortName: 'Tata Proj', partyType: 'Customer' },
  'NTPC Limited': { name: 'NTPC Limited', shortName: 'NTPC', partyType: 'Customer' },
  'Hindalco Industries Ltd': { name: 'Hindalco Industries Ltd', shortName: 'Hindalco', partyType: 'Vendor' },
  'BALCO Industries': { name: 'BALCO Industries', shortName: 'BALCO', partyType: 'Customer' },
  'Coal India Limited': { name: 'Coal India Limited', shortName: 'CIL', partyType: 'Customer' },
  'Ramesh Transport Services': { name: 'Ramesh Transport Services', shortName: 'Ramesh Trans', partyType: 'Vendor' },
  'Tata Steel Limited': { name: 'Tata Steel Limited', shortName: 'Tata Steel', partyType: 'Customer' },
  'Vedanta Limited': { name: 'Vedanta Limited', shortName: 'Vedanta', partyType: 'Vendor' },
  'Larsen & Toubro Ltd': { name: 'Larsen & Toubro Ltd', shortName: 'L&T', partyType: 'Customer' },
}

async function main() {
  console.log('Checking FinParty records for numeric/suspicious names...\n')

  const parties = await db.finParty.findMany({ orderBy: { name: 'asc' } })

  let numericCount = 0
  let fixedCount = 0
  let deletedCount = 0

  for (const p of parties) {
    const isNumeric = /^\d+\.?\d*$/.test(p.name.trim())
    const hasAmountPrefix = /^[₹Rs]/.test(p.name.trim())

    if (isNumeric || hasAmountPrefix) {
      console.log(`\n⚠️  Party ID=${p.id} name="${p.name}"`)
      console.log(`   GSTIN: ${p.gstin || '—'}, State: ${p.state || '—'}`)

      // Check if a known party exists with similar GSTIN or is referenced by invoices
      const invoiceCount = await db.finInvoice.count({ where: { partyId: p.id } })
      const adviceCount = await db.finPaymentAdvice.count({ where: { partyId: p.id } })

      console.log(`   Invoices: ${invoiceCount}, Payment Advices: ${adviceCount}`)

      // Try to find a proper party name via related invoices' client field
      if (invoiceCount > 0) {
        const sampleInvoice = await db.finInvoice.findFirst({
          where: { partyId: p.id },
          select: { client: true },
        })
        if (sampleInvoice?.client && !/^\d+\.?\d*$/.test(sampleInvoice.client)) {
          console.log(`   → Renaming to "${sampleInvoice.client}" (from invoice.client field)`)
          await db.finParty.update({
            where: { id: p.id },
            data: { name: sampleInvoice.client, shortName: null },
          })
          fixedCount++
          continue
        }
      }

      // Check if it matches any known lookup
      const match = Object.values(LOOKUP).find(l => l.name.toLowerCase().includes(p.name.toLowerCase()))
      if (match) {
        console.log(`   → Renaming to "${match.name}"`)
        await db.finParty.update({
          where: { id: p.id },
          data: { name: match.name, shortName: match.shortName, partyType: match.partyType },
        })
        fixedCount++
        continue
      }

      // If no references, delete the junk record
      if (invoiceCount === 0 && adviceCount === 0) {
        console.log(`   → Deleting (no references)`)
        try {
          await db.finParty.delete({ where: { id: p.id } })
          deletedCount++
        } catch (e) {
          console.log(`   → Could not delete: ${e}`)
        }
      } else {
        // Has references but can't auto-fix — rename to generic name
        const newName = `Imported Party ${p.id}`
        console.log(`   → Renaming to "${newName}"`)
        await db.finParty.update({
          where: { id: p.id },
          data: { name: newName },
        })
        fixedCount++
      }

      numericCount++
    }
  }

  console.log(`\n✅ Done. Fixed: ${fixedCount}, Deleted: ${deletedCount}, Remaining numeric: ${numericCount - fixedCount - deletedCount}`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
