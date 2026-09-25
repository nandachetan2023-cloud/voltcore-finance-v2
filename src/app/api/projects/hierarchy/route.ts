import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * /api/projects/hierarchy — returns the project → job → sub-job tree.
 * Each project carries its jobs; each job carries its children (sub-jobs).
 * Budgets are rolled up so job/project totals include nested sub-jobs.
 */

function rollUpBudget(jobs: any[], byId: Map<number, any>): void {
  const compute = (j: any): number => {
    let sum = j.budget || 0
    for (const c of j.children) sum += compute(c)
    j.totalBudget = sum
    return sum
  }
  for (const j of jobs) compute(j)
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const projects = await pdb.finProject.findMany({
      orderBy: { projectCode: 'asc' },
      include: {
        jobs: {
          where: { parentId: null },
          orderBy: { jobCode: 'asc' },
          include: {
            site: { select: { id: true, siteCode: true, name: true } },
            project: { select: { id: true, projectCode: true, name: true } },
            children: {
              orderBy: { jobCode: 'asc' },
              include: {
                site: { select: { id: true, siteCode: true, name: true } },
              },
            },
          },
        },
      },
    })

    const data = projects.map(p => {
      rollUpBudget(p.jobs, new Map(p.jobs.map((j: any) => [j.id, j])))
      return p
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching project hierarchy:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch project hierarchy' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    let projectCode = String(body.projectCode || '').trim()
    if (!projectCode) {
      const year = new Date().getFullYear()
      const count = await pdb.finProject.count({ where: { projectCode: { startsWith: `PRJ-${year}-` } } })
      projectCode = `PRJ-${year}-${String(count + 1).padStart(3, '0')}`
    }

    const record = await pdb.finProject.create({
      data: {
        projectCode,
        name: String(body.name || ''),
        client: String(body.client || ''),
        contractValue: Number(body.contractValue) || 0,
        sector: body.sector || null,
        projectManager: body.projectManager || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status || 'Active',
        description: body.description || null,
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finProject.update({
      where: { id },
      data: {
        projectCode: body.projectCode !== undefined ? String(body.projectCode).trim() : undefined,
        name: body.name !== undefined ? String(body.name) : undefined,
        client: body.client !== undefined ? String(body.client) : undefined,
        contractValue: body.contractValue !== undefined ? Number(body.contractValue) : undefined,
        sector: body.sector !== undefined ? (body.sector || null) : undefined,
        projectManager: body.projectManager !== undefined ? (body.projectManager || null) : undefined,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        status: body.status !== undefined ? String(body.status) : undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finProject.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 })
  }
}
