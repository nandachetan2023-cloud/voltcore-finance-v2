import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Sync employee isActive based on whether they have an active shift ──
// Called after any shift assignment change.
async function syncEmployeeActiveStatus(db: any, employeeId: number) {
  const now = new Date()
  const activeAssignment = await db.shiftAssignment.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
  })

  const shouldBeActive = !!activeAssignment
  await db.employee.update({
    where: { id: employeeId },
    data: {
      isActive: shouldBeActive,
      // Also update employmentStatus: active ↔ inactive (but don't override notice_period/resigned)
      ...(shouldBeActive
        ? { employmentStatus: 'active' }
        : { employmentStatus: 'inactive' }),
      updatedAt: new Date(),
    },
  })

  return shouldBeActive
}

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
          select: { id: true, employeeCode: true, firstName: true, lastName: true, isActive: true },
        },
        Shift: {
          select: { id: true, name: true, type: true, startTime: true, endTime: true, crossesMidnight: true, graceMinutes: true },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    return NextResponse.json({ success: true, data: assignments })
  } catch (error) {
    console.error('Error fetching shift assignments:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch shift assignments' }, { status: 500 })
  }
}

// POST: Create shift assignment → activates employee
// Supports multiple overlapping shifts — the system picks the closest
// shift to the actual punch-in time during attendance processing.
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { employeeId, shiftId, effectiveFrom, effectiveTo, replaceExisting } = body

    if (!employeeId || !shiftId || !effectiveFrom) {
      return NextResponse.json(
        { success: false, error: 'employeeId, shiftId, and effectiveFrom are required' },
        { status: 400 }
      )
    }

    const employee = await db.employee.findUnique({ where: { id: parseInt(employeeId) } })
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 400 })

    const shift = await db.shift.findUnique({ where: { id: parseInt(shiftId) } })
    if (!shift) return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 400 })

    // Only end existing assignments if explicitly requested (replaceExisting=true).
    // By default, multiple shifts can coexist for the same employee.
    if (replaceExisting) {
      await db.shiftAssignment.updateMany({
        where: {
          employeeId: parseInt(employeeId),
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(effectiveFrom) } }],
        },
        data: { effectiveTo: new Date(effectiveFrom), updatedAt: new Date() },
      })
    }

    // Check if this exact shift is already assigned and active
    const existingDuplicate = await db.shiftAssignment.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        shiftId: parseInt(shiftId),
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
    })
    if (existingDuplicate) {
      return NextResponse.json(
        { success: false, error: `This shift ("${shift.name}") is already assigned to this employee` },
        { status: 409 }
      )
    }

    const assignment = await db.shiftAssignment.create({
      data: {
        employeeId: parseInt(employeeId),
        shiftId: parseInt(shiftId),
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        updatedAt: new Date(),
      },
      include: {
        Employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        Shift: true,
      },
    })

    // Sync employee active status
    const isNowActive = await syncEmployeeActiveStatus(db, parseInt(employeeId))

    return NextResponse.json({ success: true, data: assignment, employeeActivated: isNowActive }, { status: 201 })
  } catch (error) {
    console.error('Error creating shift assignment:', error)
    return NextResponse.json({ success: false, error: 'Failed to create shift assignment' }, { status: 500 })
  }
}

// PUT: Update shift assignment → re-sync employee status
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const assignmentId = parseInt(id.toString())
    if (isNaN(assignmentId)) return NextResponse.json({ success: false, error: 'Invalid id format' }, { status: 400 })

    const existing = await db.shiftAssignment.findUnique({ where: { id: assignmentId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Shift assignment not found' }, { status: 404 })

    const updateData: any = { ...data }
    if (updateData.effectiveFrom) updateData.effectiveFrom = new Date(updateData.effectiveFrom)
    if (updateData.effectiveTo) updateData.effectiveTo = new Date(updateData.effectiveTo)
    if (updateData.employeeId) updateData.employeeId = parseInt(updateData.employeeId)
    if (updateData.shiftId) updateData.shiftId = parseInt(updateData.shiftId)

    const assignment = await db.shiftAssignment.update({
      where: { id: assignmentId },
      data: { ...updateData, updatedAt: new Date() },
    })

    // Re-sync: setting an effectiveTo in the past deactivates the employee
    await syncEmployeeActiveStatus(db, existing.employeeId)

    return NextResponse.json({ success: true, data: assignment })
  } catch (error) {
    console.error('Error updating shift assignment:', error)
    return NextResponse.json({ success: false, error: 'Failed to update shift assignment' }, { status: 500 })
  }
}

// DELETE: Remove shift assignment → deactivates employee if no other active shift
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body

    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const assignmentId = parseInt(id.toString())
    if (isNaN(assignmentId)) return NextResponse.json({ success: false, error: 'Invalid id format' }, { status: 400 })

    const existing = await db.shiftAssignment.findUnique({ where: { id: assignmentId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Shift assignment not found' }, { status: 404 })

    await db.shiftAssignment.delete({ where: { id: assignmentId } })

    // Sync: if no other active shift, deactivate employee
    const isNowActive = await syncEmployeeActiveStatus(db, existing.employeeId)

    return NextResponse.json({ success: true, data: { id: assignmentId }, employeeDeactivated: !isNowActive })
  } catch (error) {
    console.error('Error deleting shift assignment:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete shift assignment' }, { status: 500 })
  }
}
