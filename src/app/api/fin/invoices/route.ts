import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { postJournalEntry, GL_ACCOUNTS } from '@/lib/gl-posting'
import { assertPermission } from '@/lib/fin-rbac'

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
    if (!body.invoiceNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.finInvoice.count()) + 1
      body.invoiceNo = `INV-${year}-${String(count).padStart(3, '0')}`
    }
    const { actor: _actor, ...createData } = body
    const record = await pdb.finInvoice.create({ data: createData })

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
