import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper: send notification to approver(s)
async function notifyApprovers(
  db: any,
  employeeId: number,
  entityType: string,
  entityId: number,
  subject: string,
  requestType: string
) {
  try {
    // Get employee info
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: {
        firstName: true, lastName: true,
        departmentId: true, designationId: true,
        Department: { select: { name: true } },
      },
    })
    if (!employee) return

    const empName = `${employee.firstName} ${employee.lastName}`

    // Find all admin users (role = 'admin' means allowedModules = 'all')
    // We notify via email lookup — get all active users for this tenant
    // Since we don't have a direct link to TenantUser from here, we create
    // a notification with userEmail = '__admin__' as a sentinel that the
    // notifications API will expand to all admin users
    // For now: create a notification for each user who has 'all' access
    // We store it with a special marker and the admin panel polls for it

    const typeLabel = requestType === 'advance_payment' ? 'Advance Payment Request' : 'General Request'
    const title = `New ${typeLabel}`
    const message = `${empName} submitted: "${subject}"`

    // Create a broadcast notification (userEmail = '' means all admins see it)
    await db.notification.create({
      data: {
        userId: employeeId,
        userEmail: '__admin_broadcast__',
        title,
        message,
        type: 'info',
        link: '/system/requests',
        entityType,
        entityId,
        updatedAt: new Date(),
      },
    })
  } catch (e) {
    console.error('Failed to send notification:', e)
  }
}

// GET: list requests
// ?mine=true&employeeId=X  → employee's own requests
// ?pending=true            → all pending (for admin/approver)
// ?all=true                → all requests (admin)
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const pending = searchParams.get('pending') === 'true'
    const status = searchParams.get('status')
    const requestType = searchParams.get('requestType')

    const where: any = { isDeleted: false }
    if (employeeId) where.employeeId = parseInt(employeeId)
    if (pending) where.status = 'pending'
    if (status) where.status = status
    if (requestType) where.requestType = requestType

    const requests = await db.employeeRequest.findMany({
      where,
      include: {
        Employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            Department: { select: { name: true } },
            Designation: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (e) {
    console.error('GET employee-requests error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// POST: create a new request
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { employeeId, requestType, subject, description, amount } = body

    if (!employeeId || !requestType || !subject || !description) {
      return NextResponse.json(
        { success: false, error: 'employeeId, requestType, subject and description are required' },
        { status: 400 }
      )
    }

    if (!['general', 'advance_payment'].includes(requestType)) {
      return NextResponse.json({ success: false, error: 'Invalid requestType' }, { status: 400 })
    }

    const req = await db.employeeRequest.create({
      data: {
        employeeId: parseInt(employeeId),
        requestType,
        subject,
        description,
        amount: amount ? parseFloat(amount) : null,
        status: 'pending',
        updatedAt: new Date(),
      },
      include: {
        Employee: { select: { firstName: true, lastName: true } },
      },
    })

    // Notify admins
    await notifyApprovers(db, parseInt(employeeId), 'request', req.id, subject, requestType)

    return NextResponse.json({ success: true, data: req }, { status: 201 })
  } catch (e) {
    console.error('POST employee-requests error:', e)
    return NextResponse.json({ success: false, error: 'Failed to create request' }, { status: 500 })
  }
}

// PATCH: approve or reject a request (admin only)
export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, action, rejectionNote, approvedBy } = body

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'id and action required' }, { status: 400 })
    }

    const existing = await db.employeeRequest.findUnique({ where: { id: parseInt(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })

    const updateData: any = { updatedAt: new Date() }
    if (action === 'approve') {
      updateData.status = 'approved'
      updateData.approvedBy = approvedBy ? parseInt(approvedBy) : null
      updateData.approvedDate = new Date()
    } else if (action === 'reject') {
      updateData.status = 'rejected'
      updateData.rejectedBy = approvedBy ? parseInt(approvedBy) : null
      updateData.rejectedDate = new Date()
      updateData.rejectionNote = rejectionNote || ''
    } else {
      return NextResponse.json({ success: false, error: 'action must be approve or reject' }, { status: 400 })
    }

    const updated = await db.employeeRequest.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    // Notify the employee
    try {
      const emp = await db.employee.findUnique({
        where: { id: existing.employeeId },
        select: { email: true, firstName: true },
      })
      if (emp) {
        await db.notification.create({
          data: {
            userId: existing.employeeId,
            userEmail: emp.email,
            title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
            message: action === 'approve'
              ? `Your request "${existing.subject}" has been approved.`
              : `Your request "${existing.subject}" was rejected. ${rejectionNote ? `Reason: ${rejectionNote}` : ''}`,
            type: action === 'approve' ? 'success' : 'error',
            link: '/system/my-requests',
            entityType: 'request',
            entityId: existing.id,
            updatedAt: new Date(),
          },
        })
      }
    } catch (e) { console.error('Notification error:', e) }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error('PATCH employee-requests error:', e)
    return NextResponse.json({ success: false, error: 'Failed to update request' }, { status: 500 })
  }
}

// DELETE: soft delete
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await db.employeeRequest.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true, updatedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete request' }, { status: 500 })
  }
}
