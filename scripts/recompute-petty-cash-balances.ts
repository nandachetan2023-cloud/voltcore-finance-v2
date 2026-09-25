/**
 * One-time backfill: rebuild FinPettyCash.balance as a per-site running total.
 *
 * The column was written as a single global sequence, so every site's ledger
 * showed a cumulative figure mixed with other sites' movements. This rewrites it
 * per site, chronologically, counting APPROVED vouchers only — see
 * src/lib/petty-cash-balance.ts for the rules.
 *
 *   npx tsx scripts/recompute-petty-cash-balances.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { recomputePettyCashBalances } from '../src/lib/petty-cash-balance'

function loadEnv() {
  try {
    for (const line of readFileSync(join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m || process.env[m[1]]) continue
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {}
}
loadEnv()

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL! } } })

async function main() {
  const before = await db.finPettyCash.count()
  const fixed = await recomputePettyCashBalances(db)
  console.log(`Scanned ${before} vouchers — corrected ${fixed}.`)

  // Show the closing balance per site so it can be eyeballed against the UI.
  const sites = await db.finSite.findMany({ orderBy: { siteCode: 'asc' }, select: { id: true, siteCode: true, name: true } })
  for (const s of [...sites, { id: null, siteCode: '(no site)', name: '' } as any]) {
    const rows = await db.finPettyCash.findMany({
      where: { siteId: s.id },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      select: { balance: true, type: true, amount: true, approvalStatus: true },
    })
    if (rows.length === 0) continue
    const expected = rows
      .filter((r) => r.approvalStatus === 'Approved')
      .reduce((acc, r) => acc + (r.type === 'Credit' ? Number(r.amount) : -Number(r.amount)), 0)
    const closing = rows[rows.length - 1].balance
    const ok = Math.abs(closing - expected) < 0.005 ? '✓' : '✗'
    console.log(`  ${ok} ${s.siteCode} ${s.name} — closing ${closing} (approved in − out = ${expected}), ${rows.length} vouchers`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
