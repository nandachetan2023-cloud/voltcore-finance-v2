import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all attendance with employee name
export async function GET() {
  try {
    const attendance = await db.attendance.findMany({
      select: {
        id: true,
        empId: true,
        date: true,
        site: true,
        timeIn: true,
        timeOut: true,
        otHours: true,
        shift: true,
        status: true,
        createdAt: true,
        employee: {
          select: {
            name: true,
            empId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: attendance })
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}

// POST: Create attendance record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empId, date, site, timeIn, timeOut, otHours, shift, status } = body

    if (!empId || !date) {
      return NextResponse.json(
        { success: false, error: 'empId and date are required' },
        { status: 400 }
      )
    }

    // Check if employee exists
    const employee = await db.employee.findUnique({ where: { id: empId } })
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 400 }
      )
    }

    // Check duplicate empId + date combo
    const existing = await db.attendance.findFirst({
      where: { empId, date },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance record already exists for this employee on this date' },
        { status: 409 }
      )
    }

    const record = await db.attendance.create({
      data: {
        empId,
        date,
        site: site || '',
        timeIn: timeIn || null,
        timeOut: timeOut || null,
        otHours: otHours || 0,
        shift: shift || null,
        status: status || 'Present',
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating attendance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create attendance record' },
      { status: 500 }
    )
  }
}

// PUT: Update attendance by id
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

    const existing = await db.attendance.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    const record = await db.attendance.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update attendance record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete attendance by id
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

    const existing = await db.attendance.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    await db.attendance.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete attendance record' },
      { status: 500 }
    )
  }
}
