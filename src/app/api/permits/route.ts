import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all permits
export async function GET() {
  try {
    const permits = await db.workPermit.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: permits })
  } catch (error) {
    console.error('Error fetching permits:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permits' },
      { status: 500 }
    )
  }
}

// POST: Create permit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { permitNo, type, location, issuedTo, expiry, status, description, precautions } = body

    if (!permitNo || !type || !location || !issuedTo) {
      return NextResponse.json(
        { success: false, error: 'permitNo, type, location, and issuedTo are required' },
        { status: 400 }
      )
    }

    const permit = await db.workPermit.create({
      data: {
        permitNo,
        type,
        location,
        issuedTo,
        expiry: expiry || '',
        status: status || 'Active',
        description: description || null,
        precautions: precautions || null,
      },
    })

    return NextResponse.json({ success: true, data: permit }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A permit with this permitNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating permit:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create permit' },
      { status: 500 }
    )
  }
}

// PUT: Update permit by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.workPermit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Permit not found' },
        { status: 404 }
      )
    }

    const permit = await db.workPermit.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: permit })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A permit with this permitNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error updating permit:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update permit' },
      { status: 500 }
    )
  }
}

// DELETE: Delete permit by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.workPermit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Permit not found' },
        { status: 404 }
      )
    }

    await db.workPermit.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting permit:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete permit' },
      { status: 500 }
    )
  }
}
