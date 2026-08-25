import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const record = await pdb.quotation.findUnique({
        where: { id: Number(id) },
        include: { Customer: true, QuotationItem: { include: { Item: true } } },
      })
      return NextResponse.json({ success: true, data: record })
    }
    const records = await pdb.quotation.findMany({
      orderBy: { quotationDate: 'desc' },
      include: { Customer: true, QuotationItem: { include: { Item: true } } },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching quotations:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { items, ...data } = body
    if (!data.quotationNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.quotation.count()) + 1
      data.quotationNo = `QT/${year}/${String(count).padStart(3, '0')}`
    }
    const record = await pdb.quotation.create({
      data: {
        ...data,
        quotationDate: new Date(data.quotationDate),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        updatedAt: new Date(),
        QuotationItem: items?.length ? { create: items } : undefined,
      },
      include: { Customer: true, QuotationItem: { include: { Item: true } } },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating quotation:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, items, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const qId = Number(id)

    if (items) {
      await pdb.quotationItem.deleteMany({ where: { quotationId: qId } })
    }
    const record = await pdb.quotation.update({
      where: { id: qId },
      data: {
        ...data,
        quotationDate: data.quotationDate ? new Date(data.quotationDate) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        updatedAt: new Date(),
        QuotationItem: items?.length ? { create: items } : undefined,
      },
      include: { Customer: true, QuotationItem: { include: { Item: true } } },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating quotation:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.quotation.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
