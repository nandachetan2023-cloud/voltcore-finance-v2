import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all items and stock ledger
export async function GET() {
  try {
    const [items, stockLedger] = await Promise.all([
      db.item.findMany({
        include: {
          category: true,
          uom: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.stockLedger.findMany({
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { postingDate: 'desc' },
        take: 50,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { items, stockLedger },
    })
  } catch (error) {
    console.error('Error fetching inventory data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory data' },
      { status: 500 }
    )
  }
}

// POST: Create item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, name, categoryId, uomId, costPrice, sellingPrice } = body

    if (!sku || !name || !uomId) {
      return NextResponse.json(
        { success: false, error: 'sku, name, and uomId are required' },
        { status: 400 }
      )
    }

    const record = await db.item.create({
      data: {
        sku,
        name,
        categoryId: categoryId ? parseInt(categoryId) : null,
        uomId: parseInt(uomId),
        costPrice: costPrice || 0,
        sellingPrice: sellingPrice || 0,
      },
      include: {
        category: true,
        uom: true,
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create item' },
      { status: 500 }
    )
  }
}

// PUT: Update item by id
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

    const existing = await db.item.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const record = await db.item.update({
      where: { id },
      data,
      include: {
        category: true,
        uom: true,
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

// DELETE: Delete item by id
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

    const existing = await db.item.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    await db.item.delete({ where: { id } })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}
