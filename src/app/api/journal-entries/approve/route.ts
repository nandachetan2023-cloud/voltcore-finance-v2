import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { notifyFinance, deriveFinYear, FIN_APPROVERS, inr } from '@/lib/notification-bus'

function notifyJE(pdb: any, entry: any, actor: string | undefined, kind: 'submit' | 'approve' | 'reject', comments?: string) {
  const submitter = (entry.submittedBy || entry.createdBy || '').trim()
  const base = {
    entityType: 'FinJournalEntry',
    entityId: String(entry.id),
    finYear: deriveFinYear(entry.entryDate),
    amount: entry.totalDebit,
    jobCode: entry.jobCode || null,
    link: 'journal-entries',
    actorEmail: actor || null,
    vars: { entryNo: entry.entryNo, amount: inr(entry.totalDebit), actor: actor || '', reason: comments || '' },
  }
  if (kind === 'submit') {
    notifyFinance(pdb, { ...base, templateCode: 'JE_APPROVAL_REQUIRED', title: `Approval Required: Journal ${entry.entryNo}`,
      message: `${inr(entry.totalDebit)} • ${entry.description || entry.voucherType || 'Journal voucher'} • submitted by ${actor || 'unknown'}`,
      type: 'warning', priority: 'P1', recipients: FIN_APPROVERS() })
  } else if (submitter) {
    const ok = kind === 'approve'
    notifyFinance(pdb, { ...base, templateCode: ok ? 'JE_APPROVED' : 'JE_REJECTED',
      title: ok ? `Your Journal ${entry.entryNo} was approved` : `Your Journal ${entry.entryNo} was rejected`,
      message: ok ? `Posted by ${actor || 'approver'} • ${inr(entry.totalDebit)}` : `Reason: ${comments || '—'}`,
      type: ok ? 'success' : 'error', priority: ok ? 'P2' : 'P1', recipients: [submitter] })
  }
}

export const dynamic = 'force-dynamic'

const INCLUDE = { lines: { include: { account: true } } }

function flatten(entry: any) {
  return entry.lines.map((line: any) => ({
    id: line.id,
    entryId: entry.id,
    entryNo: entry.entryNo,
    date: entry.entryDate,
    siteId: entry.siteId,
    jobCode: entry.jobCode,
    poNo: entry.poNo,
    costCenter: entry.costCenter,
    department: entry.department,
    projectManager: entry.projectManager,
    voucherType: entry.voucherType,
    status: entry.status,
    submittedBy: entry.submittedBy,
    submittedAt: entry.submittedAt,
    approvedBy: entry.approvedBy,
    approvedAt: entry.approvedAt,
    rejectionReason: entry.rejectionReason,
    attachmentPath: entry.attachmentPath,
    account: line.account?.accountCode ?? '',
    accountName: line.account?.name ?? null,
    debit: line.debit,
    credit: line.credit,
    description: line.description ?? entry.description,
    reference: entry.reference,
  }))
}

// Journal Voucher approval workflow: Draft --submit--> Pending --approve--> Posted
//                                                                \--reject--> Rejected --resubmit--> Pending
// Mirrors src/app/api/fin/petty-cash/approve/route.ts exactly, including
// the Segregation-of-Duties self-approval block.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, actor, comments } = body as { id?: number; action?: string; actor?: string; comments?: string }
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (!action) return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const entry = await pdb.finJournalEntry.findUnique({ where: { id: Number(id) } })
    if (!entry) return NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 })

    const siteCode = null // journal entries carry siteId on lines; scope check is all-sites for finance roles
    const actorEmail = (actor || '').trim()

    if (action === 'submit') {
      if (!['Draft', 'Rejected'].includes(entry.status)) {
        return NextResponse.json({ success: false, error: `Cannot submit an entry that is ${entry.status}` }, { status: 400 })
      }
      if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
        return NextResponse.json({ success: false, error: 'Entry is not balanced — total debit must equal total credit' }, { status: 400 })
      }
      const denied = await assertPermission(pdb, actorEmail, 'GL_CREATE', { request, module: 'GL', entityId: String(entry.id), siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      const [updated] = await pdb.$transaction([
        pdb.finJournalEntry.update({
          where: { id: entry.id },
          data: { status: 'Pending', submittedBy: actor || null, submittedAt: new Date(), rejectionReason: null },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinJournalEntry', entityId: String(entry.id), status: 'Pending', action: 'Submit', makerId: actor || null, comments: comments || null, finJournalEntryId: entry.id },
        }),
      ])
      notifyJE(pdb, updated, actor, 'submit')
      return NextResponse.json({ success: true, data: flatten(updated) })
    }

    if (action === 'approve') {
      if (entry.status !== 'Pending') {
        return NextResponse.json({ success: false, error: `Cannot approve an entry that is ${entry.status}` }, { status: 400 })
      }
      const denied = await assertPermission(pdb, actorEmail, 'GL_APPROVE', { request, module: 'GL', entityId: String(entry.id), siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      // Segregation of Duties: the person who submitted this entry cannot also approve it.
      const submitter = (entry.submittedBy || entry.createdBy || '').trim().toLowerCase()
      const actingUser = (actor || '').trim().toLowerCase()
      if (actingUser && submitter && actingUser === submitter) {
        return NextResponse.json({ success: false, error: 'Self-approval is not allowed (Segregation of Duties). A different finance user must approve this entry.' }, { status: 403 })
      }
      const [updated] = await pdb.$transaction([
        pdb.finJournalEntry.update({
          where: { id: entry.id },
          data: { status: 'Posted', approvedBy: actor || null, approvedAt: new Date(), postedAt: new Date(), postedBy: actor || null },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinJournalEntry', entityId: String(entry.id), status: 'Posted', action: 'Approve', checkerId: actor || null, comments: comments || null, finJournalEntryId: entry.id },
        }),
      ])
      notifyJE(pdb, updated, actor, 'approve')
      // Tally auto-push onApprove (best-effort, never blocks approval)
      try {
        const { autoPushSingle } = await import('@/lib/tally-sync-engine')
        const companyName = process.env.TALLY_COMPANY || 'VoltCore'
        autoPushSingle(pdb, 'FinJournalEntry', updated.id, { trigger: 'onApprove', actor: actor || '', companyName }).catch(()=>{})
      } catch {}
      return NextResponse.json({ success: true, data: flatten(updated) })
    }

    if (action === 'reject') {
      if (entry.status !== 'Pending') {
        return NextResponse.json({ success: false, error: `Cannot reject an entry that is ${entry.status}` }, { status: 400 })
      }
      if (!comments) return NextResponse.json({ success: false, error: 'A reason is required to reject' }, { status: 400 })
      const denied = await assertPermission(pdb, actorEmail, 'GL_APPROVE', { request, module: 'GL', entityId: String(entry.id), siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      const [updated] = await pdb.$transaction([
        pdb.finJournalEntry.update({
          where: { id: entry.id },
          data: { status: 'Rejected', rejectionReason: comments },
          include: INCLUDE,
        }),
        pdb.finApprovalLog.create({
          data: { entityType: 'FinJournalEntry', entityId: String(entry.id), status: 'Rejected', action: 'Reject', checkerId: actor || null, comments, finJournalEntryId: entry.id },
        }),
      ])
      notifyJE(pdb, updated, actor, 'reject', comments)
      return NextResponse.json({ success: true, data: flatten(updated) })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Error processing journal entry approval:', error)
    return NextResponse.json({ success: false, error: 'Failed to process approval action' }, { status: 500 })
  }
}

// Approval history for one entry
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const logs = await pdb.finApprovalLog.findMany({
      where: { finJournalEntryId: Number(id) },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Error fetching approval history:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch approval history' }, { status: 500 })
  }
}
