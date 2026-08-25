import { PrismaClient } from '@prisma/client'

async function main() {
  const pdb = new PrismaClient()
  const claims = await pdb.finExpenseClaim.findMany({ select: { id: true, claimNo: true } })
  const items = await pdb.finExpenseItem.count()
  console.log('Claims:', JSON.stringify(claims))
  console.log('Items count:', items)
  await pdb.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
