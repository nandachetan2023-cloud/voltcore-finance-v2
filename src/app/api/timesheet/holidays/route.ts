import { NextRequest, NextResponse } from 'next/server'
import { getHolidaysInRange } from '@/lib/services/holiday-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/timesheet/holidays
 * Get holidays for timesheet display
 * Query params:
 *   - startDate: Start date (YYYY-MM-DD)
 *   - endDate: End date (YYYY-MM-DD)
 *   - branchId: Optional branch ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const branchId = searchParams.get('branchId')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const branchIdNum = branchId ? parseInt(branchId) : null
    const holidays = await getHolidaysInRange(startDate, endDate, branchIdNum)

    // Return holidays with date strings for easy lookup
    const holidayMap: Record<string, { name: string; type: string }> = {}
    holidays.forEach(h => {
      const dateStr = h.date.toISOString().split('T')[0]
      holidayMap[dateStr] = {
        name: h.name,
        type: h.type,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        holidays,
        holidayMap,
        dates: holidays.map(h => h.date.toISOString().split('T')[0]),
      },
    })
  } catch (error) {
    console.error('Error fetching timesheet holidays:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 }
    )
  }
}
