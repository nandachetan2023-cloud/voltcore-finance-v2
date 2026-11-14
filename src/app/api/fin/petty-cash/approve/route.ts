import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { recomputePettyCashBalances } from '@/lib/petty-cash-balance'
import { notifyFinance, deriveFinYear, SITE_APPROVERS, inr } from '@/lib/notification-bus'

function notifyPC(pdb: any, v: any, siteCode: string | null, actor: string | undefined, kind: 'submit' | 'approve' | 'reject', comments?: string) {
  const submitter = (v.submittedBy || v.custodian || '').trim()
  const base = {
    entityType: 'FinPettyCash',
    entityId: String(v.id),
    siteCode,
    finYear: deriveFinYear(v.date),
    amount: v.amount,
    jobCode: v.jobCode || null,
    actorEmail: actor || null,
    vars: { voucherNo: v.voucherNo, amount: inr(v.amount), siteCode: siteCode || '', actor: actor || '', reason: comments || '' },
  }
  if (kind === 'submit') {
    notifyFinance(pdb, { ...base, templateCode: 'PETTY_CASH_APPROVAL_REQUIRED', title: `Approval Required: Petty Cash ${v.voucherNo}`,
      message: `${inr(v.amount)} • ${v.description}${siteCode ? ` • ${siteCode}` : ''}`,
      type: 'warning', priority: 'P1', link: 'fin-petty-cash-approval-queue', recipients: SITE_APPROVERS(siteCode) })
  } else if (submitter) {
    const ok = kind === 'approve'
    notifyFinance(pdb, { ...base, templateCode: ok ? 'PETTY_CASH_APPROVED' : 'PETTY_CASH_REJECTED',
      title: ok ? `Your Petty Cash ${v.voucherNo} was approved` : `Your Petty Cash ${v.voucherNo} was rejected`,
      message: ok ? `${inr(v.amount)} approved by ${actor || 'approver'}` : `Reason: ${comments || '—'}`,
      type: ok ? 'success' : 'error', priority: ok ? 'P2' : 'P1', link: 'fin-petty-cash', recipients: [submitter] })
  }
}

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
    const { id, action, actor, comments, stage } = body as {
      id?: number; action?: string; actor?: string; comments?: string; stage?: 'manager' | 'finance'
    }
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (!action) return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const voucher = await pdb.finPettyCash.findUnique({
      where: { id: Number(id) },
      include: { site: { select: { siteCode: true } } },
    })
    if (!voucher) return NextResponse.json({ success: false, error: 'Voucher not found' }, { status: 404 })

    const siteCode = voucher.site?.siteCode ?? null
    const actorEmail = (actor || '').trim()

    if (action === 'submit') {
      if (!['Draft', 'Rejected'].includes(voucher.approvalStatus)) {
        return NextResponse.json({ success: false, error: `Cannot submit a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
      }
      const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_CREATE', { request, module: 'PettyCash', entityId: String(voucher.id), siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      const [record] = await pdb.$transaction([
        pdb.finPettyCash.update({
          where: { id: voucher.id },
          data: { approvalStatus: 'Pending', submittedBy: actor || voucher.authorizedBy || null, submittedAt: new Date(), rejectionReason: null, managerApprovedBy: null, managerApprovedAt: null, verifiedBy: null, verifiedAt: null },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'Pending', action: 'Submit', makerId: actor || null, comments: comments || null, finPettyCashId: voucher.id },
        }),
      ])
      await recomputePettyCashBalances(pdb)
      notifyPC(pdb, record, siteCode, actor, 'submit')
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'approve') {
      const effStage = stage || (voucher.approvalStatus === 'ManagerApproved' ? 'finance' : 'manager')
      const submitter = (voucher.submittedBy || voucher.custodian || voucher.authorizedBy || '').trim().toLowerCase()
      const actingUser = (actor || '').trim().toLowerCase()

      // Stage 1 — Manager approves the business purpose (Pending -> ManagerApproved)
      if (effStage === 'manager') {
        if (voucher.approvalStatus !== 'Pending') {
          return NextResponse.json({ success: false, error: `Cannot manager-approve a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
        }
        const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_APPROVE', { request, module: 'PettyCash', entityId: String(voucher.id), siteCode })
        if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
        // Segregation of Duties: the person who submitted (or holds the float) cannot approve their own request
        if (actingUser && submitter && actingUser === submitter) {
          return NextResponse.json({ success: false, error: 'Self-approval is not allowed (Segregation of Duties). A supervisor or finance user must approve this request.' }, { status: 403 })
        }
        const [record] = await pdb.$transaction([
          pdb.finPettyCash.update({
            where: { id: voucher.id },
            data: { approvalStatus: 'ManagerApproved', managerApprovedBy: actor || null, managerApprovedAt: new Date() },
            include: INCLUDE,
          }),
          pdb.finApprovalLog.create({
            data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'ManagerApproved', action: 'Manager Approval', checkerId: actor || null, comments: comments || null, finPettyCashId: voucher.id },
          }),
        ])
        await recomputePettyCashBalances(pdb)
        return NextResponse.json({ success: true, data: record })
      }

      // Stage 2 — Finance verifies documents + policy (ManagerApproved -> Approved)
      if (effStage === 'finance') {
        if (voucher.approvalStatus !== 'ManagerApproved') {
          return NextResponse.json({ success: false, error: `Cannot finance-verify a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
        }
        const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_APPROVE', { request, module: 'PettyCash', entityId: String(voucher.id), siteCode })
        if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
        // SoD: the person who submitted/float-holds and the manager who approved the purpose must not finance-verify
        const manager = (voucher.managerApprovedBy || '').trim().toLowerCase()
        if (actingUser && ((manager && actingUser === manager) || (submitter && actingUser === submitter))) {
          return NextResponse.json({ success: false, error: 'Segregation of Duties: the requester or the manager who approved the purpose cannot finance-verify this voucher.' }, { status: 403 })
        }
        const operations: any[] = [
          pdb.finPettyCash.update({
            where: { id: voucher.id },
            data: { approvalStatus: 'Approved', verifiedBy: actor || null, verifiedAt: new Date(), approvedBy: actor || null, approvedAt: new Date() },
            include: INCLUDE,
          }),
          pdb.finApprovalLog.create({
            data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'Approved', action: 'Finance Verification', checkerId: actor || null, comments: comments || null, finPettyCashId: voucher.id },
          }),
        ]
        // A replenishment voucher marks the expenses it covers as replenished
        if (voucher.category === 'Replenishment' && voucher.coversVoucherIds) {
          try {
            const ids = JSON.parse(voucher.coversVoucherIds)
            if (Array.isArray(ids) && ids.length) {
              operations.push(pdb.finPettyCash.updateMany({
                where: { id: { in: ids.map((n: any) => Number(n)) }, approvalStatus: 'Approved' },
                data: { replenished: true },
              }))
            }
          } catch { /* malformed JSON — finance can still approve */ }
        }
        const [record] = await pdb.$transaction(operations)
        await recomputePettyCashBalances(pdb)
        notifyPC(pdb, record, siteCode, actor, 'approve')
        return NextResponse.json({ success: true, data: record })
      }

      return NextResponse.json({ success: false, error: `Unknown stage: ${effStage}` }, { status: 400 })
    }

    if (action === 'allocate') {
      // Finance Head pushing cash to a site directly — skips the Pending/approval
      // queue entirely, since this is a unilateral allocation, not an approval of
      // someone else's request. Only holders of PETTYCASH_APPROVE may do this.
      if (voucher.approvalStatus !== 'Draft') {
        return NextResponse.json({ success: false, error: `Cannot allocate a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
      }
      const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_APPROVE', { request, module: 'PettyCash', entityId: String(voucher.id), siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      const operations: any[] = [
        pdb.finPettyCash.update({
          where: { id: voucher.id },
          data: { approvalStatus: 'Approved', submittedBy: actor || null, submittedAt: new Date(), approvedBy: actor || null, approvedAt: new Date() },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'Approved', action: 'Allocate', makerId: actor || null, checkerId: actor || null, comments: comments || null, finPettyCashId: voucher.id },
        }),
      ]
      // A replenishment voucher marks the expenses it covers as replenished
      if (voucher.category === 'Replenishment' && voucher.coversVoucherIds) {
        try {
          const ids = JSON.parse(voucher.coversVoucherIds)
          if (Array.isArray(ids) && ids.length) {
            operations.push(pdb.finPettyCash.updateMany({
              where: { id: { in: ids.map((n: any) => Number(n)) }, approvalStatus: 'Approved' },
              data: { replenished: true },
            }))
          }
        } catch { /* malformed JSON — the voucher itself still allocates */ }
      }
      const [record] = await pdb.$transaction(operations)
      await recomputePettyCashBalances(pdb)
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'reject') {
      if (!['Pending', 'ManagerApproved'].includes(voucher.approvalStatus)) {
        return NextResponse.json({ success: false, error: `Cannot reject a voucher that is ${voucher.approvalStatus}` }, { status: 400 })
      }
      if (!comments) return NextResponse.json({ success: false, error: 'A reason is required to reject' }, { status: 400 })
      const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_APPROVE', { request, module: 'PettyCash', entityId: String(voucher.id), siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      const [record] = await pdb.$transaction([
        pdb.finPettyCash.update({
          where: { id: voucher.id },
          data: { approvalStatus: 'Rejected', rejectionReason: comments },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinPettyCash', entityId: String(voucher.id), status: 'Rejected', action: voucher.approvalStatus === 'ManagerApproved' ? 'Finance Rejection' : 'Reject', checkerId: actor || null, comments, finPettyCashId: voucher.id },
        }),
      ])
      await recomputePettyCashBalances(pdb)
      notifyPC(pdb, record, siteCode, actor, 'reject', comments)
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
