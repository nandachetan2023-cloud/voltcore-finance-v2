import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { notifyFinance, deriveFinYear, SITE_APPROVERS, inr } from '@/lib/notification-bus'

export const dynamic = 'force-dynamic'

function actorFor(request: NextRequest) {
  return request.cookies.get('erp_user_email')?.value || request.headers.get('x-actor-email') || ''
}

function notifySE(pdb: any, claim: any, actor: string | null, kind: 'submit' | 'approved' | 'rejected', comments?: string) {
  const siteCode = claim.site?.siteCode ?? null
  const base = {
    entityType: 'FinExpenseClaim',
    entityId: String(claim.id),
    siteCode,
    finYear: deriveFinYear(claim.date),
    amount: claim.totalAmount,
    jobCode: claim.jobCode || null,
    link: 'fin-site-expenses',
    actorEmail: actor,
    vars: { claimNo: claim.claimNo, amount: inr(claim.totalAmount), siteCode: siteCode || '', reason: comments || '' },
  }
  if (kind === 'submit') {
    notifyFinance(pdb, {
      ...base,
      templateCode: 'SITE_EXPENSE_APPROVAL_REQUIRED',
      title: `Approval Required: Site Expense ${claim.claimNo}`,
      message: `${claim.submittedBy} — ${claim.expenseType} ${inr(claim.totalAmount)}${siteCode ? ` • ${siteCode}` : ''}`,
      type: 'warning',
      priority: 'P1',
      recipients: SITE_APPROVERS(siteCode),
    })
  } else {
    const approved = kind === 'approved'
    const recipients = [claim.submittedBy].filter((email: string) => email && email.includes('@'))
    if (!recipients.length) return
    notifyFinance(pdb, {
      ...base,
      templateCode: approved ? 'SITE_EXPENSE_APPROVED' : 'SITE_EXPENSE_REJECTED',
      title: approved ? `Your Site Expense ${claim.claimNo} was approved` : `Your Site Expense ${claim.claimNo} was rejected`,
      message: approved ? `${inr(claim.totalAmount)} fully approved` : `Reason: ${comments || '—'}`,
      type: approved ? 'success' : 'error',
      priority: approved ? 'P2' : 'P1',
      recipients,
    })
  }
}

async function loadClaim(pdb: any, id: number) {
  return pdb.finExpenseClaim.findUnique({
    where: { id },
    include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
  })
}

async function assertClaimAccess(pdb: any, request: NextRequest, actor: string, permission: string, id: number) {
  const claim = await pdb.finExpenseClaim.findUnique({ where: { id }, include: { site: { select: { siteCode: true } } } })
  if (!claim) return { claim: null, denied: null }
  const denied = await assertPermission(pdb, actor, permission, {
    request,
    module: 'Expenses',
    entityId: String(id),
    siteCode: claim.site?.siteCode ?? null,
  })
  return { claim, denied }
}

async function validatePostingAccounts(tx: any, claim: any) {
  if (!claim.items.length || claim.items.some((item: any) => !item.accountId)) {
    throw new Error('Assign an expense ledger account to every claim line before Finance approval')
  }
  const itemAccountIds = [...new Set(claim.items.map((item: any) => Number(item.accountId)))]
  const itemAccounts = await tx.finAccount.findMany({ where: { id: { in: itemAccountIds }, isActive: true } })
  if (itemAccounts.length !== itemAccountIds.length || itemAccounts.some((account: any) => account.type !== 'Expense')) {
    throw new Error('Every claim line must use an active Expense account')
  }
  if (claim.receivedAmount > 0) {
    const advanceAccounts = await tx.finAccount.findMany({
      where: { name: { equals: 'Employee Advances', mode: 'insensitive' }, type: 'Asset', isActive: true },
    })
    if (advanceAccounts.length !== 1) {
      throw new Error('Create exactly one active Asset account named "Employee Advances" before approving a claim with an advance')
    }
  }
}

export async function GET(request: NextRequest, { params }: any) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Invalid claim id' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const { claim, denied } = await assertClaimAccess(pdb, request, actor, 'EXPENSES_VIEW', id)
    if (!claim) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (!denied?.allowed) return NextResponse.json({ success: false, error: denied?.reason || 'Not allowed' }, { status: 403 })
    const record = await loadClaim(pdb, id)
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error fetching site expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Invalid claim id' }, { status: 400 })
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const { claim: existing, denied: accessDenied } = await assertClaimAccess(pdb, request, actor, 'EXPENSES_VIEW', id)
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (!accessDenied?.allowed) return NextResponse.json({ success: false, error: accessDenied?.reason || 'Not allowed' }, { status: 403 })

    if (body.action === 'submit') {
      const denied = await assertPermission(pdb, actor, 'EXPENSES_CREATE', { request, module: 'Expenses', entityId: String(id), siteCode: existing.site.siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to submit claims' }, { status: 403 })
      if (!['Draft', 'Rejected'].includes(existing.status)) {
        return NextResponse.json({ success: false, error: `Cannot submit a claim with status '${existing.status}'` }, { status: 409 })
      }
      if (!existing.items.length || existing.totalAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Add at least one expense item with a positive amount before submitting' }, { status: 400 })
      }
      const updated = await pdb.$transaction(async (tx: any) => {
        const result = await tx.finExpenseClaim.updateMany({
          where: { id, status: existing.status },
          data: {
            status: 'Pending',
            approvalStatus: 'Pending Manager',
            managerApprovedBy: null,
            managerApprovedAt: null,
            verifiedBy: null,
            verifiedAt: null,
            approvedBy: null,
          },
        })
        if (result.count !== 1) throw new Error('Claim status changed; reload and try again')
        await tx.finApprovalLog.create({
          data: {
            entityType: 'FinExpenseClaim',
            entityId: String(id),
            finExpenseClaimId: id,
            status: 'Pending',
            action: 'Submit',
            makerId: actor,
            checkerId: null,
          },
        })
        return loadClaim(tx, id)
      })
      if (updated) notifySE(pdb, updated, actor || null, 'submit')
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.action === 'approve' || body.action === 'reject') {
      const denied = await assertPermission(pdb, actor, 'EXPENSES_APPROVE', { request, module: 'Expenses', entityId: String(id), siteCode: existing.site.siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to approve claims' }, { status: 403 })
      if (existing.status !== 'Pending') {
        return NextResponse.json({ success: false, error: `Cannot ${body.action} a claim with status '${existing.status}'` }, { status: 409 })
      }
      if (!actor || actor.toLowerCase() === existing.submittedBy.toLowerCase()) {
        return NextResponse.json({ success: false, error: 'The claim maker cannot approve their own claim' }, { status: 403 })
      }
      if (body.action === 'reject' && !String(body.comments || '').trim()) {
        return NextResponse.json({ success: false, error: 'A rejection reason is required' }, { status: 400 })
      }

      const stage = existing.managerApprovedAt ? 'Finance' : 'Manager'
      if (body.action === 'approve' && stage === 'Finance') {
        if (existing.managerApprovedBy?.toLowerCase() === actor.toLowerCase()) {
          return NextResponse.json({ success: false, error: 'Manager and Finance approval must be performed by different users' }, { status: 403 })
        }
        try {
          await validatePostingAccounts(pdb, existing)
        } catch (error) {
          return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Expense account setup is incomplete' }, { status: 409 })
        }
      }

      const status = body.action === 'reject' ? 'Rejected' : stage === 'Manager' ? 'Pending Finance' : 'Approved'
      const updated = await pdb.$transaction(async (tx: any) => {
        const fresh = await tx.finExpenseClaim.findUnique({ where: { id } })
        if (!fresh || fresh.status !== 'Pending' || Boolean(fresh.managerApprovedAt) !== (stage === 'Finance')) {
          throw new Error('Claim approval stage changed; reload and try again')
        }
        const now = new Date()
        await tx.finExpenseClaim.update({
          where: { id },
          data: body.action === 'reject'
            ? { status: 'Rejected', approvalStatus: 'Rejected' }
            : stage === 'Manager'
              ? { managerApprovedBy: actor, managerApprovedAt: now, approvalStatus: 'Pending Finance' }
              : { verifiedBy: actor, verifiedAt: now, approvedBy: actor, status: 'Approved', approvalStatus: 'Approved' },
        })
        await tx.finApprovalLog.create({
          data: {
            entityType: 'FinExpenseClaim',
            entityId: String(id),
            finExpenseClaimId: id,
            status: body.action === 'reject' ? 'Rejected' : 'Approved',
            action: body.action === 'reject' ? `${stage} reject` : `${stage} approve`,
            makerId: fresh.submittedBy,
            checkerId: actor,
            comments: body.comments ? String(body.comments) : null,
          },
        })
        return loadClaim(tx, id)
      }, { isolationLevel: 'Serializable' })
      if (body.action === 'reject') {
        if (updated) notifySE(pdb, updated, actor || null, 'rejected', body.comments)
      } else if (stage === 'Finance' && updated) {
        notifySE(pdb, updated, actor || null, 'approved')
      }
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.action === 'pay' || body.action === 'settle') {
      const denied = await assertPermission(pdb, actor, 'EXPENSES_APPROVE', { request, module: 'Expenses', entityId: String(id), siteCode: existing.site.siteCode })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to settle claims' }, { status: 403 })
      if (existing.status !== 'Approved' || !existing.verifiedAt) {
        return NextResponse.json({ success: false, error: 'Only Finance-verified claims can be settled' }, { status: 409 })
      }
      if ([existing.submittedBy, existing.verifiedBy].some((email: string | null) => email?.toLowerCase() === actor.toLowerCase())) {
        return NextResponse.json({ success: false, error: 'Settlement must be performed by a user other than the maker and Finance verifier' }, { status: 403 })
      }
      const netAmount = Math.round((existing.totalAmount - existing.receivedAmount) * 100) / 100
      const settlementRef = String(body.settlementRef || '').trim()
      if (netAmount !== 0 && !settlementRef) {
        return NextResponse.json({ success: false, error: 'Enter the bank payment or recovery reference before settling' }, { status: 400 })
      }

      const updated = await pdb.$transaction(async (tx: any) => {
        const fresh = await tx.finExpenseClaim.findUnique({
          where: { id },
          include: { site: true, items: true },
        })
        if (!fresh || fresh.status !== 'Approved' || fresh.settledAt) throw new Error('Claim is already settled or no longer approved')
        await validatePostingAccounts(tx, fresh)
        const expenseAccountIds = [...new Set(fresh.items.map((item: any) => Number(item.accountId)))]
        const expenseAccounts = await tx.finAccount.findMany({ where: { id: { in: expenseAccountIds }, isActive: true } })
        const expenseById = new Map(expenseAccounts.map((account: any) => [account.id, account]))
        const advanceAccounts = fresh.receivedAmount > 0
          ? await tx.finAccount.findMany({ where: { name: { equals: 'Employee Advances', mode: 'insensitive' }, type: 'Asset', isActive: true } })
          : []
        let bankAccount: any = null
        let bankAccountGl: any = null
        let bankBalance: number | null = null
        if (netAmount !== 0) {
          bankAccount = await tx.bankAccount.findUnique({ where: { id: Number(body.bankAccountId) } })
          if (!bankAccount || bankAccount.status !== 'Active' || !bankAccount.finAccountId) {
            throw new Error('Select an active bank account mapped to a General Ledger account')
          }
          bankAccountGl = await tx.finAccount.findUnique({ where: { id: bankAccount.finAccountId } })
          if (!bankAccountGl?.isActive || bankAccountGl.type !== 'Asset') throw new Error('The selected bank account must map to an active Asset ledger')
          if (netAmount > 0 && bankAccount.balance < netAmount) throw new Error('The selected bank account has insufficient balance')
          bankBalance = Math.round((bankAccount.balance - netAmount) * 100) / 100
        }

        const journalLines: Array<Record<string, unknown>> = fresh.items.map((item: any) => ({
          accountId: item.accountId,
          description: `${item.category || 'Expense'} - ${fresh.claimNo}`,
          debit: item.amount,
          credit: 0,
          costCenter: fresh.costCenter || null,
          jobCode: fresh.jobCode || null,
          siteCode: fresh.site?.siteCode || null,
          department: fresh.department || null,
          projectManager: fresh.projectManager || null,
        }))
        if (fresh.receivedAmount > 0) {
          journalLines.push({
            accountId: advanceAccounts[0].id,
            description: `Advance applied to ${fresh.claimNo}`,
            debit: 0,
            credit: fresh.receivedAmount,
            costCenter: fresh.costCenter || null,
            jobCode: fresh.jobCode || null,
            siteCode: fresh.site?.siteCode || null,
            department: fresh.department || null,
            projectManager: fresh.projectManager || null,
          })
        }
        if (netAmount !== 0) {
          journalLines.push({
            accountId: bankAccountGl.id,
            description: `${netAmount > 0 ? 'Reimbursement' : 'Advance recovery'} - ${fresh.claimNo}`,
            debit: netAmount < 0 ? Math.abs(netAmount) : 0,
            credit: netAmount > 0 ? netAmount : 0,
            costCenter: fresh.costCenter || null,
            jobCode: fresh.jobCode || null,
            siteCode: fresh.site?.siteCode || null,
            department: fresh.department || null,
            projectManager: fresh.projectManager || null,
          })
        }
        const totalDebit = Math.round(journalLines.reduce((sum, line: any) => sum + line.debit, 0) * 100) / 100
        const totalCredit = Math.round(journalLines.reduce((sum, line: any) => sum + line.credit, 0) * 100) / 100
        if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error('Expense settlement journal is not balanced')

        if (bankAccount && bankBalance !== null) {
          await tx.bankTransaction.create({
            data: {
              bankAccountId: bankAccount.id,
              date: new Date(),
              type: netAmount > 0 ? 'Withdrawal' : 'Deposit',
              transactionType: netAmount > 0 ? 'Payment' : 'Receipt',
              amount: Math.abs(netAmount),
              balance: bankBalance,
              reference: settlementRef,
              party: fresh.submittedBy,
              description: `${netAmount > 0 ? 'Expense reimbursement' : 'Advance recovery'} ${fresh.claimNo}`,
              category: 'Expense Claim Settlement',
              siteCode: fresh.site?.siteCode || null,
              jobCode: fresh.jobCode || null,
              costCenter: fresh.costCenter || null,
              department: fresh.department || null,
              projectManager: fresh.projectManager || null,
            },
          })
          await tx.bankAccount.update({ where: { id: bankAccount.id }, data: { balance: bankBalance } })
        }
        await tx.finJournalEntry.create({
          data: {
            entryNo: `JE-EXP/${fresh.claimNo}`,
            entryDate: new Date(),
            reference: settlementRef || fresh.claimNo,
            description: `Expense claim settlement ${fresh.claimNo}`,
            siteId: fresh.siteId,
            finSiteId: fresh.siteId,
            jobCode: fresh.jobCode || null,
            costCenter: fresh.costCenter || null,
            department: fresh.department || null,
            projectManager: fresh.projectManager || null,
            voucherType: netAmount < 0 ? 'Receipt' : netAmount > 0 ? 'Payment' : 'Journal',
            status: 'Posted',
            postedAt: new Date(),
            postedBy: actor,
            createdBy: actor,
            totalDebit,
            totalCredit,
            lines: { create: journalLines },
          },
        })
        const result = await tx.finExpenseClaim.updateMany({
          where: { id, status: 'Approved', settledAt: null },
          data: {
            status: 'Posted',
            approvalStatus: 'Approved',
            postedAt: new Date(),
            settledBy: actor,
            settledAt: new Date(),
            settlementRef: settlementRef || 'Advance net-off',
            settlementType: netAmount > 0 ? 'Bank Payment' : netAmount < 0 ? 'Advance Recovery' : 'Advance Net-off',
            bankAccountId: bankAccount?.id ?? null,
          },
        })
        if (result.count !== 1) throw new Error('Claim settlement conflicted with another update')
        await tx.finApprovalLog.create({
          data: {
            entityType: 'FinExpenseClaim',
            entityId: String(id),
            finExpenseClaimId: id,
            status: 'Approved',
            action: 'Settlement',
            makerId: fresh.submittedBy,
            checkerId: actor,
            comments: `Net settlement ${netAmount.toFixed(2)}; reference ${settlementRef || 'Advance net-off'}`,
          },
        })
        return loadClaim(tx, id)
      }, { isolationLevel: 'Serializable' })
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.action) return NextResponse.json({ success: false, error: 'Unsupported expense claim action' }, { status: 400 })

    const denied = await assertPermission(pdb, actor, 'EXPENSES_EDIT', { request, module: 'Expenses', entityId: String(id), siteCode: existing.site.siteCode })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit claims' }, { status: 403 })
    if (!['Draft', 'Rejected'].includes(existing.status)) {
      return NextResponse.json({ success: false, error: 'Only Draft or Rejected claims can be edited' }, { status: 409 })
    }
    if (existing.submittedBy.toLowerCase() !== actor.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Only the claim maker can edit this draft' }, { status: 403 })
    }
    const date = body.date ? new Date(body.date) : existing.date
    if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, error: 'Invalid claim date' }, { status: 400 })
    const { items, totalAmount } = body.items === undefined
      ? { items: undefined, totalAmount: existing.totalAmount }
      : normalizeItems(body.items)
    if (items && (!items.length || totalAmount <= 0)) {
      return NextResponse.json({ success: false, error: 'Add at least one expense item with a positive amount' }, { status: 400 })
    }
    const siteId = body.siteId === undefined ? existing.siteId : Number(body.siteId)
    const site = await pdb.finSite.findUnique({ where: { id: siteId }, select: { id: true, siteCode: true, responsiblePerson: true } })
    if (!site) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })
    const siteDenied = await assertPermission(pdb, actor, 'EXPENSES_EDIT', { request, module: 'Expenses', entityId: String(id), siteCode: site.siteCode })
    if (!siteDenied.allowed) return NextResponse.json({ success: false, error: siteDenied.reason || 'Not allowed for this site' }, { status: 403 })
    const updateData: any = {
      ...(body.claimNo !== undefined ? { claimNo: String(body.claimNo).trim() } : {}),
      ...(body.siteId !== undefined ? { siteId, siteType: body.siteType === 'HO' ? 'HO' : 'Site' } : {}),
      ...(body.expenseType !== undefined ? { expenseType: String(body.expenseType) } : {}),
      ...(body.jobCode !== undefined ? { jobCode: body.jobCode ? String(body.jobCode) : null } : {}),
      ...(body.costCenter !== undefined ? { costCenter: body.costCenter ? String(body.costCenter) : null } : {}),
      ...(body.department !== undefined ? { department: body.department ? String(body.department) : null } : {}),
      ...(body.projectManager !== undefined ? { projectManager: body.projectManager ? String(body.projectManager) : null } : {}),
      ...(body.billNo !== undefined ? { billNo: body.billNo ? String(body.billNo) : null } : {}),
      ...(body.gstAmount !== undefined ? { gstAmount: Number(body.gstAmount) || 0 } : {}),
      ...(body.tdsAmount !== undefined ? { tdsAmount: Number(body.tdsAmount) || 0 } : {}),
      ...(body.remarks !== undefined ? { remarks: body.remarks ? String(body.remarks) : null } : {}),
      date,
      totalAmount,
      status: 'Draft',
      approvalStatus: 'Draft',
      managerApprovedBy: null,
      managerApprovedAt: null,
      verifiedBy: null,
      verifiedAt: null,
      approvedBy: null,
      ...(items ? { items: { deleteMany: {}, create: items } } : {}),
    }
    const record = await pdb.finExpenseClaim.update({
      where: { id },
      data: updateData,
      include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating site expense:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Invalid claim id' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const { claim, denied } = await assertClaimAccess(pdb, request, actor, 'EXPENSES_DELETE', id)
    if (!claim) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (!denied?.allowed) return NextResponse.json({ success: false, error: denied?.reason || 'Not allowed to delete claims' }, { status: 403 })
    if (!['Draft', 'Rejected'].includes(claim.status)) {
      return NextResponse.json({ success: false, error: 'Only Draft or Rejected claims can be deleted' }, { status: 409 })
    }
    await pdb.finExpenseClaim.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting site expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
