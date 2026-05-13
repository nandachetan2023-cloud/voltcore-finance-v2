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

    // Fetch all assignments for this employee that overlap the display window
    // Window: 1 week back → 5 weeks forward
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - 7)
    windowStart.setHours(0, 0, 0, 0)

    const windowEnd = new Date()
    windowEnd.setDate(windowEnd.getDate() + 35)
    windowEnd.setHours(23, 59, 59, 999)

    // An assignment overlaps the window if:
    //   effectiveFrom <= windowEnd  AND  (effectiveTo IS NULL OR effectiveTo >= windowStart)
    const assignments = await db.shiftAssignment.findMany({
      where: {
        employeeId,
        effectiveFrom: { lte: windowEnd },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: windowStart } },
        ],
      },
      include: {
        Shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            crossesMidnight: true,
            weekOffDays: true,
            type: true,
          },
        },
      },
      orderBy: { effectiveFrom: 'asc' },
    })

    return NextResponse.json({ success: true, data: assignments })
  } catch (e) {
    console.error('employee-self/shifts error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch shifts' }, { status: 500 })
  }
}
