import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const record = await pdb.salesTaxInvoice.findUnique({
        where: { id: Number(id) },
        include: { items: true, Customer: true },
      })
      return NextResponse.json({ success: true, data: record })
    }
    const records = await pdb.salesTaxInvoice.findMany({
      orderBy: { invoiceDate: 'desc' },
      include: { items: true },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching tax invoices:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { items, ...data } = body
    const record = await pdb.salesTaxInvoice.create({
      data: {
        ...data,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        poDate: data.poDate ? new Date(data.poDate) : null,
        items: items?.length ? { create: items } : undefined,
      },
      include: { items: true },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating tax invoice:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, items, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const invId = Number(id)

    // Replace items: delete existing, recreate
    if (items) {
      await pdb.salesTaxInvoiceItem.deleteMany({ where: { invoiceId: invId } })
    }
    const record = await pdb.salesTaxInvoice.update({
      where: { id: invId },
      data: {
        ...data,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        poDate: data.poDate ? new Date(data.poDate) : null,
        items: items?.length ? { create: items } : undefined,
      },
      include: { items: true },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating tax invoice:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.salesTaxInvoice.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tax invoice:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
