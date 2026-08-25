import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const status = searchParams.get('status')
    const where: any = {}
    if (month) {
      const [y, m] = month.split('-')
      const start = new Date(Number(y), Number(m) - 1, 1)
      const end = new Date(Number(y), Number(m), 0, 23, 59, 59)
      where.paymentDate = { gte: start, lte: end }
    }
    if (status) where.status = status
    const records = await pdb.finPaymentAdvice.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: { party: true, lines: true, po: { select: { id: true, poNo: true, totalAmount: true } } },
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
    const { lines, ...data } = body
    const pdb = getDbForRequest(request)
    const record = await pdb.finPaymentAdvice.create({
      data: { ...data, lines: lines?.length ? { create: lines } : undefined },
      include: { party: true, lines: true, po: { select: { id: true, poNo: true, totalAmount: true } } },
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
    const { id, lines, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (Array.isArray(lines)) {
      await pdb.finPaymentAdviceLine.deleteMany({ where: { adviceId: Number(id) } })
      const record = await pdb.finPaymentAdvice.update({
        where: { id: Number(id) },
        data: { ...data, lines: lines.length ? { create: lines } : undefined },
        include: { party: true, lines: true, po: { select: { id: true, poNo: true, totalAmount: true } } },
      })
      return NextResponse.json({ success: true, data: record })
    }
    const record = await pdb.finPaymentAdvice.update({ where: { id: Number(id) }, data })
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
      await pdb.finPaymentAdviceLine.deleteMany({ where: { adviceId: { in: idArr } } })
      await pdb.finApprovalLog.deleteMany({ where: { finPaymentAdviceId: { in: idArr } } })
      await pdb.finPaymentAdvice.deleteMany({ where: { id: { in: idArr } } })
      return NextResponse.json({ success: true, deleted: idArr.length })
    }
    if (!id) return NextResponse.json({ success: false, error: 'id or ids is required' }, { status: 400 })
    await pdb.finPaymentAdvice.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
