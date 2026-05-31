import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.accountsReceivable.findMany({ orderBy: { dueDate: 'asc' } })
    const { searchParams } = new URL(request.url)
    if (searchParams.get('format') === 'csv') {
      const header = 'Client,InvoiceNo,Amount,DueDate,Status,Description'
      const rows = records.map(r => `"${r.client}","${r.invoiceNo}",${r.totalAmount},${r.dueDate.toISOString().split('T')[0]},${r.status},"${r.description || ''}"`)
      return new Response([header, ...rows].join('\n'), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=accounts-receivable.csv' },
      })
    }
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching AR:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const record = await pdb.accountsReceivable.create({ data: body })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.accountsReceivable.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.accountsReceivable.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
