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
    const { type, transactionType, accountType, ...data } = body
    if (type === 'account') {
      const record = await pdb.bankAccount.create({ data: { ...data, type: accountType } })
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    } else {
      const record = await pdb.bankTransaction.create({ data: { ...data, type: transactionType } })
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating bank record:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { type, id, transactionType, accountType, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    if (type === 'account') {
      const record = await pdb.bankAccount.update({ where: { id }, data: { ...data, type: accountType } })
      return NextResponse.json({ success: true, data: record })
    } else {
      const record = await pdb.bankTransaction.update({ where: { id }, data: { ...data, type: transactionType } })
      return NextResponse.json({ success: true, data: record })
    }
  } catch (error) {
    console.error('Error updating bank record:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = Number(searchParams.get('id'))
    if (!type || !id) return NextResponse.json({ success: false, error: 'type and id are required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (type === 'account') {
      await pdb.bankAccount.delete({ where: { id } })
    } else {
      await pdb.bankTransaction.delete({ where: { id } })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bank record:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
