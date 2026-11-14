import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { nextPrefixedCode } from '@/lib/auto-number'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  _count: { select: { vouchers: true, reconciliations: true } },
}

// Fund master for petty cash accounts: approved limit, custodian, branch/department.
// GET returns funds with allocated / utilized / available derived from approved vouchers linked by fundId.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const status = searchParams.get('status')
    const where: any = {}
    if (status) where.status = status

    const funds = await pdb.finFund.findMany({ where, orderBy: { fundCode: 'asc' }, include: INCLUDE })
    const [credit, debit] = await Promise.all([
      pdb.finPettyCash.groupBy({ by: ['fundId'], where: { fundId: { in: funds.map((f: any) => f.id) }, type: 'Credit', approvalStatus: { not: 'Rejected' } }, _sum: { amount: true } }),
      pdb.finPettyCash.groupBy({ by: ['fundId'], where: { fundId: { in: funds.map((f: any) => f.id) }, type: 'Debit', approvalStatus: { not: 'Rejected' } }, _sum: { amount: true } }),
    ])
    const creditMap = new Map(credit.map((r: any) => [r.fundId, r._sum.amount || 0]))
    const debitMap = new Map(debit.map((r: any) => [r.fundId, r._sum.amount || 0]))
    const data = funds.map((f: any) => {
      const allocated = creditMap.get(f.id) || 0
      const utilized = debitMap.get(f.id) || 0
      return { ...f, allocated, utilized, available: f.limitAmount - utilized, utilizationPct: f.limitAmount > 0 ? Math.min(100, Math.round((utilized / f.limitAmount) * 100)) : 0 }
    })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching funds:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch funds' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const missing = ['fundName'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })

    const actorEmail = request.cookies.get('erp_user_email')?.value || body.actor || ''
    const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_CREATE', { request, module: 'PettyCash' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })

    const fundCode = body.fundCode || await nextPrefixedCode(pdb, 'finFund', 'fundCode', 'FND-', 3)
    const record = await pdb.finFund.create({
      data: {
        fundCode,
        fundName: String(body.fundName).trim(),
        custodian: body.custodian || null,
        limitAmount: Number(body.limitAmount) || 0,
        balance: Number(body.balance) || 0,
        branch: body.branch || null,
        department: body.department || null,
        status: body.status || 'Active',
        createdBy: actorEmail || null,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating fund:', error)
    return NextResponse.json({ success: false, error: 'Failed to create fund' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)

    const fund = await pdb.finFund.findUnique({ where: { id: Number(id) } })
    if (!fund) return NextResponse.json({ success: false, error: 'Fund not found' }, { status: 404 })

    const actorEmail = request.cookies.get('erp_user_email')?.value || body.actor || ''
    const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_CREATE', { request, module: 'PettyCash' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })

    const data: any = {}
    if (body.fundName !== undefined) data.fundName = String(body.fundName).trim()
    if (body.custodian !== undefined) data.custodian = body.custodian || null
    if (body.limitAmount !== undefined) data.limitAmount = Number(body.limitAmount) || 0
    if (body.branch !== undefined) data.branch = body.branch || null
    if (body.department !== undefined) data.department = body.department || null
    if (body.status !== undefined) data.status = body.status

    const record = await pdb.finFund.update({ where: { id: fund.id }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating fund:', error)
    return NextResponse.json({ success: false, error: 'Failed to update fund' }, { status: 500 })
  }
}
