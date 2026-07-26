import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const kpis = await p.finExpenseClaim.aggregate({ _sum: { totalAmount: true, receivedAmount: true } });
  const count = await p.finExpenseClaim.count();
  const pending = await p.finExpenseClaim.count({ where: { status: { in: ['Pending', 'Submitted'] } } });
  const approved = await p.finExpenseClaim.count({ where: { status: { in: ['Approved', 'Paid'] } } });
  console.log('claims:', count, 'sum:', kpis._sum, 'pending:', pending, 'approved:', approved);

  const jan = await p.finExpenseClaim.findMany({ where: { date: { gte: new Date(2026,0,1), lte: new Date(2026,0,31,23,59,59) } } });
  console.log('jan claims:', jan.length);
  for (const c of jan) console.log('  ' + c.claimNo, c.date?.toISOString().split('T')[0], c.expenseType, c.totalAmount);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
