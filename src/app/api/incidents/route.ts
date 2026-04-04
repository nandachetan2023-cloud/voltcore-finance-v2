import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all incidents
export async function GET() {
  try {
    const incidents = await db.incident.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: incidents })
  } catch (error) {
    console.error('Error fetching incidents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch incidents' },
      { status: 500 }
    )
  }
}

// POST: Create incident (auto-generate refNo: INC-XXX format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, site, type, severity, person, status, description, action } = body

    if (!date || !site || !type || !severity || !person) {
      return NextResponse.json(
        { success: false, error: 'date, site, type, severity, and person are required' },
        { status: 400 }
      )
    }

    // Auto-generate refNo: INC-001, INC-002, etc.
    const count = await db.incident.count()
    const refNo = `INC-${String(count + 1).padStart(3, '0')}`

    const incident = await db.incident.create({
      data: {
        refNo,
        date,
        site,
        type,
        severity,
        person,
        status: status || 'Investigating',
        description: description || null,
        action: action || null,
      },
    })

    return NextResponse.json({ success: true, data: incident }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An incident with this refNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create incident' },
      { status: 500 }
    )
  }
}

// PUT: Update incident by id
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

    const existing = await db.incident.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      )
    }

    const incident = await db.incident.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: incident })
  } catch (error) {
    console.error('Error updating incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update incident' },
      { status: 500 }
    )
  }
}

// DELETE: Delete incident by id
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

    const existing = await db.incident.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      )
    }

    await db.incident.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete incident' },
      { status: 500 }
    )
  }
}
