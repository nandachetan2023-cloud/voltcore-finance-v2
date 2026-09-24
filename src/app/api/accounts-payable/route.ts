import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { postJournalEntry, GL_ACCOUNTS } from '@/lib/gl-posting'
import { assertPermission } from '@/lib/fin-rbac'
import { notifyFinance, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.accountsPayable.findMany({ orderBy: { dueDate: 'asc' }, include: { site: true, po: { select: { id: true, poNo: true } } } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching AP:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const missing = ['siteId', 'jobCode', 'poId', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const pdb = getDbForRequest(request)
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const denied = await assertPermission(pdb, body.actor || '', 'AP_CREATE', { request, module: 'AP', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create AP bills' }, { status: 403 })
    if (!body.billNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.accountsPayable.count()) + 1
      body.billNo = `AP-${year}-${String(count).padStart(3, '0')}`
    }
    const { actor: _actor, ...createData } = body
    const record = await pdb.accountsPayable.create({ data: createData })

    // Auto-post the GL entry for this bill: Dr Inventory / Cr Vendor Payable
    // (matches the spec's own worked example). A posting failure must never
    // block the AP record itself, so this runs after create() and swallows
    // its own errors.
    await postJournalEntry(pdb, {
      prefix: 'JE-AP',
      voucherType: 'Journal',
      entryDate: record.dueDate,
      description: `AP Bill ${record.billNo} - ${record.vendor}`,
      reference: record.billNo,
      siteId: record.siteId,
      jobCode: record.jobCode,
      poNo: null,
      costCenter: record.costCenter,
      department: record.department,
      projectManager: record.projectManager,
      lines: [
        { accountCode: GL_ACCOUNTS.INVENTORY, debit: record.totalAmount, credit: 0 },
        { accountCode: GL_ACCOUNTS.VENDOR_PAYABLE, debit: 0, credit: record.totalAmount },
      ],
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
    const missing = ['siteId', 'jobCode', 'poId', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const site = data.siteId ? await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }) : null
    const denied = await assertPermission(pdb, body.actor || '', 'AP_EDIT', { request, module: 'AP', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit AP bills' }, { status: 403 })
    const { actor: _actor, ...updateData } = data
    const before = await pdb.accountsPayable.findUnique({ where: { id }, select: { status: true } })
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
    await pdb.accountsPayable.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AP record:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
