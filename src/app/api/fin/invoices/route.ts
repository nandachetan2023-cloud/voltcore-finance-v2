import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { postJournalEntry, GL_ACCOUNTS } from '@/lib/gl-posting'
import { assertPermission } from '@/lib/fin-rbac'
import { notifyFinance, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'
import { nextSeriesCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finInvoice.findMany({
      orderBy: { invoiceDate: 'desc' },
      include: { site: true, party: true },
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create invoices' }, { status: 403 })
    const { actor: _actor, ...createData } = body
    // Prisma expects Date objects, but JSON sends strings - coerce
    if (createData.invoiceDate) createData.invoiceDate = new Date(createData.invoiceDate)
    if (createData.dueDate) createData.dueDate = new Date(createData.dueDate)
    if (createData.eInvoiceDate) createData.eInvoiceDate = new Date(createData.eInvoiceDate)
    if (createData.receivedDate) createData.receivedDate = new Date(createData.receivedDate)
    const record = isBlank(createData.invoiceNo)
      ? await withCodeRetry(() => nextSeriesCode(pdb, 'invoice'), (invoiceNo) => pdb.finInvoice.create({ data: { ...createData, invoiceNo } }))
      : await pdb.finInvoice.create({ data: createData })

    // Auto-post the GL entry for this invoice: Dr Accounts Receivable / Cr
    // Project Revenue. FinInvoice has no invoice-type field to distinguish
    // Service vs Material billing, so this always credits Project Revenue —
    // the dominant revenue type for this contractor ERP (known simplification).
    await postJournalEntry(pdb, {
      prefix: 'JE-AR',
      voucherType: 'Journal',
      entryDate: record.invoiceDate,
      description: `AR Invoice ${record.invoiceNo}`,
      reference: record.invoiceNo,
      siteId: record.siteId,
      jobCode: record.jobCode,
      poNo: record.poNo,
      costCenter: record.costCenter,
      department: record.department,
      projectManager: record.projectManager,
      lines: [
        { accountCode: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: record.grandTotal, credit: 0 },
        { accountCode: GL_ACCOUNTS.PROJECT_REVENUE, debit: 0, credit: record.grandTotal },
      ],
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
    const { id, actor, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const missing = ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager'].filter(k => data[k] === undefined || data[k] === null || data[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    if (data.invoiceDate) data.invoiceDate = new Date(data.invoiceDate)
    if (data.dueDate) data.dueDate = new Date(data.dueDate)
    if (data.eInvoiceDate) data.eInvoiceDate = new Date(data.eInvoiceDate)
    if (data.receivedDate) data.receivedDate = new Date(data.receivedDate)
    const pdb = getDbForRequest(request)
    const site = data.siteId ? await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }) : null
    const denied = await assertPermission(pdb, actor || '', 'AR_EDIT', { request, module: 'AR', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit invoices' }, { status: 403 })
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
      const result = await pdb.finInvoice.deleteMany({ where: { id: { in: idList } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await pdb.finInvoice.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
