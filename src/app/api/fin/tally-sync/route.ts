import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function num(v: unknown): number {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function excelDateToJS(serial: unknown): Date | null {
  if (serial === '' || serial === null || serial === undefined) return null
  if (typeof serial === 'string') {
    const m = serial.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const m2 = serial.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/)
    if (m2) {
      const yr = m2[3].length === 2 ? 2000 + Number(m2[3]) : Number(m2[3])
      return new Date(yr, Number(m2[2]) - 1, Number(m2[1]))
    }
  }
  const n = Number(serial)
  if (isNaN(n) || n <= 0) return null
  return new Date((n - 25569) * 86400 * 1000)
}

// ── Find header row in Tally-style sheets ──────────────────────────
function findHeaderRow(rows: unknown[][], keywords: string[]): number {
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const joined = (rows[i] as unknown[]).map(c => str(c).toLowerCase()).join('|')
    if (keywords.some(k => joined.includes(k))) return i
  }
  return 7 // fallback
}

// ── Parse Purchase / Sales Register (Tally Book.xlsx, DayBook.xlsx) ──
function parseRegister(ws: XLSX.WorkSheet, sheetName: string) {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  let headerRow = findHeaderRow(raw, ['date', 'particulars', 'vch type', 'vch no.'])
  // sub-header row for amounts
  if (headerRow + 1 < raw.length) headerRow++
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: headerRow })

  const records: Record<string, unknown>[] = []
  for (const r of rows) {
    const date = str(r['Date'] || r['__EMPTY'])
    const particulars = str(r['Particulars'] || r['__EMPTY_1'])
    const vchType = str(r['Vch Type'] || r['__EMPTY_2'])
    const vchNo = str(r['Vch No.'] || r['__EMPTY_3'])
    const debit = num(r['Debit'] || r['__EMPTY_4'])
    const credit = num(r['Credit'] || r['__EMPTY_5'])
    if (!particulars || /total|grand|opening|closing/i.test(particulars)) continue
    if (/total|opening|closing|balance/i.test(date)) continue
    records.push({ date, particulars, vchType, vchNo, debit, credit, sheet: sheetName })
  }
  return records
}

// ── Parse Sundry Debtors / Creditors ─────────────────────────────────
function parseSundry(ws: XLSX.WorkSheet, sheetName: string) {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  const headerRow = findHeaderRow(raw, ['particulars', 'closing balance'])
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: headerRow })

  const records: Record<string, unknown>[] = []
  for (const r of rows) {
    const name = str(r['Particulars'] || r['__EMPTY'])
    const debit = num(r['Debit'] || r['__EMPTY_1'] || r['__EMPTY'])
    const credit = num(r['Credit'] || r['__EMPTY_2'])
    if (!name || /total|grand|opening|closing|particulars|sundry/i.test(name)) continue
    records.push({ name, debit, credit, type: sheetName === 'Sundry Debtors' ? 'Debtor' : 'Creditor' })
  }
  return records
}

// ── Parse Petty Cash Register ────────────────────────────────────────
function parsePettyCash(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  const headerRow = findHeaderRow(raw, ['s.no.', 'date', 'voucher', 'payee'])
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: headerRow })

  const records: Record<string, unknown>[] = []
  for (const r of rows) {
    const sno = str(r['S.No.'] || r['__EMPTY'])
    const date = str(r['Date'] || r['__EMPTY_1'])
    const voucherNo = str(r['Voucher No.'] || r['__EMPTY_2'])
    const payee = str(r['Payee'] || r['__EMPTY_3'])
    const category = str(r['Category'] || r['__EMPTY_4'])
    const description = str(r['Description'] || r['__EMPTY_5'])
    const debit = num(r['Debit'] || r['__EMPTY_6'])
    const credit = num(r['Credit'] || r['__EMPTY_7'])
    const balance = num(r['Balance'] || r['__EMPTY_8'])
    if (!payee && !description && !voucherNo) continue
    if (/total|opening|closing/i.test(payee)) continue
    records.push({ sno, date, voucherNo, payee, category, description, debit, credit, balance })
  }
  return records
}

// ── Parse Expense Claim Form ─────────────────────────────────────────
function parseExpenseClaim(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  const headerRow = findHeaderRow(raw, ['s.no.', 'date', 'expense category'])
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: headerRow })

  const records: Record<string, unknown>[] = []
  for (const r of rows) {
    const sno = str(r['S.No.'] || r['__EMPTY'])
    const date = str(r['Date'] || r['__EMPTY_1'])
    const category = str(r['Expense Category'] || r['__EMPTY_3'] || r['__EMPTY_2'])
    const description = str(r['Description'] || r['__EMPTY_4'])
    const project = str(r['Project/Client'] || r['__EMPTY_5'])
    const amount = num(r['Amount'] || r['__EMPTY_6'])
    const tax = num(r['Tax'] || r['__EMPTY_7'])
    const total = num(r['Total'] || r['__EMPTY_8'])
    if (!description && !category) continue
    if (/total|opening|closing/i.test(sno)) continue
    records.push({ sno, date, category, description, project, amount, tax, total })
  }
  return records
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const syncs = await pdb.finTallySync.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json({ success: true, data: syncs })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    // ── JSON commit path ──
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json()
      const { syncId } = body
      const sync = await pdb.finTallySync.findUnique({ where: { id: syncId } })
      if (!sync) return NextResponse.json({ success: false, error: 'Sync not found' }, { status: 404 })
      if (sync.status !== 'Pending') return NextResponse.json({ success: false, error: 'Sync already processed' }, { status: 400 })

      const rawJson = sync.rawJson ? JSON.parse(sync.rawJson) : []
      await pdb.finTallySync.update({ where: { id: syncId }, data: { status: 'Processing' } })

      let created = 0, updated = 0, skipped = 0, errors = 0

      for (const record of rawJson) {
        try {
          if (sync.syncType === 'DayBook' || sync.syncType === 'TallyBook') {
            const partyName = str(record.particulars)
            let party = await pdb.finParty.findFirst({ where: { name: partyName } })
            if (!party) { party = await pdb.finParty.create({ data: { name: partyName } }); created++ } else { updated++ }

            const date = record.date ? new Date(str(record.date)) : new Date()
            const amount = num(record.debit) || num(record.credit)
            const isDebit = num(record.debit) > 0

            if (record.sheet?.includes('Purchase')) {
              await pdb.finPurchaseOrder.create({
                data: {
                  poNo: str(record.vchNo) || `TALLY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  partyId: party.id,
                  description: `${str(record.vchType)} - ${partyName}`,
                  amount,
                  status: 'Imported',
                  orderDate: date,
                  siteId: 1,
                  deliveryDate: date,
                  paymentTerms: '',
                },
              }).catch(() => { errors++ })
            } else {
              const invoiceNo = str(record.vchNo) || `TALLY-INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
              const existing = await pdb.finInvoice.findFirst({ where: { invoiceNo } })
              if (!existing) {
                await pdb.finInvoice.create({
                  data: {
                    invoiceNo,
                    siteId: 1,
                    partyId: party.id,
                    client: partyName,
                    invoiceDate: date,
                    dueDate: date,
                    invoiceValue: amount,
                    grandTotal: amount,
                    balanceAmount: amount,
                    description: str(record.vchType) || null,
                    status: 'Unpaid',
                  },
                }).catch(() => { errors++ })
              } else { skipped++ }
            }
          } else if (sync.syncType === 'SundryDebtors' || sync.syncType === 'SundryCreditors') {
            const partyName = str(record.name)
            if (!partyName) { skipped++; continue }
            let party = await pdb.finParty.findFirst({ where: { name: partyName } })
            if (!party) {
              party = await pdb.finParty.create({ data: { name: partyName, gstin: null, address: null } })
              created++
            } else { updated++ }
          } else if (sync.syncType === 'PettyCash') {
            const voucherNo = str(record.voucherNo) || `PC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            const date = record.date ? new Date(str(record.date)) : new Date()
            const debit = num(record.debit)
            const credit = num(record.credit)
            const amount = debit || credit
            if (!amount) { skipped++; continue }

            await pdb.finPettyCash.create({
              data: {
                voucherNo,
                date,
                description: str(record.description) || str(record.payee) || 'Tally Import',
                amount,
                type: debit > 0 ? 'Debit' : 'Credit',
                category: str(record.category) || null,
                balance: num(record.balance) || 0,
                referenceNo: str(record.voucherNo) || null,
              },
            }).catch(() => { errors++ })
            created++
          } else if (sync.syncType === 'ExpenseClaim') {
            // No expense claim model exists; skip for now
            skipped++
          }
        } catch { errors++ }
      }

      await pdb.finTallySync.update({
        where: { id: syncId },
        data: { status: 'Completed', totalRows: rawJson.length, createdRows: created, updatedRows: updated, skippedRows: skipped, errorRows: errors, syncedAt: new Date() },
      })

      return NextResponse.json({ success: true, summary: { totalRows: rawJson.length, created, updated, skipped, errors } })
    }

    // ── File upload path ──
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const syncType = str(formData.get('type') || 'DayBook')

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    let records: Record<string, unknown>[] = []
    let periodFrom: Date | null = null
    let periodTo: Date | null = null

    for (const sname of wb.SheetNames) {
      const ws = wb.Sheets[sname]
      if (syncType === 'DayBook' || syncType === 'TallyBook') {
        const parsed = parseRegister(ws, sname)
        records.push(...parsed)
      } else if (syncType === 'SundryDebtors' || syncType === 'SundryCreditors') {
        const parsed = parseSundry(ws, sname)
        records.push(...parsed)
      } else if (syncType === 'PettyCash') {
        if (/petty cash|petty/i.test(sname)) {
          records.push(...parsePettyCash(ws))
        }
      } else if (syncType === 'ExpenseClaim') {
        if (/expense claim|expense/i.test(sname)) {
          records.push(...parseExpenseClaim(ws))
        }
      }
    }

    // Extract period from sheet content
    const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
    for (const row of raw) {
      const joined = (row as unknown[]).map(c => str(c)).join(' ')
      const m = joined.match(/(\d{1,2}-[A-Za-z]{3}-\d{2,4})\s+to\s+(\d{1,2}-[A-Za-z]{3}-\d{2,4})/)
      if (m) {
        periodFrom = new Date(m[1])
        periodTo = new Date(m[2])
        break
      }
    }

    // Create sync log entry
    const sync = await pdb.finTallySync.create({
      data: {
        syncType,
        fileName: file.name,
        periodFrom,
        periodTo,
        totalRows: records.length,
        status: 'Pending',
        rawJson: JSON.stringify(records),
      },
    })

    return NextResponse.json({
      success: true,
      syncId: sync.id,
      preview: records.slice(0, 100),
      totalRows: records.length,
      periodFrom,
      periodTo,
    })
  } catch (error) {
    console.error('Tally sync error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Sync failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const id = Number(searchParams.get('id'))
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

    await pdb.finTallySync.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
