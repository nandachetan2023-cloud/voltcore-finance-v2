import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all shifts
export async function GET() {
  try {
    const shifts = await db.shift.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: shifts,
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

// POST: Create shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      type,
      startTime,
      endTime,
      crossesMidnight,
      breakMinutes,
      graceMinutes,
      otThresholdMin,
      weekOffDays,
    } = body

    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'name, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    const shift = await db.shift.create({
      data: {
        name,
        type: type || 'fixed',
        startTime,
        endTime,
        crossesMidnight: crossesMidnight || false,
        breakMinutes: breakMinutes || 60,
        graceMinutes: graceMinutes || 10,
        otThresholdMin: otThresholdMin || 30,
        weekOffDays: weekOffDays || [],
      },
    })

    return NextResponse.json({ success: true, data: shift }, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shift' },
      { status: 500 }
    )
  }
}

// PUT: Update shift by id
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

    const existing = await db.shift.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      )
    }

    const shift = await db.shift.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: shift })
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update shift' },
      { status: 500 }
    )
  }
}

// DELETE: Delete shift by id (soft delete)
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

    const existing = await db.shift.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      )
    }

    // Soft delete
    await db.shift.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete shift' },
      { status: 500 }
    )
  }
}
