import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { isHoliday } from '@/lib/services/holiday-service'
import { classifyAttendance, getActiveShiftAssignment } from '@/lib/services/attendance-rule-service'

export const dynamic = 'force-dynamic'

// GET: List all attendance logs with employee info
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    // Build where clause
    const where: any = {}
    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)
      const nextDate = new Date(targetDate)
      nextDate.setDate(nextDate.getDate() + 1)
      where.logDate = {
        gte: targetDate,
        lt: nextDate,
      }
    }
    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    // Fetch attendance with optimized query
    const [attendance, total] = await Promise.all([
      db.attendanceLog.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          logDate: true,
          punchIn: true,
          punchOut: true,
          status: true,
          biometricDeviceId: true,
          source: true,
          createdAt: true,
          Employee: {
            select: {
              employeeCode: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
        },
        orderBy: { logDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.attendanceLog.count({ where }),
    ])

    // Enrich each record with hasShift flag — check if the employee
    // had an active shift on the log date (used by UI to flag unshifted records)
    const today = new Date()
    const uniqueEmpIds = [...new Set(attendance.map(a => a.employeeId))]
    const shiftMap = new Map<number, boolean>()
    for (const empId of uniqueEmpIds) {
      const shift = await db.shiftAssignment.findFirst({
        where: {
          employeeId: empId,
          effectiveFrom: { lte: today },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
        },
      })
      shiftMap.set(empId, !!shift)
    }

    const enriched = attendance.map(a => ({
      ...a,
      hasShift: shiftMap.get(a.employeeId) ?? false,
    }))

    return NextResponse.json({ 
      success: true, 
      data: enriched,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
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
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { employeeId, logDate, punchIn, punchOut, status } = body

    if (!employeeId || !logDate) {
      return NextResponse.json(
        { success: false, error: 'employeeId and logDate are required' },
        { status: 400 }
      )
    }

    // Check if employee exists and get shift info
    const employee = await db.employee.findUnique({ 
      where: { id: parseInt(employeeId) },
      select: {
        id: true,
        branchId: true,
      }
    })
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 400 }
      )
    }

    // ── Shift guard: employee must have an active shift assignment ──
    const shiftAssignment = await getActiveShiftAssignment(employee.id, new Date(logDate), db)
    if (!shiftAssignment) {
      return NextResponse.json(
        { success: false, error: 'Employee has no active shift assignment. Assign a shift before recording attendance.' },
        { status: 422 }
      )
    }

    // Check if the date is a holiday (for information, not blocking)
    const holidayCheck = await isHoliday(logDate, employee.branchId, db)
    let isHolidayWork = false
    if (holidayCheck.isHoliday) {
      isHolidayWork = true
      console.log(`Attendance on holiday: ${holidayCheck.holiday?.name} - All hours will be OT`)
    }

    // Apply attendance rules if punch-in time is provided
    let calculatedStatus = status || 'present'
    let lateMinutes = 0
    let fineAmount = 0
    let ruleResult = null
    
    if (punchIn) {
      const classification = await classifyAttendance(
        parseInt(employeeId),
        new Date(logDate),
        new Date(punchIn),
        punchOut ? new Date(punchOut) : null,
        db
      )
      if (!status) calculatedStatus = classification.status
      lateMinutes = classification.lateMinutes
      fineAmount = classification.fineAmount
      ruleResult = classification
    }

    const record = await db.attendanceLog.create({
      data: {
        employeeId: parseInt(employeeId),
        logDate: new Date(logDate),
        punchIn: punchIn ? new Date(punchIn) : null,
        punchOut: punchOut ? new Date(punchOut) : null,
        status: calculatedStatus,
        lateMinutes,
        fineAmount,
        updatedAt: new Date(),
      },
      include: {
        Employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      success: true, 
      data: record,
      ruleApplied: ruleResult ? {
        status: ruleResult.status,
        isLate: ruleResult.isLate,
        lateMinutes: ruleResult.lateMinutes,
        fineAmount: ruleResult.fineAmount,
        appliedRule: ruleResult.appliedRule,
      } : null,
    }, { status: 201 })
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
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const attendanceId = parseInt(id.toString())
    if (isNaN(attendanceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id format' },
        { status: 400 }
      )
    }

    const existing = await db.attendanceLog.findUnique({ where: { id: attendanceId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    // Convert date strings to Date objects if present
    const updateData: any = { ...data }
    if (updateData.logDate) updateData.logDate = new Date(updateData.logDate)
    if (updateData.punchIn) updateData.punchIn = new Date(updateData.punchIn)
    if (updateData.punchOut) updateData.punchOut = new Date(updateData.punchOut)
    if (updateData.employeeId) updateData.employeeId = parseInt(updateData.employeeId)

    const record = await db.attendanceLog.update({
      where: { id: attendanceId },
      data: updateData,
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
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const attendanceId = parseInt(id.toString())
    if (isNaN(attendanceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id format' },
        { status: 400 }
      )
    }

    const existing = await db.attendanceLog.findUnique({ where: { id: attendanceId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    await db.attendanceLog.delete({ where: { id: attendanceId } })

    return NextResponse.json({ success: true, data: { id: attendanceId } })
  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete attendance record' },
      { status: 500 }
    )
  }
}
