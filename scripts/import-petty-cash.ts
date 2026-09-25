/**
 * One-off importer: "Ho Expenses Personal 24-25 (All Month).xlsx" -> FinPettyCash
 *
 * Usage:
 *   npx tsx scripts/import-petty-cash.ts            (dry run - prints summary only)
 *   npx tsx scripts/import-petty-cash.ts --commit   (writes to DB)
 *
 * Reads DATABASE_URL from env (.env -> erp_finance_dev by default).
 */
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const FILE = 'C:/work/erp/fnancialappdata/Ho Expenses Personal 24-25 (All Month).xlsx'
const COMMIT = process.argv.includes('--commit')

const MONTH_ABBR: Record<string, string> = {
  'january': 'JAN', 'february': 'FEB', 'march': 'MAR', 'april': 'APR',
  'may': 'MAY', 'june': 'JUN', 'july': 'JUL', 'august': 'AUG',
  'september': 'SEP', 'october': 'OCT', 'november': 'NOV', 'december': 'DEC',
}

interface Row {
  voucherNo: string
  date: Date
  description: string
  amount: number
  type: 'Debit' | 'Credit'
  category: string | null
  authorizedBy: string | null
  balance: number
  referenceNo: string | null
  remarks: string | null
}

function num(v: any): number {
  if (v === null || v === undefined) return 0
  const s = String(v).replace(/,/g, '').replace(/\s/g, '').trim()
  if (s === '' || s === '-') return 0
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function parseDate(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d))
    return null
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    let yr = parseInt(m[3], 10)
    if (yr < 100) yr += 2000
    return new Date(Date.UTC(yr, parseInt(m[1], 10) - 1, parseInt(m[2], 10)))
  }
  return null
}

function sheetMonthYear(sheet: string): { mon: string; year: number; monIdx: number } | null {
  const m = sheet.toLowerCase().match(/^([a-z]+)-(\d{4})$/)
  if (!m) return null
  const abbr = MONTH_ABBR[m[1]]
  if (!abbr) return null
  const monNames = Object.keys(MONTH_ABBR)
  return { mon: abbr, year: parseInt(m[2], 10), monIdx: monNames.indexOf(m[1]) }
}

function clean(v: any): string {
  return v === null || v === undefined ? '' : String(v).trim()
}

function main() {
  const wb = XLSX.readFile(FILE, { cellDates: false })
  const monthSheets = wb.SheetNames.filter((n) => /^[A-Za-z]+-\d{4}$/.test(n))

  const out: Row[] = []
  const seenVoucher = new Set<string>()
  let skippedBlank = 0
  let skippedTotal = 0
  let carriedDate = 0
  let clampedDate = 0

  for (const sheet of monthSheets) {
    const my = sheetMonthYear(sheet)
    if (!my) continue
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheet], { header: 1, raw: true, defval: '' })
    let lastDate: Date | null = null

    for (let i = 2; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue

      const slRaw = clean(r[0])
      const proj = clean(r[2])
      const site = clean(r[3])
      const acct = clean(r[4])
      const mode = clean(r[5])
      const desc = clean(r[6])
      const debitN = num(r[7])
      const creditN = num(r[8])
      const balN = num(r[9])
      const remark = clean(r[10])

      // Skip summary/total rows
      if (/^total/i.test(desc) || /^total/i.test(slRaw) || /^total/i.test(proj)) { skippedTotal++; continue }

      const hasAmount = debitN !== 0 || creditN !== 0
      const hasContent = desc !== '' || hasAmount

      let d = parseDate(r[1])
      // Remember the most recent real date so continuation rows can inherit it
      if (d && d.getUTCFullYear() >= 2024 && d.getUTCFullYear() <= 2025) lastDate = d
      // Carry forward last date for continuation rows that have content but no date
      if (!d && hasContent && lastDate) { d = lastDate; carriedDate++ }
      // Clamp out-of-range dates (typos) into the sheet's month
      if (d && (d.getUTCFullYear() < 2024 || d.getUTCFullYear() > 2025)) {
        d = new Date(Date.UTC(my.year, my.monIdx, Math.min(Math.max(d.getUTCDate(), 1), 28)))
        clampedDate++
      }
      // Validate date falls in the sheet month-ish range; if wildly off, clamp to sheet month
      if (d && d.getUTCFullYear() === my.year && d.getUTCMonth() !== my.monIdx) {
        // tolerate adjacent-month spillover (common in ledgers); keep as-is
      }

      if (!d || !hasContent) { skippedBlank++; continue }

      const type: 'Debit' | 'Credit' = creditN > 0 && debitN === 0 ? 'Credit' : 'Debit'
      const amount = type === 'Credit' ? creditN : debitN

      // Build a unique voucher number
      const slPart = slRaw !== '' ? slRaw.replace(/[^0-9A-Za-z]/g, '') : `R${i}`
      let voucherNo = `PC-${my.mon}${String(my.year).slice(2)}-${slPart}`
      let suffix = 1
      while (seenVoucher.has(voucherNo)) {
        voucherNo = `PC-${my.mon}${String(my.year).slice(2)}-${slPart}-${suffix++}`
      }
      seenVoucher.add(voucherNo)

      const remarkParts: string[] = []
      if (proj) remarkParts.push(`Project: ${proj}`)
      if (site) remarkParts.push(`Site: ${site}`)
      if (mode) remarkParts.push(`Mode: ${mode}`)
      if (remark) remarkParts.push(remark)

      out.push({
        voucherNo,
        date: d,
        description: desc || '(no description)',
        amount,
        type,
        category: acct || null,
        authorizedBy: mode || null,
        balance: balN,
        referenceNo: `${sheet}#${slRaw || i}`,
        remarks: remarkParts.length ? remarkParts.join(' | ') : null,
      })
    }
  }

  const totalDebit = out.filter((r) => r.type === 'Debit').reduce((s, r) => s + r.amount, 0)
  const totalCredit = out.filter((r) => r.type === 'Credit').reduce((s, r) => s + r.amount, 0)

  console.log('=== PARSE SUMMARY ===')
  console.log('Sheets processed   :', monthSheets.length, JSON.stringify(monthSheets))
  console.log('Rows to import     :', out.length)
  console.log('Skipped blank      :', skippedBlank)
  console.log('Skipped total rows :', skippedTotal)
  console.log('Dates carried fwd  :', carriedDate)
  console.log('Dates clamped      :', clampedDate)
  console.log('Total Debit (out)  :', totalDebit.toLocaleString('en-IN'))
  console.log('Total Credit (in)  :', totalCredit.toLocaleString('en-IN'))
  console.log('Sample first 3     :', JSON.stringify(out.slice(0, 3), null, 2))
  console.log('Sample last 2      :', JSON.stringify(out.slice(-2), null, 2))

  if (!COMMIT) {
    console.log('\nDRY RUN — no DB writes. Re-run with --commit to import.')
    return
  }

  importToDb(out)
}

async function importToDb(rows: Row[]) {
  const db = new PrismaClient()
  try {
    const existing = await db.finPettyCash.count()
    console.log(`\nExisting FinPettyCash rows: ${existing}`)
    console.log(`Inserting ${rows.length} rows...`)

    let inserted = 0
    const BATCH = 200
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const res = await db.finPettyCash.createMany({
        data: batch.map((r) => ({
          voucherNo: r.voucherNo,
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          category: r.category ?? undefined,
          authorizedBy: r.authorizedBy ?? undefined,
          balance: r.balance,
          referenceNo: r.referenceNo ?? undefined,
          remarks: r.remarks ?? undefined,
        })),
        skipDuplicates: true,
      })
      inserted += res.count
      console.log(`  batch ${i / BATCH + 1}: +${res.count} (running ${inserted})`)
    }

    const after = await db.finPettyCash.count()
    console.log(`\nDone. Inserted ${inserted}. Table now has ${after} rows.`)
  } finally {
    await db.$disconnect()
  }
}

main()
