import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  invoiceNo: string
  client: string
  clientCode?: string
  invoiceRef?: string
  description?: string
  amount?: number
  tax?: number
  totalAmount?: number
  dueDate: string
  status?: string
  receivedAmount?: number
  tdsAmount?: number
  deductionType?: string
  otherDeduction?: number
  siteId?: number
  siteCode?: string
  jobCode?: string
  poNo?: string
  costCenter?: string
  department?: string
  projectManager?: string
}

// Commits rows already mapped and reviewed client-side (see the Upload → Map →
// Preview import wizard). Upserts by invoiceNo.
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
      const dueDate = new Date(r.dueDate)
      if (!r.invoiceNo || !r.client || isNaN(dueDate.getTime())) { skipped++; continue }

      try {
        const amount = Number(r.amount) || 0
        const tax = Number(r.tax) || 0
        const receivedAmount = Number(r.receivedAmount) || 0
        const tdsAmount = Number(r.tdsAmount) || 0
        const otherDeduction = Number(r.otherDeduction) || 0
        let siteId: number | null = r.siteId ? Number(r.siteId) : null
        if (!siteId && r.siteCode) {
          const site = await pdb.finSite.findUnique({ where: { siteCode: r.siteCode } })
          siteId = site?.id ?? null
        }
        const data = {
          invoiceNo: r.invoiceNo,
          client: r.client,
          clientCode: r.clientCode || null,
          invoiceRef: r.invoiceRef || null,
          description: r.description || null,
          amount,
          tax,
          totalAmount: Number(r.totalAmount) || amount + tax,
          receivedAmount,
          tdsAmount,
          deductionType: r.deductionType || null,
          otherDeduction,
          siteId,
          jobCode: r.jobCode || null,
          poNo: r.poNo || null,
          costCenter: r.costCenter || null,
          department: r.department || null,
          projectManager: r.projectManager || null,
          dueDate,
          status: r.status || 'Pending',
        }

        const existing = await pdb.accountsReceivable.findFirst({ where: { invoiceNo: r.invoiceNo } })
        if (existing) { await pdb.accountsReceivable.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.accountsReceivable.create({ data }); created++ }
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
    console.error('AR import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
