import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { postJournalEntry, GL_ACCOUNTS } from '@/lib/gl-posting'
import { assertPermission } from '@/lib/fin-rbac'
import { nextSeriesCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.accountsReceivable.findMany({ orderBy: { dueDate: 'asc' }, include: { site: true } })
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
    const { actor: _actor, ...createData } = body
    const record = isBlank(createData.invoiceNo)
      ? await withCodeRetry(() => nextSeriesCode(pdb, 'ar'), (invoiceNo) => pdb.accountsReceivable.create({ data: { ...createData, invoiceNo } }))
      : await pdb.accountsReceivable.create({ data: createData })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, actor, ...data } = body
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
      const result = await pdb.accountsReceivable.deleteMany({ where: { id: { in: ids } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await pdb.accountsReceivable.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AR record:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
