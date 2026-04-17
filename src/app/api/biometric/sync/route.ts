import { NextRequest, NextResponse } from 'next/server'
import { syncAllSites, loadBiometricSitesFromDb, createBiometricServiceFromDb } from '@/lib/biometric'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Trigger incremental sync (all sites or specific site)
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const body = await request.json().catch(() => ({}))
    const { siteId } = body

    if (siteId) {
      const biometricService = await createBiometricServiceFromDb(siteId, db, tenantId)
      const syncResult = await biometricService.syncIncremental()
      const processResult = await biometricService.processRawLogs()

      return NextResponse.json({
        success: true,
        message: `Biometric sync and processing completed for ${siteId}`,
        data: { sync: syncResult, processing: processResult },
      })
    } else {
      const results = await syncAllSites(db, tenantId)

      const sites = await loadBiometricSitesFromDb(db, tenantId)
      const processingResults = []
      for (const site of sites) {
        const biometricService = await createBiometricServiceFromDb(site.id, db, tenantId)
        const processResult = await biometricService.processRawLogs()
        processingResults.push({ site: site.id, result: processResult })
      }

      return NextResponse.json({
        success: true,
        message: 'Biometric sync and processing completed for all sites',
        data: { sync: results, processing: processingResults },
      })
    }
  } catch (error) {
    console.error('Biometric sync error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}

// GET: Get configured sites for this tenant
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const sites = await loadBiometricSitesFromDb(db, tenantId)
    return NextResponse.json({
      success: true,
      data: sites.map(s => ({ id: s.id, name: s.name })),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load sites' },
      { status: 500 }
    )
  }
}
