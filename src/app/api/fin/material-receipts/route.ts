import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function nextGrnNo(pdb: any): Promise<string> {
  const year = new Date().getFullYear()
  const last = await pdb.finMaterialReceipt.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  })
  const seq = (last ? last.id : 0) + 1
  return `GRN-${year}-${String(100 + seq)}`
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finMaterialReceipt.findMany({ orderBy: { grnDate: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching material receipts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch material receipts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const grnNo = await nextGrnNo(pdb)
    const qty = Number(body.qtyReceived) || 0
    const rate = Number(body.rate) || 0
    const record = await pdb.finMaterialReceipt.create({
      data: {
        grnNo,
        grnDate: new Date(body.grnDate || new Date()),
        poRef: body.poRef || null,
        itemName: String(body.itemName || '').trim(),
        vendorName: body.vendorName || null,
        qtyReceived: qty,
        qtyPO: Number(body.qtyPO) || qty,
        unit: body.unit || 'nos',
        rate,
        value: Number(body.value) || qty * rate,
        siteCode: body.siteCode || null,
        status: body.status || 'Received',
        remarks: body.remarks || null,
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating material receipt:', error)
    return NextResponse.json({ success: false, error: 'Failed to create material receipt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finMaterialReceipt.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material receipt:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete material receipt' }, { status: 500 })
  }
}
