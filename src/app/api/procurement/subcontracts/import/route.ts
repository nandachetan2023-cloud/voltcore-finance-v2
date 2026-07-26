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
      if (!r.subcontractNo) { skipped++; continue }
      try {
        const data = {
          subcontractNo: r.subcontractNo, vendor: r.vendor || '',
          project: r.project || '', scopeSummary: r.scopeSummary || null,
          value: Number(r.value) || 0,
          startDate: r.startDate ? new Date(r.startDate) : new Date(),
          endDate: r.endDate ? new Date(r.endDate) : new Date(),
          percentComplete: Number(r.percentComplete) || 0,
          status: r.status || 'Active',
          retentionPercent: Number(r.retentionPercent) || 0,
          notes: r.notes || null,
        }
        const existing = await pdb.finSubcontract.findFirst({ where: { subcontractNo: r.subcontractNo } })
        if (existing) { await pdb.finSubcontract.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.finSubcontract.create({ data }); created++ }
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
