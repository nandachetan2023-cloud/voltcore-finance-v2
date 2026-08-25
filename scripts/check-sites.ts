import { PrismaClient } from '@prisma/client'

async function main() {
  const pdb = new PrismaClient()
  const sites = await pdb.finSite.findMany({ select: { id: true, name: true, siteCode: true }, take: 10 })
  console.log('Sites:', JSON.stringify(sites, null, 2))
  await pdb.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
