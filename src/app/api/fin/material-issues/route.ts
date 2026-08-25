import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finMaterialIssue.findMany({
      orderBy: { issueDate: 'desc' },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching material issues:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobCode, description, qty } = body
    if (!jobCode || !description) return NextResponse.json({ success: false, error: 'jobCode and description required' }, { status: 400 })
    if (!qty) return NextResponse.json({ success: false, error: 'qty required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const q = Number(qty) || 0
    const rate = Number(body.rate) || 0
    const record = await pdb.finMaterialIssue.create({
      data: {
        issueNo: body.issueNo || `MI-${Date.now()}`,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        siteCode: body.siteCode || null,
        siteId: body.siteId ? Number(body.siteId) : null,
        jobCode,
        jobName: body.jobName || '',
        itemCode: body.itemCode || null,
        itemName: body.itemName || body.itemCode || '',
        warehouseId: body.warehouseId ? Number(body.warehouseId) : null,
        description,
        qty: q,
        unit: body.unit || 'Nos',
        rate,
        amount: body.amount ?? Math.round(q * rate * 100) / 100,
        wipAccount: body.wipAccount || null,
        status: body.status || 'Posted',
        remarks: body.remarks || null,
        createdBy: body.createdBy || null,
      },
    })
    // Cross-post: when an item code is given, credit the Stock Ledger (qtyOut) so
    // inventory reflects the issue automatically. Post only for 'Posted' status.
    if (body.itemCode && (body.status || 'Posted') === 'Posted') {
      const itemCode = body.itemCode
      const last = await pdb.finStockLedger.findFirst({
        where: body.warehouseId ? { itemCode, warehouseId: Number(body.warehouseId) } : { itemCode },
        orderBy: { id: 'desc' },
        select: { balanceQty: true },
      })
      const bal = Math.round(((last?.balanceQty ?? 0) - q) * 1000) / 1000
      await pdb.finStockLedger.create({
        data: {
          entryNo: `SL-${Date.now()}-MI`,
          postingDate: body.issueDate ? new Date(body.issueDate) : new Date(),
          itemCode,
          itemName: body.itemName || body.itemCode,
          unit: body.unit || 'Nos',
          warehouse: body.warehouse || null,
          warehouseId: body.warehouseId ? Number(body.warehouseId) : null,
          qtyIn: 0,
          qtyOut: q,
          balanceQty: bal,
          rate: rate,
          valueOut: Math.round(q * rate * 100) / 100,
          referenceType: 'Material Issue',
          referenceNo: body.issueNo || record.issueNo,
          jobCode,
          siteCode: body.siteCode || null,
          remarks: `Auto from Material Issue ${record.issueNo} (${body.remarks || description})`,
        },
      })
    }
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
    if (data.issueDate) data.issueDate = new Date(data.issueDate)
    if (data.qty) data.qty = Number(data.qty)
    if (data.rate) data.rate = Number(data.rate)
    if (data.amount) data.amount = Number(data.amount)
    const record = await pdb.finMaterialIssue.update({ where: { id: Number(id) }, data })
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
      const r = await pdb.finMaterialIssue.deleteMany({ where: { id: { in: list } } })
      return NextResponse.json({ success: true, deleted: r.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const rec = await pdb.finMaterialIssue.findUnique({ where: { id: Number(id) } })
    await pdb.finMaterialIssue.delete({ where: { id: Number(id) } })
    // Reverse the linked Stock Ledger outflow created on POST, restoring the
    // running balance for that item (by item code + warehouse, if given).
    if (rec?.itemCode) {
      const linked = await pdb.finStockLedger.findFirst({
        where: { itemCode: rec.itemCode, referenceType: 'Material Issue', referenceNo: rec.issueNo },
        orderBy: { id: 'desc' },
      })
      if (linked) {
        const last = await pdb.finStockLedger.findFirst({
          where: rec.warehouseId ? { itemCode: rec.itemCode, warehouseId: rec.warehouseId } : { itemCode: rec.itemCode },
          orderBy: { id: 'desc' },
          select: { balanceQty: true },
        })
        const bal = Math.round(((last?.balanceQty ?? 0) + linked.qtyOut) * 1000) / 1000
        await pdb.finStockLedger.create({
          data: {
            entryNo: `SL-${Date.now()}-RVS`,
            postingDate: new Date(),
            itemCode: linked.itemCode,
            itemName: linked.itemName,
            unit: linked.unit,
            warehouse: linked.warehouse,
            warehouseId: linked.warehouseId,
            qtyIn: linked.qtyOut,
            qtyOut: 0,
            balanceQty: bal,
            rate: linked.rate,
            valueIn: linked.valueOut ?? 0,
            referenceType: 'Material Issue Reversal',
            referenceNo: rec.issueNo,
            jobCode: linked.jobCode,
            siteCode: linked.siteCode,
            remarks: `Reversal of Material Issue ${rec.issueNo}`,
          },
        })
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}