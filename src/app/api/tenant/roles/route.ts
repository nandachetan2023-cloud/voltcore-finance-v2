/**
 * Tenant-scoped OrgRole management.
 * The tenant admin can create/edit/delete the business roles (with module
 * access) for THEIR tenant only. Roles live in the superadmin DB but are
 * always filtered by the caller's tenantId (from the erp_tenant_id cookie).
 * Per-role user limits were removed — the superadmin now caps total accounts
 * at the tenant level (Tenant.maxAccounts).
 */
import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { intersectAccess } from '@/lib/module-access'

export const dynamic = 'force-dynamic'

function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('erp_tenant_id')?.value || null
}

// Fetch the tenant-wide module cap set by the superadmin.
async function getTenantCap(tenantId: string): Promise<string> {
  const tenant = await superadminDb.tenant.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true } as any,
  })
  return (tenant as any)?.enabledModules || 'all'
}

// GET: list roles for this tenant (+ current user count per role)
export async function GET(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const roles = await superadminDb.orgRole.findMany({
      where: { tenantId, isActive: true },
      orderBy: { level: 'asc' },
      select: {
        id: true, name: true, level: true,
        moduleAccess: true, departments: true,
        designations: true, color: true,
      },
    })

    // Count tenant-admin-created users per role (for display)
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

// POST: create a role for this tenant
export async function POST(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, level, moduleAccess, departments, designations, color } = body
    if (!name) return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 })

    // Clamp requested module access to the tenant-wide cap set by the superadmin.
    const cap = await getTenantCap(tenantId)
    const clampedAccess = intersectAccess(moduleAccess || 'all', cap)

    const role = await superadminDb.orgRole.create({
      data: {
        tenantId,
        name,
        level: parseInt(String(level)) || 1,
        maxUsers: 0, // deprecated — total cap is at tenant level now
        moduleAccess: clampedAccess,
        departments: departments || '',
        designations: designations || '',
        color: color || '#5a6878',
      },
    })
    return NextResponse.json({ success: true, data: role }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create role' }, { status: 500 })
  }
}

// PUT: update a role (verified to belong to this tenant)
export async function PUT(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, name, level, moduleAccess, departments, designations, color } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const existing = await superadminDb.orgRole.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 })

    // Clamp requested module access to the tenant-wide cap.
    let clampedAccess: string | undefined
    if (moduleAccess !== undefined) {
      const cap = await getTenantCap(tenantId)
      clampedAccess = intersectAccess(moduleAccess || 'all', cap)
    }

    const role = await superadminDb.orgRole.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(level !== undefined ? { level: parseInt(String(level)) || 1 } : {}),
        ...(clampedAccess !== undefined ? { moduleAccess: clampedAccess } : {}),
        ...(departments !== undefined ? { departments } : {}),
        ...(designations !== undefined ? { designations } : {}),
        ...(color !== undefined ? { color } : {}),
      },
    })

    // When module access changes, propagate to users holding this role
    if (clampedAccess !== undefined && clampedAccess !== existing.moduleAccess) {
      await superadminDb.tenantUser.updateMany({
        where: { tenantId, orgRoleId: id },
        data: { allowedModules: clampedAccess },
      })
    }

    return NextResponse.json({ success: true, data: role })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 })
  }
}

// DELETE: remove a role (blocked if in use by users or approval chains)
export async function DELETE(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const existing = await superadminDb.orgRole.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 })

    const userCount = await superadminDb.tenantUser.count({ where: { tenantId, orgRoleId: id } })
    if (userCount > 0) {
      return NextResponse.json({ success: false, error: `Cannot delete — ${userCount} user(s) are assigned this role.` }, { status: 400 })
    }
    const usedInSteps = await superadminDb.approvalStep.count({
      where: { OR: [{ approverRoleId: id }, { selfEscalateToRoleId: id }] },
    })
    const usedAsRequester = await superadminDb.approvalChain.count({ where: { requesterRoleId: id } })
    if (usedInSteps > 0 || usedAsRequester > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete — this role is used in an approval chain.' }, { status: 400 })
    }

    await superadminDb.orgRole.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete role' }, { status: 500 })
  }
}
