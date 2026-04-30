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

    // Get shifts for the next 4 weeks + past 1 week
    const from = new Date()
    from.setDate(from.getDate() - 7)
    const to = new Date()
    to.setDate(to.getDate() + 28)

    const assignments = await db.shiftAssignment.findMany({
      where: {
        employeeId,
        date: { gte: from, lte: to },
      },
      include: {
        Shift: { select: { name: true, startTime: true, endTime: true, color: true } },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ success: true, data: assignments })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch shifts' }, { status: 500 })
  }
}
