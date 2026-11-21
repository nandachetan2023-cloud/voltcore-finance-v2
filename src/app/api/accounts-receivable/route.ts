import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { postJournalEntry, GL_ACCOUNTS, checkPostedJournalEntry, reverseJournalEntry } from '@/lib/gl-posting'
import { assertPermission } from '@/lib/fin-rbac'
import { nextSeriesCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function resolveApprovedTax(pdb: any, amount: number, taxCodeId: unknown) {
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Taxable amount must be a non-negative number' } as const
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
  const cgstAmount = money(amount * taxCode.cgstRate / 100)
  const sgstAmount = money(amount * taxCode.sgstRate / 100)
  const igstAmount = money(amount * taxCode.igstRate / 100)
  const cessAmount = money(amount * taxCode.cessRate / 100)
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
    const records = await pdb.accountsReceivable.findMany({ orderBy: { dueDate: 'asc' }, include: { site: true, workOrder: true } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching AR:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const missing = ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager']
      .filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const denied = await assertPermission(pdb, body.actor || '', 'AR_CREATE', { request, module: 'AR', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create AR invoices' }, { status: 403 })
    const { actor: _actor, lines: _lines, ...createData } = body
    const workOrderNo = String(createData.workOrderNo || '').trim()
    if (workOrderNo) {
      const workOrder = await pdb.finWorkOrder.findUnique({ where: { workOrderNo }, include: { customer: true } })
      if (!workOrder || workOrder.siteId !== Number(createData.siteId) || workOrder.jobCode !== createData.jobCode ||
          (createData.partyId && workOrder.customerId !== Number(createData.partyId))) {
        return NextResponse.json({ success: false, error: 'Selected customer work order does not match the client, site, and job' }, { status: 400 })
      }
      if (String(createData.client || '').trim() !== workOrder.customer.name) {
        return NextResponse.json({ success: false, error: 'Client name must match the selected customer Work Order' }, { status: 400 })
      }
      createData.partyId = workOrder.customerId
      createData.workOrderId = workOrder.id
      createData.workOrderNo = workOrder.workOrderNo
    } else {
      createData.workOrderId = null
      createData.workOrderNo = null
    }
    createData.poNo = createData.poNo || 'NA'
    const amount = Number(createData.amount)
    if (!createData.taxCodeId && Number(createData.tax) > 0) {
      return NextResponse.json({ success: false, error: 'Select an approved GST tax code; GST rates are never assumed' }, { status: 400 })
    }
    const tax = await resolveApprovedTax(pdb, amount, createData.taxCodeId)
    if ('error' in tax) return NextResponse.json({ success: false, error: tax.error }, { status: 400 })
    Object.assign(createData, {
      amount,
      taxCodeId: tax.taxCodeId,
      tax: tax.totalTax,
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      cessAmount: tax.cessAmount,
      totalAmount: money(amount + tax.totalTax),
    })
    if (createData.dueDate) createData.dueDate = new Date(createData.dueDate)
    const record = isBlank(createData.invoiceNo)
      ? await withCodeRetry(() => nextSeriesCode(pdb, 'ar'), (invoiceNo) => pdb.accountsReceivable.create({ data: { ...createData, invoiceNo } }))
      : await pdb.accountsReceivable.create({ data: createData })
    await postJournalEntry(pdb, {
      prefix: 'JE-AR-LEGACY',
      voucherType: 'Journal',
      entryDate: record.dueDate,
      description: `AR Invoice ${record.invoiceNo}`,
      reference: record.invoiceNo,
      siteId: record.siteId,
      jobCode: record.jobCode,
      poNo: record.poNo,
      costCenter: record.costCenter,
      department: record.department,
      projectManager: record.projectManager,
      lines: [
        { accountCode: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: record.totalAmount, credit: 0 },
        { accountCode: GL_ACCOUNTS.PROJECT_REVENUE, debit: 0, credit: record.amount },
        ...(tax.totalTax > 0 && tax.taxCode?.outputAccountCode
          ? [{ accountCode: tax.taxCode.outputAccountCode, debit: 0, credit: tax.totalTax }]
          : []),
      ],
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, actor, lines: _lines, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const missing = ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager']
      .filter(k => data[k] === undefined || data[k] === null || data[k] === '')
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }
    const site = data.siteId ? await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }) : null
    const denied = await assertPermission(pdb, actor || '', 'AR_EDIT', { request, module: 'AR', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit AR invoices' }, { status: 403 })

    const existing = await pdb.accountsReceivable.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'AR invoice not found' }, { status: 404 })

    // Check if AR invoice has a posted journal entry — if so, require credit note instead
    const { hasPostedEntry, entry } = await checkPostedJournalEntry(pdb, existing.invoiceNo)
    if (hasPostedEntry) {
      return NextResponse.json({
        success: false,
        error: 'This AR invoice has a posted GL entry and cannot be edited directly. Issue a Credit Note to reverse or adjust the transaction.',
        requiresCreditNote: true,
        journalEntry: entry?.entryNo,
      }, { status: 409 })
    }

    if (existing.receivedAmount > 0) return NextResponse.json({ success: false, error: 'Invoices with posted receipts cannot be edited; issue a credit note or adjustment' }, { status: 409 })
    if (data.workOrderNo !== undefined) {
      const workOrderNo = String(data.workOrderNo || '').trim()
      if (workOrderNo) {
        const workOrder = await pdb.finWorkOrder.findUnique({ where: { workOrderNo }, include: { customer: true } })
        if (!workOrder || workOrder.siteId !== Number(data.siteId) || workOrder.jobCode !== data.jobCode ||
            (data.partyId && workOrder.customerId !== Number(data.partyId))) {
          return NextResponse.json({ success: false, error: 'Selected customer work order does not match the client, site, and job' }, { status: 400 })
        }
        if (String(data.client || '').trim() !== workOrder.customer.name) {
          return NextResponse.json({ success: false, error: 'Client name must match the selected customer Work Order' }, { status: 400 })
        }
        data.partyId = workOrder.customerId
        data.workOrderId = workOrder.id
        data.workOrderNo = workOrder.workOrderNo
      } else {
        data.workOrderId = null
        data.workOrderNo = null
      }
    }
    data.poNo = data.poNo || 'NA'
    const amount = Number(data.amount)
    const taxCodeId = data.taxCodeId !== undefined ? data.taxCodeId : existing.taxCodeId
    if (!taxCodeId && Number(data.tax) > 0) {
      return NextResponse.json({ success: false, error: 'Select an approved GST tax code; GST rates are never assumed' }, { status: 400 })
    }
    const tax = await resolveApprovedTax(pdb, amount, taxCodeId)
    if ('error' in tax) return NextResponse.json({ success: false, error: tax.error }, { status: 400 })
    Object.assign(data, {
      amount,
      taxCodeId: tax.taxCodeId,
      tax: tax.totalTax,
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      cessAmount: tax.cessAmount,
      totalAmount: money(amount + tax.totalTax),
    })
    if (data.dueDate) data.dueDate = new Date(data.dueDate)
    // Capture the pre-update state so we can post the GL entry for only the
    // *delta* in receivedAmount — this route also handles unrelated field
    // edits (remarks, status, etc.), and receivedAmount can be resent
    // unchanged on those, so we must diff against the stored value rather
    // than just checking whether the field is present in the payload.
    const before = await pdb.accountsReceivable.findUnique({ where: { id } })

    const record = await pdb.accountsReceivable.update({ where: { id }, data })

    if (before && data.receivedAmount !== undefined) {
      const delta = Number(record.receivedAmount) - Number(before.receivedAmount)
      if (delta > 0) {
        await postJournalEntry(pdb, {
          prefix: 'JE-AR-RCPT',
          voucherType: 'Receipt',
          entryDate: record.receivedDate || new Date(),
          description: `Receipt against invoice ${record.invoiceNo} - ${record.client}`,
          reference: record.paymentRef,
          siteId: record.siteId,
          jobCode: record.jobCode,
          poNo: record.poNo,
          costCenter: record.costCenter,
          department: record.department,
          projectManager: record.projectManager,
          lines: [
            { accountCode: GL_ACCOUNTS.BANK, debit: delta, credit: 0 },
            { accountCode: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: 0, credit: delta },
          ],
        })
      }
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, actor, 'AR_DELETE', { request, module: 'AR' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete AR invoices' }, { status: 403 })
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
      if (ids.length === 0) return NextResponse.json({ success: false, error: 'No valid ids provided' }, { status: 400 })
      // Check each invoice for posted journal entries
      for (const invId of ids) {
        const inv = await pdb.accountsReceivable.findUnique({ where: { id: invId } })
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
      const result = await pdb.accountsReceivable.deleteMany({ where: { id: { in: ids } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const existing = await pdb.accountsReceivable.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'AR invoice not found' }, { status: 404 })
    const { hasPostedEntry, entry } = await checkPostedJournalEntry(pdb, existing.invoiceNo)
    if (hasPostedEntry) {
      return NextResponse.json({
        success: false,
        error: `This invoice has a posted GL entry (${entry?.entryNo}) and cannot be deleted. Issue a Credit Note to reverse the transaction.`,
        requiresCreditNote: true,
        journalEntry: entry?.entryNo,
      }, { status: 409 })
    }
    await pdb.accountsReceivable.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
