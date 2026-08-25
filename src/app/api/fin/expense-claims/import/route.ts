import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function num(v: unknown): number {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function toDate(v: unknown): Date | null {
  if (v === '' || v === null || v === undefined) return null
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/)
    if (m) return new Date(Number(m[3] < '100' ? 2000 + Number(m[3]) : m[3]), Number(m[2]) - 1, Number(m[1]))
    return null
  }
  if (v instanceof Date) return v
  const n = Number(v)
  if (!isNaN(n) && n > 0) return new Date((n - 25569) * 86400 * 1000)
  return null
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    const body = await request.json()
    const records: Record<string, unknown>[] = Array.isArray(body?.records) ? body.records : []
    if (records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })
    }

    let created = 0, updated = 0, errors = 0
    const errorRows: { claimNo: string; message: string }[] = []

    const hoSite = await pdb.finSite.findFirst({ where: { siteCode: 'HO' }, select: { id: true } })
    const defaultSiteId = hoSite?.id || 1

    const claimNumberMap = new Map<string, number>()
    function genClaimNo(date: Date): string {
      const prefix = 'HOEXP'
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
      const yearStr = dateStr.slice(0, 4)
      const seqMap = claimNumberMap.get(yearStr) || 0
      const seq = (seqMap + 1).toString().padStart(4, '0')
      claimNumberMap.set(yearStr, seqMap + 1)
      return `${prefix}-${dateStr}-${seq}`
    }

    for (const r of records) {
      let claimNo = ''
      try {
        const claimDate = toDate(r.date) || new Date()
        claimNo = str(r.claimNo ?? '') || genClaimNo(claimDate)

        const itemDate = toDate(r.itemDate || r.date)
        const category = str(r.category || r.expenseType || '')
        const description = str(r.description || r.remarks || '')

        const item: Record<string, unknown> = {
          itemDate,
          category,
          name: str(r.name || ''),
          description,
          amount: num(r.amount || r.totalAmount || 0),
          remark: str(r.remark || ''),
          receiptUrl: str(r.receiptUrl || ''),
        }
        if (itemDate) item.itemDate = itemDate

        const totalAmount = num(item.amount) || num(r.totalAmount)
        const date = claimDate

        const existing = await pdb.finExpenseClaim.findFirst({ where: { claimNo } })

        const data = {
          claimNo,
          date,
          siteId: defaultSiteId,
          siteType: str(r.siteType) || 'HO',
          expenseType: category,
          jobCode: str(r.jobCode) || null,
          costCenter: str(r.costCenter) || null,
          department: str(r.department) || null,
          projectManager: str(r.projectManager) || null,
          submittedBy: str(r.submittedBy) || 'Finance Import System',
          totalAmount,
          receivedAmount: num(r.receivedAmount),
          gstAmount: num(r.gstAmount),
          tdsAmount: num(r.tdsAmount),
          billNo: str(r.billNo) || null,
          approvalStatus: str(r.approvalStatus) || 'Draft',
          status: str(r.status) || 'Pending',
          remarks: str(r.remarks || description || ''),
        }

        if (existing) {
          await pdb.finExpenseItem.deleteMany({ where: { claimId: existing.id } })
          await pdb.finExpenseClaim.update({
            where: { id: existing.id },
            data: { ...data, items: { create: item } },
          })
          updated++
        } else {
          await pdb.finExpenseClaim.create({
            data: { ...data, items: { create: [item] } },
          })
          created++
        }
      } catch (e) {
        errors++
        errorRows.push({ claimNo, message: (e as Error).message || 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      summary: { totalRows: records.length, created, updated, skipped: 0, errors },
      errorRows: errorRows.slice(0, 20),
    })
  } catch (error) {
    console.error('Expense claim import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
