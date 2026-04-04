import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all departments and designations
export async function GET() {
  try {
    const [departments, designations] = await Promise.all([
      db.department.findMany({ orderBy: { createdAt: 'desc' } }),
      db.designation.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    return NextResponse.json({
      success: true,
      data: { departments, designations },
    })
  } catch (error) {
    console.error('Error fetching organization data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization data' },
      { status: 500 }
    )
  }
}

// POST: Create department or designation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    if (!type || !['department', 'designation'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type is required and must be 'department' or 'designation'" },
        { status: 400 }
      )
    }

    if (!data.name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    let record
    if (type === 'department') {
      record = await db.department.create({ data })
    } else {
      record = await db.designation.create({ data })
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating organization record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create organization record' },
      { status: 500 }
    )
  }
}

// PUT: Update department or designation by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, ...data } = body

    if (!type || !['department', 'designation'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type is required and must be 'department' or 'designation'" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    let existing
    if (type === 'department') {
      existing = await db.department.findUnique({ where: { id } })
    } else {
      existing = await db.designation.findUnique({ where: { id } })
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `${type} not found` },
        { status: 404 }
      )
    }

    let record
    if (type === 'department') {
      record = await db.department.update({ where: { id }, data })
    } else {
      record = await db.designation.update({ where: { id }, data })
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating organization record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update organization record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete department or designation by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id } = body

    if (!type || !['department', 'designation'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type is required and must be 'department' or 'designation'" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    let existing
    if (type === 'department') {
      existing = await db.department.findUnique({ where: { id } })
    } else {
      existing = await db.designation.findUnique({ where: { id } })
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `${type} not found` },
        { status: 404 }
      )
    }

    if (type === 'department') {
      await db.department.delete({ where: { id } })
    } else {
      await db.designation.delete({ where: { id } })
    }

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting organization record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete organization record' },
      { status: 500 }
    )
  }
}
