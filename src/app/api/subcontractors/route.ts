import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const subcontractors = await db.subcontractor.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: subcontractors })
  } catch (error) {
    console.error('[API /subcontractors GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subcontractors' },
      { status: 500 }
    )
  }
}
