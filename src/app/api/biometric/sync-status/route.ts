import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: View sync history and status
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
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
        syncHistory: syncLogs,
        unprocessedCount: stats._count.id,
        lastSuccessfulSync,
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
