import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined
  return new Date(v as string)
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finPO.findMany({ orderBy: { poIssueDate: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching POs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch POs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const record = await pdb.finPO.create({
      data: {
        poNo: String(body.poNo || '').trim(),
        vendor: String(body.vendor || ''),
        project: String(body.project || ''),
        projectShort: String(body.projectShort || ''),
        totalValue: Number(body.totalValue) || 0,
        deliveryAddress: String(body.deliveryAddress || ''),
        requiredDate: toDate(body.requiredDate) || new Date(),
        actualDeliveryDate: body.actualDeliveryDate ? toDate(body.actualDeliveryDate) : null,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems : [],
        status: body.status || 'Open',
        poIssueDate: toDate(body.poIssueDate) || new Date(),
        grnDate: body.grnDate ? toDate(body.grnDate) : null,
        invoiceMatchDate: body.invoiceMatchDate ? toDate(body.invoiceMatchDate) : null,
        poIssued: body.poIssued !== undefined ? Boolean(body.poIssued) : true,
        grnCompleted: Boolean(body.grnCompleted) || false,
        invoiceMatched: Boolean(body.invoiceMatched) || false,
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating PO:', error)
    return NextResponse.json({ success: false, error: 'Failed to create PO' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finPO.update({
      where: { id },
      data: {
        poNo: body.poNo !== undefined ? String(body.poNo).trim() : undefined,
        vendor: body.vendor !== undefined ? String(body.vendor) : undefined,
        project: body.project !== undefined ? String(body.project) : undefined,
        projectShort: body.projectShort !== undefined ? String(body.projectShort) : undefined,
        totalValue: body.totalValue !== undefined ? Number(body.totalValue) : undefined,
        deliveryAddress: body.deliveryAddress !== undefined ? String(body.deliveryAddress) : undefined,
        requiredDate: body.requiredDate ? toDate(body.requiredDate) : undefined,
        actualDeliveryDate: body.actualDeliveryDate !== undefined ? (body.actualDeliveryDate ? toDate(body.actualDeliveryDate) : null) : undefined,
        lineItems: Array.isArray(body.lineItems) ? body.lineItems : undefined,
        status: body.status !== undefined ? String(body.status) : undefined,
        poIssueDate: body.poIssueDate ? toDate(body.poIssueDate) : undefined,
        grnDate: body.grnDate !== undefined ? (body.grnDate ? toDate(body.grnDate) : null) : undefined,
        invoiceMatchDate: body.invoiceMatchDate !== undefined ? (body.invoiceMatchDate ? toDate(body.invoiceMatchDate) : null) : undefined,
        poIssued: body.poIssued !== undefined ? Boolean(body.poIssued) : undefined,
        grnCompleted: body.grnCompleted !== undefined ? Boolean(body.grnCompleted) : undefined,
        invoiceMatched: body.invoiceMatched !== undefined ? Boolean(body.invoiceMatched) : undefined,
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating PO:', error)
    return NextResponse.json({ success: false, error: 'Failed to update PO' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finPO.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting PO:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete PO' }, { status: 500 })
  }
}
