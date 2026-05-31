import { PrismaClient } from '@prisma/client'

function safeDbNameFromUrl(url: string) {
  try {
    const u = new URL(url.replace(/^postgresql:\/\//, 'postgres://'))
    const dbName = (u.pathname || '').replace(/^\//, '')
    return dbName || '(unknown)'
  } catch {
    return '(unknown)'
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set. Refusing to run purge.')
  }

  const dbName = safeDbNameFromUrl(dbUrl)
  if (dbName !== 'erp_finance_dev') {
    throw new Error(`Refusing to purge: DATABASE_URL points to "${dbName}", expected "erp_finance_dev".`)
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

  try {
    const results: Record<string, number> = {}

    async function safeDeleteMany(
      name: string,
      fn: () => Promise<{ count: number }>,
    ): Promise<void> {
      try {
        const { count } = await fn()
        results[name] = count
      } catch (err: any) {
        // If the table doesn't exist in this DB (migrations not applied), skip.
        if (err?.code === 'P2021') {
          results[name] = 0
          return
        }
        throw err
      }
    }

    // Delete in FK-safe order (children first)
    await safeDeleteMany('FinAlert', () => prisma.finAlert.deleteMany())
    await safeDeleteMany('FinCreditNote', () => prisma.finCreditNote.deleteMany())
    await safeDeleteMany('FinPOItem', () => prisma.finPOItem.deleteMany())
    await safeDeleteMany('FinPaymentAdviceLine', () => prisma.finPaymentAdviceLine.deleteMany())
    await safeDeleteMany('FinPurchaseOrder', () => prisma.finPurchaseOrder.deleteMany())
    await safeDeleteMany('FinPaymentAdvice', () => prisma.finPaymentAdvice.deleteMany())
    await safeDeleteMany('FinPettyCash', () => prisma.finPettyCash.deleteMany())
    await safeDeleteMany('FinExpenseItem', () => prisma.finExpenseItem.deleteMany())
    await safeDeleteMany('FinExpenseClaim', () => prisma.finExpenseClaim.deleteMany())
    await safeDeleteMany('FinFollowUp', () => prisma.finFollowUp.deleteMany())
    await safeDeleteMany('FinPayment', () => prisma.finPayment.deleteMany())
    await safeDeleteMany('FinOutstanding', () => prisma.finOutstanding.deleteMany())
    await safeDeleteMany('FinInvoice', () => prisma.finInvoice.deleteMany())
    await safeDeleteMany('FinSite', () => prisma.finSite.deleteMany())

    await safeDeleteMany('BankTransaction', () => prisma.bankTransaction.deleteMany())
    await safeDeleteMany('BankAccount', () => prisma.bankAccount.deleteMany())
    await safeDeleteMany('BudgetItem', () => prisma.budgetItem.deleteMany())
    await safeDeleteMany('TaxRecord', () => prisma.taxRecord.deleteMany())
    await safeDeleteMany('JournalEntry', () => prisma.journalEntry.deleteMany())
    await safeDeleteMany('LedgerAccount', () => prisma.ledgerAccount.deleteMany())
    await safeDeleteMany('AccountsPayable', () => prisma.accountsPayable.deleteMany())
    await safeDeleteMany('AccountsReceivable', () => prisma.accountsReceivable.deleteMany())

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ success: true, database: dbName, deleted: results }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
