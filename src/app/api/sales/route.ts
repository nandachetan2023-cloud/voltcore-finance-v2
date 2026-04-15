import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all customers and sales orders
export async function GET() {
  try {
    const [customers, orders] = await Promise.all([
      db.customer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.salesOrder.findMany({
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { customers, orders },
    })
  } catch (error) {
    console.error('Error fetching sales data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales data' },
      { status: 500 }
    )
  }
}

// POST: Create customer or sales order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    if (!type || !['customer', 'order'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type is required and must be 'customer' or 'order'" },
        { status: 400 }
      )
    }

    if (type === 'customer') {
      if (!data.name) {
        return NextResponse.json(
          { success: false, error: 'name is required for customer' },
          { status: 400 }
        )
      }

      const record = await db.customer.create({
        data: {
          name: data.name,
          contactPerson: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
        },
      })

      return NextResponse.json({ success: true, data: record }, { status: 201 })
    } else {
      if (!data.customerId || !data.soNo || !data.soDate || !data.totalAmount) {
        return NextResponse.json(
          { success: false, error: 'customerId, soNo, soDate, and totalAmount are required for sales order' },
          { status: 400 }
        )
      }

      const record = await db.salesOrder.create({
        data: {
          soNo: data.soNo,
          soDate: new Date(data.soDate),
          customerId: parseInt(data.customerId),
          status: data.status || 'draft',
          totalAmount: parseFloat(data.totalAmount),
        },
        include: {
          customer: true,
        },
      })

      return NextResponse.json({ success: true, data: record }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating sales record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create sales record' },
      { status: 500 }
    )
  }
}

// PUT: Update customer or sales order by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, ...data } = body

    if (!type || !['customer', 'order'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type is required and must be 'customer' or 'order'" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    if (type === 'customer') {
      const existing = await db.customer.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
      }

      const record = await db.customer.update({ where: { id }, data })
      return NextResponse.json({ success: true, data: record })
    } else {
      const existing = await db.salesOrder.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Sales order not found' }, { status: 404 })
      }

      const updateData: any = { ...data }
      if (updateData.soDate) updateData.soDate = new Date(updateData.soDate)
      if (updateData.totalAmount) updateData.totalAmount = parseFloat(updateData.totalAmount)

      const record = await db.salesOrder.update({ where: { id }, data: updateData })
      return NextResponse.json({ success: true, data: record })
    }
  } catch (error) {
    console.error('Error updating sales record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update sales record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete customer or sales order by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id } = body

    if (!type || !['customer', 'order'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type is required and must be 'customer' or 'order'" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    if (type === 'customer') {
      const existing = await db.customer.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
      }
      await db.customer.delete({ where: { id } })
    } else {
      const existing = await db.salesOrder.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Sales order not found' }, { status: 404 })
      }
      await db.salesOrder.delete({ where: { id } })
    }

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting sales record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales record' },
      { status: 500 }
    )
  }
}
