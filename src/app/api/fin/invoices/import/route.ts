import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// Convert Excel serial date number (or string) to JS Date
function excelDateToJS(serial: unknown): Date | null {
  if (serial === '' || serial === null || serial === undefined) return null
  // Already a date-like string (e.g. "10.04.2025")
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

function isValidPartyName(name: string): boolean {
  return name.trim().length >= 2 && !/^\d+\.?\d*$/.test(name.trim())
}

// Flexible column getter — tries multiple header spellings (handles typos in source files)
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] !== '' && row[k] !== null && row[k] !== undefined) return row[k]
  }
  // case-insensitive fallback
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

    // ── JSON records path (ImportWizard) ──
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json()
      const records = body.records as Record<string, unknown>[]
      if (!Array.isArray(records)) return NextResponse.json({ success: false, error: 'Expected { records: [...] }' }, { status: 400 })

      let created = 0, updated = 0, skipped = 0, errors = 0
      const partyCache = new Map<string, number>()
      const defaultSiteName = 'All Sites (Imported)'
      let defaultSiteId: number
      const existingSite = await pdb.finSite.findFirst({ where: { name: defaultSiteName } })
      if (existingSite) defaultSiteId = existingSite.id
      else { const s = await pdb.finSite.create({ data: { siteCode: 'IMP-001', name: defaultSiteName, status: 'Active' } }); defaultSiteId = s.id }

      for (const r of records) {
        const invoiceNo = str(r.invoiceNo)
        if (!invoiceNo) { skipped++; continue }
        try {
          const clientName = str(r.client || r.partyName) || 'Unknown Client'
          if (!isValidPartyName(clientName)) { skipped++; continue }
          let partyId = partyCache.get(clientName)
          if (!partyId) {
            let party = await pdb.finParty.findFirst({ where: { name: clientName } })
            if (!party) party = await pdb.finParty.create({ data: { name: clientName } })
            partyId = party.id
            partyCache.set(clientName, partyId)
          }

          const siteName = str(r.siteName) || defaultSiteName
          let siteId: number
          if (siteName === defaultSiteName) siteId = defaultSiteId
          else {
            const s = await pdb.finSite.findFirst({ where: { name: siteName } })
            siteId = s ? s.id : defaultSiteId
          }

          const invoiceValue = num(r.invoiceValue)
          const gstValue = num(r.gstValue)
          const grandTotal = num(r.grandTotal) || (invoiceValue + gstValue)
          const balanceAmount = num(r.balanceAmount) || grandTotal

          const data = {
            invoiceNo,
            trackingNo: str(r.trackingNo) || null,
            poNo: str(r.poNo) || null,
            siteId,
            partyId,
            client: clientName,
            area: str(r.area) || null,
            month: str(r.month) || null,
            invoiceDate: new Date(str(r.invoiceDate) || new Date()),
            dueDate: new Date(str(r.dueDate) || str(r.invoiceDate) || new Date()),
            eInvoiceDate: r.eInvoiceDate ? new Date(str(r.eInvoiceDate)) : null,
            invoiceValue,
            gstValue,
            grandTotal,
            balanceAmount,
            description: str(r.description) || null,
            remarks: str(r.remarks) || null,
            status: str(r.status) || 'Unpaid',
            tdsDeduction: num(r.tdsDeduction),
            kpiDeduction: num(r.kpiDeduction),
            safetyDeduction: num(r.safetyDeduction),
            otherDeduction: num(r.otherDeduction),
            totalDeduction: num(r.totalDeduction),
            afterTdsBalance: num(r.afterTdsBalance),
            receivedAmount: num(r.receivedAmount),
            roundoffAmount: num(r.roundoffAmount),
            voucherNo: str(r.voucherNo) || null,
            receivedDate: r.receivedDate ? new Date(str(r.receivedDate)) : null,
          }

          const existing = await pdb.finInvoice.findFirst({ where: { invoiceNo } })
          if (existing) { await pdb.finInvoice.update({ where: { id: existing.id }, data }); updated++ }
          else { await pdb.finInvoice.create({ data }); created++ }
        } catch { errors++ }
      }

      return NextResponse.json({
        success: true,
        summary: { totalRows: records.length, created, updated, skipped, errors },
      })
    }

    // ── FormData (file upload) path ──
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    let sheetName = (formData.get('sheet') as string) || ''

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // Auto-detect the master/list sheet if none specified
    if (!sheetName || !wb.Sheets[sheetName]) {
      sheetName =
        wb.SheetNames.find(n => /master list tax invoice/i.test(n)) ||
        wb.SheetNames.find(n => /os details/i.test(n)) ||
        wb.SheetNames.find(n => /master/i.test(n)) ||
        wb.SheetNames[0]
    }
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ success: false, error: `Sheet not found` }, { status: 400 })

    // The Master List header is on row 1; some sheets start at A3. Detect header row.
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(5, raw.length); i++) {
      const joined = (raw[i] as unknown[]).map(c => str(c).toLowerCase()).join('|')
      if (joined.includes('bill no') || (joined.includes('invoice') && joined.includes('value'))) { headerRowIdx = i; break }
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: headerRowIdx })

    const partyCache = new Map<string, number>()
    let created = 0, skipped = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    // Default rollup site
    const defaultSiteName = 'All Sites (Imported)'
    let defaultSiteId: number
    const existingSite = await pdb.finSite.findFirst({ where: { name: defaultSiteName } })
    if (existingSite) defaultSiteId = existingSite.id
    else { const s = await pdb.finSite.create({ data: { siteCode: 'IMP-001', name: defaultSiteName, status: 'Active' } }); defaultSiteId = s.id }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const billNo = str(pick(r, 'BILL NO.', 'Bill No.', 'BILL NO', 'Bill No'))
      if (!billNo) { skipped++; continue }

      const clientName = str(pick(r, 'CLIENT', 'Clinent', 'Client', 'CLINENT')) || 'Unknown Client'
      if (!isValidPartyName(clientName)) { skipped++; continue }
      const remarks = str(pick(r, 'REMARKS', 'Remarks'))
      const invoiceValue = num(pick(r, 'INVOICE VALUE', 'Invoice Value'))

      try {
        // Upsert party
        let partyId = partyCache.get(clientName)
        if (!partyId) {
          let party = await pdb.finParty.findFirst({ where: { name: clientName } })
          if (!party) party = await pdb.finParty.create({ data: { name: clientName } })
          partyId = party.id
          partyCache.set(clientName, partyId)
        }

        const gstValue = num(pick(r, 'GST VALUE', 'GST Value'))
        const totalInvoiceValue = num(pick(r, 'TOTAL INVOICE VALUE', 'Total Invoice Value'))
        const grandTotal = totalInvoiceValue || (invoiceValue + gstValue)
        const balanceAmount = num(pick(r, 'BALANCE AMOUNT', 'Balance Amount'))
        const receivedAmount = num(pick(r, 'RECEIVED AMOUNT', 'Received Amount'))

        let status = 'Unpaid'
        const rl = remarks.toLowerCase()
        if (rl.includes('cancel')) status = 'Cancelled'
        else if (rl.includes('received') && balanceAmount <= 0) status = 'Paid'
        else if (receivedAmount > 0 && balanceAmount > 0) status = 'Partially Paid'
        else if (balanceAmount <= 0 && (receivedAmount > 0 || totalInvoiceValue > 0) && grandTotal > 0) status = 'Paid'
        if (grandTotal === 0) status = 'Cancelled'

        const billDate = excelDateToJS(pick(r, 'BILL DATE', 'Bill Date')) || new Date()
        const eInvDate = excelDateToJS(pick(r, 'E Invoce Date', 'E Invoice Date', 'E INVOICE DATE'))
        const receivedDate = excelDateToJS(pick(r, 'RECEIVED DATE', 'Received Date'))

        const data = {
          invoiceNo: billNo,
          trackingNo: str(pick(r, 'TRACKING NO.', 'Tracking No.', 'TRACKING NO')) || null,
          poNo: str(pick(r, 'PO NO.', 'PO No.', 'PO NO')) || null,
          siteId: defaultSiteId,
          partyId,
          client: clientName,
          area: str(pick(r, 'AREA', 'Area')) || null,
          month: str(pick(r, 'MONTH', 'Month')) || null,
          invoiceDate: billDate,
          eInvoiceDate: eInvDate,
          dueDate: billDate,
          invoiceValue,
          gstValue,
          grandTotal,
          tdsDeduction: num(pick(r, 'TDS DEDUCTION')),
          kpiDeduction: num(pick(r, 'KPI DEDUCTION')),
          safetyDeduction: num(pick(r, 'SAFETY DEDUCTION/Retention')),
          otherDeduction: num(pick(r, 'OTHER/ADVANCE DEDUCTION')),
          totalDeduction: num(pick(r, 'TOTAL DEDUCTION')),
          afterTdsBalance: num(pick(r, 'AFTER TDS BALANCE AMT.')),
          receivedAmount,
          receivedAmount2: num(pick(r, 'RECEIVED AMOUNT-2 PH')),
          receivedDate,
          voucherNo: str(pick(r, 'VOUCHER NO.')) || null,
          roundoffAmount: num(pick(r, 'ROUNDOFF AMOUNT')),
          balanceAmount,
          remarks: remarks || null,
          status,
        }

        const existing = await pdb.finInvoice.findFirst({ where: { invoiceNo: billNo } })
        if (existing) await pdb.finInvoice.update({ where: { id: existing.id }, data })
        else await pdb.finInvoice.create({ data })
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
