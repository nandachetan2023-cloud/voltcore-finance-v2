import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

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
    const { lineItems, bids, ...data } = body
    const record = await pdb.finRFQ.create({
      data: {
        ...data,
        lineItems: lineItems ? { create: lineItems } : undefined,
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
    const { id, lineItems, bids, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (lineItems) {
      await pdb.finRFQLineItem.deleteMany({ where: { rfqId: id } })
      await pdb.finRFQLineItem.createMany({ data: lineItems.map((i: any) => ({ ...i, rfqId: id })) })
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
