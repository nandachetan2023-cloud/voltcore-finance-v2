import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all subcontractors
export async function GET() {
  try {
    const subcontractors = await db.subcontractor.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: subcontractors })
  } catch (error) {
    console.error('Error fetching subcontractors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subcontractors' },
      { status: 500 }
    )
  }
}

// POST: Create subcontractor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, trade, workers, site, pfReg, esiReg, labourLic, compliance } = body

    if (!name || !trade || !site) {
      return NextResponse.json(
        { success: false, error: 'name, trade, and site are required' },
        { status: 400 }
      )
    }

    const subcontractor = await db.subcontractor.create({
      data: {
        name,
        trade,
        workers: workers || 0,
        site,
        pfReg: pfReg || 'Pending',
        esiReg: esiReg || 'Pending',
        labourLic: labourLic || 'Pending',
        compliance: compliance || 'Non-Compliant',
      },
    })

    return NextResponse.json({ success: true, data: subcontractor }, { status: 201 })
  } catch (error) {
    console.error('Error creating subcontractor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create subcontractor' },
      { status: 500 }
    )
  }
}

// PUT: Update subcontractor by id
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

    const existing = await db.subcontractor.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Subcontractor not found' },
        { status: 404 }
      )
    }

    const subcontractor = await db.subcontractor.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: subcontractor })
  } catch (error) {
    console.error('Error updating subcontractor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update subcontractor' },
      { status: 500 }
    )
  }
}

// DELETE: Delete subcontractor by id
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

    const existing = await db.subcontractor.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Subcontractor not found' },
        { status: 404 }
      )
    }

    await db.subcontractor.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting subcontractor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete subcontractor' },
      { status: 500 }
    )
  }
}
