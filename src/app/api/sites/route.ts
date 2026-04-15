import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// NOTE: Site model doesn't exist in current schema
// Using Branch model as alternative or returning empty data

// GET: List all sites (using Branch as alternative)
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Site module not yet implemented. Use /api/organization for branches.',
    })
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
    return NextResponse.json(
      { success: false, error: 'Site module not yet implemented. Use /api/organization for branches.' },
      { status: 501 }
    )
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
    return NextResponse.json(
      { success: false, error: 'Site module not yet implemented. Use /api/organization for branches.' },
      { status: 501 }
    )
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
    return NextResponse.json(
      { success: false, error: 'Site module not yet implemented. Use /api/organization for branches.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error deleting site:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete site' },
      { status: 500 }
    )
  }
}
