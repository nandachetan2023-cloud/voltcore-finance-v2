import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Resolve the tenant ID from the request cookie ────────────────
function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('erp_tenant_id')?.value || null
}

// ── Fetch approval chain for a request type from superadmin DB ─
// Looks for role-specific chain first, falls back to default (null requesterRoleId)
// ── Fetch approval chain for a role (universal — no request type) ─
// Level-1 roles go to admin directly. All other roles need a chain.
async function getChainForRole(tenantId: string, requesterRoleId: string | undefined | null) {
  if (!requesterRoleId) return null
  try {
    return await superadminDb.approvalChain.findFirst({
      where: { tenantId, requesterRoleId, isActive: true },
      include: { steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } } },
    })
  } catch { return null }
}

async function findApproversForRole(
  tenantId: string,
  roleId: string,
  scope: string,
  employeeDeptName: string | null
): Promise<{ email: string; name: string }[]> {
  try {
    const where: any = { tenantId, orgRoleId: roleId, isActive: true }
    const users = await superadminDb.tenantUser.findMany({ where, select: { email: true, name: true } })

    // If scope is same_department, filter by users whose linked employee is in the same dept
    // We can't join across DBs, so we use the role's departments field as a proxy
    // The role itself has a departments field — if it's set, only users in that dept qualify
    // For now return all users with that role (dept scoping is enforced at role definition level)
    return users
  } catch {
    return []
  }
}

// ── Create notifications for a list of approvers ─────────────────
async function notifyUsers(
  db: any,
  recipients: { email: string }[],
  title: string,
  message: string,
  entityId: number,
  entityType: string,
  link: string
) {
  for (const r of recipients) {
    await db.notification.create({
      data: {
        userId: 0,
        userEmail: r.email,
        title,
        message,
        type: 'info',
        link,
        entityType,
        entityId,
      },
    }).catch(() => {})
  }
}

// ── GET: list requests ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)
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

    // Resolve caller's identity for self-exclusion and level check
    let callerEmployeeId: number | null = null
    let callerRoleLevel: number | null = null
    let callerIsAdmin = false
    const callerEmail = request.cookies.get('erp_user_email')?.value
    const callerRole = request.cookies.get('erp_user_role')?.value // 'admin' | 'demo'

    if (callerEmail && tenantId && !employeeId) {
      const callerUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, email: callerEmail, isActive: true },
        select: { employeeId: true, orgRoleId: true, allowedModules: true },
      }).catch(() => null)

      if (callerUser?.employeeId) callerEmployeeId = callerUser.employeeId

      if (callerUser?.orgRoleId) {
        const role = await superadminDb.orgRole.findUnique({
          where: { id: callerUser.orgRoleId },
          select: { level: true },
        }).catch(() => null)
        if (role) callerRoleLevel = role.level
      }

      // Only treat as admin if they genuinely have full access
      callerIsAdmin = callerRole === 'admin' && !callerUser?.orgRoleId
    } else if (!employeeId && callerRole === 'admin') {
      // Superadmin or admin without tenant context
      callerIsAdmin = true
    }

    // Exclude the caller's own requests from the approver view
    if (callerEmployeeId && !employeeId) {
      where.employeeId = { not: callerEmployeeId }
    }

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

    // For each request, resolve the requester's role level and tag canApprove
    let enriched: any[] = requests
    if (!employeeId) {
      if (tenantId && callerRoleLevel !== null) {
        // Caller has an orgRole — only show requests where they are the designated approver
        // in the chain for the requester's role
        const requesterEmployeeIds = [...new Set(requests.map(r => r.employeeId))]
        const requesterUsers = await superadminDb.tenantUser.findMany({
          where: { tenantId, employeeId: { in: requesterEmployeeIds }, isActive: true },
          select: { employeeId: true, orgRoleId: true },
        }).catch(() => [])

        const roleIds = [...new Set(requesterUsers.map(u => u.orgRoleId).filter(Boolean))] as string[]
        const roles = roleIds.length > 0
          ? await superadminDb.orgRole.findMany({
              where: { id: { in: roleIds } },
              select: { id: true, level: true },
            }).catch(() => [])
          : []

        const roleLevelMap = new Map<string, number>(roles.map(r => [r.id, r.level] as [string, number]))
        const empRoleLevelMap = new Map<number, number>(
          requesterUsers.map(u => [u.employeeId as number, u.orgRoleId ? (roleLevelMap.get(u.orgRoleId) ?? 0) : 0] as [number, number])
        )

        // Get the caller's orgRoleId to check if they are in the chain
        const callerUser = await superadminDb.tenantUser.findFirst({
          where: { tenantId, email: callerEmail || '', isActive: true },
          select: { orgRoleId: true },
        }).catch(() => null)
        const callerOrgRoleId = callerUser?.orgRoleId

        // For each unique requester role, build a map of roleId -> chain steps
        const chainStepsMap = new Map<string, any[]>()
        for (const roleId of roleIds) {
          const chain = await getChainForRole(tenantId, roleId)
          chainStepsMap.set(roleId, chain?.steps || [])
        }

        const empOrgRoleMap = new Map<number, string | null>(
          requesterUsers.map(u => [u.employeeId as number, u.orgRoleId ?? null] as [number, string | null])
        )

        enriched = requests
          .filter(r => {
            const reqOrgRoleId = empOrgRoleMap.get(r.employeeId)
            const reqLevel = empRoleLevelMap.get(r.employeeId) ?? 0
            if (reqLevel <= 1) return false // level-1 goes to admin only
            if (!reqOrgRoleId) return false
            const steps = chainStepsMap.get(reqOrgRoleId) || []
            // Only show if caller is the approver for the CURRENT step
            const currentStepNum = r.currentStep || 1
            const currentStepDef = steps.find((s: any) => s.stepNumber === currentStepNum)
            return currentStepDef?.approverRoleId === callerOrgRoleId
          })
          .map(r => ({ ...r, canApprove: true }))

      } else if (callerIsAdmin) {
        // Full admin sees ALL requests and can finalize any of them (top authority).
        enriched = requests
          .filter(r => r.employeeId !== callerEmployeeId)
          .map(r => ({ ...r, canApprove: true }))
      } else {
        enriched = []
      }
    }

    return NextResponse.json({ success: true, data: enriched })
  } catch (e) {
    console.error('GET employee-requests error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// ── POST: create a new request ────────────────────────────────────
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)

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

    // ── Pre-check: non-level-1 users must have a chain defined ────
    if (tenantId) {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, employeeId: parseInt(employeeId), isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)

      const requesterRole = requesterUser?.orgRoleId
        ? await superadminDb.orgRole.findUnique({ where: { id: requesterUser.orgRoleId }, select: { level: true } }).catch(() => null)
        : null

      const isLevel1 = !requesterRole || requesterRole.level === 1

      if (!isLevel1) {
        const chain = await getChainForRole(tenantId, requesterUser?.orgRoleId)
        if (!chain || chain.steps.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No approval chain is configured for your role. Contact your system administrator to set up approval workflows.',
          }, { status: 422 })
        }
      }
    }

    const req = await db.employeeRequest.create({
      data: {
        employeeId: parseInt(employeeId),
        requestType,
        subject,
        description,
        amount: amount ? parseFloat(amount) : null,
        status: 'pending',
        currentStep: 1,
        updatedAt: new Date(),
      },
      include: {
        Employee: {
          select: {
            firstName: true, lastName: true,
            Department: { select: { name: true } },
          },
        },
      },
    })

    const empName = `${req.Employee.firstName} ${req.Employee.lastName}`
    const deptName = req.Employee.Department?.name || null
    const typeLabel = requestType === 'advance_payment' ? 'Advance Payment' : 'General Request'

    // Determine approval routing based on requester's role level
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
        // Level-1 → admin approves directly
        await db.notification.create({
          data: { userId: parseInt(employeeId), userEmail: '__admin_broadcast__',
            title: `New ${typeLabel} — Admin Approval Required`,
            message: `${empName} submitted: "${subject}"`,
            type: 'info', link: 'requests', entityType: 'request', entityId: req.id },
        }).catch(() => {})
      } else {
        // Non-level-1 → chain is guaranteed to exist (pre-checked above)
        const chain = await getChainForRole(tenantId, requesterUser?.orgRoleId)
        const step1 = chain!.steps[0]
        const approvers = await findApproversForRole(tenantId, step1.approverRoleId, step1.scope, deptName)
        if (approvers.length > 0) {
          await notifyUsers(db, approvers, `New ${typeLabel} — Step 1 Approval`,
            `${empName} submitted: "${subject}"${deptName ? ` (${deptName})` : ''}`,
            req.id, 'request', 'requests')
        } else {
          await db.notification.create({
            data: { userId: parseInt(employeeId), userEmail: '__admin_broadcast__',
              title: `New ${typeLabel} — No Approver Found`,
              message: `${empName} submitted: "${subject}". No users found for step-1 approver role.`,
              type: 'warning', link: 'requests', entityType: 'request', entityId: req.id },
          }).catch(() => {})
        }
      }
    } else {
      await db.notification.create({
        data: { userId: parseInt(employeeId), userEmail: '__admin_broadcast__',
          title: `New ${typeLabel}`, message: `${empName} submitted: "${subject}"`,
          type: 'info', link: 'requests', entityType: 'request', entityId: req.id },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, data: req }, { status: 201 })
  } catch (e) {
    console.error('POST employee-requests error:', e)
    return NextResponse.json({ success: false, error: 'Failed to create request' }, { status: 500 })
  }
}

// ── PATCH: approve or reject (chain-aware) ────────────────────────
export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = getTenantId(request)

  try {
    const body = await request.json()
    const { id, action, rejectionNote, approvedBy, approvedAmount } = body

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'id and action required' }, { status: 400 })
    }

    const existing = await db.employeeRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        Employee: {
          select: {
            email: true, firstName: true, lastName: true,
            Department: { select: { name: true } },
          },
        },
      },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })

    // ── Guard: only pending requests can be actioned ──────────────
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This request has already been ${existing.status}. No further action is possible.` },
        { status: 409 }
      )
    }

    // ── Caller identity ──────────────────────────────────────────
    const callerEmail = request.cookies.get('erp_user_email')?.value
    const callerRole = request.cookies.get('erp_user_role')?.value
    const callerUser = (callerEmail && tenantId)
      ? await superadminDb.tenantUser.findFirst({
          where: { tenantId, email: callerEmail, isActive: true },
          select: { employeeId: true, orgRoleId: true },
        }).catch(() => null)
      : null
    // A full admin (role 'admin' with no org-role) is the top authority: it may
    // finalize ANY request, overriding remaining chain steps.
    const isFullAdmin = callerRole === 'admin' && !callerUser?.orgRoleId

    // Block self-approval
    if (callerUser?.employeeId && callerUser.employeeId === existing.employeeId) {
      return NextResponse.json(
        { success: false, error: 'You cannot approve or reject your own request.' },
        { status: 403 }
      )
    }

    // Chain approvers may act ONLY on their current step. The full admin bypasses this.
    if (!isFullAdmin && callerUser?.orgRoleId) {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId: tenantId!, employeeId: existing.employeeId, isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)

      const requesterRole = requesterUser?.orgRoleId
        ? await superadminDb.orgRole.findUnique({ where: { id: requesterUser.orgRoleId }, select: { level: true } }).catch(() => null)
        : null

      const isLevel1Requester = !requesterRole || requesterRole.level === 1

      if (!isLevel1Requester) {
        const chain = await getChainForRole(tenantId!, requesterUser?.orgRoleId)
        // Check caller is the approver for the CURRENT step specifically
        const currentStepDef = chain?.steps.find(s => s.stepNumber === (existing.currentStep || 1))
        if (!currentStepDef || currentStepDef.approverRoleId !== callerUser.orgRoleId) {
          return NextResponse.json(
            { success: false, error: 'It is not your turn to approve this request. Please wait for the previous step to be completed.' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Level-1 requests require admin approval.' },
          { status: 403 }
        )
      }
    }

    const empName = `${existing.Employee.firstName} ${existing.Employee.lastName}`
    const deptName = existing.Employee.Department?.name || null

    // ── REJECT: always final ──────────────────────────────────────
    if (action === 'reject') {
      const updated = await db.employeeRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'rejected',
          rejectedBy: approvedBy ? parseInt(approvedBy) : null,
          rejectedDate: new Date(),
          rejectionNote: rejectionNote || '',
          updatedAt: new Date(),
        },
      })

      // Notify the employee
      await db.notification.create({
        data: {
          userId: existing.employeeId,
          userEmail: existing.Employee.email,
          title: 'Request Rejected',
          message: `Your request "${existing.subject}" was rejected.${rejectionNote ? ` Reason: ${rejectionNote}` : ''}`,
          type: 'error',
          link: 'my-requests',
          entityType: 'request',
          entityId: existing.id,
        },
      }).catch(() => {})

      return NextResponse.json({ success: true, data: updated })
    }

    // ── APPROVE ───────────────────────────────────────────────────
    if (action !== 'approve') {
      return NextResponse.json({ success: false, error: 'action must be approve or reject' }, { status: 400 })
    }

    // Try to load the approval chain
    let chain: Awaited<ReturnType<typeof getChainForRole>> = null
    let requesterRoleId: string | null = null
    if (tenantId) {
      const requesterUser = await superadminDb.tenantUser.findFirst({
        where: { tenantId, employeeId: existing.employeeId, isActive: true },
        select: { orgRoleId: true },
      }).catch(() => null)
      requesterRoleId = requesterUser?.orgRoleId || null
      chain = await getChainForRole(tenantId, requesterRoleId)
    }

    const currentStep = existing.currentStep || 1
    const totalSteps = chain?.steps.length || 1

    // The full admin finalizes immediately (top authority — overrides the rest of
    // the chain). Otherwise it's final only once the last chain step is approved.
    const isLastStep = !chain || currentStep >= totalSteps || isFullAdmin

    if (isLastStep) {
      // Final approval — mark as approved, store approvedAmount if provided
      const approvedAmountValue = approvedAmount !== undefined && approvedAmount !== null && approvedAmount !== ''
        ? parseFloat(String(approvedAmount))
        : null;

      const updated = await db.employeeRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'approved',
          approvedBy: approvedBy ? parseInt(approvedBy) : null,
          approvedDate: new Date(),
          // Store approvedAmount if provided (for advance_payment adjustments)
          // If not provided, approvedAmount stays null (meaning full amount was approved)
          ...(approvedAmountValue !== null && { approvedAmount: approvedAmountValue }),
          updatedAt: new Date(),
        },
      })

      // Build notification message — mention adjusted amount if different from requested
      let approvalMessage = `Your request "${existing.subject}" has been fully approved.`;
      if (existing.requestType === 'advance_payment' && approvedAmountValue !== null && existing.amount) {
        const requestedAmt = Number(existing.amount);
        if (approvedAmountValue < requestedAmt) {
          approvalMessage = `Your advance payment request "${existing.subject}" has been approved for ₹${approvedAmountValue.toLocaleString('en-IN')} (you requested ₹${requestedAmt.toLocaleString('en-IN')}).`;
        } else {
          approvalMessage = `Your advance payment request "${existing.subject}" has been approved for ₹${approvedAmountValue.toLocaleString('en-IN')}.`;
        }
      }

      // Notify the employee
      await db.notification.create({
        data: {
          userId: existing.employeeId,
          userEmail: existing.Employee.email,
          title: 'Request Approved ✓',
          message: approvalMessage,
          type: 'success',
          link: 'my-requests',
          entityType: 'request',
          entityId: existing.id,
        },
      }).catch(() => {})

      return NextResponse.json({ success: true, data: updated, fullyApproved: true })
    }

    // Intermediate approval — advance to next step
    const nextStep = currentStep + 1

    // Persist approvedAmount if the approver adjusted it, so the next
    // approver sees the correct amount. Use null explicitly so existing
    // approvedAmount is cleared if the approver removed it.
    const approvedAmountValue = approvedAmount !== undefined && approvedAmount !== null && approvedAmount !== ''
      ? parseFloat(String(approvedAmount))
      : null;

    const updated = await db.employeeRequest.update({
      where: { id: parseInt(id) },
      data: {
        currentStep: nextStep,
        ...(approvedAmountValue !== null && { approvedAmount: approvedAmountValue }),
        updatedAt: new Date(),
        // Keep status as 'pending' — still needs more approvals
      },
    })

    // Notify the employee that step N was approved
    await db.notification.create({
      data: {
        userId: existing.employeeId,
        userEmail: existing.Employee.email,
        title: `Request — Step ${currentStep} Approved`,
        message: `Your request "${existing.subject}" passed step ${currentStep} of ${totalSteps}. Awaiting step ${nextStep} approval.`,
        type: 'info',
        link: 'my-requests',
        entityType: 'request',
        entityId: existing.id,
      },
    }).catch(() => {})

    // Notify the next-level approvers
    if (chain) {
      const nextStepDef = chain.steps.find(s => s.stepNumber === nextStep)
      if (nextStepDef) {
        const nextApprovers = await findApproversForRole(
          tenantId!, nextStepDef.approverRoleId, nextStepDef.scope, deptName
        )
        if (nextApprovers.length > 0) {
          // Build amount context for advance payment requests
          const amountMsg = existing.requestType === 'advance_payment' && existing.amount
            ? ` Amount: ₹${Number(existing.amount).toLocaleString('en-IN')}${approvedAmountValue !== null && approvedAmountValue !== Number(existing.amount) ? ` (adjusted to ₹${approvedAmountValue.toLocaleString('en-IN')} at step ${currentStep})` : ''}.`
            : '';
          await notifyUsers(
            db, nextApprovers,
            `Request Needs Your Approval — Step ${nextStep}`,
            `${empName}'s request "${existing.subject}" has been approved at step ${currentStep} and now requires your approval.${amountMsg}${deptName ? ` (${deptName})` : ''}`,
            existing.id, 'request', 'requests'
          )
        } else {
          // No users found for next role — fallback to admin broadcast
          await db.notification.create({
            data: {
              userId: 0,
              userEmail: '__admin_broadcast__',
              title: `Request Escalated — Step ${nextStep}`,
              message: `${empName}'s request "${existing.subject}" needs step ${nextStep} approval. No users found for the required role.`,
              type: 'warning',
              link: 'requests',
              entityType: 'request',
              entityId: existing.id,
            },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true, data: updated, fullyApproved: false, nextStep })
  } catch (e) {
    console.error('PATCH employee-requests error:', e)
    return NextResponse.json({ success: false, error: 'Failed to update request' }, { status: 500 })
  }
}

// ── DELETE: soft delete ───────────────────────────────────────────
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
