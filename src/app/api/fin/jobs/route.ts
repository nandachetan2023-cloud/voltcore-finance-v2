import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { getAssignedSiteScope, isTenantAdmin } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    // Site-scoped users only get their own sites' jobs (same rule as
    // /api/fin/sites); all-sites and non-finance accounts are unaffected.
    let where: any = {}
    if (!isTenantAdmin(request)) {
      const scope = await getAssignedSiteScope(pdb, request.cookies.get('erp_user_email')?.value || '')
      if (scope.scoped) where = { site: { siteCode: { in: scope.siteCodes } } }
    }

    const records = await pdb.finJob.findMany({
      where,
      orderBy: { jobCode: 'desc' },
      include: {
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, vendorName: true } },
        project: { select: { id: true, projectCode: true, name: true } },
        parent: { select: { id: true, jobCode: true, description: true } },
      },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    let jobCode = body.jobCode?.trim()
    if (!jobCode) {
      const year = new Date().getFullYear()
      const count = await pdb.finJob.count({ where: { jobCode: { startsWith: `JOB-${year}-` } } })
      jobCode = `JOB-${year}-${String(count + 1).padStart(3, '0')}`
    }

    const record = await pdb.finJob.create({
      data: {
        jobCode,
        projectId: body.projectId ? Number(body.projectId) : null,
        parentId: body.parentId ? Number(body.parentId) : null,
        siteId: Number(body.siteId),
        poId: body.poId ? Number(body.poId) : null,
        description: body.description || null,
        budget: Number(body.budget) || 0,
        status: body.status || 'Active',
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, jobCode, siteId, poId, description, status, projectId, parentId, budget } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finJob.update({
      where: { id },
      data: {
        jobCode, description, status,
        budget: budget !== undefined ? Number(budget) : undefined,
        projectId: projectId !== undefined ? (projectId ? Number(projectId) : null) : undefined,
        parentId: parentId !== undefined ? (parentId ? Number(parentId) : null) : undefined,
        siteId: siteId !== undefined ? Number(siteId) : undefined,
        poId: poId !== undefined ? (poId ? Number(poId) : null) : undefined,
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const ids = searchParams.get('ids')
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean)
      if (idList.length === 0) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      const result = await pdb.finJob.deleteMany({ where: { id: { in: idList } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await pdb.finJob.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
