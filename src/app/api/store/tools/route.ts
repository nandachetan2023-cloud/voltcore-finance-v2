import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  logs: { orderBy: { issueDate: 'desc' as const } },
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finTool.findMany({ orderBy: { toolCode: 'asc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching tools:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    if (!body.siteId || !body.name) return NextResponse.json({ success: false, error: 'siteId and name are required' }, { status: 400 })
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create tools' }, { status: 403 })
    let toolCode = body.toolCode
    if (!toolCode) {
      const count = (await pdb.finTool.count()) + 1
      toolCode = `TL-${String(count).padStart(4, '0')}`
    }
    const record = await pdb.finTool.create({
      data: {
        toolCode, name: body.name, category: body.category || null,
        siteId: Number(body.siteId), status: body.status || 'Available', remarks: body.remarks || null,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating tool:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, issueLog, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_EDIT', { request, module: 'Inventory', entityId: String(id) })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit tools' }, { status: 403 })

    // issueLog: { issuedTo, expectedReturnDate } -> creates a log row + marks tool Issued
    // issueLog: { returnLogId, returnDate, condition } -> closes a log row + marks tool Available
    if (issueLog?.issuedTo) {
      await pdb.finToolIssueLog.create({ data: { toolId: Number(id), issuedTo: issueLog.issuedTo, issueDate: new Date(), expectedReturnDate: issueLog.expectedReturnDate ? new Date(issueLog.expectedReturnDate) : null } })
      await pdb.finTool.update({ where: { id: Number(id) }, data: { status: 'Issued' } })
    } else if (issueLog?.returnLogId) {
      await pdb.finToolIssueLog.update({ where: { id: Number(issueLog.returnLogId) }, data: { returnDate: new Date(), condition: issueLog.condition || 'Good', remarks: issueLog.remarks || null } })
      await pdb.finTool.update({ where: { id: Number(id) }, data: { status: issueLog.condition === 'Lost' ? 'Lost' : issueLog.condition === 'Damaged' ? 'Under Repair' : 'Available' } })
    } else {
      await pdb.finTool.update({
        where: { id: Number(id) },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
          ...(data.siteId !== undefined ? { siteId: Number(data.siteId) } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
        },
      })
    }
    const record = await pdb.finTool.findUnique({ where: { id: Number(id) }, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating tool:', error)
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
    const denied = await assertPermission(pdb, actor, 'INVENTORY_DELETE', { request, module: 'Inventory', entityId: id })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete tools' }, { status: 403 })
    await pdb.finToolIssueLog.deleteMany({ where: { toolId: Number(id) } })
    await pdb.finTool.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tool:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
