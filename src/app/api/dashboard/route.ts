import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Run a query, falling back when it fails. The Prisma schema was rewritten for
 * Finance and several legacy models (Project, Expense, Incident, Equipment,
 * Subcontractor, Payroll, Site) no longer exist; a missing delegate throws a
 * TypeError, and one bad query used to turn the whole dashboard into a 500.
 */
async function safe<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query()
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request) as any
  try {
    const today = new Date().toISOString().split('T')[0]

    // Run all queries in parallel for performance. Modules with no backing
    // model (incidents, equipment, subcontractors) report 0 until one exists.
    const [
      totalEmployees,
      activeEmployees,
      totalProjects,
      activeProjects,
      todayAttendance,
      pendingLeaves,
      pendingExpenses,
      openJobOpenings,
      overdueInvoices,
      payrollPaid,
      sites,
      expenseTotal,
      payrollTotals,
    ] = await Promise.all([
      safe(() => db.employee.count(), 0),
      safe(() => db.employee.count({ where: { employmentStatus: { equals: 'active', mode: 'insensitive' } } }), 0),
      safe(() => db.finProject.count(), 0),
      safe(() => db.finProject.count({ where: { status: 'On Track' } }), 0),
      safe(
        () =>
          db.attendanceLog.findMany({
            where: {
              logDate: {
                gte: new Date(today),
                lt: new Date(new Date(today).getTime() + 86400000),
              },
            },
            include: { Employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
          }),
        [] as any[]
      ),
      safe(() => db.leaveRequest.count({ where: { status: { in: ['Pending', 'pending'] } } }), 0),
      safe(() => db.finExpenseClaim.count({ where: { status: { in: ['Pending', 'Submitted'] } } }), 0),
      safe(() => db.jobOpening.count({ where: { status: 'Open' } }), 0),
      safe(() => db.invoice.count({ where: { status: { in: ['Overdue', 'overdue'] } } }), 0),
      safe(() => db.payrollRun.count({ where: { processedAt: { not: null } } }), 0),
      safe(() => db.finSite.count(), 0),
      safe(() => db.finExpenseClaim.aggregate({ _sum: { totalAmount: true } }), { _sum: { totalAmount: 0 } }),
      safe(() => db.payrollRun.aggregate({ _sum: { totalNet: true, totalGross: true } }), {
        _sum: { totalNet: 0, totalGross: 0 },
      }),
    ])
    const totalIncidents = 0
    const openIncidents = 0
    const totalEquipment = 0
    const operationalEquipment = 0
    const totalSubcontractors = 0

    // Compute attendance breakdown
    const presentCount = todayAttendance.filter(
      (a: any) => String(a.status).toLowerCase() === 'present'
    ).length
    const absentCount = todayAttendance.filter(
      (a: any) => String(a.status).toLowerCase() === 'absent'
    ).length
    const leaveCount = todayAttendance.filter(
      (a: any) => String(a.status).toLowerCase() === 'on leave'
    ).length

    const payrollData = payrollTotals
    const expenseData = { _sum: { amount: expenseTotal._sum.totalAmount } }

    // Recent activity: last 5 attendance records + last 5 leave requests
    const recentAttendance = await safe(
      () =>
        db.attendanceLog.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { Employee: { select: { firstName: true, lastName: true } } },
        }),
      [] as any[]
    )

    const recentLeaves = await safe(
      () =>
        db.leaveRequest.findMany({
          take: 5,
          where: { status: { in: ['Pending', 'pending'] } },
          orderBy: { appliedDate: 'desc' },
          include: { Employee: { select: { firstName: true, lastName: true } } },
        }),
      [] as any[]
    )

    return NextResponse.json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
        },
        attendance: {
          date: today,
          total: todayAttendance.length,
          present: presentCount,
          absent: absentCount,
          onLeave: leaveCount,
          records: todayAttendance,
        },
        leaves: {
          pending: pendingLeaves,
          recent: recentLeaves,
        },
        expenses: {
          pending: pendingExpenses,
          totalAmount: expenseData._sum.amount ?? 0,
        },
        incidents: {
          total: totalIncidents,
          open: openIncidents,
        },
        equipment: {
          total: totalEquipment,
          operational: operationalEquipment,
        },
        subcontractors: {
          total: totalSubcontractors,
        },
        recruitment: {
          openPositions: openJobOpenings,
        },
        invoices: {
          overdue: overdueInvoices,
        },
        payroll: {
          paid: payrollPaid,
          totalDisbursed: Number(payrollData._sum.totalNet ?? 0),
          totalGross: Number(payrollData._sum.totalGross ?? 0),
        },
        sites: {
          total: sites,
        },
        recentAttendance,
      },
    })
  } catch (error) {
    console.error('[API /dashboard GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
