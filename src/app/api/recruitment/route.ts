import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all job openings
export async function GET() {
  try {
    const openings = await db.jobOpening.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: openings })
  } catch (error) {
    console.error('Error fetching job openings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job openings' },
      { status: 500 }
    )
  }
}

// POST: Create job opening
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { position, site, openings, applications, priority, status } = body

    if (!position || !site || !openings || !priority) {
      return NextResponse.json(
        { success: false, error: 'position, site, openings, and priority are required' },
        { status: 400 }
      )
    }

    const jobOpening = await db.jobOpening.create({
      data: {
        position,
        site,
        openings,
        applications: applications || 0,
        priority,
        status: status || 'Open',
      },
    })

    return NextResponse.json({ success: true, data: jobOpening }, { status: 201 })
  } catch (error) {
    console.error('Error creating job opening:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create job opening' },
      { status: 500 }
    )
  }
}

// PUT: Update job opening by id
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

    const existing = await db.jobOpening.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Job opening not found' },
        { status: 404 }
      )
    }

    const jobOpening = await db.jobOpening.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: jobOpening })
  } catch (error) {
    console.error('Error updating job opening:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update job opening' },
      { status: 500 }
    )
  }
}

// DELETE: Delete job opening by id
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

    const existing = await db.jobOpening.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Job opening not found' },
        { status: 404 }
      )
    }

    await db.jobOpening.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting job opening:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete job opening' },
      { status: 500 }
    )
  }
}
