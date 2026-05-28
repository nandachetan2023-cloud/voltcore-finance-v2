import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all employees (optionally include attendance via ?include=attendance)
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const include = searchParams.get('include')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = includeDeleted ? {} : { isDeleted: false }

    const selectBase: any = {
      id: true,
      employeeCode: true,
      tokenNumber: true,
      workmenSlNo: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      phone: true,
      alternatePhone: true,
      personalEmail: true,
      dateOfBirth: true,
      gender: true,
      maritalStatus: true,
      bloodGroup: true,
      fatherName: true,
      currentAddress: true,
      currentCity: true,
      currentState: true,
      currentPincode: true,
      permanentAddress: true,
      permanentCity: true,
      permanentState: true,
      permanentPincode: true,
      departmentId: true,
      designationId: true,
      natureOfDesignation: true,
      branchId: true,
      gradeId: true,
      reportingManagerId: true,
      dateOfJoining: true,
      confirmationDate: true,
      employmentType: true,
      employmentStatus: true,
      probationMonths: true,
      noticePeriodDays: true,
      monthlyGrossSalary: true,
      panNumber: true,
      aadharNumber: true,
      uanNumber: true,
      esicNumber: true,
      bankName: true,
      bankAccount: true,
      bankIfsc: true,
      emergencyContactName: true,
      emergencyContactRelation: true,
      emergencyContactPhone: true,
      isActive: true,
      isDeleted: true,
      employmentType: true,
      employmentStatus: true,
      dateOfJoining: true,
      Department: {
        select: {
          id: true,
          name: true,
        },
      },
      Designation: {
        select: {
          id: true,
          name: true,
        },
      },
      Branch: {
        select: {
          id: true,
          name: true,
        },
      },
      Grade: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    }

    if (include === 'attendance') {
      selectBase.attendanceLogs = {
        select: {
          id: true,
          logDate: true,
          punchIn: true,
          punchOut: true,
          status: true,
        },
        orderBy: { logDate: 'desc' },
        take: 30,
      }
    }

    const employees = await db.employee.findMany({
      where,
      select: selectBase,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({ success: true, data: employees })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

// POST: Create employee
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      currentAddress,
      currentCity,
      currentState,
      currentPincode,
      departmentId,
      designationId,
      branchId,
      dateOfJoining,
      employmentType,
      employmentStatus,
    } = body

    if (!employeeCode || !firstName || !lastName || !email || !phone || !dateOfBirth || !gender || !currentAddress || !currentCity || !currentState || !currentPincode || !departmentId || !designationId || !branchId || !dateOfJoining) {
      return NextResponse.json(
        { success: false, error: 'Required fields: employeeCode, firstName, lastName, email, phone, dateOfBirth, gender, currentAddress, currentCity, currentState, currentPincode, departmentId, designationId, branchId, dateOfJoining' },
        { status: 400 }
      )
    }

    // Check employeeCode uniqueness (exclude soft-deleted employees)
    const existingCode = await db.employee.findFirst({ 
      where: { 
        employeeCode,
        isDeleted: false 
      } 
    })
    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Employee code ${employeeCode} is already assigned to ${existingCode.firstName} ${existingCode.lastName}` },
        { status: 409 }
      )
    }

    // Check email uniqueness (exclude soft-deleted employees)
    const existingEmail = await db.employee.findFirst({ 
      where: { 
        email,
        isDeleted: false 
      } 
    })
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: `Email ${email} is already registered to ${existingEmail.firstName} ${existingEmail.lastName} (${existingEmail.employeeCode})` },
        { status: 409 }
      )
    }

    const employee = await db.employee.create({
      data: {
        employeeCode,
        tokenNumber: body.tokenNumber || null,
        workmenSlNo: body.workmenSlNo || null,
        firstName,
        middleName: body.middleName || null,
        lastName,
        email,
        phone,
        alternatePhone: body.alternatePhone || null,
        personalEmail: body.personalEmail || null,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        maritalStatus: body.maritalStatus || null,
        bloodGroup: body.bloodGroup || null,
        fatherName: body.fatherName || null,
        currentAddress,
        currentCity,
        currentState,
        currentPincode,
        permanentAddress: body.permanentAddress || null,
        permanentCity: body.permanentCity || null,
        permanentState: body.permanentState || null,
        permanentPincode: body.permanentPincode || null,
        departmentId: parseInt(departmentId),
        designationId: parseInt(designationId),
        natureOfDesignation: body.natureOfDesignation || null,
        branchId: parseInt(branchId),
        gradeId: body.gradeId ? parseInt(body.gradeId) : null,
        reportingManagerId: body.reportingManagerId ? parseInt(body.reportingManagerId) : null,
        dateOfJoining: new Date(dateOfJoining),
        confirmationDate: body.confirmationDate ? new Date(body.confirmationDate) : null,
        employmentType: employmentType || 'permanent',
        employmentStatus: employmentStatus || 'active',
        probationMonths: body.probationMonths ? parseInt(body.probationMonths) : 6,
        noticePeriodDays: body.noticePeriodDays ? parseInt(body.noticePeriodDays) : 30,
        monthlyGrossSalary: body.monthlyGrossSalary ? parseFloat(body.monthlyGrossSalary) : null,
        panNumber: body.panNumber || null,
        aadharNumber: body.aadharNumber || null,
        uanNumber: body.uanNumber || null,
        esicNumber: body.esicNumber || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        bankIfsc: body.bankIfsc || null,
        emergencyContactName: body.emergencyContactName || null,
        emergencyContactRelation: body.emergencyContactRelation || null,
        emergencyContactPhone: body.emergencyContactPhone || null,
        isActive: true,
        updatedAt: new Date(),
      },
      include: {
        Department: true,
        Designation: true,
        Branch: true,
      },
    })

    return NextResponse.json({ success: true, data: employee }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || []
      
      // Check if it's a soft-deleted employee
      if (target.includes('email')) {
        const softDeleted = await db.employee.findFirst({
          where: { email: body.email, isDeleted: true }
        })
        if (softDeleted) {
          return NextResponse.json(
            { 
              success: false, 
              error: `This email was previously used by a deleted employee (${softDeleted.employeeCode}). Please use a different email or contact administrator to permanently remove the old record.` 
            },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { success: false, error: 'This email address is already registered to another employee' },
          { status: 409 }
        )
      }
      
      if (target.includes('employeeCode')) {
        const softDeleted = await db.employee.findFirst({
          where: { employeeCode: body.employeeCode, isDeleted: true }
        })
        if (softDeleted) {
          return NextResponse.json(
            { 
              success: false, 
              error: `This employee code was previously used by a deleted employee. Please use a different code or contact administrator to permanently remove the old record.` 
            },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { success: false, error: 'This employee code is already assigned to another employee' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'An employee with this information already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}

// PUT: Update employee by id
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const employeeId = parseInt(id.toString())
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id format' },
        { status: 400 }
      )
    }

    const existing = await db.employee.findUnique({ where: { id: employeeId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if employeeCode is being changed and if it's already taken
    if (data.employeeCode && data.employeeCode !== existing.employeeCode) {
      const codeExists = await db.employee.findFirst({
        where: {
          employeeCode: data.employeeCode,
          id: { not: employeeId },
          isDeleted: false,
        }
      })
      
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: `Employee code ${data.employeeCode} is already assigned to ${codeExists.firstName} ${codeExists.lastName}` },
          { status: 409 }
        )
      }
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email !== existing.email) {
      const emailExists = await db.employee.findFirst({
        where: {
          email: data.email,
          id: { not: employeeId },
          isDeleted: false,
        }
      })
      
      if (emailExists) {
        return NextResponse.json(
          { success: false, error: `Email ${data.email} is already registered to ${emailExists.firstName} ${emailExists.lastName} (${emailExists.employeeCode})` },
          { status: 409 }
        )
      }
    }

    // Convert date strings to Date objects if present
    const updateData: any = { ...data }
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth)
    if (updateData.dateOfJoining) updateData.dateOfJoining = new Date(updateData.dateOfJoining)
    if (updateData.confirmationDate) updateData.confirmationDate = new Date(updateData.confirmationDate)
    if (updateData.departmentId) updateData.departmentId = parseInt(updateData.departmentId)
    if (updateData.designationId) updateData.designationId = parseInt(updateData.designationId)
    if (updateData.branchId) updateData.branchId = parseInt(updateData.branchId)
    if (updateData.gradeId !== undefined) updateData.gradeId = updateData.gradeId ? parseInt(updateData.gradeId) : null
    if (updateData.reportingManagerId !== undefined) updateData.reportingManagerId = updateData.reportingManagerId ? parseInt(updateData.reportingManagerId) : null
    if (updateData.probationMonths !== undefined) updateData.probationMonths = parseInt(updateData.probationMonths) || 6
    if (updateData.noticePeriodDays !== undefined) updateData.noticePeriodDays = parseInt(updateData.noticePeriodDays) || 30
    if (updateData.monthlyGrossSalary !== undefined) updateData.monthlyGrossSalary = updateData.monthlyGrossSalary ? parseFloat(updateData.monthlyGrossSalary) : null
    updateData.updatedAt = new Date()

    const employee = await db.employee.update({
      where: { id: employeeId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || []
      if (target.includes('employeeCode')) {
        return NextResponse.json(
          { success: false, error: 'This employee code is already in use' },
          { status: 409 }
        )
      }
      if (target.includes('email')) {
        return NextResponse.json(
          { success: false, error: 'This email is already registered' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'A unique constraint was violated' },
        { status: 409 }
      )
    }
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

// DELETE: Soft delete employee — always preserves data, frees up email/code for reuse
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const employeeId = parseInt(id.toString())
    if (isNaN(employeeId)) {
      return NextResponse.json({ success: false, error: 'Invalid id format' }, { status: 400 })
    }

    const existing = await db.employee.findUnique({ where: { id: employeeId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const ts = Date.now()

    // 1. Soft delete the employee — free up email and code for reuse
    await db.employee.update({
      where: { id: employeeId },
      data: {
        isDeleted: true,
        isActive: false,
        employmentStatus: 'separated',
        email: `${existing.email}.deleted.${ts}`,
        employeeCode: `${existing.employeeCode}.deleted.${ts}`,
        updatedAt: new Date(),
      },
    })

    // 2. Deactivate the linked TenantUser in the superadmin DB (if any)
    if (tenantId) {
      try {
        const { superadminDb } = await import('@/lib/superadmin-db')
        await superadminDb.tenantUser.updateMany({
          where: { tenantId, employeeId },
          data: {
            isActive: false,
            email: `${existing.email}.deleted.${ts}`,
          } as any,
        })
      } catch (e) {
        console.warn('Could not deactivate tenant user for employee:', e)
      }
    }

    // 3. Deactivate the linked User record in the tenant DB (if any)
    if (existing.userId) {
      await db.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: { id: employeeId },
      message: 'Employee deleted and linked user account deactivated. All records are preserved.',
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete employee' }, { status: 500 })
  }
}
