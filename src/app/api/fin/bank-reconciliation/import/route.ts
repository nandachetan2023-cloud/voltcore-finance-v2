import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  date: string
  type?: string
  party?: string
  description?: string
  category?: string
  amount: number | string
  balance?: number | string
  reference?: string
  status?: string
}

// Commits rows already mapped and reviewed client-side (see fin-bank-reconciliation.tsx's
// Upload → Map → Preview import wizard). All rows are attached to the bank account the
// user had selected when they opened the importer.
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bankAccountId = Number(searchParams.get('bankAccountId'))
    if (!bankAccountId) {
      return NextResponse.json({ success: false, error: 'bankAccountId is required' }, { status: 400 })
    }

    const pdb = getDbForRequest(request)
    const account = await pdb.bankAccount.findUnique({ where: { id: bankAccountId } })
    if (!account) {
      return NextResponse.json({ success: false, error: 'Bank account not found' }, { status: 404 })
    }

    const body = await request.json()
    const records: ImportRecord[] = Array.isArray(body?.records) ? body.records : []
    if (records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })
    }

    let created = 0, skipped = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      if (!r.date || r.amount === undefined || r.amount === '') { skipped++; continue }

      try {
        const isDebit = (r.type || '').toLowerCase().startsWith('d')
        const magnitude = Math.abs(Number(r.amount))
        await pdb.bankTransaction.create({
          data: {
            bankAccountId,
            date: new Date(r.date),
            type: r.type || (isDebit ? 'Debit' : 'Credit'),
            amount: isDebit ? -magnitude : magnitude,
            balance: r.balance !== undefined && r.balance !== '' ? Number(r.balance) : 0,
            reference: r.reference || null,
            party: r.party || null,
            description: r.description || null,
            category: r.category || null,
            status: r.status || 'Completed',
          },
        })
        created++
      } catch (e) {
        errors++
        errorRows.push({ row: i + 1, message: (e as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      summary: { totalRows: records.length, created, updated: 0, skipped, errors },
      errorRows: errorRows.slice(0, 20),
    })
  } catch (error) {
    console.error('Bank reconciliation import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
