import { NextRequest, NextResponse } from 'next/server'
import { syncAllSites, loadBiometricSites, createBiometricService } from '@/lib/biometric'

export const dynamic = 'force-dynamic'

// POST: Trigger incremental sync (all sites or specific site)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { siteId } = body

    if (siteId) {
      // Sync specific site
      const biometricService = createBiometricService(siteId)
      const syncResult = await biometricService.syncIncremental()

      // Automatically process logs for matched employees
      const processResult = await biometricService.processRawLogs()

      return NextResponse.json({
        success: true,
        message: `Biometric sync and processing completed for ${siteId}`,
        data: {
          sync: syncResult,
          processing: processResult,
        },
      })
    } else {
      // Sync all sites
      const results = await syncAllSites()

      // Process logs for all sites
      const sites = loadBiometricSites()
      const processingResults = []
      
      for (const site of sites) {
        const biometricService = createBiometricService(site.id)
        const processResult = await biometricService.processRawLogs()
        processingResults.push({
          site: site.id,
          result: processResult,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Biometric sync and processing completed for all sites',
        data: {
          sync: results,
          processing: processingResults,
        },
      })
    }
  } catch (error) {
    console.error('Biometric sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}

// GET: Get configured sites
export async function GET() {
  try {
    const sites = loadBiometricSites()
    return NextResponse.json({
      success: true,
      data: sites.map(s => ({ id: s.id, name: s.name })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load sites',
      },
      { status: 500 }
    )
  }
}
