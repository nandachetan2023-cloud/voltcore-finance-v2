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

    const payslips = await db.payrollItem.findMany({
      where: {
        employeeId,
        payslipGenerated: true,  // Only show dispatched payslips
      },
      include: {
        PayrollRun: { select: { month: true, year: true, name: true, payrollType: true } },
      },
      orderBy: [
        { PayrollRun: { year: 'desc' } },
        { PayrollRun: { month: 'desc' } },
      ],
    })

    return NextResponse.json({ success: true, data: payslips })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch payslips' }, { status: 500 })
  }
}
