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
      if (!r.creditNoteNo || !r.siteId || !r.jobCode || !r.poNo || !r.department || !r.projectManager) { skipped++; continue }
      try {
        const data = {
          creditNoteNo: r.creditNoteNo, trackingNo: r.trackingNo || null,
          poNo: r.poNo || null, invoiceId: Number(r.invoiceId) || 0,
          siteId: Number(r.siteId) || 0, jobCode: r.jobCode || null,
          costCenter: r.costCenter || null, department: r.department || null, projectManager: r.projectManager || null,
          creditNoteAgainstInvoiceNo: r.creditNoteAgainstInvoiceNo || null,
          client: r.client || null, area: r.area || null, monthWork: r.monthWork || null,
          date: r.date ? new Date(r.date) : new Date(),
          invoiceValue: Number(r.invoiceValue) || 0, gstValue: Number(r.gstValue) || 0,
          totalInvoiceValue: Number(r.totalInvoiceValue) || 0, amount: Number(r.amount) || 0,
          afterTdsBalance: Number(r.afterTdsBalance) || 0, receivedAmount: Number(r.receivedAmount) || 0,
          receivedDate: r.receivedDate ? new Date(r.receivedDate) : null,
          voucherNo: r.voucherNo || null, debitAmount: Number(r.debitAmount) || 0,
          holdAmount: Number(r.holdAmount) || 0, reason: r.reason || null,
          remarks: r.remarks || null, status: r.status || 'Issued',
        }
        const existing = await pdb.finCreditNote.findFirst({ where: { creditNoteNo: r.creditNoteNo } })
        if (existing) { await pdb.finCreditNote.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.finCreditNote.create({ data }); created++ }
      } catch (e) { errors++; errorRows.push({ row: i + 1, message: (e as Error).message }) }
    }

    return NextResponse.json({ success: true, summary: { totalRows: records.length, created, updated, skipped, errors }, errorRows: errorRows.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
