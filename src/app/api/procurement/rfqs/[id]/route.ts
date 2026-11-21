import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = { lineItems: true, bids: true }

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const rfqId = Number(id)
    const body = await request.json()
    const { lineItems, bids, vendorIds, ...raw } = body
    const pdb = getDbForRequest(request)
    const current = await pdb.finRFQ.findUnique({ where: { id: rfqId } })
    if (!current) return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 })

    // Only persist fields the RFQ form owns; never echo back id/timestamps/rfqNo.
    const data: any = {}
    if (raw.description !== undefined) data.description = raw.description
    if (raw.issueDate) data.issueDate = new Date(raw.issueDate)
    if (raw.responseDeadline) data.responseDeadline = new Date(raw.responseDeadline)
    if (raw.project !== undefined) data.project = raw.project
    if (raw.notes !== undefined) data.notes = raw.notes
    if (raw.status !== undefined) data.status = raw.status
    if (Array.isArray(vendorIds)) data.vendorIds = vendorIds.map(Number).filter(Number.isFinite)

    // Update line items in place so their ids survive; bids point at those ids.
    const idMap = new Map<number, number>()
    const keepIds = new Set<number>()
    const lineItemsTouched = Array.isArray(lineItems)
    if (lineItemsTouched) {
      const existing = await pdb.finRFQLineItem.findMany({ where: { rfqId }, select: { id: true } })
      const existingIds = new Set(existing.map(e => e.id))
      for (const li of lineItems) {
        if (!li.description) continue
        const incomingId = Number(li.id)
        const fields = { description: li.description, qty: Number(li.qty) || 0, unit: li.unit || 'Nos' }
        if (Number.isFinite(incomingId) && existingIds.has(incomingId)) {
          await pdb.finRFQLineItem.update({ where: { id: incomingId }, data: fields })
          keepIds.add(incomingId)
        } else {
          const created = await pdb.finRFQLineItem.create({ data: { ...fields, rfqId } })
          keepIds.add(created.id)
          if (Number.isFinite(incomingId)) idMap.set(incomingId, created.id)
        }
      }
      const removed = [...existingIds].filter(x => !keepIds.has(x))
      if (removed.length) {
        await pdb.finRFQBid.deleteMany({ where: { rfqId, lineItemId: { in: removed } } })
        await pdb.finRFQLineItem.deleteMany({ where: { id: { in: removed } } })
      }
    }

    if (Array.isArray(bids)) {
      await pdb.finRFQBid.deleteMany({ where: { rfqId } })
      for (const b of bids) {
        if (b.vendorId === undefined && !b.vendorName) continue
        const rawLineId = Number(b.lineItemId)
        const lineItemId = idMap.get(rawLineId) ?? (Number.isFinite(rawLineId) ? rawLineId : 0)
        if (lineItemsTouched && lineItemId !== 0 && !keepIds.has(lineItemId)) continue
        await pdb.finRFQBid.create({ data: { rfqId, vendorId: Number(b.vendorId) || b.vendorIdInt || (b.vendorName ? Math.abs(hash(b.vendorName)) : 0), lineItemId, unitPrice: Number(b.unitPrice) || 0, leadTime: Number(b.leadTime) || 0, notes: b.notes || null, compliant: b.compliant !== false } })
      }
    }

    const record = await pdb.finRFQ.update({ where: { id: rfqId }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const rfqId = Number(id)
    if (!Number.isFinite(rfqId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const existing = await pdb.finRFQ.findUnique({ where: { id: rfqId }, select: { id: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 })
    await pdb.$transaction([
      pdb.finRFQBid.deleteMany({ where: { rfqId } }),
      pdb.finRFQLineItem.deleteMany({ where: { rfqId } }),
      pdb.finRFQ.delete({ where: { id: rfqId } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 } return h }