import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { postJournalEntry, GL_ACCOUNTS, checkPostedJournalEntry, reverseJournalEntry } from '@/lib/gl-posting'
import { assertPermission } from '@/lib/fin-rbac'
import { notifyFinance, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'
import { nextSeriesCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function resolveApprovedTax(pdb: any, taxableValue: number, taxCodeId: unknown) {
  if (!Number.isFinite(taxableValue) || taxableValue < 0) return { error: 'Taxable value must be a non-negative amount' } as const
  if (taxCodeId === undefined || taxCodeId === null || taxCodeId === '') {
    return { taxCode: null, taxCodeId: null, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, cessAmount: 0, totalTax: 0 } as const
  }
  const taxCode = await pdb.finTaxCode.findUnique({ where: { id: Number(taxCodeId) } })
  if (!taxCode || taxCode.status !== 'Approved') return { error: 'Select an approved GST tax code' } as const
  const outputAccount = taxCode.outputAccountCode
    ? await pdb.finAccount.findUnique({ where: { accountCode: taxCode.outputAccountCode } })
    : null
  if (!outputAccount?.isActive || !['Liability', 'Current Liability'].includes(outputAccount.type)) {
    return { error: 'The approved tax code has no active output GST liability account' } as const
  }
  const cgstAmount = money(taxableValue * taxCode.cgstRate / 100)
  const sgstAmount = money(taxableValue * taxCode.sgstRate / 100)
  const igstAmount = money(taxableValue * taxCode.igstRate / 100)
  const cessAmount = money(taxableValue * taxCode.cessRate / 100)
  return {
    taxCode,
    taxCodeId: taxCode.id,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    totalTax: money(cgstAmount + sgstAmount + igstAmount + cessAmount),
  } as const
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finInvoice.findMany({
      orderBy: { invoiceDate: 'desc' },
      include: { site: true, party: true, taxCode: true, workOrder: true },
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
    const missing = ['siteId', 'jobCode', 'workOrderId', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const pdb = getDbForRequest(request)
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const workOrder = await pdb.finWorkOrder.findUnique({ where: { id: Number(body.workOrderId) } })
    if (!workOrder || workOrder.siteId !== Number(body.siteId) || workOrder.jobCode !== body.jobCode || workOrder.customerId !== Number(body.partyId)) {
      return NextResponse.json({ success: false, error: 'Select a customer work order matching the client, site, and job' }, { status: 400 })
    }
    const denied = await assertPermission(pdb, body.actor || '', 'AR_CREATE', { request, module: 'AR', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create invoices' }, { status: 403 })
    const { actor: _actor, lines: _lines, workOrderNo: _workOrderNo, poId: _poId, ...createData } = body
    createData.poId = null
    createData.poNo = null
    const taxableValue = Number(createData.taxableValue ?? createData.invoiceValue)
    if (!createData.taxCodeId && Number(createData.gstValue) > 0) {
      return NextResponse.json({ success: false, error: 'Select an approved GST tax code; GST rates are never assumed' }, { status: 400 })
    }
    const tax = await resolveApprovedTax(pdb, taxableValue, createData.taxCodeId)
    if ('error' in tax) return NextResponse.json({ success: false, error: tax.error }, { status: 400 })
    Object.assign(createData, {
      invoiceValue: taxableValue,
      taxableValue,
      taxCodeId: tax.taxCodeId,
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      cessAmount: tax.cessAmount,
      gstValue: tax.totalTax,
      grandTotal: money(taxableValue + tax.totalTax),
      balanceAmount: money(taxableValue + tax.totalTax),
    })
    // Prisma expects Date objects, but JSON sends strings - coerce
    if (createData.invoiceDate) createData.invoiceDate = new Date(createData.invoiceDate)
    if (createData.dueDate) createData.dueDate = new Date(createData.dueDate)
    if (createData.eInvoiceDate) createData.eInvoiceDate = new Date(createData.eInvoiceDate)
    if (createData.receivedDate) createData.receivedDate = new Date(createData.receivedDate)
    const record = await pdb.$transaction(async (tx: any) => {
      const created = isBlank(createData.invoiceNo)
        ? await withCodeRetry(() => nextSeriesCode(tx, 'invoice'), (invoiceNo) => tx.finInvoice.create({ data: { ...createData, invoiceNo } }))
        : await tx.finInvoice.create({ data: createData })

      await postJournalEntry(tx, {
        prefix: 'JE-AR',
        voucherType: 'Journal',
        entryDate: created.invoiceDate,
        description: `AR Invoice ${created.invoiceNo}`,
        reference: created.invoiceNo,
        siteId: created.siteId,
        jobCode: created.jobCode,
        poNo: 'NA',
        costCenter: created.costCenter,
        department: created.department,
        projectManager: created.projectManager,
        lines: [
          { accountCode: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: created.grandTotal, credit: 0 },
          { accountCode: GL_ACCOUNTS.PROJECT_REVENUE, debit: 0, credit: created.invoiceValue },
          ...(tax.totalTax > 0 && tax.taxCode?.outputAccountCode
            ? [{ accountCode: tax.taxCode.outputAccountCode, debit: 0, credit: tax.totalTax }]
            : []),
        ],
      })
      return created
    })

    // Ultra notification - Sales Invoice created
    notifyFinance(pdb, {
      entityType: 'FinInvoice',
      entityId: String(record.id),
      templateCode: 'INVOICE_CREATED',
      vars: { invoiceNo: record.invoiceNo, client: record.client || 'Client', amount: inr(record.grandTotal), siteCode: site?.siteCode || '' },
      title: `New Invoice ${record.invoiceNo}`,
      message: `${record.client || 'Client'} — ${inr(record.grandTotal)} • Due ${record.dueDate ? new Date(record.dueDate).toLocaleDateString('en-IN') : '—'} • ${site?.siteCode || ''}`,
      type: 'success',
      priority: 'P1',
      siteCode: site?.siteCode || null,
      jobCode: record.jobCode || null,
      finYear: deriveFinYear(record.invoiceDate),
      amount: record.grandTotal,
      link: 'fin-invoices',
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
    const { id, actor, lines: _lines, poId: _poId, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const missing = ['siteId', 'jobCode', 'costCenter', 'department', 'projectManager'].filter(k => data[k] === undefined || data[k] === null || data[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    if (data.invoiceDate) data.invoiceDate = new Date(data.invoiceDate)
    if (data.dueDate) data.dueDate = new Date(data.dueDate)
    if (data.eInvoiceDate) data.eInvoiceDate = new Date(data.eInvoiceDate)
    if (data.receivedDate) data.receivedDate = new Date(data.receivedDate)
    const pdb = getDbForRequest(request)
    const existing = await pdb.finInvoice.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })

    // Check if invoice has a posted journal entry — if so, require credit note instead
    const { hasPostedEntry, entry } = await checkPostedJournalEntry(pdb, existing.invoiceNo)
    if (hasPostedEntry) {
      return NextResponse.json({
        success: false,
        error: 'This invoice has a posted GL entry and cannot be edited directly. Issue a Credit Note to reverse or adjust the transaction.',
        requiresCreditNote: true,
        journalEntry: entry?.entryNo,
      }, { status: 409 })
    }

    if (data.workOrderId !== undefined && data.workOrderId !== null) {
      const workOrder = await pdb.finWorkOrder.findUnique({ where: { id: Number(data.workOrderId) } })
      if (!workOrder || workOrder.siteId !== Number(data.siteId) || workOrder.jobCode !== data.jobCode || workOrder.customerId !== Number(data.partyId)) {
        return NextResponse.json({ success: false, error: 'Select a customer work order matching the client, site, and job' }, { status: 400 })
      }
    }
    if (existing.receivedAmount > 0 || existing.amountPaid > 0 || existing.status === 'Paid') {
      return NextResponse.json({ success: false, error: 'Invoices with posted receipts cannot be edited; issue a credit note or adjustment' }, { status: 409 })
    }
    const site = data.siteId ? await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }) : null
    const denied = await assertPermission(pdb, actor || '', 'AR_EDIT', { request, module: 'AR', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit invoices' }, { status: 403 })
    const taxableValue = Number(data.taxableValue ?? data.invoiceValue)
    const taxCodeId = data.taxCodeId !== undefined ? data.taxCodeId : existing.taxCodeId
    if (!taxCodeId && Number(data.gstValue) > 0) {
      return NextResponse.json({ success: false, error: 'Select an approved GST tax code; GST rates are never assumed' }, { status: 400 })
    }
    const tax = await resolveApprovedTax(pdb, taxableValue, taxCodeId)
    if ('error' in tax) return NextResponse.json({ success: false, error: tax.error }, { status: 400 })
    Object.assign(data, {
      invoiceValue: taxableValue,
      taxableValue,
      taxCodeId: tax.taxCodeId,
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      cessAmount: tax.cessAmount,
      gstValue: tax.totalTax,
      grandTotal: money(taxableValue + tax.totalTax),
      balanceAmount: money(taxableValue + tax.totalTax),
    })
    const record = await pdb.finInvoice.update({ where: { id }, data })
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete invoices' }, { status: 403 })
    const ids = searchParams.get('ids')
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean)
      if (idList.length === 0) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      // Check each invoice for posted journal entries
      for (const invId of idList) {
        const inv = await pdb.finInvoice.findUnique({ where: { id: invId } })
        if (inv) {
          const { hasPostedEntry, entry } = await checkPostedJournalEntry(pdb, inv.invoiceNo)
          if (hasPostedEntry) {
            return NextResponse.json({
              success: false,
              error: `Invoice ${inv.invoiceNo} has a posted GL entry (${entry?.entryNo}) and cannot be deleted. Issue a Credit Note to reverse the transaction.`,
              requiresCreditNote: true,
              journalEntry: entry?.entryNo,
            }, { status: 409 })
          }
        }
      }
      const result = await pdb.finInvoice.deleteMany({ where: { id: { in: idList } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const existing = await pdb.finInvoice.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    const { hasPostedEntry, entry } = await checkPostedJournalEntry(pdb, existing.invoiceNo)
    if (hasPostedEntry) {
      return NextResponse.json({
        success: false,
        error: `This invoice has a posted GL entry (${entry?.entryNo}) and cannot be deleted. Issue a Credit Note to reverse the transaction.`,
        requiresCreditNote: true,
        journalEntry: entry?.entryNo,
      }, { status: 409 })
    }
    await pdb.finInvoice.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
