import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission, getPermittedSiteScope } from '@/lib/fin-rbac'
import { nextSeriesCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

function actorFor(request: NextRequest) {
  return request.cookies.get('erp_user_email')?.value || request.headers.get('x-actor-email') || ''
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) return { items: [], totalAmount: 0 }
  const normalized = items.map((item: any) => ({
    itemDate: item.itemDate ? new Date(item.itemDate) : null,
    category: String(item.category ?? ''),
    name: item.name ? String(item.name) : null,
    description: item.description ? String(item.description) : null,
    amount: Number(item.amount),
    remark: item.remark ? String(item.remark) : null,
    accountId: item.accountId ? Number(item.accountId) : null,
  }))
  if (normalized.some(item => !Number.isFinite(item.amount) || item.amount < 0 ||
      (item.itemDate && Number.isNaN(item.itemDate.getTime())) ||
      (item.accountId !== null && !Number.isInteger(item.accountId)))) {
    throw new Error('Expense items need valid dates, non-negative amounts, and valid ledger accounts')
  }
  return {
    items: normalized,
    totalAmount: Math.round(normalized.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
  }
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const denied = await assertPermission(pdb, actor, 'EXPENSES_VIEW', { request, module: 'Expenses' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
    const scope = await getPermittedSiteScope(pdb, actor, 'EXPENSES_VIEW')
    if (!scope.allSites && scope.siteCodes.length === 0) {
      return NextResponse.json({ success: false, error: 'No permitted sites for expense claims' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const where: any = {}
    if (searchParams.get('siteId')) where.siteId = Number(searchParams.get('siteId'))
    if (searchParams.get('status') && searchParams.get('status') !== 'All') where.status = searchParams.get('status')
    if (searchParams.get('expenseType')) where.expenseType = searchParams.get('expenseType')
    if (searchParams.get('month')) {
      const [year, month] = (searchParams.get('month') || '').split('-').map(Number)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid month filter' }, { status: 400 })
      }
      where.date = { gte: start, lte: end }
    }
    if (searchParams.get('search')) {
      const search = searchParams.get('search')!
      where.OR = [
        { claimNo: { contains: search, mode: 'insensitive' } },
        { submittedBy: { contains: search, mode: 'insensitive' } },
        { expenseType: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (!scope.allSites) where.site = { siteCode: { in: scope.siteCodes } }
    const records = await pdb.finExpenseClaim.findMany({
      where,
      orderBy: [{ date: 'desc' }, { expenseType: 'asc' }],
      include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
    })
    const sites = await pdb.finSite.findMany({
      where: scope.allSites ? undefined : { siteCode: { in: scope.siteCodes } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, data: records, sites })
  } catch (error) {
    console.error('Error fetching site expenses:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const siteId = Number(body.siteId)
    if (!Number.isInteger(siteId)) return NextResponse.json({ success: false, error: 'A valid site is required' }, { status: 400 })
    const site = await pdb.finSite.findUnique({ where: { id: siteId }, select: { id: true, siteCode: true, responsiblePerson: true } })
    if (!site) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })
    const denied = await assertPermission(pdb, actor, 'EXPENSES_CREATE', { request, module: 'Expenses', siteCode: site.siteCode })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create expense claims' }, { status: 403 })
    const date = body.date ? new Date(body.date) : new Date()
    if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, error: 'Invalid claim date' }, { status: 400 })
    const { items, totalAmount } = normalizeItems(body.items)
    if (!items.length || totalAmount <= 0) return NextResponse.json({ success: false, error: 'Add at least one expense item with a positive amount' }, { status: 400 })
    const receivedAmount = Number(body.receivedAmount ?? 0)
    if (!Number.isFinite(receivedAmount) || receivedAmount < 0) {
      return NextResponse.json({ success: false, error: 'Advance amount cannot be negative' }, { status: 400 })
    }
    const data = {
      claimNo: isBlank(body.claimNo) ? undefined : String(body.claimNo).trim(),
      siteId,
      siteType: body.siteType === 'HO' ? 'HO' : 'Site',
      expenseType: String(body.expenseType ?? ''),
      submittedBy: actor,
      date,
      receivedAmount,
      totalAmount,
      gstAmount: Number(body.gstAmount) || 0,
      tdsAmount: Number(body.tdsAmount) || 0,
      billNo: body.billNo ? String(body.billNo) : null,
      jobCode: body.jobCode ? String(body.jobCode) : null,
      costCenter: body.costCenter ? String(body.costCenter) : `CC-${site.siteCode}`,
      department: body.department ? String(body.department) : 'Site Operations',
      projectManager: body.projectManager ? String(body.projectManager) : site.responsiblePerson,
      approvalStatus: 'Draft',
      status: 'Draft',
      remarks: body.remarks ? String(body.remarks) : null,
      items: { create: items },
    }
    const record = data.claimNo
      ? await pdb.finExpenseClaim.create({ data })
      : await withCodeRetry(
          () => nextSeriesCode(pdb, 'claim'),
          claimNo => pdb.finExpenseClaim.create({ data: { ...data, claimNo } }),
        )
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating site expense:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create record' }, { status: 400 })
  }
}
