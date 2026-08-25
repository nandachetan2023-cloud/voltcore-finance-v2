import { PrismaClient } from '@prisma/client'

async function main() {
  const pdb = new PrismaClient()
  const claims = await pdb.finExpenseClaim.findMany({
    orderBy: { id: 'asc' },
    include: { items: true, site: { select: { name: true } } },
  })
  console.log('Total claims:', claims.length)
  for (const c of claims) {
    console.log(`  ${c.claimNo} | ${c.date?.toISOString().slice(0,10)} | ${c.site?.name} | ${c.expenseType} | ₹${c.totalAmount} | items:${c.items.length} | status:${c.status}`)
  }
  await pdb.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
