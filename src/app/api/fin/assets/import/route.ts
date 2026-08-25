import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  assetCode: string
  name: string
  category?: string
  serialNo?: string
  acquisitionDate: string
  cost?: number
  salvageValue?: number
  usefulLife?: number
  depreciationMethod?: string
  custodian?: string
  jobCode?: string
  poNo?: string
  costCenter?: string
  department?: string
  projectManager?: string
  status?: string
}

// Commits rows already mapped and reviewed client-side (see the Upload → Map →
// Preview import wizard). Upserts by assetCode.
export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const records: ImportRecord[] = Array.isArray(body?.records) ? body.records : []

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })
    }

    let created = 0, updated = 0, skipped = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const acquisitionDate = new Date(r.acquisitionDate)
      if (!r.assetCode || !r.name || isNaN(acquisitionDate.getTime()) || !r.jobCode || !r.poNo || !r.department || !r.projectManager) { skipped++; continue }

      try {
        const data = {
          assetCode: r.assetCode,
          name: r.name,
          category: r.category || 'Machinery',
          serialNo: r.serialNo || null,
          acquisitionDate,
          cost: Number(r.cost) || 0,
          salvageValue: Number(r.salvageValue) || 0,
          usefulLife: Number(r.usefulLife) || 5,
          depreciationMethod: r.depreciationMethod || 'Straight Line',
          custodian: r.custodian || null,
          jobCode: r.jobCode,
          poNo: r.poNo,
          costCenter: r.costCenter,
          department: r.department,
          projectManager: r.projectManager,
          status: r.status || 'Active',
        }

        const existing = await pdb.finAsset.findFirst({ where: { assetCode: r.assetCode } })
        if (existing) { await pdb.finAsset.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.finAsset.create({ data }); created++ }
      } catch (e) {
        errors++
        errorRows.push({ row: i + 1, message: (e as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      summary: { totalRows: records.length, created, updated, skipped, errors },
      errorRows: errorRows.slice(0, 20),
    })
  } catch (error) {
    console.error('Assets import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
