import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

function mapItem(i: any) {
  return {
    itemDate: i.itemDate ? new Date(i.itemDate) : null,
    category: i.category ?? '',
    name: i.name ?? null,
    description: i.description ?? null,
    amount: Number(i.amount) || 0,
    remark: i.remark ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const status = searchParams.get('status')
    const expenseType = searchParams.get('expenseType')
    const search = searchParams.get('search')
    const month = searchParams.get('month') // YYYY-MM

    const where: any = {}
    if (siteId) where.siteId = Number(siteId)
    if (status && status !== 'All') where.status = status
    if (expenseType) where.expenseType = expenseType
    if (search) {
      where.OR = [
        { claimNo: { contains: search, mode: 'insensitive' } },
        { submittedBy: { contains: search, mode: 'insensitive' } },
        { expenseType: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (month) {
      const [y, m] = month.split('-')
      const start = new Date(Number(y), Number(m) - 1, 1)
      const end = new Date(Number(y), Number(m), 0)
      where.date = { gte: start, lte: end }
    }

    const records = await pdb.finExpenseClaim.findMany({
      where,
      orderBy: [{ date: 'desc' }, { expenseType: 'asc' }],
      include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
    })

    const sites = await pdb.finSite.findMany({ orderBy: { name: 'asc' } })

    return NextResponse.json({ success: true, data: records, sites })
  } catch (error) {
    console.error('Error fetching site expenses:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, ...data } = body
    const pdb = getDbForRequest(request)

    if (!data.claimNo) {
      const d = new Date()
      data.claimNo = `SE/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
    }

    const totalAmount = items?.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0) ?? 0

    const record = await pdb.finExpenseClaim.create({
      data: {
        claimNo: data.claimNo,
        siteId: Number(data.siteId),
        siteType: data.siteType ?? 'Site',
        expenseType: data.expenseType ?? '',
        submittedBy: data.submittedBy ?? '',
        date: data.date ? new Date(data.date) : new Date(),
        receivedAmount: Number(data.receivedAmount) || 0,
        totalAmount,
        gstAmount: Number(data.gstAmount) || 0,
        tdsAmount: Number(data.tdsAmount) || 0,
        status: 'Draft',
        approvalStatus: 'Draft',
        remarks: data.remarks ?? '',
        items: items?.length ? { create: items.map(mapItem) } : undefined,
      },
      include: { site: true, items: true, approvals: true },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating site expense:', error)
    const msg = error?.message || 'Failed to create record'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
