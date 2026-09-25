import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeReconciled = searchParams.get('includeReconciled') === 'true'
    const pdb = getDbForRequest(request)

    const accounts = await pdb.bankAccount.findMany({
      orderBy: { accountName: 'asc' },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    })

    const data = accounts.map((a) => {
      const unreconciled = a.transactions.filter((t) => !t.reconciled)
      const reconciled = includeReconciled
        ? a.transactions.filter((t) => t.reconciled)
        : []
      const { transactions, ...rest } = a
      return { ...rest, unreconciled, reconciled }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching bank reconciliation:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionId } = body
    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    const record = await pdb.bankTransaction.update({
      where: { id: Number(transactionId) },
      data: { reconciled: true },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error reconciling transaction:', error)
    return NextResponse.json({ success: false, error: 'Failed to reconcile transaction' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionIds } = body
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'transactionIds array is required' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    const result = await pdb.bankTransaction.updateMany({
      where: { id: { in: transactionIds.map(Number) } },
      data: { reconciled: true },
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error batch reconciling:', error)
    return NextResponse.json({ success: false, error: 'Failed to batch reconcile' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')
    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    const record = await pdb.bankTransaction.update({
      where: { id: Number(transactionId) },
      data: { reconciled: false },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error un-reconciling transaction:', error)
    return NextResponse.json({ success: false, error: 'Failed to un-reconcile transaction' }, { status: 500 })
  }
}
