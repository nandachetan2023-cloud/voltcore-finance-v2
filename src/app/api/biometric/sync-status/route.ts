import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: View sync history and status
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const siteId = searchParams.get('siteId')

    const where: any = {}
    if (siteId) where.siteId = siteId

    const syncLogs = await db.biometricSyncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Resolve siteId -> siteName from ALL of the tenant's configs (active + inactive)
    const siteNameMap: Record<string, string> = {}
    if (tenantId) {
      try {
        const configs = await superadminDb.biometricSiteConfig.findMany({
          where: { tenantId },
          select: { siteId: true, siteName: true },
        })
        for (const c of configs) siteNameMap[c.siteId] = c.siteName
      } catch (e) {
        console.error('[Biometric sync-status] Failed to load site configs for name resolution:', e)
      }
    }
    const withSiteName = (log: any) => ({
      ...log,
      siteName: log.siteId ? (siteNameMap[log.siteId] || null) : null,
    })

    // Get statistics
    const statsWhere: any = { processed: false }
    if (siteId) statsWhere.siteId = siteId

    const stats = await db.biometricRawLog.aggregate({
      _count: {
        id: true,
      },
      where: statsWhere,
    })

    const lastSuccessWhere: any = { status: 'success' }
    if (siteId) lastSuccessWhere.siteId = siteId

    const lastSuccessfulSync = await db.biometricSyncLog.findFirst({
      where: lastSuccessWhere,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        syncHistory: syncLogs.map(withSiteName),
        unprocessedCount: stats._count.id,
        lastSuccessfulSync: lastSuccessfulSync ? withSiteName(lastSuccessfulSync) : null,
      },
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}

