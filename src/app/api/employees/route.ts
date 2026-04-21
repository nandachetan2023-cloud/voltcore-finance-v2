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
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      phone: true,
      alternatePhone: true,
      dateOfBirth: true,
      gender: true,
      employmentType: true,
      employmentStatus: true,
      isActive: true,
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
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        currentAddress,
        currentCity,
        currentState,
        currentPincode,
        departmentId: parseInt(departmentId),
        designationId: parseInt(designationId),
        branchId: parseInt(branchId),
        dateOfJoining: new Date(dateOfJoining),
        employmentType: employmentType || 'permanent',
        employmentStatus: employmentStatus || 'inactive', // inactive until shift is assigned
        isActive: false, // will be set to true when a shift is assigned
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
    if (updateData.departmentId) updateData.departmentId = parseInt(updateData.departmentId)
    if (updateData.designationId) updateData.designationId = parseInt(updateData.designationId)
    if (updateData.branchId) updateData.branchId = parseInt(updateData.branchId)
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

// DELETE: Delete employee by id
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, permanent } = body

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

    const existing = await db.employee.findUnique({ 
      where: { id: employeeId },
      include: {
        AttendanceLog: { take: 1 },
        PayrollItem: { take: 1 },
        SalaryStructureAssignment: { take: 1 },
      }
    })
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if employee has related records
    const hasRelatedRecords = 
      existing.AttendanceLog.length > 0 || 
      existing.PayrollItem.length > 0 || 
      existing.SalaryStructureAssignment.length > 0

    // If permanent flag is true, force hard delete
    if (permanent === true) {
      try {
        await db.employee.delete({ where: { id: employeeId } })
        return NextResponse.json({ 
          success: true, 
          data: { id: employeeId, softDeleted: false },
          message: 'Employee permanently deleted'
        })
      } catch (deleteError) {
        // If hard delete fails due to foreign key constraints, do soft delete
        await db.employee.update({
          where: { id: employeeId },
          data: {
            isDeleted: true,
            isActive: false,
            employmentStatus: 'separated',
            // Append timestamp to email and code to allow reuse
            email: `${existing.email}.deleted.${Date.now()}`,
            employeeCode: `${existing.employeeCode}.deleted.${Date.now()}`,
          },
        })
        return NextResponse.json({ 
          success: true, 
          data: { id: employeeId, softDeleted: true },
          message: 'Employee marked as deleted and email/code freed for reuse'
        })
      }
    }

    if (hasRelatedRecords) {
      // Soft delete - mark as deleted and free up email/code
      await db.employee.update({
        where: { id: employeeId },
        data: {
          isDeleted: true,
          isActive: false,
          employmentStatus: 'separated',
          // Append timestamp to email and code to allow reuse
          email: `${existing.email}.deleted.${Date.now()}`,
          employeeCode: `${existing.employeeCode}.deleted.${Date.now()}`,
        },
      })

      return NextResponse.json({ 
        success: true, 
        data: { id: employeeId, softDeleted: true },
        message: 'Employee marked as deleted. Email and employee code are now available for reuse.'
      })
    } else {
      // Hard delete if no related records
      await db.employee.delete({ where: { id: employeeId } })

      return NextResponse.json({ 
        success: true, 
        data: { id: employeeId, softDeleted: false },
        message: 'Employee permanently deleted'
      })
    }
  } catch (error) {
    console.error('Error deleting employee:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete employee with related records. Employee has been marked as inactive instead.' 
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
