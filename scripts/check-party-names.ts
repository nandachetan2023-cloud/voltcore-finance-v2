import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Checking FinParty records for numeric names...\n')

  const parties = await db.finParty.findMany({ orderBy: { name: 'asc' } })

  let numericCount = 0
  let suspiciousCount = 0

  for (const p of parties) {
    const isNumeric = /^\d+$/.test(p.name)
    const hasAmount = /^[₹₹]?\s*[\d,]+\.?\d*$/.test(p.name)
    const isShort = p.name.length <= 3

    if (isNumeric || hasAmount) {
      console.log(`⚠️  Party ID=${p.id}: name="${p.name}" ${isNumeric ? '(all digits)' : '(looks like amount)'}`)
      numericCount++
    } else if (isShort) {
      console.log(`❓ Party ID=${p.id}: name="${p.name}" (very short name)`)
      suspiciousCount++
    }
  }

  if (numericCount === 0 && suspiciousCount === 0) {
    console.log('✅ All party names look valid (non-numeric).')
  } else {
    console.log(`\nFound ${numericCount} numeric-looking name(s), ${suspiciousCount} short name(s).`)
    console.log('If these are wrong, you can delete them via the UI or update them via the API.')
  }

  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
