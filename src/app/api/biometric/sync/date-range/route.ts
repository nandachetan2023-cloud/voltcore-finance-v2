import { NextRequest, NextResponse } from 'next/server'
import { createBiometricService } from '@/lib/biometric'

export const dynamic = 'force-dynamic'

// POST: Sync specific date range
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromDate, toDate, siteId } = body

    if (!fromDate || !toDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'fromDate and toDate are required (format: dd/MM/yyyy_HH:mm)',
        },
        { status: 400 }
      )
    }

    const biometricService = createBiometricService(siteId)
    const result = await biometricService.syncDateRange(fromDate, toDate)

    return NextResponse.json({
      success: true,
      message: 'Date range sync completed',
      data: result,
    })
  } catch (error) {
    console.error('Date range sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}
