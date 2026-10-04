import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// The "All Projects" screen (src/components/erp/projects.tsx) calls this
// route, but it never existed — every request 404'd, the screen's fetch
// threw parsing the HTML 404 page as JSON, and the list silently rendered
// empty. Backed by FinProject, the same model /api/projects/hierarchy and
// job-progress already use, so a project created here also carries jobs.
//
// FinProject has no "type"/"site"/"progress"/"people" columns of its own for
// most of these — `sector` doubles as this screen's free-text "Type", and
// `site`/`progress`/`people` were added to the model for this screen's simple
// manual-entry fields (see prisma/schema.prisma).

function toRow(p: any) {
  return {
    id: String(p.id),
    code: p.projectCode,
    name: p.name,
    client: p.client,
    type: p.sector || '',
    contractValue: String(p.contractValue ?? 0),
    startDate: p.startDate ? p.startDate.toISOString() : '',
    endDate: p.endDate ? p.endDate.toISOString() : '',
    progress: p.progress ?? 0,
    people: p.people ?? 0,
    status: p.status || 'On Track',
    site: p.site || '',
  }
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finProject.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: records.map(toRow) })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    let projectCode = String(body.code || '').trim()
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
        sector: body.type || null,
        contractValue: Number(body.contractValue) || 0,
        site: body.site || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        progress: Number.isFinite(Number(body.progress)) ? Number(body.progress) : 0,
        people: Number.isFinite(Number(body.people)) ? Number(body.people) : 0,
        status: body.status || 'On Track',
      },
    })
    return NextResponse.json({ success: true, data: toRow(record) }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating project:', error)
    const msg = error?.code === 'P2002' ? 'A project with that code already exists' : 'Failed to create project'
    return NextResponse.json({ success: false, error: msg }, { status: error?.code === 'P2002' ? 409 : 500 })
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
        projectCode: body.code !== undefined ? String(body.code).trim() : undefined,
        name: body.name !== undefined ? String(body.name) : undefined,
        client: body.client !== undefined ? String(body.client) : undefined,
        sector: body.type !== undefined ? (body.type || null) : undefined,
        contractValue: body.contractValue !== undefined ? Number(body.contractValue) || 0 : undefined,
        site: body.site !== undefined ? (body.site || null) : undefined,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        progress: body.progress !== undefined ? Number(body.progress) || 0 : undefined,
        people: body.people !== undefined ? Number(body.people) || 0 : undefined,
        status: body.status !== undefined ? String(body.status) : undefined,
      },
    })
    return NextResponse.json({ success: true, data: toRow(record) })
  } catch (error: any) {
    console.error('Error updating project:', error)
    if (error?.code === 'P2025') return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finProject.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting project:', error)
    if (error?.code === 'P2025') return NextResponse.json({ success: true, message: 'Already deleted' })
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 })
  }
}
