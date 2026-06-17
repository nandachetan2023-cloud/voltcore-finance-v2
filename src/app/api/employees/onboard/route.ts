import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { checkAccountLimit } from '@/lib/account-limit'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// POST: Onboard a new employee — creates employee record + tenant user + links them
// Only minimal admin-side fields are needed. Personal info comes later via the joining form.
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      // Employee admin-only fields
      employeeCode,
      firstName,
      lastName,
      email,
      departmentId,
      designationId,
      branchId,
      dateOfJoining,
      employmentType,
      monthlyGrossSalary,
      natureOfDesignation,
      gradeLabel,
      // User account fields
      password,
      orgRoleId,
    } = body

    if (!employeeCode || !firstName || !lastName || !email || !departmentId || !designationId || !branchId || !dateOfJoining || !password || !orgRoleId) {
      return NextResponse.json(
        { success: false, error: 'Required: employeeCode, firstName, lastName, email, department, designation, branch, dateOfJoining, password, role' },
        { status: 400 }
      )
    }

    // Check role validity + the tenant's total account cap before creating anything
    const role = await superadminDb.orgRole.findFirst({
      where: { id: orgRoleId, tenantId, isActive: true },
    })
    if (!role) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 })
    }
    const limitError = await checkAccountLimit(tenantId, 1)
    if (limitError) {
      return NextResponse.json({ success: false, error: limitError }, { status: 403 })
    }

    // Check employee code/email uniqueness
    const existingCode = await db.employee.findFirst({ where: { employeeCode, isDeleted: false } })
    if (existingCode) {
      return NextResponse.json({ success: false, error: `Employee code ${employeeCode} already exists` }, { status: 409 })
    }
    const existingEmail = await db.employee.findFirst({ where: { email, isDeleted: false } })
    if (existingEmail) {
      return NextResponse.json({ success: false, error: `Email ${email} already registered` }, { status: 409 })
    }
    const existingUser = await superadminDb.tenantUser.findFirst({ where: { tenantId, email } })
    if (existingUser) {
      return NextResponse.json({ success: false, error: `User account with email ${email} already exists` }, { status: 409 })
    }

    // 1. Create employee record (personal fields will be filled via onboarding form)
    const employee = await db.employee.create({
      data: {
        employeeCode,
        firstName,
        lastName,
        email,
        departmentId: parseInt(departmentId),
        designationId: parseInt(designationId),
        branchId: parseInt(branchId),
        dateOfJoining: new Date(dateOfJoining),
        employmentType: employmentType || null,
        employmentStatus: 'active',
        natureOfDesignation: natureOfDesignation || gradeLabel || null,
        monthlyGrossSalary: monthlyGrossSalary ? parseFloat(monthlyGrossSalary) : null,
        // Use placeholders for fields we no longer require — will be filled via form
        phone: '',
        gender: null,
        dateOfBirth: null,
        currentAddress: null,
        currentCity: null,
        currentState: null,
        currentPincode: null,
        isActive: true,
        updatedAt: new Date(),
      } as any,
    })

    // 2. Create tenant user with onboarding required
    const passwordHash = await bcrypt.hash(password, 12)
    const tenantUser = await superadminDb.tenantUser.create({
      data: {
        tenantId,
        name: `${firstName} ${lastName}`,
        email,
        password: passwordHash,
        phone: '',
        allowedModules: role.moduleAccess,
        orgRoleId,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        createdBySuperadmin: false,
        onboardingStatus: 'pending',
      } as any,
    })

    return NextResponse.json({
      success: true,
      data: {
        employeeId: employee.id,
        userId: tenantUser.id,
        employeeCode,
        message: 'Employee onboarded. They will see the joining form on first login.',
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Onboard employee error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to onboard employee' },
      { status: 500 }
    )
  }
}
