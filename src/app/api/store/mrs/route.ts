import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  job: { select: { id: true, jobCode: true, description: true } },
  lines: { include: { item: { select: { id: true, sku: true, name: true } } } },
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const records = await pdb.finMaterialRequisition.findMany({
      where: status ? { status } : undefined,
      orderBy: { mrsDate: 'desc' },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching MRS:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    if (!body.siteId) return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 })
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create material requisitions' }, { status: 403 })
    const { lines, ...data } = body
    if (!data.mrsNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.finMaterialRequisition.count()) + 1
      data.mrsNo = `MRS/${year}/${String(count).padStart(4, '0')}`
    }
    const record = await pdb.finMaterialRequisition.create({
      data: {
        mrsNo: data.mrsNo,
        mrsDate: new Date(data.mrsDate || Date.now()),
        siteId: Number(data.siteId),
        jobId: data.jobId ? Number(data.jobId) : null,
        requestedBy: data.requestedBy || null,
        department: data.department || null,
        purpose: data.purpose || null,
        status: data.status || 'Draft',
        lines: lines?.length ? {
          create: lines.map((l: any) => ({
            itemId: Number(l.itemId),
            qtyRequested: Number(l.qtyRequested) || 0,
            remarks: l.remarks || null,
          })),
        } : undefined,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating MRS:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, actor, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)

    // Approval workflow: submit -> Pending, approve -> Approved, reject -> Rejected
    if (action) {
      const mrs = await pdb.finMaterialRequisition.findUnique({ where: { id: Number(id) }, include: { site: { select: { siteCode: true } } } })
      if (!mrs) return NextResponse.json({ success: false, error: 'MRS not found' }, { status: 404 })
      const permCode = action === 'approve' || action === 'reject' ? 'INVENTORY_APPROVE' : 'INVENTORY_EDIT'
      const denied = await assertPermission(pdb, actor || '', permCode, { request, module: 'Inventory', entityId: String(id), siteCode: mrs.site?.siteCode ?? null })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || `Not allowed to ${action} material requisitions` }, { status: 403 })
      if (action === 'submit') {
        const updated = await pdb.finMaterialRequisition.update({ where: { id: Number(id) }, data: { status: 'Pending' }, include: INCLUDE })
        return NextResponse.json({ success: true, data: updated })
      }
      if (action === 'approve') {
        const updated = await pdb.finMaterialRequisition.update({ where: { id: Number(id) }, data: { status: 'Approved', approvedBy: actor || null, approvedAt: new Date() }, include: INCLUDE })
        return NextResponse.json({ success: true, data: updated })
      }
      if (action === 'reject') {
        const updated = await pdb.finMaterialRequisition.update({ where: { id: Number(id) }, data: { status: 'Rejected', rejectionReason: data.rejectionReason || null }, include: INCLUDE })
        return NextResponse.json({ success: true, data: updated })
      }
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
    }

    const siteForEdit = data.siteId ? await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }) : null
    const editDenied = await assertPermission(pdb, actor || '', 'INVENTORY_EDIT', { request, module: 'Inventory', entityId: String(id), siteCode: siteForEdit?.siteCode ?? null })
    if (!editDenied.allowed) return NextResponse.json({ success: false, error: editDenied.reason || 'Not allowed to edit material requisitions' }, { status: 403 })

    const record = await pdb.finMaterialRequisition.update({
      where: { id: Number(id) },
      data: {
        ...(data.mrsDate ? { mrsDate: new Date(data.mrsDate) } : {}),
        ...(data.siteId !== undefined ? { siteId: Number(data.siteId) } : {}),
        ...(data.jobId !== undefined ? { jobId: data.jobId ? Number(data.jobId) : null } : {}),
        ...(data.requestedBy !== undefined ? { requestedBy: data.requestedBy } : {}),
        ...(data.department !== undefined ? { department: data.department } : {}),
        ...(data.purpose !== undefined ? { purpose: data.purpose } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating MRS:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete material requisitions' }, { status: 403 })
    await pdb.finMaterialRequisition.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting MRS:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
