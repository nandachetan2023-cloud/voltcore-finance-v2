import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all payroll with employee name and empId
export async function GET() {
  try {
    const payroll = await db.payroll.findMany({
      include: {
        employee: {
          select: {
            empId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: payroll })
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll records' },
      { status: 500 }
    )
  }
}

// POST: Create payroll record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empId, month, days, basic, hra, ot, gross, pf, esi, tds, netPay, status } = body

    if (!empId || !month || !days || basic === undefined || gross === undefined || netPay === undefined) {
      return NextResponse.json(
        { success: false, error: 'empId, month, days, basic, gross, and netPay are required' },
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

    const record = await db.payroll.create({
      data: {
        empId,
        month,
        days,
        basic,
        hra: hra || 0,
        ot: ot || 0,
        gross,
        pf: pf || 0,
        esi: esi || 0,
        tds: tds || 0,
        netPay,
        status: status || 'Pending',
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating payroll:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payroll record' },
      { status: 500 }
    )
  }
}

// PUT: Update payroll by id
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

    const existing = await db.payroll.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll record not found' },
        { status: 404 }
      )
    }

    const record = await db.payroll.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating payroll:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete payroll by id
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

    const existing = await db.payroll.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll record not found' },
        { status: 404 }
      )
    }

    await db.payroll.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting payroll:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete payroll record' },
      { status: 500 }
    )
  }
}
