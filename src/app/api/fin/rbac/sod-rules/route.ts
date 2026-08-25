import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// ── Segregation-of-Duties rules: conflicting role pairs ────────────
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const allowed = await assertPermission(pdb, actor, 'ADMIN_VIEW', { request, module: 'Admin', entityId: 'sod-rule' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const rules = await pdb.finSodRule.findMany({ orderBy: [{ roleACode: 'asc' }, { roleBCode: 'asc' }] })
    return NextResponse.json({ success: true, data: rules })
  } catch (error) {
    console.error('Error fetching SoD rules:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch SoD rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const body = await request.json()
    const { roleACode, roleBCode, description, isActive } = body
    if (!roleACode || !roleBCode) return NextResponse.json({ success: false, error: 'roleACode and roleBCode are required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_CREATE', { request, module: 'Admin', entityId: 'sod-rule' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const rule = await pdb.finSodRule.create({
      data: { roleACode, roleBCode, description: description || null, isActive: isActive ?? true },
    })
    return NextResponse.json({ success: true, data: rule }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating SoD rule:', error)
    if (error?.code === 'P2002') return NextResponse.json({ success: false, error: 'This SoD rule already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create SoD rule' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const body = await request.json()
    const { id, description, isActive } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_EDIT', { request, module: 'Admin', entityId: 'sod-rule' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const rule = await pdb.finSodRule.update({
      where: { id: Number(id) },
      data: { ...(description ? { description } : {}), ...(typeof isActive === 'boolean' ? { isActive } : {}) },
    })
    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    console.error('Error updating SoD rule:', error)
    return NextResponse.json({ success: false, error: 'Failed to update SoD rule' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get('ids') || searchParams.get('id') || '').split(',').map(Number).filter((n) => !isNaN(n))
    if (ids.length === 0) return NextResponse.json({ success: false, error: 'ids required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_DELETE', { request, module: 'Admin', entityId: 'sod-rule' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const result = await pdb.finSodRule.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Error deleting SoD rule:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete SoD rule' }, { status: 500 })
  }
}