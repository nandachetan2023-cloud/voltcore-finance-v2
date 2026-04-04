import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all employees (optionally include attendance via ?include=attendance)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const include = searchParams.get('include')

    const selectBase: any = {
      id: true,
      empId: true,
      name: true,
      email: true,
      phone: true,
      trade: true,
      role: true,
      site: true,
      type: true,
      status: true,
      joiningDate: true,
      certifications: true,
      createdAt: true,
      updatedAt: true,
    }

    if (include === 'attendance') {
      selectBase.attendance = {
        select: {
          id: true,
          date: true,
          site: true,
          timeIn: true,
          timeOut: true,
          otHours: true,
          shift: true,
          status: true,
        },
      }
    }

    const employees = await db.employee.findMany({
      select: selectBase,
      orderBy: { createdAt: 'desc' },
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
  try {
    const body = await request.json()
    const { empId, name, trade, role, site, joiningDate, email, phone, type, status, certifications } = body

    if (!empId || !name || !trade || !role || !site || !joiningDate) {
      return NextResponse.json(
        { success: false, error: 'empId, name, trade, role, site, and joiningDate are required' },
        { status: 400 }
      )
    }

    // Check empId uniqueness
    const existing = await db.employee.findUnique({ where: { empId } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An employee with this empId already exists' },
        { status: 409 }
      )
    }

    const employee = await db.employee.create({
      data: {
        empId,
        name,
        trade,
        role,
        site,
        joiningDate,
        email: email || null,
        phone: phone || null,
        type: type || 'Staff',
        status: status || 'Active',
        certifications: certifications || '',
      },
    })

    return NextResponse.json({ success: true, data: employee }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An employee with this empId already exists' },
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
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employee = await db.employee.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An employee with this empId already exists' },
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
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    await db.employee.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
