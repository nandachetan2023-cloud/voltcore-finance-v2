import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await db.item.findMany({
      orderBy: { name: 'asc' },
      where: { isDeleted: false, isActive: true },
    })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 })
  }
}
