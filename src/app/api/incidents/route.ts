import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const incidents = await db.incident.findMany({
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ success: true, data: incidents })
  } catch (error) {
    console.error('[API /incidents GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch incidents' },
      { status: 500 }
    )
  }
}
