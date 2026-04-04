import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const records = await db.attendance.findMany({
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            empId: true,
            name: true,
            role: true,
            site: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('[API /attendance GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { empId, site, date, timeIn, timeOut, otHours, shift, status } = body

    if (!empId || !site || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: empId, site, date' },
        { status: 400 }
      )
    }

    // Verify employee exists
    const employee = await db.employee.findUnique({ where: { id: empId } })
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check for duplicate attendance record for same employee and date
    const existing = await db.attendance.findFirst({
      where: { empId, date },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance already recorded for this employee on this date' },
        { status: 409 }
      )
    }

    const record = await db.attendance.create({
      data: {
        empId,
        site,
        date,
        timeIn: timeIn || null,
        timeOut: timeOut || null,
        otHours: otHours ?? 0,
        shift: shift || null,
        status: status || 'Present',
      },
      include: {
        employee: {
          select: { id: true, empId: true, name: true, role: true, site: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('[API /attendance POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to mark attendance' },
      { status: 500 }
    )
  }
}
