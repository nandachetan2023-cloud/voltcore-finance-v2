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

    if (siteId) {
      // Sync specific site
      const biometricService = createBiometricService(siteId)
      const result = await biometricService.syncDateRange(fromDate, toDate)

      return NextResponse.json({
        success: true,
        message: `Date range sync completed for ${siteId}`,
        data: result,
      })
    } else {
      // Sync all sites
      const { loadBiometricSites } = await import('@/lib/biometric')
      const sites = loadBiometricSites()
      const results = []

      for (const site of sites) {
        const biometricService = createBiometricService(site.id)
        const result = await biometricService.syncDateRange(fromDate, toDate)
        results.push({
          site: site.id,
          result,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Date range sync completed for all sites',
        data: results,
      })
    }
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
