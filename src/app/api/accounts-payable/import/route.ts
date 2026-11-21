import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  billNo: string
  vendor: string
  vendorCode?: string
  invoiceRef?: string
  description?: string
  amount?: number
  tax?: number
  totalAmount?: number
  dueDate: string
  status?: string
  siteId?: number
  siteCode?: string
  poId?: number
  poNo?: string
  jobCode?: string
  costCenter?: string
  department?: string
  projectManager?: string
}

// Commits rows already mapped and reviewed client-side (see the Upload → Map →
// Preview import wizard). Upserts by billNo.
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
      if (!r.billNo || !r.vendor || isNaN(dueDate.getTime())) { skipped++; continue }

      try {
        const amount = Number(r.amount) || 0
        const tax = Number(r.tax) || 0
        let siteId: number | null = r.siteId ? Number(r.siteId) : null
        if (!siteId && r.siteCode) {
          const site = await pdb.finSite.findUnique({ where: { siteCode: r.siteCode } })
          siteId = site?.id ?? null
        }
        const missing = [
          !siteId && 'siteCode',
          !r.jobCode?.trim() && 'jobCode',
          !r.poNo?.trim() && !r.poId && 'poNo (or NA)',
          !r.costCenter?.trim() && 'costCenter',
          !r.department?.trim() && 'department',
          !r.projectManager?.trim() && 'projectManager',
        ].filter(Boolean)
        if (missing.length) {
          errors++
          errorRows.push({ row: i + 1, message: `Missing required fields: ${missing.join(', ')}` })
          continue
        }

        const job = await pdb.finJob.findUnique({ where: { jobCode: r.jobCode!.trim() }, select: { siteId: true } })
        if (!job || job.siteId !== siteId) {
          errors++
          errorRows.push({ row: i + 1, message: job ? 'Job does not belong to the selected site' : 'Job was not found' })
          continue
        }

        let poId: number | null = null
        if (r.poId) {
          poId = Number(r.poId)
        } else if (r.poNo?.trim() && r.poNo.trim().toUpperCase() !== 'NA') {
          const po = await pdb.finPurchaseOrder.findFirst({
            where: { poNo: r.poNo.trim() },
            select: { id: true, siteId: true, jobCode: true },
          })
          if (!po) {
            errors++
            errorRows.push({ row: i + 1, message: 'Purchase order was not found' })
            continue
          }
          if (po.siteId !== siteId || (po.jobCode && po.jobCode !== r.jobCode!.trim())) {
            errors++
            errorRows.push({ row: i + 1, message: 'Purchase order does not match the selected site and job' })
            continue
          }
          poId = po.id
        }
        const data = {
          billNo: r.billNo,
          vendor: r.vendor,
          vendorCode: r.vendorCode || null,
          invoiceRef: r.invoiceRef || null,
          description: r.description || null,
          amount,
          tax,
          totalAmount: Number(r.totalAmount) || amount + tax,
          siteId,
          poId,
          jobCode: r.jobCode!.trim(),
          costCenter: r.costCenter!.trim(),
          department: r.department!.trim(),
          projectManager: r.projectManager!.trim(),
          dueDate,
          status: r.status || 'Pending',
        }

        const existing = await pdb.accountsPayable.findFirst({ where: { billNo: r.billNo } })
        if (existing) { await pdb.accountsPayable.update({ where: { id: existing.id }, data }); updated++ }
        else { await pdb.accountsPayable.create({ data }); created++ }
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
    console.error('AP import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
