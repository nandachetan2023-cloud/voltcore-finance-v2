import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

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
    const missing = ['siteId', 'jobCode', 'poId', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const { items, ...data } = body
    const pdb = getDbForRequest(request)
    const record = await pdb.finExpenseClaim.create({
      data: { ...data, items: items?.length ? { create: items } : undefined },
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
    const missing = ['siteId', 'jobCode', 'poId', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const { id, items, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finExpenseClaim.update({
      where: { id },
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
