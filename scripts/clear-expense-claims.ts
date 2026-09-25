import { PrismaClient } from '@prisma/client'

async function main() {
  const pdb = new PrismaClient()
  const before = await pdb.finExpenseClaim.count()
  console.log('Before:', before, 'claims')
  const delItems = await pdb.finExpenseItem.deleteMany()
  const delClaims = await pdb.finExpenseClaim.deleteMany()
  const after = await pdb.finExpenseClaim.count()
  console.log(`Deleted ${delItems.count} items, ${delClaims.count} claims. Remaining: ${after}`)
  await pdb.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
