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
      if (!r.category || !r.description) { skipped++; continue }
      try {
        const planned = Number(r.planned) || 0, actual = Number(r.actual) || 0
        const variance = Number.isFinite(Number(r.variance)) ? Number(r.variance) : planned - actual
        const data = {
          category: r.category, description: r.description,
          planned, actual, variance,
          jobCode: r.jobCode || null, poNo: r.poNo || null,
          costCenter: r.costCenter || null, department: r.department || null,
          projectManager: r.projectManager || null,
          period: r.period || 'FY 2024-25', month: r.month || null,
          status: r.status || 'On Track',
        }
        const existing = await pdb.budgetItem.findFirst({ where: { category: r.category, period: data.period } })
        if (existing) { await pdb.budgetItem.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.budgetItem.create({ data }); created++ }
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
