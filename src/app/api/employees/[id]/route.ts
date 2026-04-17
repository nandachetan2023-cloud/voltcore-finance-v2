import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDbForRequest(request)
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid employee ID' }, { status: 400 })
    }

    const employee = await db.employee.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        employmentType: true,
        employmentStatus: true,
        dateOfJoining: true,
        uanNumber: true,
        esicNumber: true,
        panNumber: true,
        aadharNumber: true,
        bankName: true,
        bankAccount: true,
        bankIfsc: true,
        Department: { select: { id: true, name: true } },
        Designation: { select: { id: true, name: true } },
        Branch: { select: { id: true, name: true } },
        Grade: { select: { id: true, name: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch employee' }, { status: 500 })
  }
}
