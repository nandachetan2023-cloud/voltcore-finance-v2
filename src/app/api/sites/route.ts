import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sites = await db.site.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: sites })
  } catch (error) {
    console.error('[API /sites GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}
