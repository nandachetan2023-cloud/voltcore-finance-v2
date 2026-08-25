/**
 * One-off importer: "Payment_Advice_Excel_Multiple_Invoices.xlsx" -> FinPaymentAdvice (+ lines)
 *
 * Each WORKSHEET is one payment-advice voucher:
 *   - a header block (rows 0..N) with Supplier / Vendor Code / Date / Bank details
 *   - a line-item table whose header row contains "DESCRIPTION"
 *   - data rows until a TOTAL / "Prepared By" / blank-tail
 *
 * Column layout varies per sheet, so columns are mapped by header TEXT, not position.
 *
 * Usage:
 *   npx tsx scripts/import-payment-advices.ts            (dry run - prints summary)
 *   npx tsx scripts/import-payment-advices.ts --commit   (writes to DB)
 */
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const FILE = 'C:/work/erp/fnancialappdata/Payment_Advice_Excel_Multiple_Invoices.xlsx'
const COMMIT = process.argv.includes('--commit')

/* ---------------- helpers ---------------- */
function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}
function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const s = String(v).replace(/,/g, '').replace(/\s/g, '').trim()
  if (s === '' || s === '-' || /^na$/i.test(s)) return 0
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
function normHeader(s: unknown): string {
  return String(s ?? '').toUpperCase().replace(/[\s.]+/g, ' ').trim()
}
/** Parse dd.mm.yyyy (dots) or m/d/yy (slashes, US-style). */
function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && v > 0) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d))
    return null
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/) // dd.mm.yyyy
  if (m) {
    let yr = parseInt(m[3], 10); if (yr < 100) yr += 2000
    return new Date(Date.UTC(yr, parseInt(m[2], 10) - 1, parseInt(m[1], 10)))
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/) // m/d/yy (US)
  if (m) {
    let yr = parseInt(m[3], 10); if (yr < 100) yr += 2000
    return new Date(Date.UTC(yr, parseInt(m[1], 10) - 1, parseInt(m[2], 10)))
  }
  return null
}
function normName(s: string): string {
  return s.toUpperCase().replace(/M\/S/g, '').replace(/[^A-Z0-9]/g, '').trim()
}

// Labels that mark the start of another field — used to stop a value scan.
const KNOWN_LABELS = [
  'SUPPLIER NAME', 'VENDOR CODE', 'PAYMENT ADVICE NO', 'PAYMENT MODE', 'DATE',
  'BANK NAME', 'BANK ACCOUNT NUMBER', 'ACCOUNT NUMBER', 'IFSC CODE', 'IFSC',
  'GSTIN', 'GST NO', 'PAN NO', 'PAN', 'VOUCHER NO',
].map(normHeader)

function isLabelCell(v: unknown): boolean {
  const n = normHeader(v).replace(/:$/, '')
  if (n === '') return false
  return KNOWN_LABELS.some((l) => n === l)
}

/**
 * Find the raw value to the right of a label cell, scanning the header block.
 * Returns the raw cell (so Excel date serials keep their numeric type).
 * Stops if the next non-empty cell is itself a known label (i.e. value is blank).
 */
function findLabelRaw(grid: any[][], maxRow: number, ...labels: string[]): unknown {
  const wanted = labels.map(normHeader)
  for (let r = 0; r < maxRow; r++) {
    const row = grid[r] || []
    for (let c = 0; c < row.length; c++) {
      const cell = normHeader(row[c]).replace(/:$/, '')
      if (cell === '') continue
      const matched = wanted.some((w) => cell === w || cell.startsWith(w))
      if (!matched) continue
      for (let k = c + 1; k < row.length; k++) {
        if (row[k] === '' || row[k] === null || row[k] === undefined) continue
        if (isLabelCell(row[k])) break // hit the next field's label => value is blank
        return row[k]
      }
    }
  }
  return ''
}

function findLabel(grid: any[][], maxRow: number, ...labels: string[]): string {
  return str(findLabelRaw(grid, maxRow, ...labels))
}

interface Line { billNo: string | null; amount: number; remarks: string | null }
interface Advice {
  sheet: string
  adviceNo: string
  supplierName: string
  vendorCode: string
  partyId: number | null
  totalAmount: number
  paymentDate: Date
  paymentMode: string
  referenceNo: string | null
  notes: string | null
  lines: Line[]
}

function buildColMap(headerRow: any[]): Record<string, number> {
  const map: Record<string, number> = {}
  const set = (key: string, idx: number) => { if (!(key in map)) map[key] = idx }
  headerRow.forEach((raw, idx) => {
    const h = normHeader(raw)
    if (!h) return
    if (h.includes('DESCRIPTION')) set('desc', idx)
    else if (h.includes('PAID')) set('paid', idx)
    else if (h.includes('BALANCE')) set('balance', idx)
    else if (h.includes('TOTAL') && h.includes('AMOUNT')) set('total', idx)
    else if (h === 'TDS') set('tds', idx)
    else if (h.includes('INVOICE NO') || h.includes('PO NO')) set('billNo', idx)
    else if (h.includes('INVOICE DT') || h.includes('PO DT') || h === 'DATE') set('date', idx)
    else if (h.includes('MONTH')) set('month', idx)
    else if (h.includes('PO AMOUNT') || h.includes('INVOICE AMOUNT') || h.includes('TOTAL RENT') || h === 'AMOUNT') set('base', idx)
    else if (/\bS[LR]\b/.test(h) && h.includes('NO')) set('slno', idx)
  })
  return map
}

function parseSheet(sheet: string, grid: any[][]): Advice | null {
  // header row = first row containing "DESCRIPTION"
  let headerIdx = -1
  for (let r = 0; r < Math.min(grid.length, 12); r++) {
    const row = grid[r] || []
    if (row.some((c) => normHeader(c).includes('DESCRIPTION'))) { headerIdx = r; break }
  }
  if (headerIdx === -1) return null

  const col = buildColMap(grid[headerIdx])

  const supplierName = findLabel(grid, headerIdx, 'Supplier Name')
  const vendorCode = findLabel(grid, headerIdx, 'Vendor Code')
  const dateRaw = findLabelRaw(grid, headerIdx, 'Date')
  const paymentMode = findLabel(grid, headerIdx, 'Payment Mode')
  const bankName = findLabel(grid, headerIdx, 'Bank Name')
  const accountNo = findLabel(grid, headerIdx, 'Bank Account Number', 'Account Number')
  const ifsc = findLabel(grid, headerIdx, 'IFSC Code', 'IFSC')
  const taxId = findLabel(grid, headerIdx, 'GSTIN', 'GST No', 'PAN NO', 'PAN')

  const rawLines: { billNo: string; desc: string; month: string; paid: number; total: number; base: number; balance: number }[] = []
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r] || []
    const joined = row.map((c) => normHeader(c)).join(' ')
    // stop at totals / signature block
    if (/\bTOTAL\b/.test(joined) || /PREPARED BY/.test(joined) || /CHECKED BY/.test(joined)) break

    const desc = col.desc != null ? str(row[col.desc]) : ''
    const paid = col.paid != null ? num(row[col.paid]) : 0
    const total = col.total != null ? num(row[col.total]) : 0
    const base = col.base != null ? num(row[col.base]) : 0
    const balance = col.balance != null ? num(row[col.balance]) : 0
    const billNo = col.billNo != null ? str(row[col.billNo]) : ''
    const month = col.month != null ? str(row[col.month]) : ''

    const hasContent = desc !== '' || paid !== 0 || total !== 0 || base !== 0 || billNo !== ''
    if (!hasContent) continue
    rawLines.push({ billNo, desc, month, paid, total, base, balance })
  }

  if (rawLines.length === 0) return null

  // Decide amount basis: prefer the "Paid Amount" column. Some sheets (e.g. an
  // invoice row + several payment-installment rows) would double-count if we mixed
  // invoice totals with installment payments — so if ANY line has a paid value, use
  // paid for every line; otherwise fall back to total, then base.
  const anyPaid = rawLines.some((l) => l.paid !== 0)
  const lines: Line[] = rawLines.map((l) => {
    const amount = anyPaid ? l.paid : l.total !== 0 ? l.total : l.base
    const remarkBits: string[] = []
    if (l.desc) remarkBits.push(l.desc)
    if (l.month) remarkBits.push(`Month: ${l.month}`)
    const amtBits: string[] = []
    if (l.total) amtBits.push(`inv=${l.total}`)
    if (l.paid) amtBits.push(`paid=${l.paid}`)
    if (l.balance) amtBits.push(`bal=${l.balance}`)
    if (amtBits.length) remarkBits.push(`(${amtBits.join(', ')})`)
    return { billNo: l.billNo || null, amount, remarks: remarkBits.length ? remarkBits.join(' ') : null }
  })

  const paymentDate = parseDate(dateRaw) || new Date()
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0)

  const yymmdd =
    `${String(paymentDate.getUTCFullYear()).slice(2)}` +
    `${String(paymentDate.getUTCMonth() + 1).padStart(2, '0')}` +
    `${String(paymentDate.getUTCDate()).padStart(2, '0')}`
  const codePart = vendorCode ? vendorCode.replace(/\s+/g, '') : sheet.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)
  const adviceNo = `PA-${codePart}-${yymmdd}`

  const noteBits: string[] = []
  if (supplierName) noteBits.push(`Supplier: ${supplierName}`)
  if (bankName) noteBits.push(`Bank: ${bankName}`)
  if (ifsc) noteBits.push(`IFSC: ${ifsc}`)
  if (taxId) noteBits.push(`Tax: ${taxId}`)

  return {
    sheet,
    adviceNo,
    supplierName,
    vendorCode,
    partyId: null,
    totalAmount,
    paymentDate,
    paymentMode: paymentMode || 'Bank Transfer',
    referenceNo: accountNo || null,
    notes: noteBits.length ? noteBits.join(' | ') : null,
    lines,
  }
}

async function main() {
  const wb = XLSX.readFile(FILE, { cellDates: false })
  const advices: Advice[] = []
  const seen = new Set<string>()

  for (const sheet of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheet], { header: 1, raw: true, defval: '' })
    const adv = parseSheet(sheet, grid)
    if (!adv) { console.log(`  (skipped sheet "${sheet}" — no parseable line items)`); continue }
    // ensure unique adviceNo
    let no = adv.adviceNo, n = 1
    while (seen.has(no)) no = `${adv.adviceNo}-${++n}`
    adv.adviceNo = no
    seen.add(no)
    advices.push(adv)
  }

  // optional party linking by normalized name
  let partyIndex: { id: number; norm: string }[] = []
  if (COMMIT) {
    const db = new PrismaClient()
    try {
      const parties = await db.finParty.findMany({ select: { id: true, name: true } })
      partyIndex = parties.map((p) => ({ id: p.id, norm: normName(p.name) }))
    } finally {
      await db.$disconnect()
    }
  }
  let linked = 0
  for (const a of advices) {
    if (a.supplierName && partyIndex.length) {
      const target = normName(a.supplierName)
      const hit = partyIndex.find((p) => p.norm && (p.norm === target || p.norm.includes(target) || target.includes(p.norm)))
      if (hit) { a.partyId = hit.id; linked++ }
    }
  }

  console.log('\n=== PARSE SUMMARY ===')
  console.log('Advices parsed   :', advices.length)
  console.log('Total line items :', advices.reduce((s, a) => s + a.lines.length, 0))
  console.log('Grand total amt  :', advices.reduce((s, a) => s + a.totalAmount, 0).toLocaleString('en-IN'))
  if (COMMIT) console.log('Parties linked   :', linked)
  console.table(advices.map((a) => ({
    sheet: a.sheet, adviceNo: a.adviceNo, supplier: a.supplierName.slice(0, 22),
    date: a.paymentDate.toISOString().slice(0, 10), lines: a.lines.length,
    total: a.totalAmount, mode: a.paymentMode,
  })))

  if (!COMMIT) {
    console.log('\nDRY RUN — no DB writes. Re-run with --commit to import.')
    console.log('Sample lines for first advice:', JSON.stringify(advices[0]?.lines, null, 2))
    return
  }

  const db = new PrismaClient()
  try {
    const before = await db.finPaymentAdvice.count()
    console.log(`\nExisting advices: ${before}. Inserting ${advices.length}...`)
    let created = 0, lineCount = 0
    for (const a of advices) {
      const existing = await db.finPaymentAdvice.findFirst({ where: { adviceNo: a.adviceNo } })
      const data = {
        adviceNo: a.adviceNo,
        partyId: a.partyId ?? undefined,
        totalAmount: a.totalAmount,
        paymentDate: a.paymentDate,
        paymentMode: a.paymentMode,
        referenceNo: a.referenceNo ?? undefined,
        notes: a.notes ?? undefined,
        updatedAt: new Date(),
      }
      if (existing) {
        await db.finPaymentAdviceLine.deleteMany({ where: { adviceId: existing.id } })
        await db.finPaymentAdvice.update({ where: { id: existing.id }, data: { ...data, lines: { create: a.lines } } })
      } else {
        await db.finPaymentAdvice.create({ data: { ...data, lines: { create: a.lines } } })
      }
      created++; lineCount += a.lines.length
    }
    const after = await db.finPaymentAdvice.count()
    console.log(`Done. Upserted ${created} advices, ${lineCount} lines. Table now: ${after} advices.`)
  } finally {
    await db.$disconnect()
  }
}

main()
