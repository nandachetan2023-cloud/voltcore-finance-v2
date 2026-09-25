import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  console.log('=== Expense Claims (SE/) ===');
  const claims = await p.finExpenseClaim.findMany({ where: { claimNo: { startsWith: 'SE/' } }, select: { id: true, claimNo: true, siteId: true, expenseType: true, submittedBy: true, date: true, receivedAmount: true, totalAmount: true, status: true } });
  let totalReceived = 0, totalIncurred = 0;
  for (const c of claims) {
    const items = await p.finExpenseItem.count({ where: { claimId: c.id } });
    console.log('  ' + c.claimNo + ' | ' + c.expenseType + ' | items=' + items + ' | recv=' + c.receivedAmount + ' | inc=' + c.totalAmount + ' | status=' + c.status);
    totalReceived += c.receivedAmount;
    totalIncurred += c.totalAmount;
  }
  console.log('Total SE: received=' + totalReceived + ', incurred=' + totalIncurred);

  console.log('\n=== Expense Claims (HO/) ===');
  const ho = await p.finExpenseClaim.findMany({ where: { claimNo: { startsWith: 'HO' } }, select: { id: true, claimNo: true, totalAmount: true, status: true } });
  for (const c of ho) {
    const items = await p.finExpenseItem.count({ where: { claimId: c.id } });
    console.log('  ' + c.claimNo + ' | items=' + items + ' | total=' + c.totalAmount);
  }

  console.log('\n=== Dashboard KPIs ===');
  const allClaims = await p.finExpenseClaim.findMany();
  console.log('Total claims: ' + allClaims.length);
  console.log('Total expense (sum totalAmount): ' + allClaims.reduce((s, c) => s + (c.totalAmount || 0), 0));
  console.log('Pending claims: ' + allClaims.filter(c => c.status === 'Pending').length);
  console.log('Approved claims: ' + allClaims.filter(c => c.status === 'Approved').length);

  console.log('\n=== Sites ===');
  const sites = await p.finSite.findMany({ where: { status: 'Active' }, select: { id: true, name: true, siteCode: true } });
  for (const s of sites) console.log('  ' + s.id + ': ' + s.name + ' (' + s.siteCode + ')');

  console.log('\n=== Bank Accounts ===');
  const banks = await p.bankAccount.findMany({ select: { accountName: true, balance: true } });
  let totalBal = 0;
  for (const b of banks) { console.log('  ' + b.accountName + ': ' + b.balance); totalBal += b.balance; }
  console.log('Total bank balance: ' + totalBal);

  console.log('\n=== AR/AP ===');
  const ar = await p.accountsReceivable.findMany({ select: { invoiceNo: true, client: true, totalAmount: true, status: true } });
  console.log('AR records: ' + ar.length + ', total: ' + ar.reduce((s, r) => s + r.totalAmount, 0));
  const ap = await p.accountsPayable.findMany({ select: { billNo: true, vendor: true, totalAmount: true, status: true } });
  console.log('AP records: ' + ap.length + ', total: ' + ap.reduce((s, r) => s + r.totalAmount, 0));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
