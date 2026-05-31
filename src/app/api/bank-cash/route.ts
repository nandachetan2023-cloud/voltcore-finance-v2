import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const accounts = await pdb.bankAccount.findMany({ orderBy: { accountName: 'asc' } })
    const transactions = await pdb.bankTransaction.findMany({ orderBy: { date: 'desc' } })
    return NextResponse.json({ success: true, data: { accounts, transactions } })
  } catch (error) {
    console.error('Error fetching bank data:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { type, ...data } = body
    if (type === 'account') {
      const record = await pdb.bankAccount.create({ data })
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    } else {
      const record = await pdb.bankTransaction.create({ data })
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating bank record:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}
