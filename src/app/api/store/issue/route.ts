import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  job: { select: { id: true, jobCode: true, description: true } },
  mrs: { select: { id: true, mrsNo: true, status: true } },
  lines: { include: { item: { select: { id: true, sku: true, name: true } } } },
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finStoreIssue.findMany({ orderBy: { issueDate: 'desc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching issues:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to issue material' }, { status: 403 })

    // Never issue material without an approved MRS (best-practice rule from the
    // store SOP) — the one exception is a direct/emergency issue explicitly
    // flagged by the caller, which still requires an actor for accountability.
    if (body.mrsId) {
      const mrs = await pdb.finMaterialRequisition.findUnique({ where: { id: Number(body.mrsId) } })
      if (!mrs) return NextResponse.json({ success: false, error: 'MRS not found' }, { status: 404 })
      if (mrs.status !== 'Approved') return NextResponse.json({ success: false, error: `Cannot issue against an MRS that is ${mrs.status} — it must be Approved first` }, { status: 400 })
    } else if (!body.allowDirectIssue) {
      return NextResponse.json({ success: false, error: 'An approved MRS is required to issue material (or pass allowDirectIssue for an emergency issue)' }, { status: 400 })
    }

    const { lines, allowDirectIssue, ...data } = body
    if (!data.issueNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.finStoreIssue.count()) + 1
      data.issueNo = `SI/${year}/${String(count).padStart(4, '0')}`
    }
    const record = await pdb.finStoreIssue.create({
      data: {
        issueNo: data.issueNo,
        issueDate: new Date(data.issueDate || Date.now()),
        mrsId: data.mrsId ? Number(data.mrsId) : null,
        siteId: Number(data.siteId),
        jobId: data.jobId ? Number(data.jobId) : null,
        issuedTo: data.issuedTo || null,
        receiverSignature: data.receiverSignature || null,
        issuedBy: data.issuedBy || null,
        remarks: data.remarks || null,
        lines: lines?.length ? {
          create: lines.map((l: any) => ({
            itemId: Number(l.itemId),
            qty: Number(l.qty) || 0,
            rate: Number(l.rate) || 0,
            amount: (Number(l.qty) || 0) * (Number(l.rate) || 0),
          })),
        } : undefined,
      },
      include: INCLUDE,
    })

    if (body.mrsId && lines?.length) {
      for (const l of lines) {
        await pdb.finMaterialRequisitionLine.updateMany({
          where: { mrsId: Number(body.mrsId), itemId: Number(l.itemId) },
          data: { qtyIssued: { increment: Number(l.qty) || 0 } },
        }).catch(() => {})
      }
      await pdb.finMaterialRequisition.update({ where: { id: Number(body.mrsId) }, data: { status: 'Issued' } }).catch(() => {})
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating issue:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const denied = await assertPermission(pdb, data.actor || '', 'INVENTORY_EDIT', { request, module: 'Inventory', entityId: String(id) })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit store issues' }, { status: 403 })
    const record = await pdb.finStoreIssue.update({
      where: { id: Number(id) },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating issue:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete store issues' }, { status: 403 })
    await pdb.finStoreIssue.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting issue:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
