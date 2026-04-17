import { getDbForRequest } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Get detailed sync information
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    // Get last sync for each site
    const lastSyncs = await db.biometricSyncLog.findMany({
      where: { status: 'success' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        siteId: true,
        lastRecord: true,
        syncType: true,
        recordsFetched: true,
        recordsProcessed: true,
        status: true,
        createdAt: true,
      },
    })

    // Get last sync per site
    const site1LastSync = lastSyncs.find(s => s.siteId === 'site1')
    const site2LastSync = lastSyncs.find(s => s.siteId === 'site2')

    // Get total raw logs
    const totalRawLogs = await db.biometricRawLog.count()
    const unprocessedLogs = await db.biometricRawLog.count({
      where: { processed: false },
    })

    // Get date range of existing data
    const oldestLog = await db.biometricRawLog.findFirst({
      orderBy: { punchDate: 'asc' },
      select: { punchDate: true },
    })
    const newestLog = await db.biometricRawLog.findFirst({
      orderBy: { punchDate: 'desc' },
      select: { punchDate: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        lastSyncs: {
          site1: site1LastSync ? {
            lastRecord: site1LastSync.lastRecord,
            lastSyncTime: site1LastSync.createdAt,
            recordsFetched: site1LastSync.recordsFetched,
            recordsProcessed: site1LastSync.recordsProcessed,
          } : null,
          site2: site2LastSync ? {
            lastRecord: site2LastSync.lastRecord,
            lastSyncTime: site2LastSync.createdAt,
            recordsFetched: site2LastSync.recordsFetched,
            recordsProcessed: site2LastSync.recordsProcessed,
          } : null,
        },
        dataRange: {
          oldest: oldestLog?.punchDate,
          newest: newestLog?.punchDate,
          totalLogs: totalRawLogs,
          unprocessed: unprocessedLogs,
        },
        explanation: {
          lastRecord: 'The MaxRecord value used for incremental sync. Format: MMMyyyy$ID',
          whyZeroRecords: 'If sync returns 0 records, it means there is no NEW data since the lastRecord. This is normal if you already synced today.',
          howToGetNewData: 'New data will be available after employees punch in/out. Try syncing again tomorrow or use Date Range Sync for specific dates.',
        },
        recommendations: {
          incrementalSync: 'Use for daily operations - only fetches new data',
          dateRangeSync: 'Use to fetch specific date range or backfill historical data',
          nextSteps: [
            'If you need today\'s data: Wait for employees to punch in/out, then sync',
            'If you need historical data: Use Date Range Sync with specific dates',
            'If you need to re-sync: Use Date Range Sync to re-import data',
          ],
        },
      },
    })
  } catch (error) {
    console.error('Sync info error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync info',
      },
      { status: 500 }
    )
  }
}
