/**
 * Importer: "Work order Format new ... SP.xlsx" -> FinWorkOrder
 *
 * Sheet "Sheet1" = "CURRENT ORDERS (Orders in hand)" register.
 *   row 0 = title, row 1 = header, rows 2..N = data.
 * Each row is one work order. "Order from (Company Name)" is matched to a
 * FinParty (created on demand, since FinWorkOrder.partyId is required).
 *
 * Usage:
 *   npx tsx scripts/import-work-orders.ts           (dry run)
 *   npx tsx scripts/import-work-orders.ts --commit  (writes to DB)
 */
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const FILE = 'C:/work/erp/fnancialappdata/Work order Format new (4) (1) (1) (5)bANK (1) SP.xlsx'
const COMMIT = process.argv.includes('--commit')

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim()
}
/** Parse currency-ish cells: " ₹ 6,656,267.00 ", "27,494,000.00", "NA", "-", "". */
function money(v: unknown): number {
  if (v === null || v === undefined) return 0
  let s = String(v).replace(/₹/g, '').replace(/,/g, '').replace(/\s/g, '').trim()
  if (s === '' || s === '-' || /^na$/i.test(s)) return 0
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && v > 0) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d))
    return null
  }
  const s = String(v).trim()
  // d-MMM-yy  e.g. 7-May-24, 24-Sep-24
  let m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
  if (m) {
    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
    const mo = months[m[2].toLowerCase()]
    if (mo !== undefined) { let yr = parseInt(m[3], 10); if (yr < 100) yr += 2000; return new Date(Date.UTC(yr, mo, parseInt(m[1], 10))) }
  }
  // m/d/yy
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) { let yr = parseInt(m[3], 10); if (yr < 100) yr += 2000; return new Date(Date.UTC(yr, parseInt(m[1], 10) - 1, parseInt(m[2], 10))) }
  return null
}
function naStr(v: unknown): string | null {
  const s = str(v)
  if (s === '' || /^na$/i.test(s)) return null
  return s
}
function fyOf(d: Date | null): string | null {
  if (!d) return null
  const y = d.getUTCFullYear(), m = d.getUTCMonth() // 0-based; FY starts Apr (m>=3)
  const start = m >= 3 ? y : y - 1
  return `${start}-${String(start + 1).slice(2)}`
}

interface WO {
  partyName: string
  workOrderNo: string
  description: string | null
  initiationDate: Date | null
  completionDate: Date | null
  bgAmount: number | null
  bgSource: string | null
  orderAmount: number
  unexecutedAmount: number
  bookedLastFY: number
  bookedCurrentFY: number
  toBeBookedEndFY: number
  billRaisedAmount: number
  receivedAgainstBill: number
  workDoneNotBilled: number
  extensionLetter: string | null
  delayReason: string | null
  subcontractedTo: string | null
  financialYear: string | null
}

function main() {
  const wb = XLSX.readFile(FILE, { cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const grid = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: '' })

  // find header row (contains "Order No")
  let headerIdx = grid.findIndex((r) => (r || []).some((c) => str(c).toLowerCase() === 'order no'))
  if (headerIdx === -1) headerIdx = 1
  const rows: WO[] = []

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i] || []
    const company = str(r[1])
    const orderNo = str(r[2])
    const desc = str(r[3])
    // Stop at the TOTAL row — everything after it is other sections
    // (COMPLETED ORDERS / Fresh Work / Equipments), all empty here.
    if (/^total/i.test(str(r[0]))) break
    // skip blank/summary rows
    if (!company && !orderNo && !desc) continue
    // skip any repeated section header rows
    const c1l = company.toLowerCase()
    if (c1l === 'order from (company name)' || c1l === 'description of work' || c1l === 'equipments') continue
    if (!company) continue // party is required

    const initiationDate = parseDate(r[4])
    rows.push({
      partyName: company,
      workOrderNo: orderNo || `WO-ROW${i}`,
      description: desc || null,
      initiationDate,
      completionDate: parseDate(r[5]),
      bgAmount: money(r[7]) || null,
      bgSource: naStr(r[8]),
      orderAmount: money(r[9]),
      unexecutedAmount: money(r[10]),
      bookedLastFY: money(r[11]),
      bookedCurrentFY: money(r[12]),
      toBeBookedEndFY: money(r[13]),
      billRaisedAmount: money(r[14]),
      receivedAgainstBill: money(r[15]),
      workDoneNotBilled: money(r[16]),
      extensionLetter: naStr(r[17]),
      delayReason: naStr(r[18]),
      subcontractedTo: naStr(r[19]),
      financialYear: fyOf(initiationDate),
    })
  }

  const grand = rows.reduce((s, r) => s + r.orderAmount, 0)
  const parties = [...new Set(rows.map((r) => r.partyName))]
  console.log('=== PARSE SUMMARY ===')
  console.log('Work orders parsed :', rows.length)
  console.log('Distinct parties   :', parties.length, JSON.stringify(parties))
  console.log('Grand order amount :', grand.toLocaleString('en-IN'))
  console.table(rows.slice(0, 8).map((r) => ({
    party: r.partyName.slice(0, 20), woNo: r.workOrderNo.slice(0, 22),
    init: r.initiationDate?.toISOString().slice(0, 10), amount: r.orderAmount, fy: r.financialYear,
  })))

  if (!COMMIT) {
    console.log('\nDRY RUN — no DB writes. Re-run with --commit to import.')
    return
  }
  importToDb(rows)
}

async function importToDb(rows: WO[]) {
  const db = new PrismaClient()
  try {
    // resolve/create parties by normalized name
    const norm = (s: string) => s.toUpperCase().replace(/M\/S/g, '').replace(/[^A-Z0-9]/g, '').trim()
    const existing = await db.finParty.findMany({ select: { id: true, name: true } })
    const byNorm = new Map(existing.map((p) => [norm(p.name), p.id]))

    let createdParties = 0
    const partyId = new Map<string, number>()
    for (const name of [...new Set(rows.map((r) => r.partyName))]) {
      const key = norm(name)
      let id = byNorm.get(key)
      if (!id) {
        const created = await db.finParty.create({ data: { name } })
        id = created.id
        byNorm.set(key, id)
        createdParties++
      }
      partyId.set(name, id)
    }

    let upserted = 0
    for (const r of rows) {
      const pid = partyId.get(r.partyName)!
      const data = {
        partyId: pid,
        workOrderNo: r.workOrderNo,
        description: r.description ?? undefined,
        initiationDate: r.initiationDate ?? undefined,
        completionDate: r.completionDate ?? undefined,
        bgAmount: r.bgAmount ?? undefined,
        bgSource: r.bgSource ?? undefined,
        orderAmount: r.orderAmount,
        unexecutedAmount: r.unexecutedAmount,
        bookedLastFY: r.bookedLastFY,
        bookedCurrentFY: r.bookedCurrentFY,
        toBeBookedEndFY: r.toBeBookedEndFY,
        billRaisedAmount: r.billRaisedAmount,
        receivedAgainstBill: r.receivedAgainstBill,
        workDoneNotBilled: r.workDoneNotBilled,
        extensionLetter: r.extensionLetter ?? undefined,
        delayReason: r.delayReason ?? undefined,
        subcontractedTo: r.subcontractedTo ?? undefined,
        financialYear: r.financialYear ?? undefined,
        status: 'Active',
      }
      // unique on (partyId, workOrderNo)
      const found = await db.finWorkOrder.findFirst({ where: { partyId: pid, workOrderNo: r.workOrderNo } })
      if (found) await db.finWorkOrder.update({ where: { id: found.id }, data })
      else await db.finWorkOrder.create({ data })
      upserted++
    }

    const total = await db.finWorkOrder.count()
    console.log(`\nCreated ${createdParties} new parties.`)
    console.log(`Upserted ${upserted} work orders. Table now: ${total}.`)
  } finally {
    await db.$disconnect()
  }
}

main()
