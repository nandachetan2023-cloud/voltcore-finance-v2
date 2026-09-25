import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function excelDateToJS(serial: unknown): Date | null {
  if (serial === '' || serial === null || serial === undefined) return null
  if (typeof serial === 'string') {
    const m = serial.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/)
    if (m) return new Date(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]) - 1, Number(m[1]))
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
  const lowerMap: Record<string, unknown> = {}
  for (const rk of Object.keys(row)) lowerMap[rk.toLowerCase().trim()] = row[rk]
  for (const k of keys) {
    const v = lowerMap[k.toLowerCase().trim()]
    if (v !== '' && v !== null && v !== undefined) return v
  }
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    let sheetName = (formData.get('sheet') as string) || ''

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    if (!sheetName || !wb.Sheets[sheetName]) {
      sheetName = wb.SheetNames.find(n => /expense/i.test(n)) || wb.SheetNames[0]
    }
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ success: false, error: `Sheet not found` }, { status: 400 })

    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(5, raw.length); i++) {
      const joined = (raw[i] as unknown[]).map(c => str(c).toLowerCase()).join('|')
      if (joined.includes('date') || joined.includes('site')) {
        headerRowIdx = i
        break
      }
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: headerRowIdx })

    const sampleData = rows.slice(0, 10).map(row => ({
      date: str(pick(row, 'Date', 'date', 'DATE')),
      siteType: str(pick(row, 'SiteType', 'Site Type', 'SITE TYPE')),
      category: str(pick(row, 'Category', 'category', 'CATEGORY')),
      itemName: str(pick(row, 'ItemName', 'Item Name', 'ITEM NAME')),
      description: str(pick(row, 'Description', 'description', 'DESCRIPTION')),
      totalAmount: num(pick(row, 'TotalAmount', 'Total Amount', 'TOTAL AMOUNT')),
      receivedAmount: num(pick(row, 'ReceivedAmount', 'Received Amount', 'RECEIVED AMOUNT')),
      gstAmount: num(pick(row, 'GSTAmount', 'GST Amount', 'GST AMOUNT')),
      tdsAmount: num(pick(row, 'TDSAmount', 'TDS Amount', 'TDS AMOUNT')),
      billNo: str(pick(row, 'BillNo', 'Bill No', 'BILL NO')),
      approvalStatus: str(pick(row, 'ApprovalStatus', 'Approval Status', 'APPROVAL STATUS')),
    }))

    return NextResponse.json({
      success: true,
      sheetName,
      header: Object.keys(sampleData[0]).filter(k => sampleData[0][k] !== ''),
      rowCount: rows.length,
      sample: sampleData,
      fieldsMapping: {
        date: 'Date',
        siteType: 'SiteType (HO)',
        category: 'Category',
        itemName: 'ItemName',
        description: 'Description',
        totalAmount: 'TotalAmount',
        receivedAmount: 'ReceivedAmount',
        gstAmount: 'GSTAmount',
        tdsAmount: 'TDSAmount',
        billNo: 'BillNo',
        approvalStatus: 'ApprovalStatus (Draft by default)',
      }
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Preview failed' }, { status: 500 })
  }
}