import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { nextPrefixedCode } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

const INCLUDE = { lineItems: true, bids: true }

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finRFQ.findMany({ include: INCLUDE, orderBy: { issueDate: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching RFQs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { lineItems, bids, vendorIds, ...raw } = body
    const data: any = { ...raw }
    // The form posts <input type="date"> values as 'YYYY-MM-DD'; Prisma's
    // DateTime validation rejects date-only strings, so coerce here.
    if (!data.issueDate) return NextResponse.json({ success: false, error: 'issueDate is required' }, { status: 400 })
    if (!data.responseDeadline) return NextResponse.json({ success: false, error: 'responseDeadline is required' }, { status: 400 })
    data.issueDate = new Date(data.issueDate)
    data.responseDeadline = new Date(data.responseDeadline)
    if (Array.isArray(vendorIds)) data.vendorIds = vendorIds.map(Number).filter(Number.isFinite)
    if (!data.rfqNo) {
      const year = new Date().getFullYear()
      data.rfqNo = await nextPrefixedCode(pdb, 'finRFQ', 'rfqNo', `RFQ-${year}-`, 3)
    }
    const record = await pdb.finRFQ.create({
      data: {
        ...data,
        lineItems: lineItems ? { create: lineItems.map((i: any) => ({ description: i.description ?? '', qty: Number(i.qty) || 0, unit: i.unit || 'Nos' })) } : undefined,
        bids: bids ? { create: bids } : undefined,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, lineItems, bids, vendorIds, ...raw } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const data: any = { ...raw }
    if (data.issueDate) data.issueDate = new Date(data.issueDate)
    if (data.responseDeadline) data.responseDeadline = new Date(data.responseDeadline)
    if (Array.isArray(vendorIds)) data.vendorIds = vendorIds.map(Number).filter(Number.isFinite)
    if (lineItems) {
      await pdb.finRFQLineItem.deleteMany({ where: { rfqId: id } })
      await pdb.finRFQLineItem.createMany({ data: lineItems.map((i: any) => ({ description: i.description ?? '', qty: Number(i.qty) || 0, unit: i.unit || 'Nos', rfqId: id })) })
    }
    if (bids) {
      await pdb.finRFQBid.deleteMany({ where: { rfqId: id } })
      await pdb.finRFQBid.createMany({ data: bids.map((b: any) => ({ ...b, rfqId: id })) })
    }
    const record = await pdb.finRFQ.update({ where: { id }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finRFQ.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
