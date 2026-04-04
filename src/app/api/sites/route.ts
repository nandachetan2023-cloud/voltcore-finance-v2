import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all sites
export async function GET() {
  try {
    const sites = await db.site.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: sites })
  } catch (error) {
    console.error('Error fetching sites:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}

// POST: Create site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, state, project, manpower, incharge, status } = body

    if (!name || !state || !project || !incharge) {
      return NextResponse.json(
        { success: false, error: 'name, state, project, and incharge are required' },
        { status: 400 }
      )
    }

    const site = await db.site.create({
      data: {
        name,
        state,
        project,
        manpower: manpower || 0,
        incharge,
        status: status || 'Active',
      },
    })

    return NextResponse.json({ success: true, data: site }, { status: 201 })
  } catch (error) {
    console.error('Error creating site:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create site' },
      { status: 500 }
    )
  }
}

// PUT: Update site by id
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

    const existing = await db.site.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      )
    }

    const site = await db.site.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: site })
  } catch (error) {
    console.error('Error updating site:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update site' },
      { status: 500 }
    )
  }
}

// DELETE: Delete site by id
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

    const existing = await db.site.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      )
    }

    await db.site.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting site:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete site' },
      { status: 500 }
    )
  }
}
