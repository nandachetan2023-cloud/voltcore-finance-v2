import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { getClientForUrl } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: fetch employees from a tenant's own DB for autofill in user management
// Excludes employees who already have a TenantUser account linked to them
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const search = searchParams.get('search') || ''
    // When editing an existing user, pass their current employeeId to keep them in the list
    const excludeEditId = searchParams.get('excludeEditId')

    if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })

    const tenant = await superadminDb.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

    // Get all employeeIds already linked to a TenantUser for this tenant
    const existingUsers = await superadminDb.tenantUser.findMany({
      where: {
        tenantId,
        isActive: true,
        employeeId: { not: null },
        // If editing, exclude the current user's employeeId from the "already taken" list
        ...(excludeEditId ? { NOT: { employeeId: parseInt(excludeEditId) } } : {}),
      },
      select: { employeeId: true },
    })
    const takenEmployeeIds = existingUsers
      .map(u => u.employeeId)
      .filter((id): id is number => id !== null)

    const tenantDb = getClientForUrl(tenant.dbUrl)

    {
      const employees = await tenantDb.employee.findMany({
        where: {
          isDeleted: false,
          employmentStatus: 'active',
          // Exclude employees already assigned to a user
          ...(takenEmployeeIds.length > 0 ? { id: { notIn: takenEmployeeIds } } : {}),
          ...(search ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
            ],
          } : {}),
        },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phone: true,
          Designation: { select: { name: true } },
          Department: { select: { name: true } },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        take: 50,
      })

      return NextResponse.json({ success: true, data: employees })
    }
  } catch (e) {
    console.error('Tenant employees fetch error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch employees', data: [] })
  }
}
