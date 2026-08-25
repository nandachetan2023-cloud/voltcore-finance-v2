import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const { lineItems, bids, ...data } = body
    const pdb = getDbForRequest(request)
    const current = await pdb.finRFQ.findUnique({ where: { id: Number(id) } })
    if (!current) return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 })
    if (data.rfqNo) delete data.rfqNo
    if (lineItems) {
      await pdb.finRFQLineItem.deleteMany({ where: { rfqId: Number(id) } })
      for (const li of lineItems) {
        if (!li.description) continue
        await pdb.finRFQLineItem.create({ data: { rfqId: Number(id), description: li.description, qty: Number(li.qty) || 0, unit: li.unit || 'Nos' } })
      }
    }
    if (bids) {
      await pdb.finRFQBid.deleteMany({ where: { rfqId: Number(id) } })
      for (const b of bids) {
        if (b.vendorId === undefined && !b.vendorName) continue
        await pdb.finRFQBid.create({ data: { rfqId: Number(id), vendorId: Number(b.vendorId) || b.vendorIdInt || (b.vendorName ? Math.abs(hash(b.vendorName)) : 0), lineItemId: b.lineItemId ? Number(b.lineItemId) : 0, unitPrice: Number(b.unitPrice) || 0, leadTime: Number(b.leadTime) || 0, notes: b.notes || null, compliant: b.compliant !== false } })
      }
    }
    const record = await pdb.finRFQ.update({ where: { id: Number(id) }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const pdb = getDbForRequest(request)
    await pdb.finRFQLineItem.deleteMany({ where: { rfqId: Number(id) } })
    await pdb.finRFQBid.deleteMany({ where: { rfqId: Number(id) } })
    await pdb.finRFQ.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 } return h }