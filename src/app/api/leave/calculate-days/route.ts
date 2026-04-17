import { NextRequest, NextResponse } from 'next/server'
import { calculateWorkingDays } from '@/lib/services/holiday-service'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leave/calculate-days
 * Calculate working days for leave request
 * Query params:
 *   - employeeId: Employee ID (required)
 *   - startDate: Start date (required)
 *   - endDate: End date (required)
 */
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'employeeId, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Get employee with branch info
    const employee = await db.employee.findUnique({
      where: { id: parseInt(employeeId) },
      select: {
        id: true,
        branchId: true,
      }
    })

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Calculate working days (excludes weekends/shift off days and holidays)
    const workingDays = await calculateWorkingDays(
      startDate,
      endDate,
      employee.branchId,
      employee.id,
      true,
      db
    )

    // Calculate total calendar days
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return NextResponse.json({
      success: true,
      data: {
        totalDays,
        workingDays,
        excludedDays: totalDays - workingDays,
      }
    })
  } catch (error) {
    console.error('Error calculating leave days:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to calculate leave days' },
      { status: 500 }
    )
  }
}
