import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all support tickets
export async function GET() {
  try {
    const tickets = await db.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { tickets } })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

// POST: Create support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title || !body.description) {
      return NextResponse.json(
        { success: false, error: 'title and description are required' },
        { status: 400 }
      )
    }

    // Auto-generate ticket number: TKT-XXX
    const count = await db.supportTicket.count()
    const ticketNo = `TKT-${String(count + 1).padStart(3, '0')}`

    const ticket = await db.supportTicket.create({
      data: {
        ...body,
        ticketNo,
        status: body.status || 'Open',
      },
    })

    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}

// PUT: Update support ticket by id
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

    const existing = await db.supportTicket.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Support ticket not found' },
        { status: 404 }
      )
    }

    const ticket = await db.supportTicket.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update support ticket' },
      { status: 500 }
    )
  }
}

// PATCH: Update support ticket status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }

    const existing = await db.supportTicket.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Support ticket not found' },
        { status: 404 }
      )
    }

    const ticket = await db.supportTicket.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('Error updating support ticket status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update support ticket status' },
      { status: 500 }
    )
  }
}

// DELETE: Delete support ticket by id
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

    const existing = await db.supportTicket.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Support ticket not found' },
        { status: 404 }
      )
    }

    await db.supportTicket.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting support ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete support ticket' },
      { status: 500 }
    )
  }
}
