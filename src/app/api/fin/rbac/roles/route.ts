import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// ── Finance roles: CRUD on the hierarchical role catalog ──────────
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const allowed = await assertPermission(pdb, actor, 'ADMIN_VIEW', { request, module: 'Admin', entityId: 'role' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const roles = await pdb.finRole.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { assignments: true, permissions: true } },
      },
    })
    return NextResponse.json({ success: true, data: roles })
  } catch (error) {
    console.error('Error fetching finance roles:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = (await request.headers.get('x-actor-email')) || ''
    const body = await request.json()
    const { code, name, level, readOnly, color } = body
    if (!code || !name) return NextResponse.json({ success: false, error: 'code and name are required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_CREATE', { request, module: 'Admin', entityId: 'role' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const role = await pdb.finRole.create({
      data: { code, name, level: Number(level) || 1, readOnly: !!body.readOnly, color: color || '#00d4ff', isActive: body.isActive ?? true },
    })
    return NextResponse.json({ success: true, data: role }, { status: 201 })
  } catch (error) {
    console.error('Error creating finance role:', error)
    return NextResponse.json({ success: false, error: 'Failed to create role (code may already exist)' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const body = await request.json()
    const { id, name, level, readOnly, color, isActive } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_EDIT', { request, module: 'Admin', entityId: 'role' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const role = await pdb.finRole.update({
      where: { id: Number(id) },
      data: {
        ...(name ? { name } : {}),
        ...(level ? { level: Number(level) } : {}),
        ...(typeof readOnly === 'boolean' ? { readOnly } : {}),
        ...(color ? { color } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    })
    return NextResponse.json({ success: true, data: role })
  } catch (error) {
    console.error('Error updating finance role:', error)
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get('ids') || searchParams.get('id') || '').split(',').map(Number).filter((n) => !isNaN(n))
    if (ids.length === 0) return NextResponse.json({ success: false, error: 'ids required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_DELETE', { request, module: 'Admin', entityId: 'role' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const result = await pdb.finRole.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Error deleting finance role:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete role' }, { status: 500 })
  }
}