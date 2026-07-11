import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null

    const dateFilter = (field: string) => {
      const f: any = {}
      if (startDate) f.gte = new Date(startDate)
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); f.lte = e }
      return Object.keys(f).length ? { [field]: f } : {}
    }

    switch (type) {

      // ── 1. Manpower ──────────────────────────────────────────────
      case 'manpower': {
        const employees = await db.employee.findMany({
          where: { isDeleted: false },
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            employmentStatus: true, employmentType: true, dateOfJoining: true,
            Department: { select: { name: true } },
            Designation: { select: { name: true } },
            Branch: { select: { name: true } },
          },
          orderBy: { employeeCode: 'asc' },
        })
        return NextResponse.json({ success: true, data: employees })
      }

      // ── 2. Attendance ────────────────────────────────────────────
      case 'attendance': {
        const where: any = { ...dateFilter('logDate') }
        const logs = await db.attendanceLog.findMany({
          where,
          select: {
            id: true, logDate: true, status: true,
            punchIn: true, punchOut: true,
            lateMinutes: true, fineAmount: true,
            Employee: {
              select: {
                employeeCode: true, firstName: true, lastName: true,
                Department: { select: { name: true } },
                Designation: { select: { name: true } },
                Branch: { select: { name: true } },
              },
            },
          },
          orderBy: { logDate: 'desc' },
          take: 5000,
        })
        return NextResponse.json({ success: true, data: logs })
      }

      // ── 3. Payroll ───────────────────────────────────────────────
      case 'payroll': {
        const where: any = {}
        if (month) where.month = month
        if (year) where.year = year
        const runs = await db.payrollRun.findMany({
          where,
          include: {
            PayrollItem: {
              select: {
                id: true, grossEarning: true, netPay: true,
                pfDeduction: true, esiDeduction: true, ptDeduction: true,
                tdsDeduction: true, totalDeduction: true, basicSalary: true,
                otAmount: true, presentDays: true, workingDays: true,
                payslipGenerated: true, status: true,
                Employee: {
                  select: {
                    employeeCode: true, firstName: true, lastName: true,
                    Department: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        })
        return NextResponse.json({ success: true, data: runs })
      }

      // ── 4. Leave ─────────────────────────────────────────────────
      case 'leave': {
        const where: any = {}
        if (startDate || endDate) {
          where.fromDate = {}
          if (startDate) where.fromDate.gte = new Date(startDate)
          if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.fromDate.lte = e }
        }
        const leaves = await db.leaveRequest.findMany({
          where,
          select: {
            id: true, leaveType: true, status: true,
            fromDate: true, toDate: true, days: true,
            reason: true, appliedDate: true,
            Employee: {
              select: {
                employeeCode: true, firstName: true, lastName: true,
                Department: { select: { name: true } },
              },
            },
          },
          orderBy: { appliedDate: 'desc' },
          take: 2000,
        })
        return NextResponse.json({ success: true, data: leaves })
      }

      // ── 5. Late & Fine ───────────────────────────────────────────
      case 'late-fine': {
        const where: any = { status: 'late', ...dateFilter('logDate') }
        const logs = await db.attendanceLog.findMany({
          where,
          select: {
            id: true, logDate: true, lateMinutes: true, fineAmount: true,
            punchIn: true,
            Employee: {
              select: {
                employeeCode: true, firstName: true, lastName: true,
                Department: { select: { name: true } },
              },
            },
          },
          orderBy: { logDate: 'desc' },
          take: 2000,
        })
        return NextResponse.json({ success: true, data: logs })
      }

      // ── 6. Onboarding Status ─────────────────────────────────────
      case 'onboarding': {
        const checklists = await db.onboardingChecklist.findMany({
          include: {
            Employee: {
              select: {
                employeeCode: true, firstName: true, lastName: true,
                Department: { select: { name: true } },
              },
            },
            template: { select: { name: true } },
            tasks: { select: { status: true, dueDate: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json({ success: true, data: checklists })
      }

      // ── 7. Turnover / Exit ───────────────────────────────────────
      case 'turnover': {
        const resignations = await db.resignation.findMany({
          include: {
            Employee: {
              select: {
                employeeCode: true, firstName: true, lastName: true,
                Department: { select: { name: true } },
                dateOfJoining: true,
              },
            },
            exitInterview: {
              select: { primaryReason: true, wouldRejoin: true, rating: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
        })
        const totalActive = await db.employee.count({ where: { isDeleted: false, employmentStatus: 'active' } })
        return NextResponse.json({ success: true, data: resignations, totalActive })
      }

      // ── 8. Training & Certifications ─────────────────────────────
      case 'training': {
        const [sessions, certs] = await Promise.all([
          db.trainingSession.findMany({ orderBy: { date: 'desc' } }),
          db.certification.findMany({ orderBy: { expiryDate: 'asc' } }),
        ])
        return NextResponse.json({ success: true, data: { sessions, certs } })
      }

      // ── 9. Notice Read Rate ──────────────────────────────────────
      case 'notices': {
        const notices = await db.notice.findMany({
          include: { _count: { select: { reads: true } } },
          orderBy: { publishedAt: 'desc' },
        })
        const totalEmployees = await db.employee.count({ where: { isDeleted: false } })
        return NextResponse.json({ success: true, data: notices, totalEmployees })
      }

      // ── 10. Payslip Dispatch ─────────────────────────────────────
      case 'dispatch': {
        const where: any = {}
        if (month) where.month = month
        if (year) where.year = year
        const runs = await db.payrollRun.findMany({
          where,
          select: {
            id: true, name: true, month: true, year: true,
            payrollType: true, totalEmployees: true, status: true,
            _count: { select: { PayrollItem: true } },
            PayrollItem: {
              select: { payslipGenerated: true },
            },
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        })
        return NextResponse.json({ success: true, data: runs })
      }

      // ── 11. Tour Requests ────────────────────────────────────────
      case 'tour': {
        const where: any = { isDeleted: false }
        if (startDate || endDate) {
          where.fromDate = {}
          if (startDate) where.fromDate.gte = new Date(startDate)
          if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); where.fromDate.lte = e }
        }
        const tours = await db.tourRequest.findMany({
          where,
          select: {
            id: true, fromDate: true, toDate: true, days: true,
            destination: true, purpose: true, status: true, appliedDate: true,
            Employee: {
              select: {
                employeeCode: true, firstName: true, lastName: true,
                Department: { select: { name: true } },
                Branch: { select: { name: true } },
              },
            },
          },
          orderBy: { appliedDate: 'desc' },
          take: 2000,
        })
        return NextResponse.json({ success: true, data: tours })
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown report type' }, { status: 400 })
    }
  } catch (e) {
    console.error('Report error:', e)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
