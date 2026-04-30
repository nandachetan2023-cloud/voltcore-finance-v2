import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    if (!cookieEmpId) {
      return NextResponse.json({ success: false, error: 'Not linked to an employee record' }, { status: 400 })
    }
    const employeeId = parseInt(cookieEmpId)

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        Department: { select: { id: true, name: true } },
        Designation: { select: { id: true, name: true } },
        Branch: { select: { id: true, name: true } },
        Grade: { select: { id: true, name: true } },
        _count: {
          select: {
            OnboardingChecklist: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    // Count certifications
    const certCount = await db.certification.count({ where: { empId: employee.employeeCode } })

    // Count onboarding docs
    const docCount = await db.onboardingTask.count({
      where: {
        checklist: { employeeId },
        documentPath: { not: null },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        certCount,
        docCount,
      },
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 })
  }
}
