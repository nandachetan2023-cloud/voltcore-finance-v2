import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all leave requests
export async function GET(request: NextRequest) {
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
    const employee = await db.employee.findUnique({ where: { id: parseInt(employeeId) } })
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 400 }
      )
    }

    // Calculate days if not provided
    let leaveDays = days
    if (!leaveDays) {
      const from = new Date(fromDate)
      const to = new Date(toDate)
      leaveDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1)
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

    return NextResponse.json({ success: true, data: leaveRequest }, { status: 201 })
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
