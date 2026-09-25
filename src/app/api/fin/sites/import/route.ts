import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  siteCode: string
  name: string
  location?: string | null
  state?: string | null
  contactPerson?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  budget?: number
  status?: string
}

// Commits rows that have already been mapped and reviewed client-side (see the
// Upload → Map → Preview import wizard). Upserts by siteCode.
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
      if (!r.siteCode || !r.name) { skipped++; continue }

      try {
        const data = {
          siteCode: r.siteCode,
          name: r.name,
          location: r.location || null,
          state: r.state || null,
          contactPerson: r.contactPerson || null,
          contactPhone: r.contactPhone || null,
          contactEmail: r.contactEmail || null,
          budget: Number(r.budget) || 0,
          status: r.status || 'Active',
        }

        const existing = await pdb.finSite.findFirst({ where: { siteCode: r.siteCode } })
        if (existing) { await pdb.finSite.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.finSite.create({ data }); created++ }
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
    console.error('Sites import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
