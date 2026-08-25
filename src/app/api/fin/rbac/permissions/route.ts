import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// ── Permission catalog: read-only list grouped by module ───────────
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const allowed = await assertPermission(pdb, actor, 'ADMIN_VIEW', { request, module: 'Admin', entityId: 'permission' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const moduleFilter = searchParams.get('module')
    const bindings = searchParams.get('bindings') === '1'

    const permissions = await pdb.finPermission.findMany({
      where: moduleFilter ? { module: moduleFilter } : {},
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
      include: bindings
        ? { finRolePermissions: { include: { role: { select: { id: true, code: true, name: true } } } } }
        : undefined,
    })

    // Group for the admin matrix
    const groups = new Map<string, typeof permissions>()
    for (const p of permissions) {
      if (!groups.has(p.module)) groups.set(p.module, [])
      groups.get(p.module)!.push(p)
    }
    const grouped = Array.from(groups.entries()).map(([module, items]) => ({ module, permissions: items }))

    return NextResponse.json({ success: true, data: grouped, flat: permissions })
  } catch (error) {
    console.error('Error fetching finance permissions:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch permissions' }, { status: 500 })
  }
}