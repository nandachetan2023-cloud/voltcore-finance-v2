import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all expenses with employee name
export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      include: {
        employee: {
          select: {
            name: true,
            empId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: expenses })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST: Create expense (auto-generate claimNo: EXP-XXXX format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empId, category, amount, project, date, status } = body

    if (!empId || !category || !amount || !project || !date) {
      return NextResponse.json(
        { success: false, error: 'empId, category, amount, project, and date are required' },
        { status: 400 }
      )
    }

    // Check if employee exists
    const employee = await db.employee.findUnique({ where: { id: empId } })
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 400 }
      )
    }

    // Auto-generate claimNo: EXP-0001, EXP-0002, etc.
    const count = await db.expense.count()
    const claimNo = `EXP-${String(count + 1).padStart(4, '0')}`

    const expense = await db.expense.create({
      data: {
        claimNo,
        empId,
        category,
        amount,
        project,
        date,
        status: status || 'Pending',
      },
    })

    return NextResponse.json({ success: true, data: expense }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An expense with this claimNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}

// PATCH: Update expense status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      )
    }

    const expense = await db.expense.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: expense })
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE: Delete expense by id
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

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      )
    }

    await db.expense.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
