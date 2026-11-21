import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { postJournalEntry, GL_ACCOUNTS, checkPostedJournalEntry, reverseJournalEntry } from '@/lib/gl-posting'
import { assertPermission } from '@/lib/fin-rbac'
import { notifyFinance, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'
import { nextSeriesCode, withCodeRetry } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function validateApDimensions(pdb: any, body: Record<string, any>) {
  const missing = ['siteId', 'jobCode', 'costCenter', 'department', 'projectManager']
    .filter(key => body[key] === undefined || body[key] === null || String(body[key]).trim() === '')
  if (missing.length) return { error: `Missing required fields: ${missing.join(', ')}` }

  const siteId = Number(body.siteId)
  if (!Number.isInteger(siteId) || siteId <= 0) return { error: 'Select a valid site' }
  const site = await pdb.finSite.findUnique({ where: { id: siteId }, select: { id: true, siteCode: true } })
  if (!site) return { error: 'Selected site was not found' }

  const jobCode = String(body.jobCode).trim()
  const job = await pdb.finJob.findUnique({ where: { jobCode }, select: { siteId: true } })
  if (!job) return { error: 'Selected job was not found' }
  if (job.siteId !== siteId) return { error: 'Selected job does not belong to the selected site' }

  const poId = body.poId === undefined || body.poId === null || body.poId === '' || body.poId === 'NA'
    ? null
    : Number(body.poId)
  if (poId !== null && (!Number.isInteger(poId) || poId <= 0)) return { error: 'Select a valid purchase order or NA' }
  const po = poId === null
    ? null
    : await pdb.finPurchaseOrder.findUnique({ where: { id: poId }, select: { id: true, poNo: true, siteId: true, jobCode: true } })
  if (poId !== null && !po) return { error: 'Selected purchase order was not found' }
  if (po && po.siteId !== siteId) return { error: 'Selected purchase order does not belong to the selected site' }
  if (po?.jobCode && po.jobCode !== jobCode) return { error: 'Selected purchase order does not belong to the selected job' }

  return { site, po, poId, jobCode }
}

async function resolveApprovedTax(pdb: any, amount: number, taxCodeId: unknown) {
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Bill amount must be a non-negative number' } as const
  if (taxCodeId === undefined || taxCodeId === null || taxCodeId === '') {
    return { taxCode: null, taxCodeId: null, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, cessAmount: 0, totalTax: 0 } as const
  }
  const taxCode = await pdb.finTaxCode.findUnique({ where: { id: Number(taxCodeId) } })
  if (!taxCode || taxCode.status !== 'Approved') return { error: 'Select an approved GST tax code' } as const
  const inputAccount = taxCode.inputAccountCode
    ? await pdb.finAccount.findUnique({ where: { accountCode: taxCode.inputAccountCode } })
    : null
  if (!inputAccount?.isActive || !['Asset', 'Current Asset'].includes(inputAccount.type)) {
    return { error: 'The approved tax code has no active input GST asset account' } as const
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
    const records = await pdb.accountsPayable.findMany({ orderBy: { dueDate: 'asc' }, include: { site: true, taxCode: true, po: { select: { id: true, poNo: true } } } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching AP:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.billDate || Number.isNaN(new Date(body.billDate).getTime())) {
      return NextResponse.json({ success: false, error: 'A valid supplier bill date is required' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    const dimensions = await validateApDimensions(pdb, body)
    if ('error' in dimensions) return NextResponse.json({ success: false, error: dimensions.error }, { status: 400 })
    const { site } = dimensions
    const denied = await assertPermission(pdb, body.actor || '', 'AP_CREATE', { request, module: 'AP', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create AP bills' }, { status: 403 })
    const { actor: _actor, ...createData } = body
    createData.siteId = site.id
    createData.jobCode = dimensions.jobCode
    createData.poId = dimensions.poId
    createData.costCenter = String(createData.costCenter).trim()
    createData.department = String(createData.department).trim()
    createData.projectManager = String(createData.projectManager).trim()
    createData.createdBy = request.cookies.get('erp_user_email')?.value || body.actor || request.headers.get('x-actor-email') || null
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
      itcEligible: false,
      itcReviewedBy: null,
      itcReviewedAt: null,
    })
    createData.billDate = new Date(createData.billDate)
    if (createData.dueDate) createData.dueDate = new Date(createData.dueDate)
    const record = await pdb.$transaction(async (tx: any) => {
      const created = createData.billNo
        ? await tx.accountsPayable.create({ data: createData, include: { po: { select: { poNo: true } } } })
        : await withCodeRetry(() => nextSeriesCode(tx, 'ap'), (billNo) => tx.accountsPayable.create({ data: { ...createData, billNo }, include: { po: { select: { poNo: true } } } }))

      await postJournalEntry(tx, {
        prefix: 'JE-AP',
        voucherType: 'Journal',
        entryDate: created.dueDate,
        description: `AP Bill ${created.billNo} - ${created.vendor}`,
        reference: created.billNo,
        siteId: created.siteId,
        jobCode: created.jobCode,
        poNo: created.po?.poNo || 'NA',
        costCenter: created.costCenter,
        department: created.department,
        projectManager: created.projectManager,
        lines: [
          { accountCode: GL_ACCOUNTS.INVENTORY, debit: created.amount, credit: 0 },
          ...(created.tax > 0 && tax.taxCode?.inputAccountCode
            ? [{ accountCode: tax.taxCode.inputAccountCode, debit: created.tax, credit: 0 }]
            : []),
          { accountCode: GL_ACCOUNTS.VENDOR_PAYABLE, debit: 0, credit: created.totalAmount },
        ],
      })
      return created
    })

    const daysToDue = Math.ceil((new Date(record.dueDate).getTime() - Date.now()) / 86400000)
    notifyFinance(pdb, {
      entityType: 'AccountsPayable',
      entityId: String(record.id),
      templateCode: daysToDue <= 7 ? 'AP_BILL_DUE_SOON' : 'AP_BILL_CREATED',
      vars: { billNo: record.billNo, vendor: record.vendor, amount: inr(record.totalAmount), siteCode: site?.siteCode || '' },
      title: `New AP Bill ${record.billNo}`,
      message: `${record.vendor} — ${inr(record.totalAmount)} • Due ${new Date(record.dueDate).toLocaleDateString('en-IN')}${site?.siteCode ? ` • ${site.siteCode}` : ''}`,
      type: daysToDue <= 7 ? 'warning' : 'info',
      priority: daysToDue <= 7 ? 'P1' : 'P2',
      siteCode: site?.siteCode || null,
      jobCode: record.jobCode || null,
      finYear: deriveFinYear(record.dueDate),
      amount: record.totalAmount,
      link: 'accounts-payable',
      actorEmail: body.actor || null,
      recipients: FIN_TEAM(site?.siteCode),
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating AP record:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (body.action === 'approve') {
      const pdb = getDbForRequest(request)
      const bill = await pdb.accountsPayable.findUnique({ where: { id: Number(id) } })
      if (!bill) return NextResponse.json({ success: false, error: 'AP bill not found' }, { status: 404 })
      const actor = request.cookies.get('erp_user_email')?.value || body.actor || request.headers.get('x-actor-email') || ''
      const denied = await assertPermission(pdb, actor, 'AP_APPROVE', { request, module: 'AP', entityId: String(id), siteCode: bill.siteId ? (await pdb.finSite.findUnique({ where: { id: bill.siteId }, select: { siteCode: true } }))?.siteCode : null })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to approve AP bills' }, { status: 403 })
      if (bill.status !== 'Pending') return NextResponse.json({ success: false, error: 'Only submitted AP bills can be approved' }, { status: 409 })
      if (bill.createdBy && bill.createdBy.toLowerCase() === actor.toLowerCase()) {
        return NextResponse.json({ success: false, error: 'The bill creator cannot approve their own bill' }, { status: 403 })
      }
      const [updated] = await pdb.$transaction([
        pdb.accountsPayable.update({ where: { id: Number(id) }, data: { status: 'Approved' } }),
        pdb.finApprovalLog.create({
          data: { entityType: 'AccountsPayable', entityId: String(id), status: 'Approved', action: 'AP bill approval', makerId: bill.createdBy, checkerId: actor },
        }),
      ])
      return NextResponse.json({ success: true, data: updated })
    }
    if (body.action === 'review-itc') {
      const pdb = getDbForRequest(request)
      const bill = await pdb.accountsPayable.findUnique({ where: { id: Number(id) }, include: { taxCode: true } })
      if (!bill) return NextResponse.json({ success: false, error: 'AP bill not found' }, { status: 404 })
      const actor = request.cookies.get('erp_user_email')?.value || body.actor || request.headers.get('x-actor-email') || ''
      const denied = await assertPermission(pdb, actor, 'AP_APPROVE', { request, module: 'AP', entityId: String(id) })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to review ITC' }, { status: 403 })
      if (!['Approved', 'Partially Paid', 'Paid'].includes(bill.status)) {
        return NextResponse.json({ success: false, error: 'Only approved bills can be reviewed for ITC' }, { status: 409 })
      }
      if (!bill.billDate) return NextResponse.json({ success: false, error: 'Supplier bill date is required before ITC review' }, { status: 400 })
      if (bill.tax <= 0 || !bill.taxCode || bill.taxCode.status !== 'Approved') {
        return NextResponse.json({ success: false, error: 'Bill must have GST calculated from an approved tax code before ITC review' }, { status: 400 })
      }
      const eligible = body.itcEligible === true
      const [record] = await pdb.$transaction([
        pdb.accountsPayable.update({
          where: { id: Number(id) },
          data: { itcEligible: eligible, itcReviewedBy: eligible ? actor : null, itcReviewedAt: eligible ? new Date() : null },
        }),
        pdb.finApprovalLog.create({
          data: {
            entityType: 'AccountsPayable',
            entityId: String(id),
            status: eligible ? 'Approved' : 'Rejected',
            action: eligible ? 'ITC eligibility approved' : 'ITC eligibility withdrawn',
            checkerId: actor,
          },
        }),
      ])
      return NextResponse.json({ success: true, data: record })
    }
    if (!data.billDate || Number.isNaN(new Date(data.billDate).getTime())) {
      return NextResponse.json({ success: false, error: 'A valid supplier bill date is required' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    const existing = await pdb.accountsPayable.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'AP bill not found' }, { status: 404 })

    // Check if AP bill has a posted journal entry — if so, require debit note/reversal instead
    const { hasPostedEntry, entry } = await checkPostedJournalEntry(pdb, existing.billNo)
    if (hasPostedEntry) {
      return NextResponse.json({
        success: false,
        error: 'This AP bill has a posted GL entry and cannot be edited directly. Issue a Debit Note or Reversal Voucher to reverse or adjust the transaction.',
        requiresReversal: true,
        journalEntry: entry?.entryNo,
      }, { status: 409 })
    }

    const dimensions = await validateApDimensions(pdb, data)
    if ('error' in dimensions) return NextResponse.json({ success: false, error: dimensions.error }, { status: 400 })
    const { site } = dimensions
    const denied = await assertPermission(pdb, body.actor || '', 'AP_EDIT', { request, module: 'AP', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit AP bills' }, { status: 403 })
    const { actor: _actor, ...updateData } = data
    updateData.siteId = site.id
    updateData.jobCode = dimensions.jobCode
    updateData.poId = dimensions.poId
    updateData.costCenter = String(updateData.costCenter).trim()
    updateData.department = String(updateData.department).trim()
    updateData.projectManager = String(updateData.projectManager).trim()
    const before = await pdb.accountsPayable.findUnique({ where: { id }, select: { status: true } })
    const amount = Number(updateData.amount)
    if (!updateData.taxCodeId && Number(updateData.tax) > 0) {
      return NextResponse.json({ success: false, error: 'Select an approved GST tax code; GST rates are never assumed' }, { status: 400 })
    }
    const tax = await resolveApprovedTax(pdb, amount, updateData.taxCodeId)
    if ('error' in tax) return NextResponse.json({ success: false, error: tax.error }, { status: 400 })
    Object.assign(updateData, {
      amount,
      taxCodeId: tax.taxCodeId,
      tax: tax.totalTax,
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      cessAmount: tax.cessAmount,
      totalAmount: money(amount + tax.totalTax),
      itcEligible: false,
      itcReviewedBy: null,
      itcReviewedAt: null,
    })
    updateData.billDate = new Date(updateData.billDate)
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate)
    const record = await pdb.accountsPayable.update({ where: { id }, data: updateData })
    if (record.status === 'Paid' && before?.status !== 'Paid') {
      notifyFinance(pdb, {
        entityType: 'AccountsPayable',
        entityId: String(record.id),
        templateCode: 'AP_BILL_PAID',
        vars: { billNo: record.billNo, vendor: record.vendor, amount: inr(record.totalAmount) },
        title: `AP Bill ${record.billNo} marked Paid`,
        message: `${record.vendor} — ${inr(record.totalAmount)}${record.paymentRef ? ` • Ref ${record.paymentRef}` : ''}`,
        type: 'success',
        priority: 'P2',
        siteCode: site?.siteCode || null,
        finYear: deriveFinYear(record.dueDate),
        amount: record.totalAmount,
        link: 'accounts-payable',
        actorEmail: body.actor || null,
        recipients: FIN_TEAM(site?.siteCode),
      })
    }
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating AP record:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, actor, 'AP_DELETE', { request, module: 'AP', entityId: id })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete AP bills' }, { status: 403 })
    const existing = await pdb.accountsPayable.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'AP bill not found' }, { status: 404 })

    // Check if AP bill has a posted journal entry — if so, require debit note/reversal instead
    const { hasPostedEntry, entry } = await checkPostedJournalEntry(pdb, existing.billNo)
    if (hasPostedEntry) {
      return NextResponse.json({
        success: false,
        error: `This AP bill has a posted GL entry (${entry?.entryNo}) and cannot be deleted. Issue a Debit Note or Reversal Voucher to reverse the transaction.`,
        requiresReversal: true,
        journalEntry: entry?.entryNo,
      }, { status: 409 })
    }

    await pdb.accountsPayable.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AP record:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
