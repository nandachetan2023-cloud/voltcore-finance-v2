import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const records: any[] = Array.isArray(body?.records) ? body.records : []
    if (records.length === 0) return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })

    // FinJournalEntry requires a real siteId — legacy imports had no site
    // column, so fall back to a shared "Imported" site, same pattern
    // already used by the PO import route for the same reason.
    const defaultSiteName = 'All Sites (Imported)'
    let defaultSiteId: number
    const existingSite = await pdb.finSite.findFirst({ where: { name: defaultSiteName } })
    if (existingSite) defaultSiteId = existingSite.id
    else { const s = await pdb.finSite.create({ data: { siteCode: 'IMP-JE-001', name: defaultSiteName, status: 'Active' } }); defaultSiteId = s.id }

    // Multi-line entries share an entryNo in the flat import format — group
    // rows so each entryNo becomes one real double-entry FinJournalEntry.
    const groups = new Map<string, any[]>()
    let skipped = 0
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      if (!r.entryNo || !r.account) { skipped++; continue }
      if (!groups.has(r.entryNo)) groups.set(r.entryNo, [])
      groups.get(r.entryNo)!.push({ ...r, __row: i + 1 })
    }

    let created = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (const [entryNo, rows] of groups) {
      try {
        const resolvedLines: { accountId: number; description: string | null; debit: number; credit: number }[] = []
        for (const r of rows) {
          const account = await pdb.finAccount.findUnique({ where: { accountCode: r.account } })
          if (!account) throw new Error(`Unknown account code: ${r.account}`)
          resolvedLines.push({
            accountId: account.id,
            description: r.description || null,
            debit: Number(r.debit) || 0,
            credit: Number(r.credit) || 0,
          })
        }
        const totalDebit = resolvedLines.reduce((s, l) => s + l.debit, 0)
        const totalCredit = resolvedLines.reduce((s, l) => s + l.credit, 0)
        const first = rows[0]

        const existing = await pdb.finJournalEntry.findFirst({ where: { entryNo } })
        if (existing) {
          await pdb.$transaction(async (tx) => {
            await tx.finJournalLine.deleteMany({ where: { entryId: existing.id } })
            await tx.finJournalEntry.update({
              where: { id: existing.id },
              data: { totalDebit, totalCredit, lines: { create: resolvedLines } },
            })
          })
        } else {
          await pdb.finJournalEntry.create({
            data: {
              entryNo,
              entryDate: first.date ? new Date(first.date) : new Date(),
              description: first.description || null,
              reference: first.reference || null,
              voucherType: first.voucherType || 'Journal',
              siteId: defaultSiteId,
              finSiteId: defaultSiteId,
              status: 'Draft',
              totalDebit,
              totalCredit,
              lines: { create: resolvedLines },
            },
          })
        }
        created++
      } catch (e) {
        errors++
        errorRows.push({ row: rows[0].__row, message: (e as Error).message })
      }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated: 0, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
