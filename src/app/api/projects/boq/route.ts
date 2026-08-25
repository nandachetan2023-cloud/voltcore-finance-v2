import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finBoq.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching BOQs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title } = body
    if (!title) return NextResponse.json({ success: false, error: 'title required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const lines: { itemNo: string; description: string; uom: string; qty: number; rate: number; amount: number; sortOrder: number }[] = []
    if (Array.isArray(body.lines)) {
      for (const [i, l] of body.lines.entries()) {
        if (!l?.description) continue
        const qty = Number(l.qty) || 0
        const rate = Number(l.rate) || 0
        lines.push({
          itemNo: l.itemNo || String(i + 1),
          description: l.description,
          uom: l.uom || 'Nos',
          qty,
          rate,
          amount: Math.round(qty * rate * 100) / 100,
          sortOrder: i,
        })
      }
    }
    const totalAmount = lines.reduce((s, l) => s + l.amount, 0)
    const record = await pdb.finBoq.create({
      data: {
        boqNo: body.boqNo || `BOQ-${Date.now()}`,
        title,
        siteId: body.siteId ? Number(body.siteId) : null,
        siteCode: body.siteCode || null,
        jobCode: body.jobCode || null,
        jobName: body.jobName || '',
        poNo: body.poNo || null,
        project: body.project || null,
        version: body.version || 'V1',
        status: body.status || 'Draft',
        totalQty: lines.reduce((s, l) => s + l.qty, 0),
        totalAmount,
        remarks: body.remarks || null,
        lines: { create: lines },
      },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
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
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const update: any = { ...data }
    delete update.lines
    if (update.siteId) update.siteId = Number(update.siteId)
    if (update.totalQty !== undefined) update.totalQty = Number(update.totalQty)
    if (update.totalAmount !== undefined) update.totalAmount = Number(update.totalAmount)
    const record = await pdb.finBoq.update({ where: { id: Number(id) }, data: update, include: { lines: true } })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const ids = searchParams.get('ids')
    if (ids) {
      const list = ids.split(',').map(Number).filter(Boolean)
      if (!list.length) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      const r = await pdb.finBoq.deleteMany({ where: { id: { in: list } } })
      return NextResponse.json({ success: true, deleted: r.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await pdb.finBoq.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
