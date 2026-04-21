import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST: Sync all employees' isActive status based on current shift assignments.
// Call this daily (e.g. via a cron job or scheduled task) to auto-deactivate
// employees whose shift effectiveTo has passed.
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const now = new Date()

    // Get all active employees
    const employees = await db.employee.findMany({
      where: { isDeleted: false },
      select: { id: true, isActive: true, employmentStatus: true },
    })

    let activated = 0
    let deactivated = 0

    for (const emp of employees) {
      // Skip employees in special states (notice period, resigned, etc.)
      if (['notice_period', 'resigned', 'terminated'].includes(emp.employmentStatus)) continue

      const activeShift = await db.shiftAssignment.findFirst({
        where: {
          employeeId: emp.id,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
      })

      const shouldBeActive = !!activeShift

      if (shouldBeActive !== emp.isActive) {
        await db.employee.update({
          where: { id: emp.id },
          data: {
            isActive: shouldBeActive,
            employmentStatus: shouldBeActive ? 'active' : 'inactive',
            updatedAt: new Date(),
          },
        })
        if (shouldBeActive) activated++
        else deactivated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${activated} activated, ${deactivated} deactivated`,
      data: { activated, deactivated, total: employees.length },
    })
  } catch (error) {
    console.error('Shift status sync error:', error)
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 })
  }
}
