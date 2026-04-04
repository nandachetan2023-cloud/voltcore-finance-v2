import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all budget items
export async function GET() {
  try {
    const items = await db.budgetItem.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Error fetching budget items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch budget items' },
      { status: 500 }
    )
  }
}

// POST: Create budget item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, description, planned, period, status } = body

    if (!category || !description || !planned || !period) {
      return NextResponse.json(
        { success: false, error: 'category, description, planned, and period are required' },
        { status: 400 }
      )
    }

    const item = await db.budgetItem.create({
      data: {
        category,
        description,
        planned: parseFloat(planned) || 0,
        actual: parseFloat(body.actual) || 0,
        period,
        status: status || 'On Track',
      },
    })

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create budget item' },
      { status: 500 }
    )
  }
}

// PUT: Update budget item by id
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

    const existing = await db.budgetItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Budget item not found' },
        { status: 404 }
      )
    }

    const updateData: any = { ...data }
    if (updateData.planned !== undefined) {
      updateData.planned = parseFloat(updateData.planned) || 0
    }
    if (updateData.actual !== undefined) {
      updateData.actual = parseFloat(updateData.actual) || 0
    }

    const item = await db.budgetItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('Error updating budget item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update budget item' },
      { status: 500 }
    )
  }
}

// DELETE: Delete budget item by id
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

    const existing = await db.budgetItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Budget item not found' },
        { status: 404 }
      )
    }

    await db.budgetItem.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting budget item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete budget item' },
      { status: 500 }
    )
  }
}
