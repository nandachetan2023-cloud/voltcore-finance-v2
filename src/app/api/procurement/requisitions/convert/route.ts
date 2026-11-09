import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Convert an Approved purchase requisition into an RFQ (line items copied over).
// PR status becomes 'Converted to RFQ/PO' — the next flow step is the
// Quotation Comparison screen where a supplier is selected and a PO is generated.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const pr = await pdb.finPurchaseRequisition.findUnique({ where: { id }, include: { items: true } })
    if (!pr) return NextResponse.json({ success: false, error: 'Purchase requisition not found' }, { status: 404 })
    if (pr.status !== 'Approved') {
      return NextResponse.json({ success: false, error: `Only Approved PRs can be converted (this one is ${pr.status})` }, { status: 400 })
    }

    const year = new Date().getFullYear()
    const count = (await pdb.finRFQ.count()) + 1
    const rfq = await pdb.finRFQ.create({
      data: {
        rfqNo: `RFQ/${year}/${String(count).padStart(3, '0')}`,
        description: `Against PR ${pr.prNo}${pr.items[0] ? ` — ${pr.items[0].description}` : ''}`,
        issueDate: new Date(),
        responseDeadline: new Date(Date.now() + 14 * 86400000),
        project: pr.project,
        notes: `Auto-converted from ${pr.prNo}`,
        status: 'Draft',
        lineItems: pr.items.length
          ? { create: pr.items.map((i: { description: string; qty: number; unit: string }) => ({ description: i.description, qty: i.qty, unit: i.unit })) }
          : undefined,
      },
    })
    const updatedPR = await pdb.finPurchaseRequisition.update({
      where: { id }, data: { status: 'Converted to RFQ/PO' }, include: { items: true, approvals: true },
    })
    return NextResponse.json({ success: true, data: rfq, pr: updatedPR })
  } catch (error) {
    console.error('Error converting PR to RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to convert PR' }, { status: 500 })
  }
}
