import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Set ALL SE claims to Jan 15, 2026 (middle of Jan)
  const janDate = new Date(2026, 0, 15);
  const res = await p.finExpenseClaim.updateMany({
    where: { claimNo: { startsWith: 'SE/' } },
    data: { date: janDate },
  });
  console.log(`Updated ${res.count} claims to 2026-01-15`);

  // Verify
  const claims = await p.finExpenseClaim.findMany({
    where: { claimNo: { startsWith: 'SE/' } },
    select: { claimNo: true, date: true },
  });
  for (const c of claims) console.log(`  ${c.claimNo} → ${c.date?.toISOString().split('T')[0]}`);

  // Check Jan 2026 filter
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 0, 31, 23, 59, 59);
  const jan = await p.finExpenseClaim.findMany({ where: { date: { gte: start, lte: end }, claimNo: { startsWith: 'SE/' } } });
  console.log(`\nJan 2026 filter: ${jan.length} claims`);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
