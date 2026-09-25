import { PrismaClient } from '@prisma/client'

/**
 * Recompute the stored running `balance` on FinPettyCash rows, per site.
 *
 * The column used to be written as one global sequence (`last row's balance +
 * delta`, ordered by id across every site), which meant a site's ledger showed
 * another site's cumulative figure and never reconciled with that site's own
 * cash in − cash out.
 *
 * Rules:
 *   • one running total per siteId (rows with no site form their own sequence),
 *   • chronological order — date, then id for same-day rows,
 *   • only APPROVED vouchers move cash: a Draft/Pending/Rejected row carries the
 *     running total unchanged, so the last row's balance equals
 *     Σ approved credits − Σ approved debits for that site.
 *
 * Returns the number of rows whose stored balance was corrected.
 */
export async function recomputePettyCashBalances(
  db: PrismaClient,
  opts: { siteId?: number | null } = {},
): Promise<number> {
  const scoped = opts.siteId !== undefined
  const rows = await db.finPettyCash.findMany({
    where: scoped ? { siteId: opts.siteId } : {},
    select: { id: true, siteId: true, date: true, type: true, amount: true, approvalStatus: true, balance: true },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })

  const running = new Map<string, number>()
  const updates: Array<{ id: number; balance: number }> = []

  for (const r of rows) {
    const key = r.siteId === null ? 'none' : String(r.siteId)
    const current = running.get(key) ?? 0
    const amount = Number(r.amount) || 0
    const delta = r.approvalStatus === 'Approved' ? (r.type === 'Credit' ? amount : -amount) : 0
    const next = current + delta
    running.set(key, next)
    if ((Number(r.balance) || 0) !== next) updates.push({ id: r.id, balance: next })
  }

  for (const u of updates) {
    await db.finPettyCash.update({ where: { id: u.id }, data: { balance: u.balance } })
  }
  return updates.length
}

/**
 * The next running balance for a site — what a newly created voucher should
 * carry. Mirrors the rules above without rewriting existing rows.
 */
export async function nextSiteBalance(
  db: PrismaClient,
  siteId: number | null,
  voucher: { type: string; amount: number; approvalStatus?: string | null },
): Promise<number> {
  const rows = await db.finPettyCash.findMany({
    where: { siteId, approvalStatus: 'Approved' },
    select: { type: true, amount: true },
  })
  const current = rows.reduce(
    (s, r) => s + (r.type === 'Credit' ? Number(r.amount) || 0 : -(Number(r.amount) || 0)),
    0,
  )
  if (voucher.approvalStatus !== 'Approved') return current
  const amount = Number(voucher.amount) || 0
  return current + (voucher.type === 'Credit' ? amount : -amount)
}
