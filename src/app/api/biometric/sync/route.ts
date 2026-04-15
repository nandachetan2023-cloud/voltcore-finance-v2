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
      const result = await biometricService.syncIncremental()

      return NextResponse.json({
        success: true,
        message: `Biometric sync completed for ${siteId}`,
        data: result,
      })
    } else {
      // Sync all sites
      const results = await syncAllSites()

      return NextResponse.json({
        success: true,
        message: 'Biometric sync completed for all sites',
        data: results,
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
