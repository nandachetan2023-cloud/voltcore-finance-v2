import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// NOTE: Project models don't exist in current schema
// Returning empty data until models are added

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Projects module not yet implemented in database schema',
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'Projects module not yet implemented in database schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'Projects module not yet implemented in database schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'Projects module not yet implemented in database schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
