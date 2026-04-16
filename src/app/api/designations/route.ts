import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all designations
export async function GET() {
  try {
    const designations = await db.designation.findMany({
      include: {
        _count: {
          select: {
            Employee: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: designations,
    })
  } catch (error) {
    console.error('Error fetching designations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch designations' },
      { status: 500 }
    )
  }
}

// POST: Create designation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const designation = await db.designation.create({
      data: {
        name,
      },
    })

    return NextResponse.json({ success: true, data: designation }, { status: 201 })
  } catch (error) {
    console.error('Error creating designation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create designation' },
      { status: 500 }
    )
  }
}

// PUT: Update designation by id
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

    const existing = await db.designation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      )
    }

    const designation = await db.designation.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: designation })
  } catch (error) {
    console.error('Error updating designation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update designation' },
      { status: 500 }
    )
  }
}

// DELETE: Delete designation by id
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

    const existing = await db.designation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      )
    }

    // Check if designation has employees
    const employeeCount = await db.employee.count({
      where: { 
        designationId: id,
        isDeleted: false,
      },
    })

    if (employeeCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete designation with ${employeeCount} active employee(s)` },
        { status: 400 }
      )
    }

    await db.designation.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting designation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete designation' },
      { status: 500 }
    )
  }
}
