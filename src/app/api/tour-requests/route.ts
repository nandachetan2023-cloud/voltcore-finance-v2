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

// ── Fetch approval chain for tour from superadmin DB ─────────────
async function getTourApprovalChain(tenantId: string, requesterRoleId?: string | null) {
  if (!requesterRoleId) return null
  try {
    return await superadminDb.approvalChain.findFirst({
      where: { tenantId, requesterRoleId, isActive: true },
      include: { steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } } },
    })
  } catch { return null }
}

async function findUsersForRole(tenantId: string, roleId: string): Promise<{ email: string }[]> {
  try {
    return await superadminDb.tenantUser.findMany({
      where: { tenantId, orgRoleId: roleId, isActive: true },
      select: { email: true },
    })
  } catch { return [] }
}

// POST: Create tour request
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)
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
        Employee: { select: { employeeCode: true, firstName: true, lastName: true } },
      },
    })

    // Notify via approval chain (same logic as leave)
    const empName = `${tourRequest.Employee.firstName} ${tourRequest.Employee.lastName}`
    const fromStr = from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const toStr = to.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const notifMsg = `${empName} (${tourRequest.Employee.employeeCode}) applied for a tour to ${destination} (${fromStr} – ${toStr}, ${calculatedDays} day${calculatedDays !== 1 ? 's' : ''})`

    if (tenantId) {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, employeeId: parseInt(employeeId), isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)

      const requesterRole = requesterUser?.orgRoleId
        ? await superadminDb.orgRole.findUnique({ where: { id: requesterUser.orgRoleId }, select: { level: true } }).catch(() => null)
        : null

      const isLevel1 = !requesterRole || requesterRole.level === 1

      if (isLevel1) {
        await db.notification.create({
          data: { userId: 0, userEmail: '__admin_broadcast__',
            title: 'New Tour Request — Admin Approval Required', message: notifMsg,
            type: 'info', link: '', entityType: 'tour', entityId: tourRequest.id },
        }).catch(() => {})
      } else {
        const chain = await getTourApprovalChain(tenantId, requesterUser?.orgRoleId)
        if (chain && chain.steps.length > 0) {
          const step1 = chain.steps[0]
          const approvers = await findUsersForRole(tenantId, step1.approverRoleId)
          if (approvers.length > 0) {
            for (const approver of approvers) {
              await db.notification.create({
                data: { userId: 0, userEmail: approver.email,
                  title: 'New Tour Request — Approval Needed', message: notifMsg,
                  type: 'info', link: '', entityType: 'tour', entityId: tourRequest.id },
              }).catch(() => {})
            }
          } else {
            await db.notification.create({
              data: { userId: 0, userEmail: '__admin_broadcast__',
                title: 'New Tour Request — No Approver Found', message: notifMsg,
                type: 'warning', link: '', entityType: 'tour', entityId: tourRequest.id },
            }).catch(() => {})
          }
        } else {
          await db.notification.create({
            data: { userId: 0, userEmail: '__admin_broadcast__',
              title: 'New Tour Request', message: notifMsg,
              type: 'info', link: '', entityType: 'tour', entityId: tourRequest.id },
          }).catch(() => {})
        }
      }
    } else {
      await db.notification.create({
        data: { userId: 0, userEmail: '__admin_broadcast__',
          title: 'New Tour Request', message: notifMsg,
          type: 'info', link: '', entityType: 'tour', entityId: tourRequest.id },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, data: tourRequest }, { status: 201 })
  } catch (error) {
    console.error('Error creating tour request:', error)
    return NextResponse.json({ success: false, error: 'Failed to create tour request' }, { status: 500 })
  }
}

// PATCH: Approve or reject tour request (multi-step approval chain)
export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)
  try {
    const body = await request.json()
    const { id, action, rejectionReason } = body

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 })
    }

    const tourRequest = await db.tourRequest.findUnique({
      where: { id: parseInt(id) },
      include: { Employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, email: true } } },
    })
    if (!tourRequest) return NextResponse.json({ success: false, error: 'Tour request not found' }, { status: 404 })
    if (tourRequest.status !== 'pending') return NextResponse.json({ success: false, error: 'Tour request is not pending' }, { status: 400 })

    let approverEmployeeId: number | null = null
    const callerEmail = request.cookies.get('erp_user_email')?.value
    if (callerEmail && tenantId) {
      const callerUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, email: callerEmail, isActive: true },
        select: { employeeId: true },
      }).catch(() => null)
      if (callerUser?.employeeId) approverEmployeeId = callerUser.employeeId
    }

    const empName = `${tourRequest.Employee.firstName} ${tourRequest.Employee.lastName}`
    const fromStr = tourRequest.fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const toStr = tourRequest.toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

    // ── REJECT ──
    if (action === 'reject') {
      await db.tourRequest.update({
        where: { id: parseInt(id) },
        data: { status: 'rejected', rejectedBy: approverEmployeeId, rejectedDate: new Date(), rejectionReason: rejectionReason || null, updatedAt: new Date() },
      })
      await db.notification.create({
        data: { userId: 0, userEmail: tourRequest.Employee.email || '',
          title: 'Tour Request Rejected',
          message: `Your tour to ${tourRequest.destination} (${fromStr} – ${toStr}) was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
          type: 'error', link: '', entityType: 'tour', entityId: parseInt(id) },
      }).catch(() => {})
      return NextResponse.json({ success: true, message: 'Tour request rejected' })
    }

    // ── APPROVE (multi-step) ──
    if (action !== 'approve') return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })

    // Load approval chain
    let chain: Awaited<ReturnType<typeof getTourApprovalChain>> = null
    if (tenantId) {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, employeeId: tourRequest.employeeId, isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)
      chain = await getTourApprovalChain(tenantId, requesterUser?.orgRoleId || null)
    }

    const currentStep = tourRequest.currentStep || 1
    const totalSteps = chain?.steps.length || 1
    const isLastStep = !chain || currentStep >= totalSteps

    if (isLastStep) {
      // Final approval
      await db.tourRequest.update({
        where: { id: parseInt(id) },
        data: { status: 'approved', approvedBy: approverEmployeeId, approvedDate: new Date(), updatedAt: new Date() },
      })
      await db.notification.create({
        data: { userId: 0, userEmail: tourRequest.Employee.email || '',
          title: 'Tour Request Approved ✓',
          message: `Your tour to ${tourRequest.destination} (${fromStr} – ${toStr}) has been approved. These days will count as paid attendance.`,
          type: 'success', link: '', entityType: 'tour', entityId: parseInt(id) },
      }).catch(() => {})
      return NextResponse.json({ success: true, message: 'Tour request approved', fullyApproved: true })
    }

    // Intermediate step — advance to next
    const nextStep = currentStep + 1
    await db.tourRequest.update({
      where: { id: parseInt(id) },
      data: { currentStep: nextStep, approvedBy: approverEmployeeId, updatedAt: new Date() },
    })

    // Notify employee of partial approval
    await db.notification.create({
      data: { userId: 0, userEmail: tourRequest.Employee.email || '',
        title: `Tour — Step ${currentStep} Approved`,
        message: `Your tour to ${tourRequest.destination} (${fromStr} – ${toStr}) passed step ${currentStep} of ${totalSteps}. Awaiting step ${nextStep}.`,
        type: 'info', link: '', entityType: 'tour', entityId: parseInt(id) },
    }).catch(() => {})

    // Notify next-level approvers
    if (chain && tenantId) {
      const nextStepDef = chain.steps.find(s => s.stepNumber === nextStep)
      if (nextStepDef) {
        const nextApprovers = await findUsersForRole(tenantId, nextStepDef.approverRoleId)
        for (const approver of nextApprovers) {
          await db.notification.create({
            data: { userId: 0, userEmail: approver.email,
              title: `Tour Request — Step ${nextStep} Approval Needed`,
              message: `${empName}'s tour to ${tourRequest.destination} (${fromStr} – ${toStr}) passed step ${currentStep} and now requires your approval.`,
              type: 'info', link: '', entityType: 'tour', entityId: parseInt(id) },
          }).catch(() => {})
        }
        if (nextApprovers.length === 0) {
          await db.notification.create({
            data: { userId: 0, userEmail: '__admin_broadcast__',
              title: `Tour Escalated — Step ${nextStep}`,
              message: `${empName}'s tour needs step ${nextStep} approval. No users found for the required role.`,
              type: 'warning', link: '', entityType: 'tour', entityId: parseInt(id) },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true, message: `Tour step ${currentStep} approved. Awaiting step ${nextStep}.` })
  } catch (error) {
    console.error('Error processing tour request:', error)
    return NextResponse.json({ success: false, error: 'Failed to process tour request' }, { status: 500 })
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
