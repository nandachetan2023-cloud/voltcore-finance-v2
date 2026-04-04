import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all accounts receivable records
export async function GET() {
  try {
    const records = await db.accountsReceivable.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching accounts receivable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts receivable' },
      { status: 500 }
    )
  }
}

// POST: Create AR record (auto-generate invoiceNo: AR-001 format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client, description, amount, dueDate, status } = body

    if (!client || !amount || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'client, amount, and dueDate are required' },
        { status: 400 }
      )
    }

    // Auto-generate invoiceNo: AR-001, AR-002, etc.
    const count = await db.accountsReceivable.count()
    const invoiceNo = `AR-${String(count + 1).padStart(3, '0')}`

    const record = await db.accountsReceivable.create({
      data: {
        invoiceNo,
        client,
        description: description || null,
        amount: parseFloat(amount) || 0,
        dueDate,
        status: status || 'Pending',
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An invoice with this number already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating accounts receivable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create accounts receivable record' },
      { status: 500 }
    )
  }
}

// PUT: Update AR record by id
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

    // Convert amount to number if provided
    if (data.amount !== undefined) {
      data.amount = parseFloat(data.amount) || 0
    }

    const existing = await db.accountsReceivable.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Accounts receivable record not found' },
        { status: 404 }
      )
    }

    const record = await db.accountsReceivable.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating accounts receivable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update accounts receivable record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete AR record by id
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

    const existing = await db.accountsReceivable.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Accounts receivable record not found' },
        { status: 404 }
      )
    }

    await db.accountsReceivable.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting accounts receivable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete accounts receivable record' },
      { status: 500 }
    )
  }
}
