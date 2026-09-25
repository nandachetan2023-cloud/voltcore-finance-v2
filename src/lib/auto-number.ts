/**
 * Server-side generation of primary keys / document numbers.
 *
 * Users never type these - the form shows "Auto-generated" and the API assigns
 * the code on create. Generating on the server (not in the browser) matters:
 * a browser only sees the rows it was allowed to load - a site custodian sees
 * one site's records - so a number built from `records.length + 1` there can
 * collide with a row the user cannot see, and it goes stale after any delete.
 *
 * The next number is the highest existing suffix + 1, so gaps left by deletes
 * are never reused, and `withCodeRetry` re-generates if two creates race.
 */

const year = () => new Date().getFullYear()

/** Every document series in one place so formats stay consistent. */
export const NUMBER_SERIES = {
  job:      () => ({ model: 'finJob',           field: 'jobCode',   prefix: `JOB-${year()}-`, pad: 3 }),
  site:     () => ({ model: 'finSite',          field: 'siteCode',  prefix: 'SITE-',          pad: 3 }),
  invoice:  () => ({ model: 'finInvoice',       field: 'invoiceNo', prefix: `INV-${year()}-`, pad: 3 }),
  po:       () => ({ model: 'finPurchaseOrder', field: 'poNo',      prefix: `PO-${year()}-`,  pad: 3 }),
  ar:       () => ({ model: 'accountsReceivable', field: 'invoiceNo', prefix: `AR-${year()}-`, pad: 3 }),
  claim:    () => ({ model: 'finExpenseClaim',  field: 'claimNo',   prefix: `EC-${year()}-`,  pad: 3 }),
} as const

export type SeriesKind = keyof typeof NUMBER_SERIES

/** Next code in a prefixed series, e.g. JOB-2026-012. */
export async function nextSeriesCode(db: any, kind: SeriesKind): Promise<string> {
  const { model, field, prefix, pad } = NUMBER_SERIES[kind]()
  const rows: any[] = await db[model].findMany({
    where: { [field]: { startsWith: prefix } },
    select: { [field]: true },
  })
  let max = 0
  for (const r of rows) {
    const m = String(r[field]).slice(prefix.length).match(/^\d+/)
    if (m) max = Math.max(max, parseInt(m[0], 10))
  }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`
}

/** First digit of a chart-of-accounts code by account type (matches the seeded chart). */
const ACCOUNT_BASE: Record<string, number> = { Asset: 1000, Liability: 2000, Equity: 3000, Income: 4000, Expense: 5000 }

/** Next chart-of-accounts code for a type: 1000s Assets, 2000s Liabilities, ... */
export async function nextAccountCode(db: any, type: string): Promise<string> {
  const base = ACCOUNT_BASE[type] ?? 1000
  const rows: Array<{ accountCode: string }> = await db.finAccount.findMany({
    where: { type: type in ACCOUNT_BASE ? type : 'Asset' },
    select: { accountCode: true },
  })
  const nums = rows.map((r) => parseInt(r.accountCode, 10)).filter((n) => Number.isFinite(n) && n >= base && n < base + 1000)
  return String(nums.length ? Math.max(...nums) + 1 : base)
}

/** Next numeric code for the flat ledger-accounts list (LedgerAccount), starting at 1001. */
export async function nextLedgerCode(db: any): Promise<string> {
  const rows: Array<{ accountCode: string }> = await db.ledgerAccount.findMany({ select: { accountCode: true } })
  const nums = rows.map((r) => parseInt(r.accountCode, 10)).filter((n) => Number.isFinite(n))
  return String(nums.length ? Math.max(...nums) + 1 : 1001)
}

/**
 * Run `create(code)` with a freshly generated code, retrying if another request
 * took that code first (Prisma P2002 unique violation).
 */
export async function withCodeRetry<T>(
  generate: () => Promise<string>,
  create: (code: string) => Promise<T>,
  attempts = 4,
): Promise<T> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    const code = await generate()
    try {
      return await create(code)
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e
      lastErr = e
    }
  }
  throw lastErr
}

/** A key the caller supplied (import, edit) wins; otherwise generate one. */
export const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === ''
