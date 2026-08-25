import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission, checkSodConflict } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// ── FinUserRole CRUD: (user, role, siteCode) assignments with SoD checks ─
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const allowed = await assertPermission(pdb, actor, 'ADMIN_VIEW', { request, module: 'Admin', entityId: 'assignment' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const roleId = searchParams.get('roleId')

    const rows = await pdb.finUserRole.findMany({
      where: {
        ...(email ? { userEmail: email } : {}),
        ...(roleId ? { roleId: Number(roleId) } : {}),
      },
      orderBy: [{ userEmail: 'asc' }, { siteCode: 'asc' }],
      include: { role: { select: { id: true, code: true, name: true, level: true, readOnly: true, color: true } } },
    })
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error('Error fetching user role assignments:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const body = await request.json()
    const { userEmail, userName, roleId, roleCode, siteCode } = body
    if (!userEmail) return NextResponse.json({ success: false, error: 'userEmail is required' }, { status: 400 })
    if (!roleId && !roleCode) return NextResponse.json({ success: false, error: 'roleId or roleCode is required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_CREATE', { request, module: 'Admin', entityId: 'assignment' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    // Resolve role id
    let roleIdNum = Number(roleId)
    if (!roleIdNum && roleCode) {
      const role = await pdb.finRole.findUnique({ where: { code: roleCode } })
      if (!role) return NextResponse.json({ success: false, error: `Role ${roleCode} not found` }, { status: 400 })
      roleIdNum = role.id
    }

    // SoD guard
    const roleRow = await pdb.finRole.findUnique({ where: { id: roleIdNum } })
    if (!roleRow) return NextResponse.json({ success: false, error: 'Role not found' }, { status: 400 })
    const sod = await checkSodConflict(pdb, userEmail, roleRow.code)
    if (sod.conflict) return NextResponse.json({ success: false, error: sod.message || 'SoD conflict' }, { status: 409 })

    const record = await pdb.finUserRole.create({
      data: { userEmail, userName: userName || null, roleId: roleIdNum, siteCode: siteCode || null },
      include: { role: { select: { code: true, name: true, level: true, readOnly: true, color: true } } },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user role assignment:', error)
    if (error?.code === 'P2002') return NextResponse.json({ success: false, error: 'This assignment already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create assignment' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const body = await request.json()
    const { id, userName, siteCode, isActive } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_EDIT', { request, module: 'Admin', entityId: 'assignment' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const record = await pdb.finUserRole.update({
      where: { id: Number(id) },
      data: {
        ...(typeof userName === 'string' ? { userName: userName || null } : {}),
        ...('siteCode' in body ? { siteCode: body.siteCode || null } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: { role: { select: { code: true, name: true, level: true, readOnly: true, color: true } } },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating user role assignment:', error)
    return NextResponse.json({ success: false, error: 'Failed to update assignment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get('ids') || searchParams.get('id') || '').split(',').map(Number).filter((n) => !isNaN(n))
    if (ids.length === 0) return NextResponse.json({ success: false, error: 'ids required' }, { status: 400 })

    const allowed = await assertPermission(pdb, actor, 'ADMIN_DELETE', { request, module: 'Admin', entityId: 'assignment' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const result = await pdb.finUserRole.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Error deleting user role assignment:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete assignment' }, { status: 500 })
  }
}