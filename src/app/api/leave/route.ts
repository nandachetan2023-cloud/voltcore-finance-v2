import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'
import { getHolidaysInRange, calculateWorkingDays } from '@/lib/services/holiday-service'
import { annotateRequesterStage } from '@/lib/services/approval-stage'
import {
  callerMatchesOwnRoleScope,
  resolveStepRecipients,
} from '@/lib/services/approval-scope'
import { runLeaveAutoApproval } from '@/lib/services/leave-auto-approval'

export const dynamic = 'force-dynamic'

// ── Resolve tenant ID from cookie ─────────────────────────────────
function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('erp_tenant_id')?.value || null
}

// ── Fetch approval chain for leave from superadmin DB ─────────────
async function getLeaveApprovalChain(tenantId: string, requesterRoleId?: string | null) {
  if (!requesterRoleId) return null
  try {
    return await superadminDb.approvalChain.findFirst({
      where: { tenantId, requesterRoleId, isActive: true },
      include: { steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } } },
    })
  } catch { return null }
}

// ── Find the approvers for a step, honouring the approver role's scope ──
// A role scoped to a department/designation/site may only be notified about —
// and may only act on — employees inside that scope. When nobody is in scope
// the request escalates to the tenant admin rather than going nowhere.
// See src/lib/services/approval-scope.ts.
async function findScopedApprovers(
  db: any,
  tenantId: string,
  roleId: string,
  requesterEmployeeId: number,
): Promise<{ recipients: { email: string }[]; escalated: boolean; note: string }> {
  return await resolveStepRecipients(db, tenantId, roleId, requesterEmployeeId)
}

// GET: List all leave requests
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)
  try {
    // Pass any step that has been pending over 24h before reading, so the list
    // never shows a request as awaiting an approver whose window has expired.
    // Self-guarded and idempotent; failures are swallowed so a sweep problem
    // can never stop the list from loading.
    await runLeaveAutoApproval(db, tenantId).catch(() => {})

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { isDeleted: false }
    if (employeeId) where.employeeId = parseInt(employeeId)
    if (status) where.status = status.toLowerCase()

    // Resolve caller's role level for canApprove tagging (admin/approver view only)
    let callerEmployeeId: number | null = null
    let callerRoleLevel: number | null = null
    let callerIsAdmin = false
    const callerEmail = request.cookies.get('erp_user_email')?.value
    const callerRole = request.cookies.get('erp_user_role')?.value

    if (callerEmail && tenantId && !employeeId) {
      const callerUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, email: callerEmail, isActive: true },
        select: { employeeId: true, orgRoleId: true },
      }).catch(() => null)

      if (callerUser?.employeeId) callerEmployeeId = callerUser.employeeId
      if (callerUser?.orgRoleId) {
        const role = await superadminDb.orgRole.findUnique({
          where: { id: callerUser.orgRoleId },
          select: { level: true },
        }).catch(() => null)
        if (role) callerRoleLevel = role.level
      }
      // Only true admin if role cookie is 'admin' AND no orgRole assigned
      callerIsAdmin = callerRole === 'admin' && !callerUser?.orgRoleId
    } else if (!employeeId && callerRole === 'admin') {
      callerIsAdmin = true
    }

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
              Branch: { select: { name: true } },
            },
          },
        },
        orderBy: { appliedDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.leaveRequest.count({ where }),
    ])

    // Enrich with canApprove for the approver view — hard filter at API level
    let enriched: any[] = leaveRequests
    if (tenantId && !employeeId) {
      if (callerRoleLevel !== null) {
        // Caller has an orgRole — only show leaves where they are a designated approver
        const requesterEmpIds = [...new Set(leaveRequests.map(r => r.employeeId))]
        const requesterUsers = await superadminDb.tenantUser.findMany({
          where: { tenantId, employeeId: { in: requesterEmpIds }, isActive: true },
          select: { employeeId: true, orgRoleId: true },
        }).catch(() => [])

        const roleIds = [...new Set(requesterUsers.map(u => u.orgRoleId).filter(Boolean))] as string[]
        const roles = roleIds.length > 0
          ? await superadminDb.orgRole.findMany({ where: { id: { in: roleIds } }, select: { id: true, level: true } }).catch(() => [])
          : []
        const roleLevelMap = new Map<string, number>(roles.map(r => [r.id, r.level] as [string, number]))
        const empRoleLevelMap = new Map<number, number>(
          requesterUsers.map(u => [u.employeeId as number, u.orgRoleId ? (roleLevelMap.get(u.orgRoleId) ?? 0) : 0] as [number, number])
        )

        // Get caller's orgRoleId
        const callerUser = await superadminDb.tenantUser.findFirst({
          where: { tenantId, email: callerEmail || '', isActive: true },
          select: { orgRoleId: true },
        }).catch(() => null)
        const callerOrgRoleId = callerUser?.orgRoleId

        // Build chain steps map per requester role
        const chainStepsMap2 = new Map<string, any[]>()
        for (const roleId of roleIds) {
          const chain = await getLeaveApprovalChain(tenantId, roleId)
          chainStepsMap2.set(roleId, chain?.steps || [])
        }

        const empOrgRoleMap = new Map<number, string | null>(
          requesterUsers.map(u => [u.employeeId as number, u.orgRoleId ?? null] as [number, string | null])
        )

        enriched = leaveRequests
          .filter(r => {
            const reqOrgRoleId = empOrgRoleMap.get(r.employeeId)
            const reqLevel = empRoleLevelMap.get(r.employeeId) ?? 0
            if (reqLevel <= 1) return false
            if (!reqOrgRoleId) return false
            const steps = chainStepsMap2.get(reqOrgRoleId) || []
            // Only show if caller is the approver for the CURRENT step
            const currentStepNum = (r as any).currentStep || 1
            const currentStepDef = steps.find((s: any) => s.stepNumber === currentStepNum)
            if (currentStepDef?.approverRoleId !== callerOrgRoleId) return false

            // Being the named approver for the current step IS the
            // authorization. The role's scope describes who the approver is,
            // not who they may act on, so it is not tested against the
            // requester here — doing so hid every request from every scoped
            // approver.
            return true
          })
          .map(r => ({ ...r, canApprove: true }))

      } else if (callerIsAdmin) {
        // Full admin sees ALL leaves and can finalize any of them (top authority).
        enriched = leaveRequests
          .filter(r => r.employeeId !== callerEmployeeId)
          .map(r => ({ ...r, canApprove: true }))
      } else {
        enriched = []
      }
    } else if (tenantId && employeeId) {
      // Requester's own view — annotate each pending leave with its stage.
      enriched = await annotateRequesterStage(tenantId, parseInt(employeeId), leaveRequests)
    }

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
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
      supportingDocument,
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
          },
          {
            applicableTo: 'employee',
            employeeId: employee.id
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

    // ── Document requirement check ────────────────────────────────
    if (policy.requiresDocument && !supportingDocument) {
      return NextResponse.json({
        success: false,
        error: `${policy.name} requires a supporting document (e.g. medical certificate). Please attach one before submitting.`,
      }, { status: 400 })
    }

    // ── Policy restriction checks ─────────────────────────────────

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const leaveFrom = new Date(fromDate)
    leaveFrom.setHours(0, 0, 0, 0)
    const leaveTo = new Date(toDate)
    leaveTo.setHours(0, 0, 0, 0)

    // 1. Min days notice — employee must apply at least N days before leave starts
    if (policy.minDaysNotice && policy.minDaysNotice > 0) {
      const daysUntilLeave = Math.floor((leaveFrom.getTime() - today.getTime()) / 86400000)
      if (daysUntilLeave < policy.minDaysNotice) {
        return NextResponse.json({
          success: false,
          error: `${policy.name} requires at least ${policy.minDaysNotice} day${policy.minDaysNotice !== 1 ? 's' : ''} advance notice. Your leave starts in ${daysUntilLeave} day${daysUntilLeave !== 1 ? 's' : ''}.`,
        }, { status: 400 })
      }
    }

    // 2. Max consecutive days
    const requestedDays = days || Math.ceil((leaveTo.getTime() - leaveFrom.getTime()) / 86400000) + 1
    if (policy.maxConsecutiveDays && policy.maxConsecutiveDays > 0 && requestedDays > policy.maxConsecutiveDays) {
      return NextResponse.json({
        success: false,
        error: `${policy.name} allows a maximum of ${policy.maxConsecutiveDays} consecutive day${policy.maxConsecutiveDays !== 1 ? 's' : ''} per application. You requested ${requestedDays} days.`,
      }, { status: 400 })
    }

    // 3. Applicable after N months of service
    if (policy.applicableAfterMonths && policy.applicableAfterMonths > 0) {
      const fullEmployee = await db.employee.findUnique({
        where: { id: parseInt(employeeId) },
        select: { joiningDate: true, gender: true },
      })
      if (fullEmployee?.joiningDate) {
        const joining = new Date(fullEmployee.joiningDate)
        const monthsWorked =
          (today.getFullYear() - joining.getFullYear()) * 12 +
          (today.getMonth() - joining.getMonth())
        if (monthsWorked < policy.applicableAfterMonths) {
          const remaining = policy.applicableAfterMonths - monthsWorked
          return NextResponse.json({
            success: false,
            error: `${policy.name} is only available after ${policy.applicableAfterMonths} months of service. You need ${remaining} more month${remaining !== 1 ? 's' : ''} to be eligible.`,
          }, { status: 400 })
        }
      }

      // 4. Gender restriction (fetch gender if not already fetched)
      if (policy.applicableGender && policy.applicableGender !== 'all') {
        const empGender = fullEmployee?.gender?.toLowerCase()
        if (empGender && empGender !== policy.applicableGender.toLowerCase()) {
          return NextResponse.json({
            success: false,
            error: `${policy.name} is only applicable to ${policy.applicableGender} employees.`,
          }, { status: 400 })
        }
      }
    } else if (policy.applicableGender && policy.applicableGender !== 'all') {
      // Gender check even when no service period restriction
      const fullEmployee = await db.employee.findUnique({
        where: { id: parseInt(employeeId) },
        select: { gender: true },
      })
      const empGender = fullEmployee?.gender?.toLowerCase()
      if (empGender && empGender !== policy.applicableGender.toLowerCase()) {
        return NextResponse.json({
          success: false,
          error: `${policy.name} is only applicable to ${policy.applicableGender} employees.`,
        }, { status: 400 })
      }
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

    // ── Pre-check: non-level-1 users must have an approval chain ──
    const tenantIdPreCheck = getTenantId(request)
    if (tenantIdPreCheck) {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId: tenantIdPreCheck, employeeId: parseInt(employeeId), isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)

      const requesterRole = requesterUser?.orgRoleId
        ? await superadminDb.orgRole.findUnique({ where: { id: requesterUser.orgRoleId }, select: { level: true } }).catch(() => null)
        : null

      const isLevel1 = !requesterRole || requesterRole.level === 1

      if (!isLevel1) {
        const chain = await getLeaveApprovalChain(tenantIdPreCheck, requesterUser?.orgRoleId)
        if (!chain || chain.steps.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No approval chain is configured for your role. Contact your system administrator to set up approval workflows.',
          }, { status: 422 })
        }
      }
    }

    // Use calculated working days (holidays and shift off days are automatically excluded)
    const leaveDays = days || workingDays
    
    // Prepare message about holidays and off days if any exist in the range
    let responseMessage = 'Leave request created successfully'
    let holidayInfo: { count: number; holidays: { name: string; date: string }[]; workingDays: number; offDays: number } | null = null
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
        supportingDocument: supportingDocument || undefined,
        status: 'pending',
        currentStep: 1,
        // Starts the 24h auto-approval window for step 1.
        // See src/lib/services/leave-auto-approval.ts
        stepEnteredAt: new Date(),
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

    // Notify approvers via chain, or broadcast to admins as fallback
    const empName = `${leaveRequest.Employee.firstName} ${leaveRequest.Employee.lastName}`
    const fromStr = new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const toStr   = new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const notifMsg = `${empName} applied for ${leaveType} leave (${fromStr} – ${toStr}, ${leaveDays} day${leaveDays !== 1 ? 's' : ''})`

    const tenantId = getTenantId(request)
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
            title: 'New Leave Request — Admin Approval Required', message: notifMsg,
            type: 'info', link: '', entityType: 'leave', entityId: leaveRequest.id },
        }).catch(() => {})
      } else {
        // Non-level-1 → chain is guaranteed to exist (pre-checked above)
        const chain = await getLeaveApprovalChain(tenantId, requesterUser?.orgRoleId)
        const step1 = chain!.steps[0]
        // Scoped fan-out: only approvers whose role scope covers this employee.
        const { recipients, escalated, note } = await findScopedApprovers(
          db, tenantId, step1.approverRoleId, leaveRequest.employeeId,
        )
        if (recipients.length > 0) {
          for (const approver of recipients) {
            await db.notification.create({
              data: { userId: 0, userEmail: approver.email,
                title: escalated
                  ? 'New Leave Request — Admin Approval Required'
                  : 'New Leave Request — Approval Needed',
                message: notifMsg + note,
                type: escalated ? 'warning' : 'info',
                link: '', entityType: 'leave', entityId: leaveRequest.id },
            }).catch(() => {})
          }
        } else {
          await db.notification.create({
            data: { userId: 0, userEmail: '__admin_broadcast__',
              title: 'New Leave Request — No Approver Found', message: notifMsg + note,
              type: 'warning', link: '', entityType: 'leave', entityId: leaveRequest.id },
          }).catch(() => {})
        }
      }
    } else {
      await db.notification.create({
        data: { userId: 0, userEmail: '__admin_broadcast__',
          title: 'New Leave Request', message: notifMsg,
          type: 'info', link: '', entityType: 'leave', entityId: leaveRequest.id },
      }).catch(() => {})
    }

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
  const tenantId = getTenantId(request)
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

    const existing = await db.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        Employee: {
          select: { email: true, firstName: true, lastName: true, Department: { select: { name: true } } },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 })
    }

    // ── Guard: only pending leaves can be actioned ───────────────
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This leave request has already been ${existing.status}. No further action is possible.` },
        { status: 409 }
      )
    }

    // ── Caller identity + self-approval + current-step guard ──────
    const callerEmail = request.cookies.get('erp_user_email')?.value
    const callerRole = request.cookies.get('erp_user_role')?.value
    const callerUser = (callerEmail && tenantId)
      ? await superadminDb.tenantUser.findFirst({
          where: { tenantId, email: callerEmail, isActive: true },
          select: { employeeId: true, orgRoleId: true },
        }).catch(() => null)
      : null
    // Full admin (role 'admin' with no org-role) is the top authority: it may
    // finalize any leave, overriding remaining chain steps.
    const isFullAdmin = callerRole === 'admin' && !callerUser?.orgRoleId

    if (callerUser?.employeeId && callerUser.employeeId === existing.employeeId) {
      return NextResponse.json(
        { success: false, error: 'You cannot approve or reject your own leave request.' },
        { status: 403 }
      )
    }

    // Chain approvers may act ONLY on their current step. The full admin bypasses this.
    if (!isFullAdmin && callerUser?.orgRoleId) {
      // Confirm the caller really is the person their role describes — the
      // scope identifies the approver, it is NOT a filter on the requester.
      // Testing the requester here rejected every approver whose own
      // department/designation/site differed from the person they approve for.
      if (!(await callerMatchesOwnRoleScope(db, callerUser.orgRoleId, callerUser.employeeId))) {
        return NextResponse.json(
          { success: false, error: 'Your account does not match the department/designation/site of your assigned role. Contact your administrator.' },
          { status: 403 }
        )
      }

      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId: tenantId!, employeeId: existing.employeeId, isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)

      const requesterRole = requesterUser?.orgRoleId
        ? await superadminDb.orgRole.findUnique({ where: { id: requesterUser.orgRoleId }, select: { level: true } }).catch(() => null)
        : null

      const isLevel1Requester = !requesterRole || requesterRole.level === 1

      if (!isLevel1Requester) {
        const chain = await getLeaveApprovalChain(tenantId!, requesterUser?.orgRoleId)
        // Must be the approver for the CURRENT step specifically
        const currentStepDef = chain?.steps.find(s => s.stepNumber === ((existing as any).currentStep || 1))
        if (!currentStepDef || currentStepDef.approverRoleId !== callerUser.orgRoleId) {
          return NextResponse.json(
            { success: false, error: 'It is not your turn to approve this leave request. Please wait for the previous step to be completed.' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Level-1 leave requests require admin approval.' },
          { status: 403 }
        )
      }
    }

    const empName = `${existing.Employee.firstName} ${existing.Employee.lastName}`
    const fromStr = existing.fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const toStr   = existing.toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

    // ── REJECT ────────────────────────────────────────────────────
    if (status.toLowerCase() === 'rejected') {
      const leaveRequest = await db.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: 'rejected',
          rejectedDate: new Date(),
          ...(rejectedBy ? { rejectedBy: parseInt(rejectedBy) } : {}),
          ...(rejectionReason ? { rejectionReason } : {}),
        },
      })
      await db.notification.create({
        data: {
          userId: 0,
          userEmail: existing.Employee.email,
          title: 'Leave Rejected',
          message: `Your ${existing.leaveType} leave (${fromStr} – ${toStr}) was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
          type: 'error',
          link: '',
          entityType: 'leave',
          entityId: leaveId,
        },
      }).catch(() => {})
      return NextResponse.json({ success: true, data: leaveRequest })
    }

    // ── APPROVE ───────────────────────────────────────────────────
    if (status.toLowerCase() !== 'approved') {
      return NextResponse.json({ success: false, error: 'status must be approved or rejected' }, { status: 400 })
    }

    // Load chain to check if multi-step
    let chain: Awaited<ReturnType<typeof getLeaveApprovalChain>> = null
    let requesterRoleId: string | null = null
    if (tenantId) {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, employeeId: existing.employeeId, isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)
      requesterRoleId = requesterUser?.orgRoleId || null
      chain = await getLeaveApprovalChain(tenantId, requesterRoleId)
    }

    const currentStep = (existing as any).currentStep || 1
    const totalSteps = chain?.steps.length || 1
    // Full admin finalizes immediately (top authority); otherwise final at last step.
    const isLastStep = !chain || currentStep >= totalSteps || isFullAdmin

    if (isLastStep) {
      // Final approval
      const leaveRequest = await db.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: 'approved',
          approvedDate: new Date(),
          ...(approvedBy ? { approvedBy: parseInt(approvedBy) } : {}),
        },
      })
      await db.notification.create({
        data: {
          userId: 0,
          userEmail: existing.Employee.email,
          title: 'Leave Approved ✓',
          message: `Your ${existing.leaveType} leave (${fromStr} – ${toStr}) has been fully approved.`,
          type: 'success',
          link: '',
          entityType: 'leave',
          entityId: leaveId,
        },
      }).catch(() => {})
      return NextResponse.json({ success: true, data: leaveRequest, fullyApproved: true })
    }

    // Intermediate step — advance to next
    const nextStep = currentStep + 1
    const leaveRequest = await db.leaveRequest.update({
      where: { id: leaveId },
      data: {
        currentStep: nextStep,
        // Restart the 24h window so the NEXT approver gets a full day, rather
        // than inheriting however much of it the previous approver used.
        stepEnteredAt: new Date(),
        ...(approvedBy ? { approvedBy: parseInt(approvedBy) } : {}),
      },
    })

    // Notify employee of partial approval
    await db.notification.create({
      data: {
        userId: 0,
        userEmail: existing.Employee.email,
        title: `Leave — Step ${currentStep} Approved`,
        message: `Your ${existing.leaveType} leave (${fromStr} – ${toStr}) passed step ${currentStep} of ${totalSteps}. Awaiting step ${nextStep} approval.`,
        type: 'info',
        link: '',
        entityType: 'leave',
        entityId: leaveId,
      },
    }).catch(() => {})

    // Notify next-level approvers
    if (chain && tenantId) {
      const nextStepDef = chain.steps.find(s => s.stepNumber === nextStep)
      if (nextStepDef) {
        // Scoped fan-out for the next step — same boundary as step 1.
        const { recipients: nextApprovers, escalated, note } = await findScopedApprovers(
          db, tenantId, nextStepDef.approverRoleId, existing.employeeId,
        )
        for (const approver of nextApprovers) {
          await db.notification.create({
            data: {
              userId: 0,
              userEmail: approver.email,
              title: escalated
                ? `Leave Escalated — Step ${nextStep}`
                : `Leave Request — Step ${nextStep} Approval Needed`,
              message: `${empName}'s ${existing.leaveType} leave (${fromStr} – ${toStr}) passed step ${currentStep} and now requires your approval.${note}`,
              type: escalated ? 'warning' : 'info',
              link: '',
              entityType: 'leave',
              entityId: leaveId,
            },
          }).catch(() => {})
        }
        if (nextApprovers.length === 0) {
          // No users for next role — fallback to admin broadcast
          await db.notification.create({
            data: {
              userId: 0,
              userEmail: '__admin_broadcast__',
              title: `Leave Escalated — Step ${nextStep}`,
              message: `${empName}'s ${existing.leaveType} leave needs step ${nextStep} approval. No users found for the required role.${note}`,
              type: 'warning',
              link: '',
              entityType: 'leave',
              entityId: leaveId,
            },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true, data: leaveRequest, fullyApproved: false, nextStep })
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
