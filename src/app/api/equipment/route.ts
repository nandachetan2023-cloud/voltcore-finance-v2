import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all equipment
export async function GET() {
  try {
    const equipment = await db.equipment.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: equipment })
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}

// POST: Create equipment (auto-generate eqId: EQ-XX-XXX format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, site, status, lastPM, nextPM, issue, downSince, etaRepair, assignedTo, utilization } = body

    if (!name || !site) {
      return NextResponse.json(
        { success: false, error: 'name and site are required' },
        { status: 400 }
      )
    }

    // Auto-generate eqId: EQ-01-001, EQ-01-002, etc.
    const count = await db.equipment.count()
    const eqId = `EQ-${String(Math.floor(count / 100) + 1).padStart(2, '0')}-${String((count % 100) + 1).padStart(3, '0')}`

    const equip = await db.equipment.create({
      data: {
        name,
        eqId,
        site,
        status: status || 'Operational',
        lastPM: lastPM || null,
        nextPM: nextPM || null,
        issue: issue || null,
        downSince: downSince || null,
        etaRepair: etaRepair || null,
        assignedTo: assignedTo || null,
        utilization: utilization || 0,
      },
    })

    return NextResponse.json({ success: true, data: equip }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Equipment with this eqId already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating equipment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create equipment' },
      { status: 500 }
    )
  }
}

// PUT: Update equipment by id
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

    const existing = await db.equipment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      )
    }

    const equip = await db.equipment.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: equip })
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update equipment' },
      { status: 500 }
    )
  }
}

// DELETE: Delete equipment by id
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

    const existing = await db.equipment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      )
    }

    await db.equipment.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete equipment' },
      { status: 500 }
    )
  }
}
