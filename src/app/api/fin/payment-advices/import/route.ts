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

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    let createdAdvices = 0, createdLines = 0, errors = 0, skipped = 0

    // Group rows by advice number (multiple invoices per advice)
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
        const lines = adviceRows.map(r => ({
          billNo: str(pick(r, 'INVOICE IDS', 'INVOICE NO', 'Bill No', 'BILL NO')) || null,
          amount: num(pick(r, 'AMOUNT', 'Amount')),
          remarks: str(pick(r, 'REMARKS', 'Remarks')) || null,
        }))
        const totalAmount = lines.reduce((s, l) => s + l.amount, 0)

        const existing = await pdb.finPaymentAdvice.findFirst({ where: { adviceNo } })
        const data = {
          adviceNo,
          totalAmount,
          paymentDate: excelDateToJS(pick(first, 'PAYMENT DATE', 'DATE', 'Advice Date')) || new Date(),
          paymentMode: str(pick(first, 'PAYMENT MODE', 'Mode')) || 'Bank Transfer',
          referenceNo: str(pick(first, 'REFERENCE NO', 'Reference')) || null,
          notes: str(pick(first, 'NOTES', 'Notes')) || null,
          updatedAt: new Date(),
        }

        if (existing) {
          await pdb.finPaymentAdviceLine.deleteMany({ where: { adviceId: existing.id } })
          await pdb.finPaymentAdvice.update({ where: { id: existing.id }, data: { ...data, lines: { create: lines } } })
        } else {
          await pdb.finPaymentAdvice.create({ data: { ...data, lines: { create: lines } } })
        }
        createdAdvices++
        createdLines += lines.length
      } catch { errors++ }
    }

    return NextResponse.json({ success: true, summary: { createdAdvices, createdLines, rowErrors: errors, skipped } })
  } catch (error) {
    console.error('Payment advice import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
