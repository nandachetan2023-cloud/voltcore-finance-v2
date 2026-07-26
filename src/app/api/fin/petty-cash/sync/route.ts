import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { poId, expenseClaimId, date, authorizedBy, paymentMode } = body
    const sourceType = poId ? 'PO' : 'ExpenseClaim'
    const sourceId = poId || expenseClaimId

    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'poId or expenseClaimId required' }, { status: 400 })
    }

    const linkedType = sourceType
    const existing = await pdb.finPettyCash.findFirst({
      where: linkedType === 'PO' ? { poId: Number(poId) } : { expenseClaimId: Number(expenseClaimId) },
    })
    if (existing) {
      return NextResponse.json({ success: false, error: `Petty cash voucher already exists for this ${linkedType}` }, { status: 409 })
    }

    let description = ''
    let amount = 0
    let partyId: number | null = null
    let siteId: number | null = null

    if (linkedType === 'PO') {
      const po = await pdb.finPurchaseOrder.findUnique({
        where: { id: Number(poId) },
        include: { site: { select: { id: true, name: true } } },
      })
      if (!po) return NextResponse.json({ success: false, error: 'PO not found' }, { status: 404 })
      description = `Payment against PO: ${po.poNo} - ${po.descriptionOfWork || ''}`
      amount = po.totalAmount
      siteId = po.siteId
    } else {
      const claim = await pdb.finExpenseClaim.findUnique({
        where: { id: Number(expenseClaimId) },
        include: { site: { select: { id: true, name: true } } },
      })
      if (!claim) return NextResponse.json({ success: false, error: 'Expense claim not found' }, { status: 404 })
      description = `Expense claim: ${claim.claimNo} - ${claim.expenseType || ''}`
      amount = claim.totalAmount
      siteId = claim.siteId
    }

    const last = await pdb.finPettyCash.findFirst({ orderBy: { id: 'desc' } })
    const lastBalance = last?.balance ?? 0
    const delta = -amount

    const count = (await pdb.finPettyCash.count()) + 1
    const prefix = linkedType === 'PO' ? 'PO' : 'EX'
    const yr = new Date().getFullYear()
    const voucherNo = `${prefix}/PV/${yr}/${String(count).padStart(4, '0')}`

    const record = await pdb.finPettyCash.create({
      data: {
        voucherNo,
        date: date ? new Date(date) : new Date(),
        description: description.substring(0, 255),
        amount,
        type: 'Debit',
        category: linkedType === 'PO' ? 'Purchase Order' : 'Expense Claim',
        partyId,
        siteId,
        poId: linkedType === 'PO' ? Number(poId) : null,
        expenseClaimId: linkedType === 'ExpenseClaim' ? Number(expenseClaimId) : null,
        linkedType,
        authorizedBy: authorizedBy || null,
        paymentMode: paymentMode || 'Bank Transfer',
        balance: lastBalance + delta,
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
    console.error('Error syncing:', error)
    return NextResponse.json({ success: false, error: 'Failed to sync' }, { status: 500 })
  }
}
