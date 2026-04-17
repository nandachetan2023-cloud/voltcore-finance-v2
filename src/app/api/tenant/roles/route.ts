/**
 * Returns OrgRoles for the current tenant (read-only for tenant admin).
 * Used to populate the role dropdown in User Management.
 */
import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const roles = await superadminDb.orgRole.findMany({
      where: { tenantId, isActive: true },
      orderBy: { level: 'asc' },
      select: {
        id: true, name: true, level: true,
        moduleAccess: true, departments: true,
        designations: true, color: true, maxUsers: true,
      },
    })

    // For each role, count how many tenant-admin-created users exist
    const roleCounts = await superadminDb.tenantUser.groupBy({
      by: ['orgRoleId'],
      where: { tenantId, createdBySuperadmin: false, orgRoleId: { not: null } },
      _count: { id: true },
    })
    const countMap: Record<string, number> = {}
    for (const rc of roleCounts) {
      if (rc.orgRoleId) countMap[rc.orgRoleId] = rc._count.id
    }

    return NextResponse.json({
      success: true,
      data: roles.map(r => ({ ...r, currentCount: countMap[r.id] ?? 0 })),
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 })
  }
}
