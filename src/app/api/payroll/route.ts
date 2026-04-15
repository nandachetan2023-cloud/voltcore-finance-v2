import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all payroll runs with items
export async function GET() {
  try {
    const payrollRuns = await db.payrollRun.findMany({
      include: {
        PayrollItem: {
          include: {
            Employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: payrollRuns })
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll records' },
      { status: 500 }
    )
  }
}

// POST: Create payroll run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, month, year, status } = body

    if (!name || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'name, month, and year are required' },
        { status: 400 }
      )
    }

    const payrollRun = await db.payrollRun.create({
      data: {
        name,
        month: parseInt(month),
        year: parseInt(year),
        status: status || 'draft',
      },
    })

    return NextResponse.json({ success: true, data: payrollRun }, { status: 201 })
  } catch (error) {
    console.error('Error creating payroll run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payroll run' },
      { status: 500 }
    )
  }
}

// PUT: Update payroll run by id
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

    const existing = await db.payrollRun.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      )
    }

    const payrollRun = await db.payrollRun.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: payrollRun })
  } catch (error) {
    console.error('Error updating payroll run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll run' },
      { status: 500 }
    )
  }
}

// DELETE: Delete payroll run by id
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

    const existing = await db.payrollRun.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      )
    }

    await db.payrollRun.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting payroll run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete payroll run' },
      { status: 500 }
    )
  }
}
