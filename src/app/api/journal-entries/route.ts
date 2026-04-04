import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all journal entries ordered by date desc
export async function GET() {
  try {
    const entries = await db.journalEntry.findMany({
      orderBy: { date: 'desc' },
    })
    return NextResponse.json({ success: true, data: entries })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch journal entries' },
      { status: 500 }
    )
  }
}

// POST: Create journal entry (auto-generate entryNo: JE-001 format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, account, debit, credit, description, reference, status } = body

    if (!date || !account) {
      return NextResponse.json(
        { success: false, error: 'date and account are required' },
        { status: 400 }
      )
    }

    if ((debit === 0 || debit === undefined) && (credit === 0 || credit === undefined)) {
      return NextResponse.json(
        { success: false, error: 'At least one of debit or credit must be non-zero' },
        { status: 400 }
      )
    }

    // Auto-generate entryNo: JE-001, JE-002, etc.
    const count = await db.journalEntry.count()
    const entryNo = `JE-${String(count + 1).padStart(3, '0')}`

    const entry = await db.journalEntry.create({
      data: {
        entryNo,
        date,
        account,
        debit: parseFloat(debit) || 0,
        credit: parseFloat(credit) || 0,
        description: description || null,
        reference: reference || null,
        status: status || 'Posted',
      },
    })

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A journal entry with this entryNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating journal entry:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create journal entry' },
      { status: 500 }
    )
  }
}

// PUT: Update journal entry by id
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

    const existing = await db.journalEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    const updated = await db.journalEntry.update({
      where: { id },
      data: {
        ...data,
        debit: data.debit !== undefined ? parseFloat(data.debit) : undefined,
        credit: data.credit !== undefined ? parseFloat(data.credit) : undefined,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating journal entry:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update journal entry' },
      { status: 500 }
    )
  }
}

// DELETE: Delete journal entry by id
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

    const existing = await db.journalEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    await db.journalEntry.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete journal entry' },
      { status: 500 }
    )
  }
}
