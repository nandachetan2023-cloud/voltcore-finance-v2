import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getCurrentUserContext(request: NextRequest) {
  const emailCookie = request.cookies.get('erp_user_email')?.value
  const roleCookie = request.cookies.get('erp_user_role')?.value
  const tenantId = request.cookies.get('erp_tenant_id')?.value

  if (roleCookie === 'admin' || roleCookie === 'superadmin') {
    return { isAdmin: true, isLevel1: true }
  }

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
          select: { level: true },
        })
        if (orgRole) isLevel1 = orgRole.level === 1
      }
    } catch {}
  }

  return { isAdmin: false, isLevel1 }
}

// GET: list onboarding checklists, or get one by employeeId
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const userCtx = await getCurrentUserContext(request)
    if (!userCtx.isAdmin && !userCtx.isLevel1) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const id = searchParams.get('id')

    if (id) {
      const checklist = await db.onboardingChecklist.findUnique({
        where: { id: parseInt(id) },
        include: {
          Employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, Department: { select: { name: true } }, Designation: { select: { name: true } } } },
          template: { select: { id: true, name: true } },
          // Omit the heavy documentData (Bytes, up to 10MB) — the UI only needs
          // documentPath to know a file exists; bytes download separately.
          tasks: { omit: { documentData: true }, include: { templateTask: true }, orderBy: { templateTask: { order: 'asc' } } },
        },
      })
      return NextResponse.json({ success: true, data: checklist })
    }

    const where: any = {}
    if (employeeId) where.employeeId = parseInt(employeeId)

    const checklists = await db.onboardingChecklist.findMany({
      where,
      include: {
        Employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, Department: { select: { name: true } } } },
        template: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
        tasks: {
          // Omit the heavy documentData blob from the list payload (see above).
          omit: { documentData: true },
          include: {
            templateTask: {
              include: { dependsOn: { select: { id: true, title: true } } },
            },
          },
          orderBy: { templateTask: { order: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: checklists, currentUser: { isAdmin: userCtx.isAdmin, isLevel1: userCtx.isLevel1 } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch onboarding data' }, { status: 500 })
  }
}

// POST: create onboarding checklist for an employee from a template
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const userCtx = await getCurrentUserContext(request)
    if (!userCtx.isAdmin && !userCtx.isLevel1) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const { employeeId, templateId } = await request.json()
    if (!employeeId || !templateId) return NextResponse.json({ success: false, error: 'employeeId and templateId required' }, { status: 400 })

    const employee = await db.employee.findUnique({ where: { id: parseInt(employeeId) } })
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })

    const template = await db.checklistTemplate.findUnique({
      where: { id: parseInt(templateId) },
      include: { tasks: { orderBy: { order: 'asc' } } },
    })
    if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })

    const joiningDate = employee.dateOfJoining || new Date()

    const checklist = await db.onboardingChecklist.create({
      data: {
        employeeId: parseInt(employeeId),
        templateId: parseInt(templateId),
        status: 'in_progress',
        updatedAt: new Date(),
        tasks: {
          create: template.tasks.map(t => ({
            templateTaskId: t.id,
            status: 'pending',
            dueDate: new Date(new Date(joiningDate).getTime() + t.dueDayOffset * 86400000),
          })),
        },
      },
      include: {
        tasks: { include: { templateTask: true }, orderBy: { templateTask: { order: 'asc' } } },
        Employee: { select: { firstName: true, lastName: true } },
      },
    })
    return NextResponse.json({ success: true, data: checklist }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to create onboarding checklist' }, { status: 500 })
  }
}

// PATCH: update a task status
export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { taskId, status, notes, completedBy } = await request.json()
    if (!taskId || !status) return NextResponse.json({ success: false, error: 'taskId and status required' }, { status: 400 })

    // Check dependency: if this task depends on another, that one must be completed first
    const taskWithDep = await db.onboardingTask.findUnique({
      where: { id: parseInt(taskId) },
      include: {
        templateTask: { include: { dependsOn: true } },
        // Dependency check only needs task status/templateTaskId — skip the blob.
        checklist: { include: { tasks: { omit: { documentData: true }, include: { templateTask: true } } } },
      },
    })

    if (!taskWithDep) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })

    if (status === 'completed' && taskWithDep.templateTask.dependsOnTaskId) {
      // Find the instance task that corresponds to the dependency template task
      const depInstanceTask = taskWithDep.checklist.tasks.find(
        t => t.templateTaskId === taskWithDep.templateTask.dependsOnTaskId
      )
      if (depInstanceTask && depInstanceTask.status !== 'completed' && depInstanceTask.status !== 'skipped') {
        return NextResponse.json({
          success: false,
          error: `Cannot complete this task yet. "${taskWithDep.templateTask.dependsOn?.title}" must be completed first.`,
        }, { status: 422 })
      }
    }

    // Block completion if documentNecessary is true and no document has been uploaded
    if (status === 'completed' && (taskWithDep.templateTask as any).documentNecessary) {
      if (!taskWithDep.documentPath && !taskWithDep.documentData) {
        return NextResponse.json({
          success: false,
          error: 'This task requires a document upload before it can be marked as complete.',
        }, { status: 422 })
      }
    }

    const task = await db.onboardingTask.update({
      where: { id: parseInt(taskId) },
      data: {
        status,
        notes,
        completedBy: completedBy ? parseInt(completedBy) : null,
        completedAt: status === 'completed' ? new Date() : null,
      },
    })

    // Check if all tasks in the checklist are done
    const allTasks = await db.onboardingTask.findMany({ where: { checklistId: task.checklistId } })
    const allDone = allTasks.every(t => t.status === 'completed' || t.status === 'skipped')
    if (allDone) {
      await db.onboardingChecklist.update({
        where: { id: task.checklistId },
        data: { status: 'completed', completedAt: new Date(), updatedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, data: task, checklistCompleted: allDone })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 })
  }
}
