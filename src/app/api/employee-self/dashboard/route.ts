import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Aggregated data for the personalized employee dashboard.
 * One round-trip instead of the dashboard firing 6+ separate requests.
 * Employee is identified by the erp_employee_id cookie (set at login),
 * with a ?employeeId=X fallback for flexibility.
 */
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    const employeeIdStr = cookieEmpId || searchParams.get('employeeId')
    if (!employeeIdStr) {
      return NextResponse.json(
        { success: false, error: 'Your account is not linked to an employee record. Ask your administrator to link it.' },
        { status: 400 },
      )
    }
    const employeeId = parseInt(employeeIdStr)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // ── Employee profile (name, dept, designation, joining) ──
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true, employeeCode: true, firstName: true, lastName: true,
        dateOfJoining: true, employmentStatus: true,
        Department: { select: { name: true } },
        Designation: { select: { name: true } },
        Branch: { select: { name: true } },
      },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    // Run the independent aggregate queries in parallel
    const [
      monthAttendance,
      todayAttendance,
      leavePolicies,
      approvedLeavesThisYear,
      pendingLeaves,
      pendingRequests,
      pendingTours,
      shiftAssignment,
      latestPayslip,
      certifications,
    ] = await Promise.all([
      // This-month attendance for the summary ring
      db.attendanceLog.findMany({
        where: { employeeId, logDate: { gte: monthStart, lte: monthEnd } },
        select: { status: true, logDate: true, fineAmount: true, lateMinutes: true },
      }),
      // Today's punch (for the "today" card)
      db.attendanceLog.findFirst({
        where: { employeeId, logDate: { gte: todayStart, lte: todayEnd } },
        select: { status: true, punchIn: true, punchOut: true },
      }),
      // Leave policies → total entitlement by type
      db.leavePolicy.findMany({
        where: { isActive: true },
        select: { leaveType: true, annualQuota: true },
      }),
      // Approved leave days taken this year
      db.leaveRequest.findMany({
        where: {
          employeeId,
          status: { in: ['approved', 'Approved'] },
          fromDate: { gte: yearStart },
        },
        select: { leaveType: true, days: true },
      }),
      // Pending leave count
      db.leaveRequest.count({
        where: { employeeId, status: { in: ['pending', 'Pending'] } },
      }),
      // Pending general/advance requests
      db.employeeRequest.count({
        where: { employeeId, status: { in: ['pending', 'Pending'] }, isDeleted: false },
      }),
      // Pending tours
      db.tourRequest.count({
        where: { employeeId, status: { in: ['pending', 'Pending'] }, isDeleted: false },
      }).catch(() => 0),
      // Active shift for today
      db.shiftAssignment.findFirst({
        where: {
          employeeId,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
        orderBy: { effectiveFrom: 'desc' },
        include: { Shift: { select: { name: true, startTime: true, endTime: true, weekOffDays: true, crossesMidnight: true } } },
      }),
      // Latest dispatched payslip
      db.payrollItem.findFirst({
        where: { employeeId, payslipGenerated: true },
        orderBy: [{ PayrollRun: { year: 'desc' } }, { PayrollRun: { month: 'desc' } }],
        select: {
          netPay: true, grossEarning: true, totalDeduction: true,
          PayrollRun: { select: { month: true, year: true } },
        },
      }).catch(() => null),
      // Certifications for expiry alerts
      db.certification.findMany({
        where: { empId: employee.employeeCode },
        select: { name: true, expiryDate: true },
      }).catch(() => []),
    ])

    // ── Attendance summary (this month) ──
    const att = { present: 0, late: 0, absent: 0, halfDay: 0, totalFines: 0, totalLateMinutes: 0 }
    for (const r of monthAttendance) {
      const s = (r.status || '').toLowerCase()
      if (s === 'present') att.present++
      else if (s === 'late') att.late++
      else if (s === 'absent') att.absent++
      else if (s === 'half_day' || s === 'half-day') att.halfDay++
      att.totalFines += Number(r.fineAmount || 0)
      att.totalLateMinutes += Number(r.lateMinutes || 0)
    }
    const markedDays = att.present + att.late + att.absent + att.halfDay
    const attendanceRate = markedDays > 0
      ? Math.round(((att.present + att.late + att.halfDay * 0.5) / markedDays) * 100)
      : 0

    // ── Leave balance (entitlement − approved taken), by type ──
    const takenByType: Record<string, number> = {}
    for (const l of approvedLeavesThisYear) {
      takenByType[l.leaveType] = (takenByType[l.leaveType] || 0) + Number(l.days || 0)
    }
    const leaveBalance = leavePolicies.map(p => {
      const allocated = Number(p.annualQuota || 0)
      const used = takenByType[p.leaveType] || 0
      return { type: p.leaveType, allocated, used, remaining: Math.max(0, allocated - used) }
    })
    const totalLeaveRemaining = leaveBalance.reduce((s, l) => s + l.remaining, 0)
    const totalLeaveAllocated = leaveBalance.reduce((s, l) => s + l.allocated, 0)

    // ── Notices (targeted + unread count) ──
    let unreadNotices = 0
    try {
      const emp = await db.employee.findUnique({
        where: { id: employeeId },
        select: { Department: { select: { name: true } }, Designation: { select: { name: true } } },
      })
      const deptName = emp?.Department?.name || null
      const desigName = emp?.Designation?.name || null
      const targeted = await db.notice.findMany({
        where: {
          AND: [
            { OR: [{ targetDept: null }, ...(deptName ? [{ targetDept: deptName }] : [])] },
            { OR: [{ targetDesig: null }, ...(desigName ? [{ targetDesig: desigName }] : [])] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        },
        include: { reads: { where: { employeeId }, select: { id: true } } },
      })
      unreadNotices = targeted.filter(n => n.reads.length === 0).length
    } catch { unreadNotices = 0 }

    // ── Certifications expiring within 30 days / expired ──
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    let expiringCerts = 0
    let expiredCerts = 0
    for (const c of certifications) {
      if (!c.expiryDate) continue
      const exp = new Date(c.expiryDate)
      if (exp < now) expiredCerts++
      else if (exp <= in30) expiringCerts++
    }

    // ── Shift / week-off awareness for today ──
    let todayShift: any = null
    let isWeekOffToday = false
    if (shiftAssignment?.Shift) {
      const s = shiftAssignment.Shift
      todayShift = { name: s.name, startTime: s.startTime, endTime: s.endTime, crossesMidnight: s.crossesMidnight }
      isWeekOffToday = Array.isArray(s.weekOffDays) && s.weekOffDays.includes(now.getDay())
    }

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          employeeCode: employee.employeeCode,
          department: employee.Department?.name || null,
          designation: employee.Designation?.name || null,
          branch: employee.Branch?.name || null,
          dateOfJoining: employee.dateOfJoining,
          employmentStatus: employee.employmentStatus,
        },
        attendance: { ...att, markedDays, attendanceRate },
        today: {
          status: todayAttendance?.status || null,
          punchIn: todayAttendance?.punchIn || null,
          punchOut: todayAttendance?.punchOut || null,
          isWeekOff: isWeekOffToday,
        },
        leave: { balance: leaveBalance, totalRemaining: totalLeaveRemaining, totalAllocated: totalLeaveAllocated, pending: pendingLeaves },
        pending: { requests: pendingRequests, tours: pendingTours, leaves: pendingLeaves },
        notices: { unread: unreadNotices },
        payslip: latestPayslip
          ? {
              netPay: Number(latestPayslip.netPay || 0),
              grossEarning: Number(latestPayslip.grossEarning || 0),
              totalDeduction: Number(latestPayslip.totalDeduction || 0),
              month: latestPayslip.PayrollRun?.month || null,
              year: latestPayslip.PayrollRun?.year || null,
            }
          : null,
        shift: todayShift,
        certifications: { expiring: expiringCerts, expired: expiredCerts },
      },
    })
  } catch (e) {
    console.error('Employee dashboard error:', e)
    return NextResponse.json({ success: false, error: 'Failed to load dashboard' }, { status: 500 })
  }
}
