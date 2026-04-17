import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getHolidaysInRange, calculateWorkingDays } from '@/lib/services/holiday-service'

export const dynamic = 'force-dynamic'

// GET: List all leave requests
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { isDeleted: false }
    if (employeeId) where.employeeId = parseInt(employeeId)
    if (status) where.status = status.toLowerCase()

    const [leaveRequests, total] = await Promise.all([
      db.leaveRequest.findMany({
        where,
        include: {
          Employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              Branch: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { appliedDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.leaveRequest.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: leaveRequests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave requests' },
      { status: 500 }
    )
  }
}

// POST: Create leave request
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const {
      employeeId,
      leaveType,
      fromDate,
      toDate,
      days,
      reason,
    } = body

    if (!employeeId || !leaveType || !fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'employeeId, leaveType, fromDate, and toDate are required' },
        { status: 400 }
      )
    }

    // Validate employee exists
    const employee = await db.employee.findUnique({ 
      where: { id: parseInt(employeeId) },
      select: {
        id: true,
        branchId: true,
        departmentId: true,
        designationId: true,
      }
    })
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 400 }
      )
    }

    // Validate leave policy exists and is applicable to employee
    const policy = await db.leavePolicy.findFirst({
      where: {
        code: leaveType,
        isActive: true,
        OR: [
          { applicableTo: 'all' },
          { 
            applicableTo: 'department',
            departmentId: employee.departmentId 
          },
          { 
            applicableTo: 'designation',
            designationId: employee.designationId 
          },
          { 
            applicableTo: 'both',
            departmentId: employee.departmentId,
            designationId: employee.designationId 
          }
        ]
      }
    })

    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'This leave type is not applicable to your role or department' },
        { status: 400 }
      )
    }

    // Check for holidays in the leave date range
    const holidays = await getHolidaysInRange(fromDate, toDate, employee.branchId, db)
    
    // Calculate working days excluding weekends, holidays, and employee's shift off days
    const workingDays = await calculateWorkingDays(fromDate, toDate, employee.branchId, employee.id, true, db)
    
    if (workingDays === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave request contains only off days and/or holidays. No working days to apply leave.' },
        { status: 400 }
      )
    }

    // Use calculated working days (holidays and shift off days are automatically excluded)
    const leaveDays = days || workingDays
    
    // Prepare message about holidays and off days if any exist in the range
    let responseMessage = 'Leave request created successfully'
    let holidayInfo = null
    if (holidays.length > 0) {
      const holidayNames = holidays.map(h => h.name).join(', ')
      const totalDays = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const offDays = totalDays - workingDays - holidays.length
      
      if (offDays > 0) {
        responseMessage = `Leave request created. ${holidays.length} holiday(s) (${holidayNames}) and ${offDays} off day(s) excluded. ${workingDays} working days will be deducted.`
      } else {
        responseMessage = `Leave request created. ${holidays.length} holiday(s) (${holidayNames}) excluded. ${workingDays} working days will be deducted.`
      }
      
      holidayInfo = {
        count: holidays.length,
        holidays: holidays.map(h => ({
          name: h.name,
          date: h.date.toISOString().split('T')[0]
        })),
        workingDays: workingDays,
        offDays: offDays
      }
    } else {
      // Check if there are off days without holidays
      const totalDays = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const offDays = totalDays - workingDays
      
      if (offDays > 0) {
        responseMessage = `Leave request created. ${offDays} off day(s) excluded. ${workingDays} working days will be deducted.`
        holidayInfo = {
          count: 0,
          holidays: [],
          workingDays: workingDays,
          offDays: offDays
        }
      }
    }

    const leaveRequest = await db.leaveRequest.create({
      data: {
        employeeId: parseInt(employeeId),
        leaveType,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        days: leaveDays,
        reason: reason || '',
        status: 'pending',
        appliedDate: new Date(),
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
      data: leaveRequest,
      message: responseMessage,
      holidayInfo: holidayInfo
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create leave request' },
      { status: 500 }
    )
  }
}

// PATCH: Update leave request status (approve/reject)
export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, status, rejectionReason, approvedBy, rejectedBy } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'id and status are required' },
        { status: 400 }
      )
    }

    const leaveId = parseInt(id.toString())
    if (isNaN(leaveId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id format' },
        { status: 400 }
      )
    }

    const existing = await db.leaveRequest.findUnique({ where: { id: leaveId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      status: status.toLowerCase(),
    }

    if (status.toLowerCase() === 'approved') {
      updateData.approvedDate = new Date()
      if (approvedBy) updateData.approvedBy = parseInt(approvedBy)
    } else if (status.toLowerCase() === 'rejected') {
      updateData.rejectedDate = new Date()
      if (rejectedBy) updateData.rejectedBy = parseInt(rejectedBy)
      if (rejectionReason) updateData.rejectionReason = rejectionReason
    }

    const leaveRequest = await db.leaveRequest.update({
      where: { id: leaveId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: leaveRequest })
  } catch (error) {
    console.error('Error updating leave request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update leave request' },
      { status: 500 }
    )
  }
}

// DELETE: Delete leave request (soft delete)
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

    const leaveId = parseInt(id.toString())
    if (isNaN(leaveId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id format' },
        { status: 400 }
      )
    }

    const existing = await db.leaveRequest.findUnique({ where: { id: leaveId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Soft delete
    await db.leaveRequest.update({
      where: { id: leaveId },
      data: { isDeleted: true },
    })

    return NextResponse.json({ success: true, data: { id: leaveId } })
  } catch (error) {
    console.error('Error deleting leave request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete leave request' },
      { status: 500 }
    )
  }
}
