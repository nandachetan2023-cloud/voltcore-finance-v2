import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const record = await pdb.salesOrder.findUnique({
        where: { id: Number(id) },
        include: {
          Customer: true,
          SalesOrderItem: { include: { Item: true } },
          Quotation: true,
        },
      })
      return NextResponse.json({ success: true, data: record })
    }
    const records = await pdb.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Customer: true,
        SalesOrderItem: { include: { Item: true } },
        Quotation: true,
      },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching sales orders:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, ...data } = body
    const pdb = getDbForRequest(request)
    if (!data.soNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.salesOrder.count()) + 1
      data.soNo = `SO/${year}/${String(count).padStart(4, '0')}`
    }
    const record = await pdb.salesOrder.create({
      data: {
        ...data,
        soDate: new Date(data.soDate),
        quotationId: data.quotationId || null,
        updatedAt: new Date(),
        SalesOrderItem: items?.length ? { create: items } : undefined,
      },
      include: {
        Customer: true,
        SalesOrderItem: { include: { Item: true } },
        Quotation: true,
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating sales order:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, items, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const orderId = Number(id)

    if (items) {
      await pdb.salesOrderItem.deleteMany({ where: { salesOrderId: orderId } })
    }
    const record = await pdb.salesOrder.update({
      where: { id: orderId },
      data: {
        ...data,
        soDate: data.soDate ? new Date(data.soDate) : undefined,
        quotationId: data.quotationId || null,
        updatedAt: new Date(),
        SalesOrderItem: items?.length ? { create: items } : undefined,
      },
      include: {
        Customer: true,
        SalesOrderItem: { include: { Item: true } },
        Quotation: true,
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating sales order:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const orderId = Number(id)
    await pdb.salesOrderItem.deleteMany({ where: { salesOrderId: orderId } })
    await pdb.salesOrder.delete({ where: { id: orderId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sales order:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
