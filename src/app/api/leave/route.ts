import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled']

export async function GET() {
  try {
    const leaveRequests = await db.leaveRequest.findMany({
      orderBy: { appliedDate: 'desc' },
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

    return NextResponse.json({ success: true, data: leaveRequests })
  } catch (error) {
    console.error('[API /leave GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave requests' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
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

    const updated = await db.leaveRequest.update({
      where: { id },
      data: { status },
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

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[API /leave PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update leave request' },
      { status: 500 }
    )
  }
}
