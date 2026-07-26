import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  party: { select: { id: true, name: true, code: true } },
  site: { select: { id: true, name: true, siteCode: true } },
  po: { select: { id: true, poNo: true, totalAmount: true } },
  expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
}

// Petty cash approval workflow: Draft --submit--> Pending --approve--> Approved
//                                                        \--reject--> Rejected --resubmit--> Pending
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, actor, comments } = body as {
      id?: number; action?: string; actor?: string; comments?: string
    }
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (!action) return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const voucher = await pdb.finPettyCash.findUnique({ where: { id: Number(id) } })
    if (!voucher) return NextResponse.json({ success: false, error: 'Voucher not found' }, { status: 404 })

    if (action === 'submit') {
      if (!['Draft', 'Rejected'].includes(voucher.approvalStatus)) {
        return NextResponse.json({ success: false, error: `Cannot submit a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
      }
      const [record] = await pdb.$transaction([
        pdb.finPettyCash.update({
          where: { id: voucher.id },
          data: { approvalStatus: 'Pending', submittedBy: actor || voucher.authorizedBy || null, submittedAt: new Date(), rejectionReason: null },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'Pending', action: 'Submit', makerId: actor || null, comments: comments || null, finPettyCashId: voucher.id },
        }),
      ])
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'approve') {
      if (voucher.approvalStatus !== 'Pending') {
        return NextResponse.json({ success: false, error: `Cannot approve a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
      }
      const [record] = await pdb.$transaction([
        pdb.finPettyCash.update({
          where: { id: voucher.id },
          data: { approvalStatus: 'Approved', approvedBy: actor || null, approvedAt: new Date() },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'Approved', action: 'Approve', checkerId: actor || null, comments: comments || null, finPettyCashId: voucher.id },
        }),
      ])
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'reject') {
      if (voucher.approvalStatus !== 'Pending') {
        return NextResponse.json({ success: false, error: `Cannot reject a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
      }
      if (!comments) return NextResponse.json({ success: false, error: 'A reason is required to reject' }, { status: 400 })
      const [record] = await pdb.$transaction([
        pdb.finPettyCash.update({
          where: { id: voucher.id },
          data: { approvalStatus: 'Rejected', rejectionReason: comments },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'Rejected', action: 'Reject', checkerId: actor || null, comments, finPettyCashId: voucher.id },
        }),
      ])
      return NextResponse.json({ success: true, data: record })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Error processing petty cash approval:', error)
    return NextResponse.json({ success: false, error: 'Failed to process approval action' }, { status: 500 })
  }
}

// Approval history for one voucher
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const logs = await pdb.finApprovalLog.findMany({
      where: { finPettyCashId: Number(id) },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Error fetching approval history:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch approval history' }, { status: 500 })
  }
}
