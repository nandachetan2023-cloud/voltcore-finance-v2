import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all invoices
export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// POST: Create invoice (auto-generate invNo: INV-XXXX format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client, project, amount, date, dueDate, status } = body

    if (!client || !project || !amount || !date || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'client, project, amount, date, and dueDate are required' },
        { status: 400 }
      )
    }

    // Auto-generate invNo: INV-0001, INV-0002, etc.
    const count = await db.invoice.count()
    const invNo = `INV-${String(count + 1).padStart(4, '0')}`

    const invoice = await db.invoice.create({
      data: {
        invNo,
        client,
        project,
        amount: String(amount),
        date,
        dueDate,
        status: status || 'Under Review',
      },
    })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An invoice with this invNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

// PUT: Update invoice by id
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

    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = await db.invoice.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE: Delete invoice by id
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

    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    await db.invoice.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
