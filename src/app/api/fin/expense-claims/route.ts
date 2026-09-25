import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { notifyFinance, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const where: any = {}
    if (month) {
      const [y, m] = month.split('-')
      const start = new Date(Number(y), Number(m) - 1, 1)
      const end = new Date(Number(y), Number(m), 0, 23, 59, 59)
      where.date = { gte: start, lte: end }
    }
    const records = await pdb.finExpenseClaim.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { site: true, items: true },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Only the site is genuinely required. A claim need not be tied to a PO, and
    // the costing fields are derived from the site when the caller omits them —
    // demanding all six made every caller that passed `poId: null` fail with a
    // "Missing required fields" 400.
    if (body.siteId === undefined || body.siteId === null || body.siteId === '') {
      return NextResponse.json({ success: false, error: 'Missing required fields: siteId' }, { status: 400 })
    }
    const { items, actor, ...data } = body
    const pdb = getDbForRequest(request)

    const site = await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }).catch(() => null)
    if (!data.claimNo) {
      const count = (await pdb.finExpenseClaim.count()) + 1
      data.claimNo = `EC-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`
    }
    if (!data.costCenter) data.costCenter = site?.siteCode ? `CC-${site.siteCode}` : null
    if (!data.department) data.department = 'Site Operations'
    if (!data.projectManager) data.projectManager = site?.responsiblePerson || null
    if (!data.submittedBy) data.submittedBy = request.cookies.get('erp_user_email')?.value || actor || 'unknown'
    // `date` is @db.Date — a plain 'YYYY-MM-DD' string from a form field is not a
    // valid Prisma DateTime and throws, so normalise whatever the caller sent.
    data.date = data.date ? new Date(data.date) : new Date()
    if (isNaN(data.date.getTime())) return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 })
    if (data.siteId !== undefined) data.siteId = Number(data.siteId)
    if (data.poId !== undefined && data.poId !== null) data.poId = Number(data.poId)
    if (data.totalAmount !== undefined) data.totalAmount = Number(data.totalAmount) || 0

    const record = await pdb.finExpenseClaim.create({
      data: { ...data, items: items?.length ? { create: items } : undefined },
    })
    notifyFinance(pdb, {
      entityType: 'FinExpenseClaim',
      entityId: String(record.id),
      templateCode: 'EXPENSE_CLAIM_CREATED',
      vars: { claimNo: record.claimNo, submittedBy: record.submittedBy, amount: inr(record.totalAmount) },
      title: `New Expense Claim ${record.claimNo}`,
      message: `${record.submittedBy} — ${record.expenseType} ${inr(record.totalAmount)}${site?.siteCode ? ` • ${site.siteCode}` : ''}`,
      type: 'info',
      priority: 'P2',
      siteCode: site?.siteCode || null,
      jobCode: record.jobCode || null,
      finYear: deriveFinYear(record.date),
      amount: record.totalAmount,
      link: 'fin-expense-claims',
      actorEmail: actor || request.headers.get('x-actor-email') || null,
      recipients: FIN_TEAM(site?.siteCode),
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    // Partial updates are allowed — approving a claim only sends {id, status},
    // and requiring the full costing payload here rejected exactly that.
    const { id, items, actor: _actor, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (data.date) {
      const d = new Date(data.date)
      if (isNaN(d.getTime())) return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 })
      data.date = d
    }
    if (data.siteId !== undefined) data.siteId = Number(data.siteId)
    if (data.totalAmount !== undefined) data.totalAmount = Number(data.totalAmount) || 0
    const record = await pdb.finExpenseClaim.update({
      where: { id: Number(id) },
      data: {
        ...data,
        items: items?.length
          ? { deleteMany: {}, create: items }
          : undefined,
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const ids = searchParams.get('ids')
    const id = searchParams.get('id')
    if (ids) {
      const idArr = ids.split(',').map(Number).filter(n => !isNaN(n))
      if (!idArr.length) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      await pdb.finExpenseItem.deleteMany({ where: { claimId: { in: idArr } } })
      await pdb.finApprovalLog.deleteMany({ where: { finExpenseClaimId: { in: idArr } } })
      await pdb.finExpenseClaim.deleteMany({ where: { id: { in: idArr } } })
      return NextResponse.json({ success: true, deleted: idArr.length })
    }
    if (!id) return NextResponse.json({ success: false, error: 'id or ids is required' }, { status: 400 })
    const existing = await pdb.finExpenseClaim.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: true, message: 'Already deleted' })
    await pdb.finExpenseClaim.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
