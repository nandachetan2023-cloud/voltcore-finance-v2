import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { getDbForRequest } from '@/lib/db'
import { checkAccountLimit } from '@/lib/account-limit'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// POST: Bulk create tenant users from unlinked employees
export async function POST(request: NextRequest) {
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  const db = getDbForRequest(request)

  try {
    const body = await request.json()
    const { employeeIds, orgRoleId, defaultPassword, requireOnboarding } = body

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ success: false, error: 'employeeIds array is required' }, { status: 400 })
    }
    if (!orgRoleId) {
      return NextResponse.json({ success: false, error: 'orgRoleId is required' }, { status: 400 })
    }
    if (!defaultPassword || defaultPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'defaultPassword must be at least 6 characters' }, { status: 400 })
    }

    // Validate role
    const role = await superadminDb.orgRole.findFirst({
      where: { id: orgRoleId, tenantId, isActive: true },
    })
    if (!role) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 })
    }

    // Enforce the tenant's TOTAL account cap for the requested batch size
    const limitError = await checkAccountLimit(tenantId, employeeIds.length)
    if (limitError) {
      return NextResponse.json({ success: false, error: limitError }, { status: 403 })
    }

    // Fetch employees
    const employees = await db.employee.findMany({
      where: { id: { in: employeeIds.map((id: number) => parseInt(String(id))) }, isDeleted: false },
      select: { id: true, employeeCode: true, firstName: true, lastName: true, email: true, phone: true },
    })

    if (employees.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid employees found' }, { status: 404 })
    }

    // Check which employees already have accounts
    const existingUsers = await superadminDb.tenantUser.findMany({
      where: { tenantId, employeeId: { in: employees.map(e => e.id) } },
      select: { employeeId: true },
    })
    const linkedIds = new Set(existingUsers.map(u => u.employeeId))

    // Also check for email conflicts
    const existingEmails = await superadminDb.tenantUser.findMany({
      where: { tenantId, email: { in: employees.map(e => e.email) } },
      select: { email: true },
    })
    const usedEmails = new Set(existingEmails.map(u => u.email))

    const passwordHash = await bcrypt.hash(defaultPassword, 12)
    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const emp of employees) {
      if (linkedIds.has(emp.id)) {
        skipped++
        errors.push(`${emp.employeeCode}: already has an account`)
        continue
      }
      if (usedEmails.has(emp.email)) {
        skipped++
        errors.push(`${emp.employeeCode}: email ${emp.email} already in use`)
        continue
      }

      try {
        await superadminDb.tenantUser.create({
          data: {
            tenantId,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            password: passwordHash,
            phone: emp.phone || '',
            allowedModules: role.moduleAccess,
            orgRoleId,
            employeeId: emp.id,
            createdBySuperadmin: false,
            onboardingStatus: requireOnboarding ? 'pending' : 'none',
          } as any,
        })
        created++
      } catch (e: any) {
        skipped++
        errors.push(`${emp.employeeCode}: ${e.message?.includes('Unique') ? 'duplicate email' : 'creation failed'}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, skipped, total: employees.length, errors },
      message: `Created ${created} user account(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`,
    })
  } catch (error: any) {
    console.error('Bulk user creation error:', error)
    return NextResponse.json({ success: false, error: 'Bulk creation failed' }, { status: 500 })
  }
}
