import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { notifyFinance, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'
import { nextSeriesCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finPurchaseOrder.findMany({
      orderBy: { date: 'desc' },
      include: { site: true },
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
    const missing = ['siteId', 'jobCode', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const pdb = getDbForRequest(request)
    const { actor, ...createData } = body
    const record = isBlank(createData.poNo)
      ? await withCodeRetry(() => nextSeriesCode(pdb, 'po'), (poNo) => pdb.finPurchaseOrder.create({ data: { ...createData, poNo } }))
      : await pdb.finPurchaseOrder.create({ data: createData })
    const site = await pdb.finSite.findUnique({ where: { id: Number(record.siteId) } }).catch(() => null)
    notifyFinance(pdb, {
      entityType: 'FinPurchaseOrder',
      entityId: String(record.id),
      templateCode: 'PO_CREATED',
      vars: { poNo: record.poNo, vendor: record.vendorName, amount: inr(record.totalAmount), siteCode: site?.siteCode || '' },
      title: `New Purchase Order ${record.poNo}`,
      message: `${record.vendorName} — ${inr(record.totalAmount)}${site?.siteCode ? ` • ${site.siteCode}` : ''}`,
      type: 'info',
      priority: 'P2',
      siteCode: site?.siteCode || null,
      jobCode: record.jobCode || null,
      finYear: deriveFinYear(record.date),
      amount: record.totalAmount,
      link: 'fin-purchase-orders',
      actorEmail: actor || request.headers.get('x-actor-email') || null,
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
    const missing = ['siteId', 'jobCode', 'costCenter', 'department', 'projectManager'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finPurchaseOrder.update({ where: { id }, data })
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
    const ids = searchParams.get('ids')
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean)
      if (idList.length === 0) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      const result = await pdb.finPurchaseOrder.deleteMany({ where: { id: { in: idList } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await pdb.finPurchaseOrder.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
