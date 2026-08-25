import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finStockLedger.findMany({
      where: { referenceType: 'Scrap Disposal' },
      orderBy: [{ postingDate: 'desc' }, { id: 'desc' }],
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching scrap entries:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemCode, itemName, qty } = body
    if (!itemCode) return NextResponse.json({ success: false, error: 'itemCode required' }, { status: 400 })
    if (!qty) return NextResponse.json({ success: false, error: 'qty required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const q = Number(qty) || 0
    const rate = Number(body.rate) || 0
    // Running balance: last balance for the same item (or item+warehouse), apply outflow.
    const last = await pdb.finStockLedger.findFirst({
      where: body.warehouseId ? { itemCode, warehouseId: Number(body.warehouseId) } : { itemCode },
      orderBy: { id: 'desc' },
      select: { balanceQty: true },
    })
    const balanceQty = Math.round(((last?.balanceQty ?? 0) - q) * 1000) / 1000
    const record = await pdb.finStockLedger.create({
      data: {
        entryNo: body.entryNo || `SCR-${Date.now()}`,
        postingDate: body.postingDate ? new Date(body.postingDate) : new Date(),
        itemCode,
        itemName: itemName || itemCode,
        category: body.category || null,
        unit: body.unit || 'Nos',
        warehouse: body.warehouse || null,
        warehouseId: body.warehouseId ? Number(body.warehouseId) : null,
        qtyIn: 0,
        qtyOut: q,
        balanceQty,
        rate,
        valueOut: Math.round(q * rate * 100) / 100,
        referenceType: 'Scrap Disposal',
        referenceNo: body.referenceNo || null,
        jobCode: body.jobCode || null,
        siteCode: body.siteCode || null,
        remarks: body.remarks || null,
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
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
      const r = await pdb.finStockLedger.deleteMany({ where: { id: { in: list } } })
      return NextResponse.json({ success: true, deleted: r.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await pdb.finStockLedger.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
