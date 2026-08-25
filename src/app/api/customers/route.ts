import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const records = await db.customer.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const record = await db.customer.create({ data: body })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ success: false, error: 'Failed to create customer' }, { status: 500 })
  }
}
