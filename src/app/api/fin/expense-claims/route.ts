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
    receiptUrl: item.receiptUrl ? String(item.receiptUrl) : null,
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
    if (searchParams.get('month')) {
      const [year, month] = (searchParams.get('month') || '').split('-').map(Number)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid month filter' }, { status: 400 })
      }
      where.date = { gte: start, lte: end }
    }
    if (!scope.allSites) where.site = { siteCode: { in: scope.siteCodes } }
    const records = await pdb.finExpenseClaim.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { site: true, items: true },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching expense claims:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create claims' }, { status: 403 })
    const date = body.date ? new Date(body.date) : new Date()
    if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, error: 'Invalid claim date' }, { status: 400 })
    const { items, totalAmount } = normalizeItems(body.items)
    if (!items.length || totalAmount <= 0) return NextResponse.json({ success: false, error: 'Add at least one expense item with a positive amount' }, { status: 400 })
    const poId = body.poId ? Number(body.poId) : null
    if (poId !== null && !Number.isInteger(poId)) return NextResponse.json({ success: false, error: 'Invalid purchase order' }, { status: 400 })
    const receivedAmount = Number(body.receivedAmount ?? 0)
    if (!Number.isFinite(receivedAmount) || receivedAmount < 0) return NextResponse.json({ success: false, error: 'Advance amount cannot be negative' }, { status: 400 })
    const data: any = {
      siteId,
      siteType: body.siteType === 'HO' ? 'HO' : 'Site',
      poId,
      jobCode: body.jobCode ? String(body.jobCode) : null,
      costCenter: body.costCenter ? String(body.costCenter) : `CC-${site.siteCode}`,
      department: body.department ? String(body.department) : 'Site Operations',
      projectManager: body.projectManager ? String(body.projectManager) : site.responsiblePerson,
      expenseType: String(body.expenseType ?? ''),
      submittedBy: actor,
      date,
      receivedAmount,
      totalAmount,
      gstAmount: Number(body.gstAmount) || 0,
      tdsAmount: Number(body.tdsAmount) || 0,
      billNo: body.billNo ? String(body.billNo) : null,
      status: 'Draft',
      approvalStatus: 'Draft',
      remarks: body.remarks ? String(body.remarks) : null,
      items: { create: items },
    }
    const claimNo = isBlank(body.claimNo) ? null : String(body.claimNo).trim()
    const record = claimNo
      ? await pdb.finExpenseClaim.create({ data: { ...data, claimNo } })
      : await withCodeRetry(
          () => nextSeriesCode(pdb, 'claim'),
          nextClaimNo => pdb.finExpenseClaim.create({ data: { ...data, claimNo: nextClaimNo } }),
        )
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating expense claim:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create record' }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const existing = await pdb.finExpenseClaim.findUnique({ where: { id }, include: { site: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Expense claim not found' }, { status: 404 })
    const denied = await assertPermission(pdb, actor, 'EXPENSES_EDIT', {
      request, module: 'Expenses', entityId: String(id), siteCode: existing.site.siteCode,
    })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit claims' }, { status: 403 })
    if (!['Draft', 'Rejected'].includes(existing.status)) {
      return NextResponse.json({ success: false, error: 'Only Draft or Rejected claims can be edited' }, { status: 409 })
    }
    if (existing.submittedBy.toLowerCase() !== actor.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Only the claim maker can edit this draft' }, { status: 403 })
    }
    const date = body.date ? new Date(body.date) : existing.date
    if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, error: 'Invalid claim date' }, { status: 400 })
    const { items, totalAmount } = body.items === undefined
      ? { items: undefined, totalAmount: existing.totalAmount }
      : normalizeItems(body.items)
    if (items && (!items.length || totalAmount <= 0)) {
      return NextResponse.json({ success: false, error: 'Add at least one expense item with a positive amount' }, { status: 400 })
    }
    const siteId = body.siteId === undefined ? existing.siteId : Number(body.siteId)
    const site = await pdb.finSite.findUnique({ where: { id: siteId }, select: { siteCode: true, responsiblePerson: true } })
    if (!site) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })
    const siteDenied = await assertPermission(pdb, actor, 'EXPENSES_EDIT', {
      request, module: 'Expenses', entityId: String(id), siteCode: site.siteCode,
    })
    if (!siteDenied.allowed) return NextResponse.json({ success: false, error: siteDenied.reason || 'Not allowed for this site' }, { status: 403 })
    const data: any = {
      ...(body.siteId !== undefined ? { siteId, siteType: body.siteType === 'HO' ? 'HO' : 'Site' } : {}),
      ...(body.poId !== undefined ? { poId: body.poId ? Number(body.poId) : null } : {}),
      ...(body.jobCode !== undefined ? { jobCode: body.jobCode ? String(body.jobCode) : null } : {}),
      ...(body.costCenter !== undefined ? { costCenter: body.costCenter ? String(body.costCenter) : null } : {}),
      ...(body.department !== undefined ? { department: body.department ? String(body.department) : null } : {}),
      ...(body.projectManager !== undefined ? { projectManager: body.projectManager ? String(body.projectManager) : null } : {}),
      ...(body.expenseType !== undefined ? { expenseType: String(body.expenseType) } : {}),
      ...(body.gstAmount !== undefined ? { gstAmount: Number(body.gstAmount) || 0 } : {}),
      ...(body.tdsAmount !== undefined ? { tdsAmount: Number(body.tdsAmount) || 0 } : {}),
      ...(body.billNo !== undefined ? { billNo: body.billNo ? String(body.billNo) : null } : {}),
      ...(body.remarks !== undefined ? { remarks: body.remarks ? String(body.remarks) : null } : {}),
      date,
      totalAmount,
      status: 'Draft',
      approvalStatus: 'Draft',
      managerApprovedBy: null,
      managerApprovedAt: null,
      verifiedBy: null,
      verifiedAt: null,
      approvedBy: null,
      ...(items ? { items: { deleteMany: {}, create: items } } : {}),
    }
    const record = await pdb.finExpenseClaim.update({
      where: { id },
      data,
      include: { site: true, items: true },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating expense claim:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update record' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawIds = (searchParams.get('ids') || searchParams.get('id') || '').split(',').filter(Boolean)
    const ids = rawIds.map(Number)
    if (!ids.length || ids.some(id => !Number.isInteger(id))) {
      return NextResponse.json({ success: false, error: 'Provide valid claim ids' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const claims = await pdb.finExpenseClaim.findMany({ where: { id: { in: ids } }, include: { site: true } })
    if (claims.length !== ids.length) return NextResponse.json({ success: false, error: 'One or more claims were not found' }, { status: 404 })
    for (const claim of claims) {
      const denied = await assertPermission(pdb, actor, 'EXPENSES_DELETE', {
        request, module: 'Expenses', entityId: String(claim.id), siteCode: claim.site.siteCode,
      })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete claims' }, { status: 403 })
      if (!['Draft', 'Rejected'].includes(claim.status)) {
        return NextResponse.json({ success: false, error: `Claim ${claim.claimNo} cannot be deleted after submission` }, { status: 409 })
      }
    }
    const deleted = await pdb.$transaction(async (tx: any) => {
      await tx.finApprovalLog.deleteMany({ where: { finExpenseClaimId: { in: ids } } })
      const result = await tx.finExpenseClaim.deleteMany({ where: { id: { in: ids }, status: { in: ['Draft', 'Rejected'] } } })
      if (result.count !== ids.length) throw new Error('Claims changed while deleting; reload and retry')
      return result
    })
    return NextResponse.json({ success: true, deleted: deleted.count })
  } catch (error) {
    console.error('Error deleting expense claims:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
