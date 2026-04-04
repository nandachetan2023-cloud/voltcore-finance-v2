import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all ledger accounts
export async function GET() {
  try {
    const accounts = await db.ledgerAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Error fetching ledger accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ledger accounts' },
      { status: 500 }
    )
  }
}

// POST: Create ledger account (auto-generate accountCode: ACC-001 format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, group, type, balance, status } = body

    if (!name || !group || !type) {
      return NextResponse.json(
        { success: false, error: 'name, group, and type are required' },
        { status: 400 }
      )
    }

    // Auto-generate accountCode: ACC-001, ACC-002, etc.
    const count = await db.ledgerAccount.count()
    const accountCode = `ACC-${String(count + 1).padStart(3, '0')}`

    const account = await db.ledgerAccount.create({
      data: {
        accountCode,
        name,
        group,
        type,
        balance: parseFloat(balance) || 0,
        status: status || 'Active',
      },
    })

    return NextResponse.json({ success: true, data: account }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An account with this code already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating ledger account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create ledger account' },
      { status: 500 }
    )
  }
}

// PUT: Update ledger account by id
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

    // Convert balance to number if provided
    if (data.balance !== undefined) {
      data.balance = parseFloat(data.balance) || 0
    }

    const existing = await db.ledgerAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Ledger account not found' },
        { status: 404 }
      )
    }

    const account = await db.ledgerAccount.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('Error updating ledger account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update ledger account' },
      { status: 500 }
    )
  }
}

// DELETE: Delete ledger account by id
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

    const existing = await db.ledgerAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Ledger account not found' },
        { status: 404 }
      )
    }

    await db.ledgerAccount.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting ledger account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete ledger account' },
      { status: 500 }
    )
  }
}
