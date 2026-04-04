import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ success: true, data: invoices })
  } catch (error) {
    console.error('[API /invoices GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}
