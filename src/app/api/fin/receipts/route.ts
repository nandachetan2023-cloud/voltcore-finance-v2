import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function nextReceiptNo(pdb: any): Promise<string> {
  const year = new Date().getFullYear()
  const last = await pdb.finReceipt.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  })
  const seq = (last ? last.id : 0) + 1
  return `RCT-${year}-${String(seq).padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finReceipt.findMany({ orderBy: { receiptDate: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch receipts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const receiptNo = await nextReceiptNo(pdb)
    const record = await pdb.finReceipt.create({
      data: {
        receiptNo,
        receiptDate: new Date(body.receiptDate || new Date()),
        partyName: String(body.partyName || '').trim(),
        invoiceRef: body.invoiceRef || null,
        amount: Number(body.amount) || 0,
        mode: body.mode || 'NEFT',
        bankRef: body.bankRef || null,
        jobCode: body.jobCode || null,
        siteCode: body.siteCode || null,
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating receipt:', error)
    return NextResponse.json({ success: false, error: 'Failed to create receipt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finReceipt.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete receipt' }, { status: 500 })
  }
}
