import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function excelDateToJS(serial: unknown): Date | null {
  if (serial === '' || serial === null || serial === undefined) return null
  if (typeof serial === 'string') {
    const m = serial.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/)
    if (m) return new Date(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    return null
  }
  const n = Number(serial)
  if (isNaN(n) || n <= 0) return null
  return new Date((n - 25569) * 86400 * 1000)
}

function num(v: unknown): number {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] !== '' && row[k] !== null && row[k] !== undefined) return row[k]
  }
  const lower: Record<string, unknown> = {}
  for (const rk of Object.keys(row)) lower[rk.toLowerCase().trim()] = row[rk]
  for (const k of keys) {
    const v = lower[k.toLowerCase().trim()]
    if (v !== '' && v !== null && v !== undefined) return v
  }
  return ''
}

// Build a line object from a flat record (used for both wizard JSON and xlsx rows)
function buildLine(src: Record<string, unknown>) {
  const get = (...keys: string[]) => {
    // wizard sends mapped keys; xlsx rows use raw headers — try both
    const direct = keys.find(k => k in src && src[k] !== '' && src[k] != null)
    if (direct) return src[direct]
    return pick(src, ...keys)
  }
  const billNo = str(get('billNo', 'INVOICE NO', 'INVOICE IDS', 'Bill No', 'BILL NO')) || null
  const invDateRaw = get('invDate', 'INVOICE DT', 'INVOICE DATE', 'Bill Date', 'BILL DATE')
  const invDate = str(invDateRaw) || null
  const month = str(get('month', 'Month', 'MONTH')) || null
  const invAmount = num(get('invAmount', 'Invoice Amount', 'INVOICE AMOUNT', 'Total Rent', 'TOTAL RENT'))
  const tdsAmount = num(get('tdsAmount', 'TDS Amount', 'TDS AMOUNT', 'TDS'))
  const amount = num(get('amount', 'Total Invoice Amount', 'TOTAL INVOICE AMOUNT', 'AMOUNT', 'Amount', 'Total'))
  const paidAmount = num(get('paidAmount', 'Paid Amount', 'PAID AMOUNT', 'Paid'))
  const balanceAmount = num(get('balanceAmount', 'Balance Amount', 'BALANCE AMOUNT', 'Balance'))
  const remarks = str(get('remarks', 'Remarks', 'REMARKS', 'Description', 'DESCRIPTION')) || null
  const voucherNo = str(get('voucherNo', 'Voucher no', 'VOUCHER NO', 'Voucher')) || null
  return {
    billNo,
    invDate: invDateRaw instanceof Date ? invDateRaw.toISOString().split('T')[0] : invDate,
    month,
    invAmount,
    gst: 0,
    tdsAmount,
    amount,
    paidAmount,
    balanceAmount,
    remarks,
    voucherNo,
  }
}

function buildAdviceData(first: Record<string, unknown>) {
  const get = (...keys: string[]) => {
    const direct = keys.find(k => k in first && first[k] !== '' && first[k] != null)
    if (direct) return first[direct]
    return pick(first, ...keys)
  }
  return {
    paymentDate: excelDateToJS(get('paymentDate', 'PAYMENT DATE', 'DATE', 'Advice Date', 'Date')) || new Date(),
    paymentMode: str(get('paymentMode', 'PAYMENT MODE', 'Mode', 'MODE')) || 'Bank Transfer',
    referenceNo: str(get('referenceNo', 'REFERENCE NO', 'Reference', 'REFERENCE')) || null,
    notes: str(get('notes', 'NOTES', 'Notes')) || null,
    supplierName: str(get('supplierName', 'Supplier Name', 'SUPPLIER NAME', 'Supplier', 'Party Name', 'PARTY NAME')) || null,
    vendorCode: str(get('vendorCode', 'Vendor Code', 'VENDOR CODE')) || null,
    panNo: str(get('panNo', 'PAN No', 'PAN NO', 'PAN')) || null,
    bankName: str(get('bankName', 'Bank Name', 'BANK NAME')) || null,
    accountNo: str(get('accountNo', 'Bank Account Number', 'BANK ACCOUNT NUMBER', 'Account No', 'ACCOUNT NO')) || null,
    ifscCode: str(get('ifscCode', 'IFSC Code', 'IFSC CODE', 'IFSC')) || null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    // ── Path A: wizard JSON ({ records: [...] }) ────────────────
    const ct = request.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const body = await request.json()
      const records: Record<string, unknown>[] = Array.isArray(body?.records) ? body.records : []
      if (records.length === 0) return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })

      let createdAdvices = 0, createdLines = 0, errors = 0, skipped = 0
      const errorRows: { adviceNo: string; message: string }[] = []
      const adviceMap = new Map<string, Record<string, unknown>[]>()
      for (const r of records) {
        const adviceNo = str(r.adviceNo ?? '')
        if (!adviceNo) { skipped++; continue }
        if (!adviceMap.has(adviceNo)) adviceMap.set(adviceNo, [])
        adviceMap.get(adviceNo)!.push(r)
      }
      for (const [adviceNo, adviceRows] of adviceMap) {
        try {
          const first = adviceRows[0]
          const lines = adviceRows.map(buildLine)
          const totalAmount = lines.reduce((s, l) => s + l.amount, 0) || num(first.amount)
          const data = { adviceNo, totalAmount, updatedAt: new Date(), ...buildAdviceData(first) }
          const existing = await pdb.finPaymentAdvice.findFirst({ where: { adviceNo } })
          if (existing) {
            await pdb.finPaymentAdviceLine.deleteMany({ where: { adviceId: existing.id } })
            await pdb.finPaymentAdvice.update({ where: { id: existing.id }, data: { ...data, lines: { create: lines } } })
          } else {
            await pdb.finPaymentAdvice.create({ data: { ...data, lines: { create: lines } } })
          }
          createdAdvices++
          createdLines += lines.length
        } catch (e) {
          errors++
          errorRows.push({ adviceNo, message: (e as Error).message || 'Unknown error' })
        }
      }
      return NextResponse.json({
        success: true,
        summary: { totalRows: records.length, createdAdvices, createdLines, rowErrors: errors, skipped },
        errorRows: errorRows.slice(0, 20),
      })
    }

    // ── Path B: uploaded Excel/CSV file (formData) ───────────────
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    let createdAdvices = 0, createdLines = 0, errors = 0, skipped = 0
    const errorRows: { adviceNo: string; message: string }[] = []

    const adviceMap = new Map<string, Record<string, unknown>[]>()
    for (const r of rows) {
      const adviceNo = str(pick(r, 'ADVICE NO', 'Advice No', 'PAYMENT ADVICE NO'))
      if (!adviceNo) { skipped++; continue }
      if (!adviceMap.has(adviceNo)) adviceMap.set(adviceNo, [])
      adviceMap.get(adviceNo)!.push(r)
    }

    for (const [adviceNo, adviceRows] of adviceMap) {
      try {
        const first = adviceRows[0]
        const lines = adviceRows.map(buildLine)
        const totalAmount = lines.reduce((s, l) => s + l.amount, 0) || num(pick(first, 'Amount', 'AMOUNT'))

        const existing = await pdb.finPaymentAdvice.findFirst({ where: { adviceNo } })
        const data = { adviceNo, totalAmount, updatedAt: new Date(), ...buildAdviceData(first) }

        if (existing) {
          await pdb.finPaymentAdviceLine.deleteMany({ where: { adviceId: existing.id } })
          await pdb.finPaymentAdvice.update({ where: { id: existing.id }, data: { ...data, lines: { create: lines } } })
        } else {
          await pdb.finPaymentAdvice.create({ data: { ...data, lines: { create: lines } } })
        }
        createdAdvices++
        createdLines += lines.length
      } catch (e) {
        errors++
        errorRows.push({ adviceNo, message: (e as Error).message || 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      summary: { createdAdvices, createdLines, rowErrors: errors, skipped },
      errorRows: errorRows.slice(0, 20),
    })
  } catch (error) {
    console.error('Payment advice import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
