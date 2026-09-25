import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { notifyFinance, deriveFinYear, SITE_APPROVERS, inr } from '@/lib/notification-bus'

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
    notifyFinance(pdb, { ...base, templateCode: 'SITE_EXPENSE_APPROVAL_REQUIRED', title: `Approval Required: Site Expense ${claim.claimNo}`,
      message: `${claim.submittedBy} — ${claim.expenseType} ${inr(claim.totalAmount)}${siteCode ? ` • ${siteCode}` : ''}`,
      type: 'warning', priority: 'P1', recipients: SITE_APPROVERS(siteCode) })
  } else {
    const ok = kind === 'approved'
    // submittedBy is free text on older claims; only notify it when it is an email.
    const recipients = [claim.submittedBy].filter((e: string) => e && e.includes('@'))
    if (!recipients.length) return
    notifyFinance(pdb, { ...base, templateCode: ok ? 'SITE_EXPENSE_APPROVED' : 'SITE_EXPENSE_REJECTED',
      title: ok ? `Your Site Expense ${claim.claimNo} was approved` : `Your Site Expense ${claim.claimNo} was rejected`,
      message: ok ? `${inr(claim.totalAmount)} fully approved` : `Reason: ${comments || '—'}`,
      type: ok ? 'success' : 'error', priority: ok ? 'P2' : 'P1', recipients })
  }
}

export const dynamic = 'force-dynamic'

const APPROVAL_STEPS = ['site_engineer', 'project_manager', 'finance']

function getNextStep(currentIndex: number): string | null {
  return currentIndex < APPROVAL_STEPS.length - 1 ? APPROVAL_STEPS[currentIndex + 1] : null
}

export async function GET(request: NextRequest, { params }: any) {
  try {
    const { id } = await params
    const pdb = getDbForRequest(request)
    const record = await pdb.finExpenseClaim.findUnique({
      where: { id: Number(id) },
      include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
    })
    if (!record) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error fetching site expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const { id } = await params
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const existing = await pdb.finExpenseClaim.findUnique({
      where: { id: Number(id) },
      include: { items: true, approvals: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if (body.action === 'submit') {
      if (existing.status !== 'Draft' && existing.status !== 'Rejected') {
        return NextResponse.json({ success: false, error: `Cannot submit a claim with status '${existing.status}'` }, { status: 400 })
      }
      await pdb.finExpenseClaim.update({
        where: { id: Number(id) },
        data: { status: 'Pending', approvalStatus: 'Pending' },
      })
      const updated = await pdb.finExpenseClaim.findUnique({
        where: { id: Number(id) },
        include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
      })
      if (updated) notifySE(pdb, updated, request.headers.get('x-actor-email') || body.actor || null, 'submit')
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.action === 'pay') {
      if (existing.status !== 'Approved') {
        return NextResponse.json({ success: false, error: `Only Approved claims can be marked as paid (current status: '${existing.status}')` }, { status: 400 })
      }
      await pdb.finExpenseClaim.update({
        where: { id: Number(id) },
        data: { status: 'Posted', approvalStatus: 'Approved', postedAt: new Date() },
      })
      const updated = await pdb.finExpenseClaim.findUnique({
        where: { id: Number(id) },
        include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.action === 'approve' || body.action === 'reject') {
      const action = body.action
      const role = body.role
      const stepIndex = APPROVAL_STEPS.indexOf(role)
      if (stepIndex === -1) {
        return NextResponse.json({ success: false, error: 'Invalid approval role' }, { status: 400 })
      }
      if (existing.status !== 'Pending') {
        return NextResponse.json({ success: false, error: `Cannot ${action} a claim with status '${existing.status}'` }, { status: 400 })
      }

      const stepStatus = action === 'approve' ? 'Approved' : 'Rejected'

      await pdb.finApprovalLog.create({
        data: {
          entityType: 'SiteExpense',
          entityId: String(id),
          status: stepStatus,
          action: role,
          makerId: body.userId ?? null,
          checkerId: body.userId ?? null,
          comments: body.comments ?? null,
        },
      })

      if (action === 'reject') {
        await pdb.finExpenseClaim.update({
          where: { id: Number(id) },
          data: { approvalStatus: 'Rejected', status: 'Rejected' },
        })
        const updated = await pdb.finExpenseClaim.findUnique({
          where: { id: Number(id) },
          include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
        })
        if (updated) notifySE(pdb, updated, request.headers.get('x-actor-email') || body.actor || null, 'rejected', body.comments)
        return NextResponse.json({ success: true, data: updated })
      }

      const isLastStep = stepIndex === APPROVAL_STEPS.length - 1

      if (isLastStep) {
        await pdb.finExpenseClaim.update({
          where: { id: Number(id) },
          data: {
            approvalStatus: 'Approved',
            status: 'Approved',
            approvedBy: body.userId ?? null,
          },
        })

        if (body.autoPost !== false) {
          const entryNo = 'JE-SE/' + String(id).padStart(4, '0')
          const expenseAccounts = await pdb.finAccount.findMany({
            where: { group: { in: ['Expenses', 'Direct Expenses', 'Indirect Expenses'] } },
          })
          const defaultExpenseId = expenseAccounts[0]?.id
          const cashAccounts = await pdb.finAccount.findMany({
            where: { group: { in: ['Assets', 'Current Assets'] } },
          })
          const defaultCashId = cashAccounts[0]?.id

          if (defaultExpenseId && defaultCashId) {
            const lines = [
              { accountId: defaultExpenseId, description: 'Site Expense - ' + existing.claimNo, debit: existing.totalAmount, credit: 0 },
              { accountId: defaultCashId, description: 'Cash - ' + existing.claimNo, debit: 0, credit: existing.totalAmount },
            ]
            await pdb.finJournalEntry.create({
              data: {
                entryNo,
                entryDate: new Date(),
                description: 'Auto-generated for site expense: ' + existing.claimNo,
                siteId: existing.siteId,
                finSiteId: existing.siteId,
                status: 'Draft',
                totalDebit: existing.totalAmount,
                totalCredit: existing.totalAmount,
                lines: { create: lines },
              },
            })
          }
        }

        const updated = await pdb.finExpenseClaim.findUnique({
          where: { id: Number(id) },
          include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
        })
        if (updated) notifySE(pdb, updated, request.headers.get('x-actor-email') || body.actor || null, 'approved')
        return NextResponse.json({ success: true, data: updated })
      }

      await pdb.finExpenseClaim.update({
        where: { id: Number(id) },
        data: { approvalStatus: 'Pending' },
      })

      const updated = await pdb.finExpenseClaim.findUnique({
        where: { id: Number(id) },
        include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.action === 'post') {
      const entryNo = 'JE-SE/' + String(id).padStart(4, '0')
      const expenseAccounts = await pdb.finAccount.findMany({
        where: { group: { in: ['Expenses', 'Direct Expenses', 'Indirect Expenses'] } },
      })
      const defaultExpenseId = expenseAccounts[0]?.id
      const cashAccounts = await pdb.finAccount.findMany({
        where: { group: { in: ['Assets', 'Current Assets'] } },
      })
      const defaultCashId = cashAccounts[0]?.id

      if (!defaultExpenseId || !defaultCashId) {
        return NextResponse.json({ success: false, error: 'No default accounts found. Create accounts first.' }, { status: 400 })
      }

      const lines = [
        { accountId: defaultExpenseId, description: 'Site Expense - ' + existing.claimNo, debit: existing.totalAmount, credit: 0 },
        { accountId: defaultCashId, description: 'Cash - ' + existing.claimNo, debit: 0, credit: existing.totalAmount },
      ]
      await pdb.finJournalEntry.create({
        data: {
          entryNo,
          entryDate: new Date(),
          description: 'Manual journal for site expense: ' + existing.claimNo,
          siteId: existing.siteId,
          finSiteId: existing.siteId,
          status: 'Draft',
          totalDebit: existing.totalAmount,
          totalCredit: existing.totalAmount,
          lines: { create: lines },
        },
      })

      const updated = await pdb.finExpenseClaim.findUnique({
        where: { id: Number(id) },
        include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    const { items, action, ...data } = body
    const totalAmount = items?.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0) ?? existing.totalAmount

    const updateData: any = { ...data, totalAmount }
    if (data.date) updateData.date = new Date(data.date)
    if (data.siteId) updateData.siteId = Number(data.siteId)
    if (data.receivedAmount !== undefined) updateData.receivedAmount = Number(data.receivedAmount) || 0

    if (items) {
      await pdb.finExpenseItem.deleteMany({ where: { claimId: Number(id) } })
      updateData.items = {
        create: items.map((i: any) => ({
          itemDate: i.itemDate ? new Date(i.itemDate) : null,
          category: i.category ?? '',
          name: i.name ?? null,
          description: i.description ?? null,
          amount: Number(i.amount) || 0,
          remark: i.remark ?? null,
        })),
      }
    }

    const record = await pdb.finExpenseClaim.update({
      where: { id: Number(id) },
      data: updateData,
      include: { site: true, items: true, approvals: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating site expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { id } = await params
    const pdb = getDbForRequest(request)
    await pdb.finExpenseClaim.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting site expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
