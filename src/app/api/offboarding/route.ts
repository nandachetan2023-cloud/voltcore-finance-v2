import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Helper: resolve current user's department name and whether they are admin ──
async function getCurrentUserContext(request: NextRequest, db: any) {
  const employeeIdCookie = request.cookies.get('erp_employee_id')?.value
  const emailCookie = request.cookies.get('erp_user_email')?.value
  const roleCookie = request.cookies.get('erp_user_role')?.value
  const tenantId = request.cookies.get('erp_tenant_id')?.value

  // superadmin / admin (all-access) role → treat as admin
  if (roleCookie === 'admin' || roleCookie === 'superadmin') {
    return { isAdmin: true, deptName: null, employeeId: null }
  }

  // Try to resolve department from linked employee record
  let deptName: string | null = null
  let employeeId: number | null = null

  if (employeeIdCookie) {
    employeeId = parseInt(employeeIdCookie)
    try {
      const emp = await db.employee.findUnique({
        where: { id: employeeId },
        select: { Department: { select: { name: true } } },
      })
      if (emp?.Department?.name) deptName = emp.Department.name.toLowerCase().trim()
    } catch {}
  }

  // Check OrgRole level via superadmin DB — level 1 = department-scoped approver
  let isLevel1 = false
  if (emailCookie && tenantId) {
    try {
      const tenantUser = await superadminDb.tenantUser.findFirst({
        where: { email: emailCookie, tenantId },
        select: { orgRoleId: true },
      })
      if (tenantUser?.orgRoleId) {
        const orgRole = await superadminDb.orgRole.findUnique({
          where: { id: tenantUser.orgRoleId },
          select: { level: true, departments: true },
        })
        if (orgRole) {
          isLevel1 = orgRole.level === 1
          // If OrgRole has explicit departments, use those to override
          if (orgRole.departments && orgRole.departments.trim()) {
            const roleDepts = orgRole.departments.split(',').map((d: string) => d.toLowerCase().trim())
            if (roleDepts.length > 0 && roleDepts[0]) deptName = roleDepts[0]
          }
        }
      }
    } catch {}
  }

  return { isAdmin: false, deptName, employeeId, isLevel1 }
}

// A non-admin user can approve a clearance only if:
// 1. They have a linked employee with a matching department, AND
// 2. Their OrgRole level === 1 (lowest authority = department-level approver)
function userCanApproveClearance(
  userCtx: { isAdmin: boolean; deptName: string | null; isLevel1?: boolean },
  clearanceDept: string
): boolean {
  if (userCtx.isAdmin) return true
  if (!userCtx.deptName || !userCtx.isLevel1) return false
  return clearanceDept.toLowerCase().trim() === userCtx.deptName.toLowerCase().trim()
}

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const where: any = {}
    if (employeeId) where.employeeId = parseInt(employeeId)
    if (status) where.status = status

    const resignations = await db.resignation.findMany({
      where,
      include: {
        Employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            Department: { select: { name: true } },
            Designation: { select: { name: true } },
            noticePeriodDays: true,
          },
        },
        clearances: { orderBy: { department: 'asc' } },
        exitInterview: true,
      },
      orderBy: { submittedAt: 'desc' },
    })

    // Resolve current user context to tell the UI what they can approve
    const userCtx = await getCurrentUserContext(request, db)

    return NextResponse.json({
      success: true,
      data: resignations,
      currentUser: {
        isAdmin: userCtx.isAdmin,
        deptName: userCtx.deptName,
        employeeId: userCtx.employeeId,
        isLevel1: userCtx.isLevel1 ?? false,
      },
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch resignations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { employeeId, reason, requestedLwd, buyoutDays = 0 } = await request.json()
    if (!employeeId || !reason || !requestedLwd) {
      return NextResponse.json({ success: false, error: 'employeeId, reason and requestedLwd required' }, { status: 400 })
    }

    const employee = await db.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: { Department: { select: { name: true } } },
    })
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })

    const noticeDays = employee.noticePeriodDays || 30
    const effectiveDays = Math.max(0, noticeDays - parseInt(buyoutDays))

    const calculatedLwd = new Date()
    calculatedLwd.setDate(calculatedLwd.getDate() + effectiveDays)

    // Build clearance departments: employee's own dept + always "admin"
    const empDept = employee.Department?.name?.toLowerCase().trim() || 'general'
    const clearanceDepts = Array.from(new Set([empDept, 'admin']))

    const resignation = await db.resignation.create({
      data: {
        employeeId: parseInt(employeeId),
        reason,
        requestedLwd: new Date(requestedLwd),
        calculatedLwd,
        noticePeriodDays: noticeDays,
        buyoutDays: parseInt(buyoutDays),
        status: 'pending',
        updatedAt: new Date(),
        clearances: {
          create: clearanceDepts.map(dept => ({
            department: dept,
            status: 'pending',
            updatedAt: new Date(),
          })),
        },
      },
      include: { Employee: { select: { firstName: true, lastName: true } }, clearances: true },
    })

    await db.employee.update({
      where: { id: parseInt(employeeId) },
      data: { employmentStatus: 'notice_period', updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, data: resignation }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to submit resignation' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { id, action, rejectionReason, clearanceId, clearanceStatus, clearanceRemarks } = await request.json()

    // ── Clearance approval ──────────────────────────────────────────
    if (clearanceId) {
      const userCtx = await getCurrentUserContext(request, db)

      // Fetch the clearance to check department
      const existing = await db.exitClearance.findUnique({ where: { id: parseInt(clearanceId) } })
      if (!existing) return NextResponse.json({ success: false, error: 'Clearance not found' }, { status: 404 })

      // Authorization: admin can approve any; level-1 dept user can only approve their own dept
      const clearanceDept = existing.department.toLowerCase().trim()
      const canApprove = userCanApproveClearance(userCtx, clearanceDept)

      if (!canApprove) {
        const reason = !userCtx.isAdmin && !userCtx.isLevel1
          ? 'Only level-1 role employees can approve clearances'
          : `You can only approve clearances for your own department (${userCtx.deptName || 'unknown'})`
        return NextResponse.json({ success: false, error: reason }, { status: 403 })
      }

      const clearance = await db.exitClearance.update({
        where: { id: parseInt(clearanceId) },
        data: {
          status: clearanceStatus,
          remarks: clearanceRemarks,
          clearedBy: userCtx.employeeId ?? null,
          clearedAt: clearanceStatus === 'cleared' ? new Date() : null,
          updatedAt: new Date(),
        },
      })

      // Auto-approve resignation when all clearances are cleared
      const all = await db.exitClearance.findMany({ where: { resignationId: clearance.resignationId } })
      const allCleared = all.every((c: any) => c.status === 'cleared')
      if (allCleared) {
        await db.resignation.update({
          where: { id: clearance.resignationId },
          data: { status: 'approved', updatedAt: new Date() },
        })
      }

      return NextResponse.json({ success: true, data: clearance, allCleared })
    }

    if (!id || !action) return NextResponse.json({ success: false, error: 'id and action required' }, { status: 400 })

    const updateData: any = { updatedAt: new Date() }
    if (action === 'approve_manager') { updateData.managerApprovedAt = new Date(); updateData.currentStep = 2 }
    else if (action === 'approve_hr') { updateData.hrApprovedAt = new Date(); updateData.status = 'approved' }
    else if (action === 'reject') { updateData.status = 'rejected'; updateData.rejectionReason = rejectionReason }
    else if (action === 'withdraw') { updateData.status = 'withdrawn' }

    const updated = await db.resignation.update({ where: { id: parseInt(id) }, data: updateData })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update resignation' }, { status: 500 })
  }
}
