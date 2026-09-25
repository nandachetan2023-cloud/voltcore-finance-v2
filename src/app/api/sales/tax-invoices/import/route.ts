import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function excelDateToJS(serial: unknown): Date | null {
  if (serial === '' || serial === null || serial === undefined) return null
  if (typeof serial === 'string') {
    const m = serial.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/)
    if (m) {
      const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
      return new Date(yr, Number(m[2]) - 1, Number(m[1]))
    }
  }
  const n = Number(serial)
  if (isNaN(n) || n <= 0) return null
  const utcDays = Math.floor(n - 25569)
  return new Date(utcDays * 86400 * 1000)
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

// Number to Indian words
function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const w = (n: number): string => {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + w(n % 100) : '')
    if (n < 100000) return w(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + w(n % 1000) : '')
    if (n < 10000000) return w(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + w(n % 100000) : '')
    return w(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + w(n % 10000000) : '')
  }
  return w(Math.round(num))
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
      sheetName =
        wb.SheetNames.find(n => /master list tax invoice/i.test(n)) ||
        wb.SheetNames.find(n => /os details/i.test(n)) ||
        wb.SheetNames.find(n => /master/i.test(n)) ||
        wb.SheetNames[0]
    }
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ success: false, error: 'Sheet not found' }, { status: 400 })

    // Detect header row
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(5, raw.length); i++) {
      const joined = (raw[i] as unknown[]).map(c => str(c).toLowerCase()).join('|')
      if (joined.includes('bill no') || (joined.includes('invoice') && joined.includes('value'))) { headerRowIdx = i; break }
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: headerRowIdx })

    const customerCache = new Map<string, number>()
    let created = 0, skipped = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const billNo = str(pick(r, 'BILL NO.', 'Bill No.', 'BILL NO', 'Bill No'))
      if (!billNo) { skipped++; continue }

      const clientName = str(pick(r, 'CLIENT', 'Clinent', 'Client', 'CLINENT')) || 'Unknown Client'
      const invoiceValue = num(pick(r, 'INVOICE VALUE', 'Invoice Value'))
      const gstValue = num(pick(r, 'GST VALUE', 'GST Value'))
      const totalValue = num(pick(r, 'TOTAL INVOICE VALUE', 'Total Invoice Value')) || (invoiceValue + gstValue)
      if (totalValue === 0) { skipped++; continue }

      try {
        // Upsert customer
        let customerId = customerCache.get(clientName)
        if (!customerId) {
          let cust = await pdb.customer.findFirst({ where: { name: clientName } })
          if (!cust) cust = await pdb.customer.create({ data: { name: clientName, updatedAt: new Date() } })
          customerId = cust.id
          customerCache.set(clientName, customerId)
        }

        const billDate = excelDateToJS(pick(r, 'BILL DATE', 'Bill Date')) || new Date()
        const area = str(pick(r, 'AREA', 'Area'))
        const poNo = str(pick(r, 'PO NO.', 'PO No.', 'PO NO'))

        // Intra-state GST split (CGST 9% + SGST 9%)
        const cgst = gstValue / 2
        const sgst = gstValue / 2

        const existing = await pdb.salesTaxInvoice.findFirst({ where: { invoiceNo: billNo } })
        const invoiceData = {
          invoiceNo: billNo,
          invoiceDate: billDate,
          dueDate: billDate,
          customerId,
          customerName: clientName,
          placeOfSupply: area || null,
          poNo: poNo || null,
          taxableAmount: invoiceValue,
          cgstRate: 9,
          sgstRate: 9,
          igstRate: 0,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: 0,
          totalAmount: totalValue,
          amountInWords: `Rupees ${numberToWords(totalValue)} Only`,
          status: 'Submitted',
          updatedAt: new Date(),
        }

        const itemData = {
          description: area ? `Maintenance services — ${area}` : 'Maintenance services rendered',
          hsnSac: '998717',
          uom: 'LOT',
          quantity: 1,
          rate: invoiceValue,
          taxableValue: invoiceValue,
          cgstPercent: 9,
          sgstPercent: 9,
          igstPercent: 0,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: 0,
          total: totalValue,
        }

        if (existing) {
          await pdb.salesTaxInvoiceItem.deleteMany({ where: { invoiceId: existing.id } })
          await pdb.salesTaxInvoice.update({ where: { id: existing.id }, data: { ...invoiceData, items: { create: [itemData] } } })
        } else {
          await pdb.salesTaxInvoice.create({ data: { ...invoiceData, items: { create: [itemData] } } })
        }
        created++
      } catch (e) {
        errors++
        errorRows.push({ row: i + 2, message: (e as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      sheet: sheetName,
      summary: { totalRows: rows.length, created, skipped, errors },
      errorRows: errorRows.slice(0, 20),
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
