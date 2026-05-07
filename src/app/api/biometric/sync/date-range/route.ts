import { NextRequest, NextResponse } from 'next/server'
import { createBiometricServiceFromDb, loadBiometricSitesFromDb } from '@/lib/biometric'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Sync specific date range
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const body = await request.json()
    const { fromDate, toDate, siteId } = body

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'fromDate and toDate are required (format: dd/MM/yyyy_HH:mm)' },
        { status: 400 }
      )
    }

    if (siteId) {
      const biometricService = await createBiometricServiceFromDb(siteId, db, tenantId)
      const result = await biometricService.syncDateRange(fromDate, toDate)
      return NextResponse.json({
        success: true,
        message: `Date range sync completed for ${siteId}`,
        data: result,
      })
    } else {
      const sites = await loadBiometricSitesFromDb(db, tenantId)
      const results = []
      for (const site of sites) {
        const biometricService = await createBiometricServiceFromDb(site.id, db, tenantId)
        const result = await biometricService.syncDateRange(fromDate, toDate)
        results.push({ site: site.id, result })
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
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
