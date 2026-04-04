import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all purchase orders
export async function GET() {
  try {
    const purchaseOrders = await db.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: purchaseOrders })
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}

// POST: Create purchase order (auto-generate poNo: PO-XXXX format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendor, item, amount, project, delivery, grn, status } = body

    if (!vendor || !item || !amount || !project) {
      return NextResponse.json(
        { success: false, error: 'vendor, item, amount, and project are required' },
        { status: 400 }
      )
    }

    // Auto-generate poNo: PO-0001, PO-0002, etc.
    const count = await db.purchaseOrder.count()
    const poNo = `PO-${String(count + 1).padStart(4, '0')}`

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        poNo,
        vendor,
        item,
        amount,
        project,
        delivery: delivery || '',
        grn: grn || 'Awaited',
        status: status || 'Open',
      },
    })

    return NextResponse.json({ success: true, data: purchaseOrder }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A purchase order with this poNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}

// PUT: Update purchase order by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.purchaseOrder.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    const purchaseOrder = await db.purchaseOrder.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: purchaseOrder })
  } catch (error) {
    console.error('Error updating purchase order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

// DELETE: Delete purchase order by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.purchaseOrder.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    await db.purchaseOrder.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete purchase order' },
      { status: 500 }
    )
  }
}
