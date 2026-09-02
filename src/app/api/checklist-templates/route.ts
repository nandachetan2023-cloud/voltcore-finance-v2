import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const templates = await db.checklistTemplate.findMany({
      where: { isActive: true },
      include: {
        Department: { select: { id: true, name: true } },
        Designation: { select: { id: true, name: true } },
        tasks: { orderBy: { order: 'asc' } },
        _count: { select: { instances: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: templates })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { name, description, departmentId, designationId, subDesignationId, tasks = [] } = body
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })

    const template = await db.checklistTemplate.create({
      data: {
        name, description,
        departmentId: departmentId ? parseInt(departmentId) : null,
        designationId: designationId ? parseInt(designationId) : null,
        subDesignationId: subDesignationId ? parseInt(subDesignationId) : null,
        updatedAt: new Date(),
        tasks: tasks.length ? {
          create: tasks.map((t: any, i: number) => ({
            title: t.title,
            description: t.description,
            assignedRole: t.assignedRole || 'hr',
            dueDayOffset: t.dueDayOffset || 1,
            requiresDocument: t.requiresDocument || false,
            documentNecessary: t.requiresDocument ? (t.documentNecessary || false) : false,
            order: i,
          })),
        } : undefined,
      },
      include: { tasks: { orderBy: { order: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, tasks, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    if (data.departmentId) data.departmentId = parseInt(data.departmentId)
    if (data.designationId) data.designationId = parseInt(data.designationId)
    if (data.subDesignationId !== undefined) data.subDesignationId = data.subDesignationId ? parseInt(data.subDesignationId) : null

    await db.checklistTemplate.update({ where: { id: parseInt(id) }, data: { ...data, updatedAt: new Date() } })

    if (tasks !== undefined) {
      await db.checklistTemplateTask.deleteMany({ where: { templateId: parseInt(id) } })
      if (tasks.length > 0) {
        await db.checklistTemplateTask.createMany({
          data: tasks.map((t: any, i: number) => ({
            templateId: parseInt(id),
            title: t.title,
            description: t.description,
            assignedRole: t.assignedRole || 'hr',
            dueDayOffset: t.dueDayOffset || 1,
            requiresDocument: t.requiresDocument || false,
            documentNecessary: t.requiresDocument ? (t.documentNecessary || false) : false,
            order: i,
          })),
        })
      }
    }

    const updated = await db.checklistTemplate.findUnique({
      where: { id: parseInt(id) },
      include: { tasks: { orderBy: { order: 'asc' } }, Department: true, Designation: true },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { id } = await request.json()
    await db.checklistTemplate.update({ where: { id: parseInt(id) }, data: { isActive: false, updatedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete template' }, { status: 500 })
  }
}
