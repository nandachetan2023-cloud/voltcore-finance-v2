import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all tax records
export async function GET() {
  try {
    const records = await db.taxRecord.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching tax records:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tax records' },
      { status: 500 }
    )
  }
}

// POST: Create tax record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taxType, period, amount, dueDate, status } = body

    if (!taxType || !period || !amount || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'taxType, period, amount, and dueDate are required' },
        { status: 400 }
      )
    }

    const record = await db.taxRecord.create({
      data: {
        taxType,
        period,
        amount: parseFloat(amount) || 0,
        dueDate,
        paidDate: body.paidDate || null,
        status: status || 'Pending',
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating tax record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create tax record' },
      { status: 500 }
    )
  }
}

// PUT: Update tax record by id
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

    const existing = await db.taxRecord.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tax record not found' },
        { status: 404 }
      )
    }

    const updateData: any = { ...data }
    if (updateData.amount !== undefined) {
      updateData.amount = parseFloat(updateData.amount) || 0
    }

    const record = await db.taxRecord.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating tax record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update tax record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete tax record by id
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

    const existing = await db.taxRecord.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tax record not found' },
        { status: 404 }
      )
    }

    await db.taxRecord.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting tax record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete tax record' },
      { status: 500 }
    )
  }
}
