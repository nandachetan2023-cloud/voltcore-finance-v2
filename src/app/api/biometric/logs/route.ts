import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: View raw biometric logs
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const empCode = searchParams.get('empCode')
    const processed = searchParams.get('processed')
    const siteId = searchParams.get('siteId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = {}
    if (empCode) where.empCode = empCode
    if (processed !== null) where.processed = processed === 'true'
    if (siteId) where.siteId = siteId

    const logs = await db.biometricRawLog.findMany({
      where,
      orderBy: { punchDate: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Error fetching biometric logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
