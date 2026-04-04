import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all projects
export async function GET() {
  try {
    const projects = await db.project.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        client: true,
        type: true,
        contractValue: true,
        startDate: true,
        endDate: true,
        progress: true,
        people: true,
        status: true,
        site: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST: Create project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, client, type, contractValue, startDate, endDate, status, site, people, progress } = body

    if (!name || !client) {
      return NextResponse.json(
        { success: false, error: 'name and client are required' },
        { status: 400 }
      )
    }

    let projectCode = code
    if (!projectCode) {
      // Auto-generate unique code: PRJ-001, PRJ-002, etc.
      const count = await db.project.count()
      projectCode = `PRJ-${String(count + 1).padStart(3, '0')}`
    }

    const project = await db.project.create({
      data: {
        code: projectCode,
        name,
        client,
        type: type || '',
        contractValue: contractValue || '',
        startDate: startDate || '',
        endDate: endDate || '',
        status: status || 'On Track',
        site: site || '',
        people: people || 0,
        progress: progress || 0,
      },
    })

    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A project with this code already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

// PUT: Update project by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const project = await db.project.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A project with this code already exists' },
        { status: 409 }
      )
    }
    console.error('Error updating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE: Delete project by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    await db.project.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
