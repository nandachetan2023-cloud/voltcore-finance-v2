import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Fetch open job postings visible to all employees
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const openings = await db.jobOpening.findMany({
      where: { status: 'Open' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        position: true,
        site: true,
        openings: true,
        applications: true,
        priority: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: openings })
  } catch (error) {
    console.error('Error fetching open positions:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch openings' }, { status: 500 })
  }
}
