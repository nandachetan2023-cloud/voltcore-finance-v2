import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all shift assignments
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const shiftId = searchParams.get('shiftId')
    const active = searchParams.get('active') === 'true'

    const where: any = {}
    if (employeeId) where.employeeId = parseInt(employeeId)
    if (shiftId) where.shiftId = parseInt(shiftId)
    
    // Filter for active assignments (no end date or end date in future)
    if (active) {
      where.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ]
    }

    const assignments = await db.shiftAssignment.findMany({
      where,
      include: {
        Employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
        Shift: {
          select: {
            id: true,
            name: true,
            type: true,
            startTime: true,
            endTime: true,
            crossesMidnight: true,
            graceMinutes: true,
          },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    return NextResponse.json({ success: true, data: assignments })
  } catch (error) {
    console.error('Error fetching shift assignments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shift assignments' },
      { status: 500 }
    )
  }
}

// POST: Create shift assignment
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { employeeId, shiftId, effectiveFrom, effectiveTo } = body

    if (!employeeId || !shiftId || !effectiveFrom) {
      return NextResponse.json(
        { success: false, error: 'employeeId, shiftId, and effectiveFrom are required' },
        { status: 400 }
      )
    }

    // Validate employee exists
    const employee = await db.employee.findUnique({ where: { id: parseInt(employeeId) } })
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 400 }
      )
    }

    // Validate shift exists
    const shift = await db.shift.findUnique({ where: { id: parseInt(shiftId) } })
    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 400 }
      )
    }

    // End any existing active assignments for this employee
    await db.shiftAssignment.updateMany({
      where: {
        employeeId: parseInt(employeeId),
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(effectiveFrom) } },
        ],
      },
      data: {
        effectiveTo: new Date(effectiveFrom),
        updatedAt: new Date(),
      },
    })

    // Create new assignment
    const assignment = await db.shiftAssignment.create({
      data: {
        employeeId: parseInt(employeeId),
        shiftId: parseInt(shiftId),
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        updatedAt: new Date(),
      },
      include: {
        Employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
        Shift: true,
      },
    })

    return NextResponse.json({ success: true, data: assignment }, { status: 201 })
  } catch (error) {
    console.error('Error creating shift assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shift assignment' },
      { status: 500 }
    )
  }
}

// PUT: Update shift assignment
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const assignmentId = parseInt(id.toString())
    if (isNaN(assignmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id format' },
        { status: 400 }
      )
    }

    const existing = await db.shiftAssignment.findUnique({ where: { id: assignmentId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Shift assignment not found' },
        { status: 404 }
      )
    }

    const updateData: any = { ...data }
    if (updateData.effectiveFrom) updateData.effectiveFrom = new Date(updateData.effectiveFrom)
    if (updateData.effectiveTo) updateData.effectiveTo = new Date(updateData.effectiveTo)
    if (updateData.employeeId) updateData.employeeId = parseInt(updateData.employeeId)
    if (updateData.shiftId) updateData.shiftId = parseInt(updateData.shiftId)

    const assignment = await db.shiftAssignment.update({
      where: { id: assignmentId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: assignment })
  } catch (error) {
    console.error('Error updating shift assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update shift assignment' },
      { status: 500 }
    )
  }
}

// DELETE: Delete shift assignment
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const assignmentId = parseInt(id.toString())
    if (isNaN(assignmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id format' },
        { status: 400 }
      )
    }

    const existing = await db.shiftAssignment.findUnique({ where: { id: assignmentId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Shift assignment not found' },
        { status: 404 }
      )
    }

    await db.shiftAssignment.delete({ where: { id: assignmentId } })

    return NextResponse.json({ success: true, data: { id: assignmentId } })
  } catch (error) {
    console.error('Error deleting shift assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete shift assignment' },
      { status: 500 }
    )
  }
}
