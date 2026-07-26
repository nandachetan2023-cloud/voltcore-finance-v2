import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const records: any[] = Array.isArray(body?.records) ? body.records : []
    if (records.length === 0) return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })

    let created = 0, updated = 0, skipped = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      if (!r.quotationNo) { skipped++; continue }
      try {
        const data = {
          quotationNo: r.quotationNo, quotationDate: r.quotationDate ? new Date(r.quotationDate) : new Date(),
          customerId: Number(r.customerId) || 1,
          validUntil: r.validUntil ? new Date(r.validUntil) : null,
          status: r.status || 'draft', subtotal: Number(r.subtotal) || 0,
          taxAmount: Number(r.taxAmount) || 0, totalAmount: Number(r.totalAmount) || 0,
        }
        const existing = await pdb.quotation.findFirst({ where: { quotationNo: r.quotationNo } })
        if (existing) { await pdb.quotation.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.quotation.create({ data }); created++ }
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
