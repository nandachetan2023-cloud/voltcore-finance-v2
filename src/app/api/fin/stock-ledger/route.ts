import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finStockLedger.findMany({
      orderBy: [{ postingDate: 'asc' }, { id: 'asc' }],
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching stock ledger:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemCode, itemName, qtyIn, qtyOut } = body
    if (!itemCode) return NextResponse.json({ success: false, error: 'itemCode required' }, { status: 400 })
    if (qtyIn === undefined && qtyOut === undefined) return NextResponse.json({ success: false, error: 'qtyIn or qtyOut required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    // Running balance: fetch latest balance for the same item (or item+warehouse) and apply this line.
    const last = await pdb.finStockLedger.findFirst({
      where: body.warehouseId ? { itemCode, warehouseId: body.warehouseId } : { itemCode },
      orderBy: { id: 'desc' },
      select: { balanceQty: true },
    })
    const qi = Number(qtyIn) || 0
    const qo = Number(qtyOut) || 0
    const balanceQty = Math.round(((last?.balanceQty ?? 0) + qi - qo) * 1000) / 1000
    const record = await pdb.finStockLedger.create({
      data: {
        entryNo: body.entryNo || `SL-${Date.now()}`,
        postingDate: body.postingDate ? new Date(body.postingDate) : new Date(),
        itemCode,
        itemName: itemName || itemCode,
        category: body.category || null,
        unit: body.unit || 'Nos',
        warehouse: body.warehouse || null,
        warehouseId: body.warehouseId ? Number(body.warehouseId) : null,
        qtyIn: qi,
        qtyOut: qo,
        balanceQty,
        rate: Number(body.rate) || 0,
        valueIn: Number(body.valueIn) ?? qi * (Number(body.rate) || 0),
        valueOut: Number(body.valueOut) ?? qo * (Number(body.rate) || 0),
        referenceType: body.referenceType || 'Stock Receipt',
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, qtyIn, qtyOut, ...rest } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const data: any = { ...rest }
    if (qtyIn !== undefined) data.qtyIn = Number(qtyIn)
    if (qtyOut !== undefined) data.qtyOut = Number(qtyOut)
    if (data.postingDate) data.postingDate = new Date(data.postingDate)
    const record = await pdb.finStockLedger.update({ where: { id: Number(id) }, data })
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