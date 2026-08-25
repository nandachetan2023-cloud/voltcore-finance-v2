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
      if (!r.jobCode || !r.siteCode) { skipped++; continue }
      try {
        const site = await pdb.finSite.findFirst({ where: { siteCode: String(r.siteCode).trim() } })
        if (!site) { skipped++; continue }

        let poId: number | null = null
        if (r.poNo) {
          const po = await pdb.finPurchaseOrder.findFirst({ where: { poNo: String(r.poNo).trim() } })
          if (po) poId = po.id
        }

        const data = {
          siteId: site.id,
          poId,
          description: r.description || null,
          status: r.status || 'Active',
        }

        const existing = await pdb.finJob.findFirst({ where: { jobCode: String(r.jobCode).trim() } })
        if (existing) { await pdb.finJob.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.finJob.create({ data: { jobCode: String(r.jobCode).trim(), ...data } }); created++ }
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
