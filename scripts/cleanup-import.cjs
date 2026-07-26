const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.finExpenseClaim.findMany({ where: { siteId: 5, remarks: { startsWith: 'Imported from Jan 2026' } }, select: { id: true, claimNo: true, expenseType: true } }).then(async claims => {
  console.log(`Found ${claims.length} claims to delete:`);
  for (const c of claims) console.log(`  ${c.claimNo} — ${c.expenseType}`);
  for (const c of claims) {
    await db.finExpenseItem.deleteMany({ where: { claimId: c.id } });
    await db.finExpenseClaim.delete({ where: { id: c.id } });
  }
  console.log('Deleted.');
  await db.$disconnect();
}).catch(e => { console.error(e.message); db.$disconnect(); });
