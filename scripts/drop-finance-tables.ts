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
    throw new Error('DATABASE_URL is not set. Refusing to drop tables.')
  }

  const dbName = safeDbNameFromUrl(dbUrl)
  if (dbName !== 'erp_finance_dev') {
    throw new Error(`Refusing to drop tables: DATABASE_URL points to "${dbName}", expected "erp_finance_dev".`)
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

  const tables = [
    // Finance & Accounting (simple)
    'LedgerAccount',
    'JournalEntry',
    'AccountsPayable',
    'AccountsReceivable',
    'BankTransaction',
    'BankAccount',
    'TaxRecord',
    'BudgetItem',

    // Finance (Fin* suite)
    'FinAlert',
    'FinCreditNote',
    'FinPOItem',
    'FinPurchaseOrder',
    'FinPaymentAdviceLine',
    'FinPaymentAdvice',
    'FinPettyCash',
    'FinExpenseItem',
    'FinExpenseClaim',
    'FinFollowUp',
    'FinPayment',
    'FinOutstanding',
    'FinInvoice',
    'FinSite',
  ] as const

  const dropped: string[] = []

  try {
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "public"."${table}" CASCADE;`)
      dropped.push(table)
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ success: true, database: dbName, dropped }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

