/**
 * Tenant User Management API
 * Called from within the ERP by tenant admins.
 * Reads/writes TenantUser records in the superadmin DB, scoped to the caller's tenant.
 * Module access is derived from the assigned OrgRole (read-only for tenant admin).
 */
import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { checkAccountLimit } from '@/lib/account-limit'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('erp_tenant_id')?.value || null
}

// GET: list users for this tenant — excludes superadmin-created users
export async function GET(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const users = await superadminDb.tenantUser.findMany({
      where: { tenantId, createdBySuperadmin: false },  // hide superadmin-created users
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      success: true,
      data: users.map(({ password: _, ...u }) => u),
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST: create a new user for this tenant
export async function POST(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, email, password, phone, orgRoleId } = body

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'name, email and password are required' }, { status: 400 })
    }

    // Block creation if no roles are defined for this tenant
    const roleCount = await superadminDb.orgRole.count({ where: { tenantId, isActive: true } })
    if (roleCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'No roles have been defined for your account. Contact your system administrator to set up roles before creating users.',
      }, { status: 403 })
    }

    // Role is required when roles exist
    if (!orgRoleId) {
      return NextResponse.json({ success: false, error: 'A role must be assigned to the user.' }, { status: 400 })
    }

    // Enforce the tenant's TOTAL account cap (set by superadmin)
    const limitError = await checkAccountLimit(tenantId, 1)
    if (limitError) {
      return NextResponse.json({ success: false, error: limitError }, { status: 403 })
    }

    // Resolve allowedModules from the OrgRole if provided
    let allowedModules = 'all'
    if (orgRoleId) {
      const role = await superadminDb.orgRole.findFirst({
        where: { id: orgRoleId, tenantId },
      })
      if (role) {
        allowedModules = role.moduleAccess
      }
    }

    const hash = await bcrypt.hash(password, 12)
    const user = await superadminDb.tenantUser.create({
      data: {
        tenantId, name, email,
        password: hash,
        phone: phone || '',
        allowedModules,
        orgRoleId: orgRoleId || null,
        employeeId: body.employeeId ? parseInt(body.employeeId) : null,
        employeeCode: body.employeeCode || null,
        createdBySuperadmin: false,
        onboardingStatus: body.requireOnboarding ? 'pending' : 'none',
      } as any,
    })
    const { password: _, ...safe } = user
    return NextResponse.json({ success: true, data: safe }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 })
  }
}

// PUT: update a user (name, phone, orgRoleId, isActive — NOT allowedModules directly)
export async function PUT(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, password, orgRoleId, ...rest } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    // Verify user belongs to this tenant AND was not created by superadmin
    const existing = await superadminDb.tenantUser.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    if (existing.createdBySuperadmin) {
      return NextResponse.json({ success: false, error: 'This user is managed by the system administrator and cannot be edited here.' }, { status: 403 })
    }

    const data: any = { ...rest }
    if (orgRoleId !== undefined) {
      data.orgRoleId = orgRoleId || null
      if (orgRoleId) {
        const role = await superadminDb.orgRole.findFirst({ where: { id: orgRoleId, tenantId } })
        if (role) data.allowedModules = role.moduleAccess
      } else {
        data.allowedModules = 'all'
      }
    }
    if (body.employeeId !== undefined) {
      data.employeeId = body.employeeId ? parseInt(body.employeeId) : null
    }
    if (password && password.trim()) {
      data.password = await bcrypt.hash(password, 12)
    }

    const user = await superadminDb.tenantUser.update({ where: { id }, data })
    const { password: _, ...safe } = user
    return NextResponse.json({ success: true, data: safe })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE: delete a user from this tenant
export async function DELETE(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const existing = await superadminDb.tenantUser.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    if (existing.createdBySuperadmin) {
      return NextResponse.json({ success: false, error: 'This user is managed by the system administrator and cannot be deleted here.' }, { status: 403 })
    }

    await superadminDb.tenantUser.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 })
  }
}
