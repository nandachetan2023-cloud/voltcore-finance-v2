import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const permits = await db.workPermit.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: permits })
  } catch (error) {
    console.error('[API /permits GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch work permits' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      permitNo,
      type,
      location,
      issuedTo,
      expiry,
      status = 'Active',
      description,
      precautions,
    } = body

    if (!permitNo || !type || !location || !issuedTo || !expiry) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: permitNo, type, location, issuedTo, expiry',
        },
        { status: 400 }
      )
    }

    const permit = await db.workPermit.create({
      data: {
        permitNo,
        type,
        location,
        issuedTo,
        expiry,
        status,
        description: description || null,
        precautions: precautions || null,
      },
    })

    return NextResponse.json({ success: true, data: permit }, { status: 201 })
  } catch (error: unknown) {
    console.error('[API /permits POST] Error:', error)
    const message =
      error instanceof Error && error.message.includes('Unique')
        ? 'Permit number already exists'
        : 'Failed to create work permit'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
