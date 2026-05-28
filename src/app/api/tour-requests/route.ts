import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('erp_tenant_id')?.value || null
}

// GET: List tour requests
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { isDeleted: false }
    if (employeeId) where.employeeId = parseInt(employeeId)
    if (status) where.status = status.toLowerCase()

    // Resolve caller's role level for canApprove tagging
    let callerRoleLevel: number | null = null
    let callerIsAdmin = false
    const callerEmail = request.cookies.get('erp_user_email')?.value
    const callerRole = request.cookies.get('erp_user_role')?.value

    if (callerEmail && tenantId && !employeeId) {
      const callerUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, email: callerEmail, isActive: true },
        select: { employeeId: true, orgRoleId: true },
      }).catch(() => null)

      if (callerUser?.orgRoleId) {
        const role = await superadminDb.orgRole.findUnique({
          where: { id: callerUser.orgRoleId },
          select: { level: true },
        }).catch(() => null)
        if (role) callerRoleLevel = role.level
      }
      callerIsAdmin = callerRole === 'admin' && !callerUser?.orgRoleId
    } else if (!employeeId && callerRole === 'admin') {
      callerIsAdmin = true
    }

    const [tourRequests, total] = await Promise.all([
      db.tourRequest.findMany({
        where,
        include: {
          Employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              Branch: { select: { name: true } },
            },
          },
        },
        orderBy: { appliedDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.tourRequest.count({ where }),
    ])

    // Enrich with canApprove
    const enriched = tourRequests.map((tr: any) => ({
      ...tr,
      canApprove: tr.status === 'pending' && (callerIsAdmin || (callerRoleLevel !== null && callerRoleLevel > 1)),
    }))

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (error) {
    console.error('Error fetching tour requests:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tour requests' },
      { status: 500 }
    )
  }
}

// POST: Create tour request
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { employeeId, fromDate, toDate, days, destination, purpose, remarks } = body

    if (!employeeId || !fromDate || !toDate || !destination || !purpose) {
      return NextResponse.json(
        { success: false, error: 'employeeId, fromDate, toDate, destination, and purpose are required' },
        { status: 400 }
      )
    }

    const employee = await db.employee.findUnique({ where: { id: parseInt(employeeId) } })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 400 })
    }

    // Calculate days if not provided
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const calculatedDays = days || Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const tourRequest = await db.tourRequest.create({
      data: {
        employeeId: parseInt(employeeId),
        fromDate: from,
        toDate: to,
        days: calculatedDays,
        destination,
        purpose,
        remarks: remarks || null,
        status: 'pending',
        currentStep: 1,
        updatedAt: new Date(),
      },
      include: {
        Employee: {
          select: { employeeCode: true, firstName: true, lastName: true },
        },
      },
    })

    // Notify admin of new tour request
    try {
      const empName = `${tourRequest.Employee.firstName} ${tourRequest.Employee.lastName}`
      await db.notification.create({
        data: {
          userId: 0,
          userEmail: '__admin_broadcast__',
          title: 'New Tour Request — Approval Required',
          message: `${empName} (${tourRequest.Employee.employeeCode}) applied for a tour to ${destination} from ${new Date(from).toLocaleDateString('en-IN')} to ${new Date(to).toLocaleDateString('en-IN')}.`,
          type: 'info',
          entityType: 'tour',
          entityId: tourRequest.id,
          link: '',
          isRead: false,
          createdAt: new Date(),
        },
      })
    } catch (e) { console.warn('Tour notification failed:', e) }

    return NextResponse.json({ success: true, data: tourRequest }, { status: 201 })
  } catch (error) {
    console.error('Error creating tour request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create tour request' },
      { status: 500 }
    )
  }
}

// PATCH: Approve or reject tour request
export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)
  try {
    const body = await request.json()
    const { id, action, rejectionReason } = body // action: 'approve' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 })
    }

    const tourRequest = await db.tourRequest.findUnique({ where: { id: parseInt(id) } })
    if (!tourRequest) {
      return NextResponse.json({ success: false, error: 'Tour request not found' }, { status: 404 })
    }
    if (tourRequest.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Tour request is not pending' }, { status: 400 })
    }

    // Resolve approver's employee ID
    let approverEmployeeId: number | null = null
    const callerEmail = request.cookies.get('erp_user_email')?.value
    if (callerEmail && tenantId) {
      const callerUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, email: callerEmail, isActive: true },
        select: { employeeId: true },
      }).catch(() => null)
      if (callerUser?.employeeId) approverEmployeeId = callerUser.employeeId
    }

    if (action === 'approve') {
      await db.tourRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'approved',
          approvedBy: approverEmployeeId,
          approvedDate: new Date(),
          updatedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, message: 'Tour request approved' })
    } else if (action === 'reject') {
      await db.tourRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'rejected',
          rejectedBy: approverEmployeeId,
          rejectedDate: new Date(),
          rejectionReason: rejectionReason || null,
          updatedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, message: 'Tour request rejected' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing tour request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process tour request' },
      { status: 500 }
    )
  }
}

// DELETE: Soft delete tour request
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    await db.tourRequest.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete tour request' }, { status: 500 })
  }
}
