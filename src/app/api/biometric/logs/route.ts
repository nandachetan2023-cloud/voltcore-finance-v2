import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: View raw biometric logs (with resolved site names)
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const { searchParams } = new URL(request.url)
    const empCode = searchParams.get('empCode')
    const processed = searchParams.get('processed')
    const matched = searchParams.get('matched')
    const siteId = searchParams.get('siteId')
    const date = searchParams.get('date') // YYYY-MM-DD — filter to a single day
    const limit = parseInt(searchParams.get('limit') || '200') // higher default for grouping

    const where: any = {}
    if (empCode) where.empCode = empCode
    if (processed !== null && processed !== '') where.processed = processed === 'true'
    if (matched !== null && matched !== '') where.matched = matched === 'true'
    if (siteId) where.siteId = siteId
    if (date) {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      where.punchDate = { gte: dayStart, lte: dayEnd }
    }

    const logs = await db.biometricRawLog.findMany({
      where,
      orderBy: { punchDate: 'asc' }, // asc so first punch = index 0, last = index N-1
      take: limit,
    })

    // Build a siteId -> siteName map from ALL of the tenant's configs
    // (active AND inactive) so renamed/deactivated sites still resolve to a name.
    const siteNameMap: Record<string, string> = {}
    if (tenantId) {
      try {
        const configs = await superadminDb.biometricSiteConfig.findMany({
          where: { tenantId },
          select: { siteId: true, siteName: true },
        })
        for (const c of configs) siteNameMap[c.siteId] = c.siteName
      } catch (e) {
        console.error('[Biometric logs] Failed to load site configs for name resolution:', e)
      }
    }

    const data = logs.map(log => ({
      ...log,
      siteName: log.siteId ? (siteNameMap[log.siteId] || null) : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching biometric logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
