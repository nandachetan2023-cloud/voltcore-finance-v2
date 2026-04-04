import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all leave requests with employee name
export async function GET() {
  try {
    const leaveRequests = await db.leaveRequest.findMany({
      include: {
        employee: {
          select: {
            name: true,
            empId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: leaveRequests })
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave requests' },
      { status: 500 }
    )
  }
}

// POST: Create leave request (auto-generate appliedDate)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empId, site, type, fromDate, toDate, days, reason, status } = body

    if (!empId || !type || !fromDate || !toDate || !days) {
      return NextResponse.json(
        { success: false, error: 'empId, type, fromDate, toDate, and days are required' },
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

    const today = new Date().toISOString().split('T')[0]

    const leaveRequest = await db.leaveRequest.create({
      data: {
        empId,
        site: site || employee.site || '',
        type,
        fromDate,
        toDate,
        days,
        reason: reason || '',
        status: status || 'Pending',
        appliedDate: today,
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

// PATCH: Update leave request status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.leaveRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      )
    }

    const leaveRequest = await db.leaveRequest.update({
      where: { id },
      data,
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

// DELETE: Delete leave request by id
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

    const existing = await db.leaveRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      )
    }

    await db.leaveRequest.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting leave request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete leave request' },
      { status: 500 }
    )
  }
}
