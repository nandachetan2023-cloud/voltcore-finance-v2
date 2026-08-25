import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  date: string
  amount: number
  bankAccountId?: number
  type?: string
  balance?: number
  reference?: string
  party?: string
  description?: string
  category?: string
  status?: string
  siteCode?: string
  jobCode?: string
  poNo?: string
  costCenter?: string
  department?: string
  projectManager?: string
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const records: ImportRecord[] = Array.isArray(body?.records) ? body.records : []
    if (records.length === 0) return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })

    let created = 0, updated = 0, skipped = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      if (!r.date || !r.amount || !r.bankAccountId || !r.siteCode || !r.jobCode || !r.poNo || !r.department || !r.projectManager) { skipped++; continue }
      try {
        const data = {
          bankAccountId: Number(r.bankAccountId),
          date: r.date ? new Date(r.date) : new Date(),
          type: r.type || 'Debit', amount: Number(r.amount) || 0,
          balance: Number(r.balance) || 0, reference: r.reference || null,
          party: r.party || null, description: r.description || null,
          category: r.category || null, status: r.status || 'Completed',
          siteCode: r.siteCode,
          jobCode: r.jobCode,
          poNo: r.poNo,
          costCenter: r.costCenter,
          department: r.department,
          projectManager: r.projectManager,
        }
        await pdb.bankTransaction.create({ data }); created++
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
