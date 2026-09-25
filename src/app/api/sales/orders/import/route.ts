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
      if (!r.soNo) { skipped++; continue }
      try {
        const data = {
          soNo: r.soNo, soDate: r.soDate ? new Date(r.soDate) : new Date(),
          customerId: Number(r.customerId) || 1,
          quotationId: r.quotationId ? Number(r.quotationId) : null,
          status: r.status || 'draft', totalAmount: Number(r.totalAmount) || 0,
        }
        const existing = await pdb.salesOrder.findFirst({ where: { soNo: r.soNo } })
        if (existing) { await pdb.salesOrder.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.salesOrder.create({ data }); created++ }
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
