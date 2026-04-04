import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all accounts payable records
export async function GET() {
  try {
    const records = await db.accountsPayable.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching accounts payable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts payable' },
      { status: 500 }
    )
  }
}

// POST: Create AP record (auto-generate billNo: AP-001 format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendor, description, amount, dueDate, status } = body

    if (!vendor || !amount || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'vendor, amount, and dueDate are required' },
        { status: 400 }
      )
    }

    // Auto-generate billNo: AP-001, AP-002, etc.
    const count = await db.accountsPayable.count()
    const billNo = `AP-${String(count + 1).padStart(3, '0')}`

    const record = await db.accountsPayable.create({
      data: {
        billNo,
        vendor,
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
        { success: false, error: 'A bill with this number already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating accounts payable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create accounts payable record' },
      { status: 500 }
    )
  }
}

// PUT: Update AP record by id (allow setting paidDate and status)
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

    const existing = await db.accountsPayable.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Accounts payable record not found' },
        { status: 404 }
      )
    }

    const record = await db.accountsPayable.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating accounts payable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update accounts payable record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete AP record by id
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

    const existing = await db.accountsPayable.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Accounts payable record not found' },
        { status: 404 }
      )
    }

    await db.accountsPayable.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting accounts payable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete accounts payable record' },
      { status: 500 }
    )
  }
}
