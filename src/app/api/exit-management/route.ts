import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Reuse same user context resolution as offboarding ────────────
async function getCurrentUserContext(request: NextRequest, db: any) {
  const employeeIdCookie = request.cookies.get('erp_employee_id')?.value
  const emailCookie = request.cookies.get('erp_user_email')?.value
  const roleCookie = request.cookies.get('erp_user_role')?.value
  const tenantId = request.cookies.get('erp_tenant_id')?.value

  if (roleCookie === 'admin' || roleCookie === 'superadmin') {
    return { isAdmin: true, isLevel1: true, deptName: null, employeeId: null }
  }

  let deptName: string | null = null
  let employeeId: number | null = null
  let isLevel1 = false

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
          if (orgRole.departments && orgRole.departments.trim()) {
            const roleDepts = orgRole.departments.split(',').map((d: string) => d.toLowerCase().trim())
            if (roleDepts.length > 0 && roleDepts[0]) deptName = roleDepts[0]
          }
        }
      }
    } catch {}
  }

  return { isAdmin: false, isLevel1, deptName, employeeId }
}

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const userCtx = await getCurrentUserContext(request, db)

    // Block non-level-1, non-admin users entirely
    if (!userCtx.isAdmin && !userCtx.isLevel1) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const resignationId = searchParams.get('resignationId')

    if (resignationId) {
      const interview = await db.exitInterview.findUnique({
        where: { resignationId: parseInt(resignationId) },
        include: {
          resignation: {
            include: {
              Employee: {
                select: {
                  firstName: true, lastName: true,
                  Department: { select: { name: true } },
                },
              },
            },
          },
        },
      })
      return NextResponse.json({
        success: true,
        data: interview,
        currentUser: {
          isAdmin: userCtx.isAdmin,
          isLevel1: userCtx.isLevel1,
          deptName: userCtx.deptName,
        },
      })
    }

    // Analytics
    const [total, resigned, reasons] = await Promise.all([
      db.employee.count({ where: { isDeleted: false } }),
      db.resignation.count({ where: { status: 'approved' } }),
      db.exitInterview.groupBy({ by: ['primaryReason'], _count: { id: true } }),
    ])

    const turnoverRate = total > 0 ? ((resigned / total) * 100).toFixed(1) : '0'
    const reasonBreakdown = reasons.map((r: any) => ({ reason: r.primaryReason || 'unknown', count: r._count.id }))

    return NextResponse.json({
      success: true,
      data: { turnoverRate, resigned, total, reasonBreakdown },
      currentUser: {
        isAdmin: userCtx.isAdmin,
        isLevel1: userCtx.isLevel1,
        deptName: userCtx.deptName,
      },
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch exit data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const userCtx = await getCurrentUserContext(request, db)

    // Block non-level-1, non-admin users
    if (!userCtx.isAdmin && !userCtx.isLevel1) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const { resignationId, primaryReason, cultureFeedback, managementFeedback, suggestions, wouldRejoin, rating } = await request.json()
    if (!resignationId) return NextResponse.json({ success: false, error: 'resignationId required' }, { status: 400 })

    // Check if interview already exists
    const existing = await db.exitInterview.findUnique({
      where: { resignationId: parseInt(resignationId) },
    })

    // If already saved, only admin can edit
    if (existing && !userCtx.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Interview already saved. Only an administrator can edit it.' },
        { status: 403 }
      )
    }

    const interview = await db.exitInterview.upsert({
      where: { resignationId: parseInt(resignationId) },
      create: {
        resignationId: parseInt(resignationId),
        primaryReason, cultureFeedback, managementFeedback, suggestions,
        wouldRejoin: wouldRejoin ?? null,
        rating: rating ? parseInt(rating) : null,
        conductedAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        primaryReason, cultureFeedback, managementFeedback, suggestions,
        wouldRejoin: wouldRejoin ?? null,
        rating: rating ? parseInt(rating) : null,
        conductedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: interview })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to save exit interview' }, { status: 500 })
  }
}
