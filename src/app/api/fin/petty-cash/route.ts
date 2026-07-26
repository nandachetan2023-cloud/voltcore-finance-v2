import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finPettyCash.findMany({
      orderBy: { date: 'desc' },
      include: {
        party: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, totalAmount: true } },
        expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
      },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const last = await pdb.finPettyCash.findFirst({ orderBy: { id: 'desc' } })
    const lastBalance = last?.balance ?? 0
    const delta = body.type === 'Credit' ? Number(body.amount) || 0 : -(Number(body.amount) || 0)

    const record = await pdb.finPettyCash.create({
      data: {
        voucherNo: body.voucherNo,
        date: new Date(body.date),
        description: body.description,
        amount: Number(body.amount),
        type: body.type || 'Debit',
        category: body.category || null,
        partyId: body.partyId ? Number(body.partyId) : null,
        siteId: body.siteId ? Number(body.siteId) : null,
        poId: body.poId ? Number(body.poId) : null,
        expenseClaimId: body.expenseClaimId ? Number(body.expenseClaimId) : null,
        linkedType: body.linkedType || 'Direct',
        authorizedBy: body.authorizedBy || null,
        paymentMode: body.paymentMode || 'Cash',
        balance: lastBalance + delta,
        referenceNo: body.referenceNo || null,
        remarks: body.remarks || null,
        billAttachmentPath: body.billAttachmentPath || null,
      },
      include: {
        party: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, totalAmount: true } },
        expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)

    const updateData: any = {}
    if (data.voucherNo !== undefined) updateData.voucherNo = data.voucherNo
    if (data.date !== undefined) updateData.date = new Date(data.date)
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = Number(data.amount)
    if (data.type !== undefined) updateData.type = data.type
    if (data.category !== undefined) updateData.category = data.category
    if (data.partyId !== undefined) updateData.partyId = data.partyId ? Number(data.partyId) : null
    if (data.siteId !== undefined) updateData.siteId = data.siteId ? Number(data.siteId) : null
    if (data.poId !== undefined) updateData.poId = data.poId ? Number(data.poId) : null
    if (data.expenseClaimId !== undefined) updateData.expenseClaimId = data.expenseClaimId ? Number(data.expenseClaimId) : null
    if (data.linkedType !== undefined) updateData.linkedType = data.linkedType
    if (data.authorizedBy !== undefined) updateData.authorizedBy = data.authorizedBy
    if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo
    if (data.remarks !== undefined) updateData.remarks = data.remarks
    if (data.billAttachmentPath !== undefined) updateData.billAttachmentPath = data.billAttachmentPath

    const record = await pdb.finPettyCash.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        party: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, totalAmount: true } },
        expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)

    const idsParam = searchParams.get('ids')
    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter((n) => !isNaN(n))
      if (ids.length === 0) return NextResponse.json({ success: false, error: 'No valid ids provided' }, { status: 400 })
      const result = await pdb.finPettyCash.deleteMany({ where: { id: { in: ids } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await pdb.finPettyCash.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
