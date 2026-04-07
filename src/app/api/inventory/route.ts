import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all inventory items and stock movements
export async function GET() {
  try {
    const [items, movements] = await Promise.all([
      db.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } }),
      db.stockMovement.findMany({ orderBy: { date: 'desc' } }),
    ])

    return NextResponse.json({
      success: true,
      data: { items, movements },
    })
  } catch (error) {
    console.error('Error fetching inventory data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory data' },
      { status: 500 }
    )
  }
}

// POST: Create inventory item or stock movement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordType, ...data } = body

    if (!recordType || !['item', 'movement'].includes(recordType)) {
      return NextResponse.json(
        { success: false, error: "recordType is required and must be 'item' or 'movement'" },
        { status: 400 }
      )
    }

    if (recordType === 'item') {
      if (!data.name || !data.itemCode) {
        return NextResponse.json(
          { success: false, error: 'itemCode and name are required for inventory item' },
          { status: 400 }
        )
      }
      const record = await db.inventoryItem.create({ data })
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    } else {
      if (!data.itemCode || !data.type || !data.quantity) {
        return NextResponse.json(
          { success: false, error: 'itemCode, type, and quantity are required for stock movement' },
          { status: 400 }
        )
      }
      const record = await db.stockMovement.create({ data })
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating inventory record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create inventory record' },
      { status: 500 }
    )
  }
}

// PUT: Update inventory item by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordType, id, ...data } = body

    if (!recordType || !['item'].includes(recordType)) {
      return NextResponse.json(
        { success: false, error: "Only 'item' recordType can be updated" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.inventoryItem.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    const record = await db.inventoryItem.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating inventory record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete inventory item by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordType, id } = body

    if (!recordType || !['item'].includes(recordType)) {
      return NextResponse.json(
        { success: false, error: "Only 'item' recordType can be deleted" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.inventoryItem.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    await db.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting inventory record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete inventory record' },
      { status: 500 }
    )
  }
}
