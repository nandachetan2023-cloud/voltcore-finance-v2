import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { notifyFinance, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'
import { nextPrefixedCode } from '@/lib/auto-number'
import { postJournalEntry, GL_ACCOUNTS, checkPostedJournalEntry } from '@/lib/gl-posting'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finCreditNote.findMany({
      orderBy: { date: 'desc' },
      include: { invoice: true, site: true },
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
    const missing = ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const pdb = getDbForRequest(request)
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const denied = await assertPermission(pdb, body.actor || '', 'AR_CREATE', { request, module: 'AR', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create credit notes' }, { status: 403 })
    if (!body.creditNoteNo) {
      const year = new Date().getFullYear()
      body.creditNoteNo = await nextPrefixedCode(pdb, 'finCreditNote', 'creditNoteNo', `CN/${year}/`, 4)
    }

    const invoiceId = Number(body.invoiceId)
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return NextResponse.json({ success: false, error: 'invoiceId is required to raise a credit note against an invoice' }, { status: 400 })
    }
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'A positive credit note amount is required' }, { status: 400 })
    }
    const invoice = await pdb.finInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Referenced invoice not found' }, { status: 404 })
    }
    if (invoice.siteId !== Number(body.siteId)) {
      return NextResponse.json({ success: false, error: 'Credit note site must match the invoice site' }, { status: 400 })
    }
    if (invoice.status === 'Paid') {
      return NextResponse.json({ success: false, error: `Invoice ${invoice.invoiceNo} is already paid and cannot be credited` }, { status: 409 })
    }
    const outstanding = invoice.balanceAmount > 0
      ? Math.round(invoice.balanceAmount * 100) / 100
      : Math.max(0, Math.round((invoice.grandTotal - invoice.receivedAmount - invoice.tdsDeduction) * 100) / 100)
    if (amount > outstanding + 0.001) {
      return NextResponse.json({ success: false, error: `Credit note amount ₹${amount.toLocaleString('en-IN')} exceeds invoice ${invoice.invoiceNo} outstanding balance ₹${outstanding.toLocaleString('en-IN')}` }, { status: 400 })
    }

    const cnDate = body.date ? new Date(body.date) : new Date()
    if (Number.isNaN(cnDate.getTime())) return NextResponse.json({ success: false, error: 'Invalid credit note date' }, { status: 400 })
    const receivedDate = body.receivedDate ? new Date(body.receivedDate) : null
    const paymentDueDate = body.paymentDueDate ? new Date(body.paymentDueDate) : null

    const { actor: _actor, ...createData } = body
    Object.assign(createData, {
      date: cnDate,
      receivedDate,
      paymentDueDate,
      invoiceId,
      siteId: Number(body.siteId),
      amount,
      invoiceValue: Number(body.invoiceValue) || 0,
      gstValue: Number(body.gstValue) || 0,
      totalInvoiceValue: Number(body.totalInvoiceValue) || 0,
      afterTdsBalance: Number(body.afterTdsBalance) || 0,
      receivedAmount: Number(body.receivedAmount) || 0,
      debitAmount: Number(body.debitAmount) || 0,
      holdAmount: Number(body.holdAmount) || 0,
    })

    const record = await pdb.$transaction(async (tx) => {
      const cn = await tx.finCreditNote.create({ data: createData })
      const newBalance = Math.max(0, Math.round((outstanding - amount) * 100) / 100)
      await tx.finInvoice.update({
        where: { id: invoiceId },
        data: {
          balanceAmount: newBalance,
          status: newBalance <= 0 ? 'Paid' : invoice.status,
        },
      })
      const outstandingRow = await tx.finOutstanding.findFirst({ where: { invoiceId } })
      if (outstandingRow) {
        await tx.finOutstanding.update({
          where: { id: outstandingRow.id },
          data: {
            creditNote: Math.round((Number(outstandingRow.creditNote) + amount) * 100) / 100,
            balanceAmount: Math.max(0, Math.round((Number(outstandingRow.balanceAmount) - amount) * 100) / 100),
          },
        })
      }
      // Atomic reversal journal: Dr Project Revenue / Cr Accounts Receivable
      await postJournalEntry(tx, {
        prefix: 'JE-CN',
        voucherType: 'Journal',
        entryDate: cnDate,
        description: `Credit Note reversal ${cn.creditNoteNo}`,
        reference: cn.creditNoteNo,
        siteId: cn.siteId,
        jobCode: cn.jobCode,
        poNo: cn.poNo,
        costCenter: cn.costCenter,
        department: cn.department,
        projectManager: cn.projectManager,
        lines: [
          { accountCode: GL_ACCOUNTS.PROJECT_REVENUE, debit: amount, credit: 0 },
          { accountCode: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount },
        ],
      })
      return cn
    })

    notifyFinance(pdb, {
      entityType: 'FinCreditNote',
      entityId: String(record.id),
      templateCode: 'CREDIT_NOTE_CREATED',
      vars: { creditNoteNo: record.creditNoteNo, client: record.client || 'Client', amount: inr(amount), siteCode: site?.siteCode || '' },
      title: `Credit Note ${record.creditNoteNo} issued`,
      message: `${record.client || 'Client'} — ${inr(amount)} against ${invoice.invoiceNo} (outstanding ₹${outstanding.toLocaleString('en-IN')} → ₹${Math.max(0, outstanding - amount).toLocaleString('en-IN')})${record.reason ? ` • ${record.reason}` : ''}`,
      type: 'warning',
      priority: 'P1',
      siteCode: site?.siteCode || null,
      jobCode: record.jobCode || null,
      finYear: deriveFinYear(record.date),
      amount: record.amount,
      link: 'fin-credit-notes',
      actorEmail: body.actor || null,
      recipients: FIN_TEAM(site?.siteCode),
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
    const { id, actor, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const missing = ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const pdb = getDbForRequest(request)
    const site = data.siteId ? await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }) : null
    const denied = await assertPermission(pdb, actor || '', 'AR_EDIT', { request, module: 'AR', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit credit notes' }, { status: 403 })
    const existingCn = await pdb.finCreditNote.findUnique({ where: { id } })
    if (!existingCn) return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 })
    const { hasPostedEntry: cnPosted, entry: cnEntry } = await checkPostedJournalEntry(pdb, existingCn.creditNoteNo)
    if (cnPosted) {
      return NextResponse.json({
        success: false,
        error: `Credit note ${existingCn.creditNoteNo} has a posted reversal journal (${cnEntry?.entryNo}) and cannot be edited. Issue a new Credit Note to adjust the transaction.`,
        requiresReversal: true,
        journalEntry: cnEntry?.entryNo,
      }, { status: 409 })
    }
    const record = await pdb.finCreditNote.update({ where: { id }, data })
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
    const actor = request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, actor, 'AR_DELETE', { request, module: 'AR' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete credit notes' }, { status: 403 })
    const ids = searchParams.get('ids')
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean)
      if (idList.length === 0) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      const postedIds = new Set<number>()
      for (const cnId of idList) {
        const cn = await pdb.finCreditNote.findUnique({ where: { id: cnId } })
        if (!cn) continue
        const { hasPostedEntry: cnPosted, entry: cnEntry } = await checkPostedJournalEntry(pdb, cn.creditNoteNo)
        if (cnPosted) postedIds.add(cnId)
      }
      if (postedIds.size > 0) {
        const blocked = postedIds.size
        return NextResponse.json({
          success: false,
          error: `${blocked} credit note(s) have posted reversal journals and cannot be deleted. Issue a reversal/cancellation instead.`,
          requiresReversal: true,
        }, { status: 409 })
      }
      const result = await pdb.finCreditNote.deleteMany({ where: { id: { in: idList } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const existingCnDel = await pdb.finCreditNote.findUnique({ where: { id: Number(id) } })
    if (!existingCnDel) return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 })
    const { hasPostedEntry: cnPostedDel, entry: cnEntryDel } = await checkPostedJournalEntry(pdb, existingCnDel.creditNoteNo)
    if (cnPostedDel) {
      return NextResponse.json({
        success: false,
        error: `Credit note ${existingCnDel.creditNoteNo} has a posted reversal journal (${cnEntryDel?.entryNo}) and cannot be deleted. Issue a reversal/cancellation instead.`,
        requiresReversal: true,
        journalEntry: cnEntryDel?.entryNo,
      }, { status: 409 })
    }
    await pdb.finCreditNote.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
