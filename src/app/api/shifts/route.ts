import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all shift schedules (filter by ?site= and ?weekStart=)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const site = searchParams.get('site')
    const weekStart = searchParams.get('weekStart')

    const where: any = {}
    if (site) where.site = site
    if (weekStart) where.weekStart = weekStart

    const shifts = await db.shiftSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: shifts })
  } catch (error) {
    console.error('Error fetching shift schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shift schedules' },
      { status: 500 }
    )
  }
}

// POST: Create shift assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empId, employeeName, site, shift, weekStart } = body

    if (!empId || !employeeName || !site || !shift || !weekStart) {
      return NextResponse.json(
        { success: false, error: 'empId, employeeName, site, shift, and weekStart are required' },
        { status: 400 }
      )
    }

    const shiftSchedule = await db.shiftSchedule.create({
      data: {
        empId,
        employeeName,
        site,
        shift,
        weekStart,
      },
    })

    return NextResponse.json({ success: true, data: shiftSchedule }, { status: 201 })
  } catch (error) {
    console.error('Error creating shift schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shift schedule' },
      { status: 500 }
    )
  }
}

// PUT: Update shift schedule by id
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

    const existing = await db.shiftSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Shift schedule not found' },
        { status: 404 }
      )
    }

    const shiftSchedule = await db.shiftSchedule.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: shiftSchedule })
  } catch (error) {
    console.error('Error updating shift schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update shift schedule' },
      { status: 500 }
    )
  }
}

// DELETE: Delete shift schedule by id
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

    const existing = await db.shiftSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Shift schedule not found' },
        { status: 404 }
      )
    }

    await db.shiftSchedule.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting shift schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete shift schedule' },
      { status: 500 }
    )
  }
}
