import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Run all queries in parallel for performance
    const [
      totalEmployees,
      activeEmployees,
      totalProjects,
      activeProjects,
      todayAttendance,
      pendingLeaves,
      pendingExpenses,
      totalIncidents,
      openIncidents,
      totalEquipment,
      operationalEquipment,
      totalSubcontractors,
      openJobOpenings,
      overdueInvoices,
      payrollPaid,
      sites,
    ] = await Promise.all([
      db.employee.count(),
      db.employee.count({ where: { status: 'Active' } }),
      db.project.count(),
      db.project.count({ where: { status: 'On Track' } }),
      db.attendanceLog.findMany({
        where: { 
          logDate: {
            gte: new Date(today),
            lt: new Date(new Date(today).getTime() + 86400000)
          }
        },
        include: { Employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      }),
      db.leaveRequest.count({ where: { status: 'Pending' } }),
      db.expense.count({ where: { status: 'Pending' } }),
      db.incident.count(),
      db.incident.count({
        where: { status: { in: ['Investigating', 'Open'] } },
      }),
      db.equipment.count(),
      db.equipment.count({ where: { status: 'Operational' } }),
      db.subcontractor.count(),
      db.jobOpening.count({ where: { status: 'Open' } }),
      db.invoice.count({ where: { status: 'Overdue' } }),
      db.payroll.count({ where: { status: 'Paid' } }),
      db.site.count(),
    ])

    // Compute attendance breakdown
    const presentCount = todayAttendance.filter(
      (a) => a.status === 'Present'
    ).length
    const absentCount = todayAttendance.filter(
      (a) => a.status === 'Absent'
    ).length
    const leaveCount = todayAttendance.filter(
      (a) => a.status === 'On Leave'
    ).length

    // Sum payroll amounts
    const payrollData = await db.payroll.aggregate({
      _sum: { netPay: true, gross: true },
    })

    // Sum expense amounts
    const expenseData = await db.expense.aggregate({
      _sum: { amount: true },
    })

    // Recent activity: last 5 attendance records + last 5 leave requests
    const recentAttendance = await db.attendanceLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { Employee: { select: { firstName: true, lastName: true } } },
    })

    const recentLeaves = await db.leaveRequest.findMany({
      take: 5,
      where: { status: 'pending' },
      orderBy: { appliedDate: 'desc' },
      include: { Employee: { select: { firstName: true, lastName: true } } },
    })

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
          totalDisbursed: payrollData._sum.netPay ?? 0,
          totalGross: payrollData._sum.gross ?? 0,
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
