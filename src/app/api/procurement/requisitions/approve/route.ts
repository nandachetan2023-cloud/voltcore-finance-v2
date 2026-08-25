import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = { items: true, approvals: true }

// The approval chain every new PR goes through once submitted.
const APPROVAL_TEMPLATE = [
  { role: 'site_engineer', label: 'Site Engineer' },
  { role: 'project_manager', label: 'Project Manager' },
  { role: 'procurement', label: 'Procurement' },
  { role: 'finance', label: 'Finance' },
]

// Purchase Requisition approval workflow: Draft --submit--> Pending Approval
// --(each role approves in sequence)--> Approved
// --reject (any role)--> Draft (requester reworks and resubmits, chain resets)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, actor, comments } = body as {
      id?: number; action?: string; actor?: string; comments?: string
    }
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (!action) return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const pr = await pdb.finPurchaseRequisition.findUnique({ where: { id: Number(id) }, include: INCLUDE })
    if (!pr) return NextResponse.json({ success: false, error: 'Purchase requisition not found' }, { status: 404 })

    if (action === 'submit') {
      if (pr.status !== 'Draft') {
        return NextResponse.json({ success: false, error: `Cannot submit a PR that is ${pr.status}` }, { status: 400 })
      }
      // (Re)seed a clean approval chain — handles both first submission and resubmission after rejection.
      await pdb.finPRApproval.deleteMany({ where: { prId: pr.id } })
      await pdb.finPRApproval.createMany({
        data: APPROVAL_TEMPLATE.map((step) => ({ prId: pr.id, role: step.role, label: step.label, status: 'Pending' })),
      })
      const record = await pdb.finPurchaseRequisition.update({
        where: { id: pr.id }, data: { status: 'Pending Approval' }, include: INCLUDE,
      })
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'approve' || action === 'reject') {
      if (pr.status !== 'Pending Approval') {
        return NextResponse.json({ success: false, error: `Cannot ${action} a PR that is ${pr.status}` }, { status: 400 })
      }
      const nextStep = pr.approvals.filter((a) => a.status === 'Pending').sort((a, b) => a.id - b.id)[0]
      if (!nextStep) return NextResponse.json({ success: false, error: 'No pending approval step found' }, { status: 400 })

      if (action === 'reject' && !comments) {
        return NextResponse.json({ success: false, error: 'A reason is required to reject' }, { status: 400 })
      }

      await pdb.finPRApproval.update({
        where: { id: nextStep.id },
        data: { status: action === 'approve' ? 'Approved' : 'Rejected', actedBy: actor || null, actedAt: new Date(), comments: comments || null },
      })

      let newStatus = pr.status
      if (action === 'reject') {
        newStatus = 'Draft' // send back for rework; resubmitting resets the whole chain
      } else {
        const remaining = pr.approvals.filter((a) => a.id !== nextStep.id && a.status === 'Pending')
        if (remaining.length === 0) newStatus = 'Approved'
      }

      const record = await pdb.finPurchaseRequisition.update({
        where: { id: pr.id }, data: { status: newStatus }, include: INCLUDE,
      })
      return NextResponse.json({ success: true, data: record })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Error processing PR approval:', error)
    return NextResponse.json({ success: false, error: 'Failed to process approval action' }, { status: 500 })
  }
}
