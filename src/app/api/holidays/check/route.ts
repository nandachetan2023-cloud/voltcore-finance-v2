import { NextRequest, NextResponse } from 'next/server'
import { isHoliday, getHolidaysInRange } from '@/lib/services/holiday-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/holidays/check
 * Check if specific date(s) are holidays
 * Query params:
 *   - date: Single date to check (YYYY-MM-DD)
 *   - startDate & endDate: Date range to check
 *   - branchId: Optional branch ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const branchId = searchParams.get('branchId')

    const branchIdNum = branchId ? parseInt(branchId) : null

    // Single date check
    if (date) {
      const result = await isHoliday(date, branchIdNum)
      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    // Date range check
    if (startDate && endDate) {
      const holidays = await getHolidaysInRange(startDate, endDate, branchIdNum)
      return NextResponse.json({
        success: true,
        data: {
          holidays,
          count: holidays.length,
          dates: holidays.map(h => h.date.toISOString().split('T')[0]),
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Either date or startDate+endDate is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error checking holidays:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check holidays' },
      { status: 500 }
    )
  }
}
