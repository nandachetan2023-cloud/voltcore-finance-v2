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
      if (!r.entryNo || !r.account) { skipped++; continue }
      try {
        const data = {
          entryNo: r.entryNo, date: r.date ? new Date(r.date) : new Date(),
          account: r.account, accountName: r.accountName || null,
          debit: Number(r.debit) || 0, credit: Number(r.credit) || 0,
          description: r.description || null, reference: r.reference || null,
          voucherType: r.voucherType || null, status: r.status || 'Posted',
        }
        await pdb.journalEntry.create({ data }); created++
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
