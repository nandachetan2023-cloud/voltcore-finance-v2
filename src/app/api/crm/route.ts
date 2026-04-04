import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all CRM contacts
export async function GET() {
  try {
    const contacts = await db.crmContact.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { contacts } })
  } catch (error) {
    console.error('Error fetching CRM contacts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CRM contacts' },
      { status: 500 }
    )
  }
}

// POST: Create CRM contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const contact = await db.crmContact.create({
      data: body,
    })

    return NextResponse.json({ success: true, data: contact }, { status: 201 })
  } catch (error) {
    console.error('Error creating CRM contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create CRM contact' },
      { status: 500 }
    )
  }
}

// PUT: Update CRM contact by id
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

    const existing = await db.crmContact.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'CRM contact not found' },
        { status: 404 }
      )
    }

    const contact = await db.crmContact.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    console.error('Error updating CRM contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update CRM contact' },
      { status: 500 }
    )
  }
}

// DELETE: Delete CRM contact by id
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

    const existing = await db.crmContact.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'CRM contact not found' },
        { status: 404 }
      )
    }

    await db.crmContact.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting CRM contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete CRM contact' },
      { status: 500 }
    )
  }
}
