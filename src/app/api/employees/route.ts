import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        attendance: { orderBy: { date: 'desc' } },
        leaveRequests: { orderBy: { appliedDate: 'desc' } },
        payroll: { orderBy: { month: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
      },
    })

    return NextResponse.json({ success: true, data: employees })
  } catch (error) {
    console.error('[API /employees GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      empId,
      name,
      email,
      phone,
      trade,
      role,
      site,
      type = 'Staff',
      status = 'Active',
      joiningDate,
      certifications = '',
    } = body

    if (!empId || !name || !trade || !role || !site || !joiningDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: empId, name, trade, role, site, joiningDate' },
        { status: 400 }
      )
    }

    const employee = await db.employee.create({
      data: {
        empId,
        name,
        email: email || null,
        phone: phone || null,
        trade,
        role,
        site,
        type,
        status,
        joiningDate,
        certifications,
      },
    })

    return NextResponse.json({ success: true, data: employee }, { status: 201 })
  } catch (error: unknown) {
    console.error('[API /employees POST] Error:', error)
    const message =
      error instanceof Error && error.message.includes('Unique')
        ? 'Employee ID already exists'
        : 'Failed to create employee'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
