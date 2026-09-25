import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

function isValidPartyName(name: string): boolean {
  return name.trim().length >= 2 && !/^\d+\.?\d*$/.test(name.trim())
}

interface ImportRecord {
  code?: string
  name: string
  shortName?: string
  partyType?: string
  gstin?: string
  pan?: string
  contact?: string
  address?: string
  state?: string
  stateCode?: string
  udyam?: string
  tdsSection?: string
  tdsRate?: number
  gstTreatment?: string
  status?: string
}

// Commits rows already mapped and reviewed client-side (see the Upload → Map →
// Preview import wizard). Upserts by name, FinParty's required unique field.
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
      if (!r.name || !isValidPartyName(r.name)) { skipped++; continue }

      try {
        const data = {
          code: r.code || null,
          name: r.name,
          shortName: r.shortName || null,
          partyType: r.partyType || 'Other',
          gstin: r.gstin || null,
          pan: r.pan || null,
          contact: r.contact || null,
          address: r.address || null,
          state: r.state || null,
          stateCode: r.stateCode || null,
          udyam: r.udyam || null,
          tdsSection: r.tdsSection || null,
          tdsRate: r.tdsRate ? Number(r.tdsRate) : 0,
          gstTreatment: r.gstTreatment || 'Unregistered',
          isActive: (r.status || 'Active').toLowerCase() !== 'inactive',
        }

        const existing = await pdb.finParty.findFirst({ where: { name: r.name } })
        if (existing) { await pdb.finParty.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.finParty.create({ data }); created++ }
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
    console.error('Parties import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
