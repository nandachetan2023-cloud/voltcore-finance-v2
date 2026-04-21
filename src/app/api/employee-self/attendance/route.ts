import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: employee's own attendance records
// Cookie erp_employee_id takes priority; falls back to ?employeeId=X query param
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    // Cookie set at login is the authoritative source
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    const employeeId = cookieEmpId || searchParams.get('employeeId')
    const month = searchParams.get('month') // YYYY-MM

    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Your account is not linked to an employee record. Ask your administrator to link it.',
      }, { status: 400 })
    }

    const where: any = { employeeId: parseInt(employeeId) }

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const start = new Date(year, mon - 1, 1)
      const end = new Date(year, mon, 0, 23, 59, 59)
      where.logDate = { gte: start, lte: end }
    } else {
      // Default: last 30 days
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      where.logDate = { gte: start, lte: end }
    }

    const records = await db.attendanceLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
      select: {
        id: true, logDate: true, punchIn: true, punchOut: true,
        status: true, source: true, lateMinutes: true, fineAmount: true,
      },
    })

    // Summary stats
    const present = records.filter(r => r.status === 'present').length
    const late = records.filter(r => r.status === 'late').length
    const absent = records.filter(r => r.status === 'absent').length
    const halfDay = records.filter(r => r.status === 'half_day').length
    const totalFines = records.reduce((sum, r) => sum + Number(r.fineAmount || 0), 0)
    const totalLateMinutes = records.reduce((sum, r) => sum + (r.lateMinutes || 0), 0)

    return NextResponse.json({
      success: true,
      data: records,
      summary: { present, late, absent, halfDay, total: records.length, totalFines, totalLateMinutes },
    })
  } catch (e) {
    console.error('Employee self attendance error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500 })
  }
}
