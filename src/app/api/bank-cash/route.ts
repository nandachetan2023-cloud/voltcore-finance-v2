import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET: List all bank accounts
export async function GET() {
  try {
    const accounts = await db.bankAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bank accounts' },
      { status: 500 }
    )
  }
}

// POST: Create bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountName, bankName, accountNo, type, balance, status } = body

    if (!accountName || !bankName || !accountNo) {
      return NextResponse.json(
        { success: false, error: 'accountName, bankName, and accountNo are required' },
        { status: 400 }
      )
    }

    const account = await db.bankAccount.create({
      data: {
        accountName,
        bankName,
        accountNo,
        type: type || 'Current',
        balance: parseFloat(balance) || 0,
        status: status || 'Active',
      },
    })

    return NextResponse.json({ success: true, data: account }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An account with this accountNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating bank account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create bank account' },
      { status: 500 }
    )
  }
}

// PUT: Update bank account by id
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

    const existing = await db.bankAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      )
    }

    const updated = await db.bankAccount.update({
      where: { id },
      data: {
        ...data,
        balance: data.balance !== undefined ? parseFloat(data.balance) : undefined,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An account with this accountNo already exists' },
        { status: 409 }
      )
    }
    console.error('Error updating bank account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update bank account' },
      { status: 500 }
    )
  }
}

// DELETE: Delete bank account by id
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

    const existing = await db.bankAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      )
    }

    await db.bankAccount.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting bank account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete bank account' },
      { status: 500 }
    )
  }
}
