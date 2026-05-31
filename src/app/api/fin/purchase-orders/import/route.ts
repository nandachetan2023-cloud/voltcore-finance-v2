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

    // Default rollup site
    const defaultSiteName = 'All Sites (Imported)'
    let siteId: number
    const existing = await pdb.finSite.findFirst({ where: { name: defaultSiteName } })
    if (existing) siteId = existing.id
    else { const s = await pdb.finSite.create({ data: { siteCode: 'IMP-001', name: defaultSiteName, status: 'Active' } }); siteId = s.id }

    let created = 0, skipped = 0, errors = 0
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const poNo = str(pick(r, 'WORK ORDER NO', 'PO NO', 'PO No.', 'Work Order No', 'WO NO'))
      if (!poNo) { skipped++; continue }
      const vendorName = str(pick(r, 'PARTY', 'VENDOR', 'Vendor', 'Party Name')) || 'Unknown Vendor'
      try {
        const existingPo = await pdb.finPurchaseOrder.findFirst({ where: { poNo } })
        const data = {
          poNo,
          vendorId: str(pick(r, 'VENDOR ID', 'Vendor Code')) || 'NA',
          vendorName,
          siteId,
          date: excelDateToJS(pick(r, 'DATE', 'PO DATE', 'Order Date')) || new Date(),
          descriptionOfWork: str(pick(r, 'DESCRIPTION', 'Description of Work', 'WORK')) || null,
          totalAmount: num(pick(r, 'ORDER AMOUNT', 'AMOUNT', 'Total Amount', 'TOTAL')),
          status: 'Active',
          updatedAt: new Date(),
        }
        if (existingPo) await pdb.finPurchaseOrder.update({ where: { id: existingPo.id }, data })
        else await pdb.finPurchaseOrder.create({ data })
        created++
      } catch { errors++ }
    }

    return NextResponse.json({ success: true, summary: { createdWorkOrders: created, updatedWorkOrders: 0, rowErrors: errors, skipped } })
  } catch (error) {
    console.error('PO import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
