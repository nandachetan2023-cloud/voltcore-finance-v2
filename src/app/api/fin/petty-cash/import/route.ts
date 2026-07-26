import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  voucherNo: string
  date: string
  description: string
  amount: number
  type?: string
  category?: string
  authorizedBy?: string
  paymentMode?: string
  balance?: number | string
}

function hasExplicitBalance(v: number | string | undefined): v is number | string {
  return v !== undefined && v !== null && String(v).trim() !== ''
}

// Commits rows already mapped and reviewed client-side (see the Upload → Map →
// Preview import wizard). Upserts by voucherNo.
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

    // New rows extend the running cash balance; corrections to existing
    // vouchers (upsert-update) leave the stored balance untouched.
    const last = await pdb.finPettyCash.findFirst({ orderBy: { id: 'desc' } })
    let runningBalance = last?.balance ?? 0

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const date = new Date(r.date)
      if (!r.voucherNo || !r.description || isNaN(date.getTime())) { skipped++; continue }

      try {
        const type = r.type || 'Debit'
        const amount = Number(r.amount) || 0
        const explicitBalance = hasExplicitBalance(r.balance) ? Number(r.balance) : undefined
        const data = {
          voucherNo: r.voucherNo,
          date,
          description: r.description,
          amount,
          type,
          category: r.category || null,
          authorizedBy: r.authorizedBy || null,
          paymentMode: r.paymentMode || null,
          ...(explicitBalance !== undefined ? { balance: explicitBalance } : {}),
        }

        const existing = await pdb.finPettyCash.findFirst({ where: { voucherNo: r.voucherNo } })
        if (existing) { await pdb.finPettyCash.update({ where: { id: existing.id }, data }); updated++ }
        else {
          runningBalance = explicitBalance !== undefined ? explicitBalance : runningBalance + (type === 'Credit' ? amount : -amount)
          await pdb.finPettyCash.create({ data: { ...data, balance: runningBalance } })
          created++
        }
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
    console.error('Petty cash import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
