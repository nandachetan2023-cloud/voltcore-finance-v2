import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Check dates of all SE claims
  const claims = await p.finExpenseClaim.findMany({ where: { claimNo: { startsWith: 'SE/' } }, select: { claimNo: true, date: true, expenseType: true } });
  console.log('=== SE claim dates ===');
  for (const c of claims) {
    const d = c.date;
    console.log('  ' + c.claimNo + ' | date=' + (d ? d.toISOString() : 'null') + ' | type=' + c.expenseType);
  }

  // Check what the GET API would return for July 2026 (current month)
  const start = new Date(2026, 6, 1); // July 2026
  const end = new Date(2026, 7, 0); // Last day of July
  console.log('\n=== July 2026 filter ===');
  console.log('Start:', start.toISOString(), 'End:', end.toISOString());
  const july = await p.finExpenseClaim.findMany({ where: { date: { gte: start, lte: end }, claimNo: { startsWith: 'SE/' } } });
  console.log('July claims:', july.length);

  // Check all dates regardless of filter
  const all = await p.finExpenseClaim.findMany({ where: { claimNo: { startsWith: 'SE/' } } });
  console.log('Total SE claims:', all.length);
  console.log('With date:', all.filter(c => c.date).length);
  console.log('Without date:', all.filter(c => !c.date).length);

  // Check if any claims have dates in 2026 (Jan-Dec)
  const dates = all.map(c => c.date ? c.date.toISOString().split('T')[0] : 'null');
  console.log('Dates:', [...new Set(dates)].sort());

  // Dashboard KPI - totalExpenseClaims
  console.log('\n=== Dashboard would show ===');
  const totalExpense = all.reduce((s, c) => s + (c.totalAmount || 0), 0);
  console.log('Total expense claims amount:', totalExpense);
  console.log('Pending:', all.filter(c => c.status === 'Pending').length);
  console.log('Draft:', all.filter(c => c.status === 'Draft').length);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
