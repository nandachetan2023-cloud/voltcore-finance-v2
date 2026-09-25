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
    const previewJson = formData.get('preview') as string
    let sheetName = (formData.get('sheet') as string) || ''

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    if (!sheetName || !wb.Sheets[sheetName]) {
      sheetName = wb.SheetNames.find(n => /expense/i.test(n)) || wb.SheetNames[0]
    }
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ success: false, error: `Sheet not found` }, { status: 400 })

    const preview = previewJson ? JSON.parse(previewJson) : null
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

    const claimNumberMap = new Map<string, number>()
    let createdClaims = 0
    let createdItems = 0
    let errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const date = str(pick(row, 'Date', 'date', 'DATE'))
      const siteType = str(pick(row, 'SiteType', 'Site Type', 'SITE TYPE'))
      const category = str(pick(row, 'Category', 'category', 'CATEGORY'))
      const itemName = str(pick(row, 'ItemName', 'Item Name', 'ITEM NAME'))
      const description = str(pick(row, 'Description', 'description', 'DESCRIPTION'))
      const totalAmount = num(pick(row, 'TotalAmount', 'Total Amount', 'TOTAL AMOUNT'))
      const receivedAmount = num(pick(row, 'ReceivedAmount', 'Received Amount', 'RECEIVED AMOUNT'))
      const gstAmount = num(pick(row, 'GSTAmount', 'GST Amount', 'GST AMOUNT'))
      const tdsAmount = num(pick(row, 'TDSAmount', 'TDS Amount', 'TDS AMOUNT'))
      const billNo = str(pick(row, 'BillNo', 'Bill No', 'BILL NO'))
      const approvalStatus = str(pick(row, 'ApprovalStatus', 'Approval Status', 'APPROVAL STATUS'))

      if (!date || !totalAmount) { errors++; continue }

      const claimDate = excelDateToJS(date) || new Date()
      const claimedAmount = totalAmount - gstAmount - tdsAmount

      const prefix = 'HOEXP'
      const dateStr = claimDate.toISOString().slice(0, 10).replace(/-/g, '')
      const yearStr = dateStr.slice(0, 4)
      const seqMap = claimNumberMap.get(yearStr) || 0
      const seq = (seqMap + 1).toString().padStart(4, '0')
      claimNumberMap.set(yearStr, seqMap + 1)
      const claimNo = `${prefix}-${dateStr}-${seq}`

      // HO default site
      const hoSite = await pdb.finSite.findFirst({ where: { siteCode: 'HO' }, select: { id: true } })
      const defaultSiteId = hoSite?.id || 1

      try {
        const existing = await pdb.finExpenseClaim.findFirst({ where: { claimNo } })
        if (existing) {
          await pdb.finExpenseClaim.update({
            where: { id: existing.id },
            data: {
              siteType: siteType || 'HO',
              expenseType: category,
              totalAmount,
              receivedAmount,
              gstAmount,
              tdsAmount,
              billNo: billNo || null,
              approvalStatus: approvalStatus || 'Draft',
              date: claimDate,
              updatedAt: new Date(),
            },
          })
          createdClaims++
        } else {
          const claim = await pdb.finExpenseClaim.create({
            data: {
              claimNo,
              siteId: defaultSiteId,
              siteType: siteType || 'HO',
              expenseType: category,
              totalAmount,
              receivedAmount,
              gstAmount,
              tdsAmount,
              billNo: billNo || null,
              approvalStatus: approvalStatus || 'Draft',
              date: claimDate,
              submittedBy: 'Finance Import System',
              status: 'Pending',
              remarks: description || null,
              postedAt: new Date(),
            },
          })
          createdClaims++

          const itemAmount = totalAmount || receivedAmount || 0
          if (itemAmount > 0 || category || itemName) {
            await pdb.finExpenseItem.create({
              data: {
                claimId: claim.id,
                itemDate: claimDate,
                category: category || '',
                name: itemName || null,
                description: `From import: ${billNo || 'Imported'}`,
                amount: itemAmount,
                remark: description || null,
              },
            })
            createdItems++
          }
        }
      } catch (e) {
        errors++
        errorRows.push({ row: i + 1, message: (e as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rows.length,
        createdClaims,
        createdItems,
        errors,
        errorRows: errorRows.slice(0, 20),
      }
    })
  } catch (error) {
    console.error('Commit error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Commit failed' }, { status: 500 })
  }
}