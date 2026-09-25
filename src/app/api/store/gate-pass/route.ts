import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const INCLUDE = { site: { select: { id: true, name: true, siteCode: true } } }

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finGatePass.findMany({ orderBy: { gatePassDate: 'desc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching gate passes:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    if (!body.siteId || !body.itemDescription) return NextResponse.json({ success: false, error: 'siteId and itemDescription are required' }, { status: 400 })
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create gate passes' }, { status: 403 })
    let gatePassNo = body.gatePassNo
    if (!gatePassNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.finGatePass.count()) + 1
      gatePassNo = `GP/${year}/${String(count).padStart(4, '0')}`
    }
    const record = await pdb.finGatePass.create({
      data: {
        gatePassNo, gatePassDate: new Date(body.gatePassDate || Date.now()), type: body.type || 'Outward',
        siteId: Number(body.siteId), itemDescription: body.itemDescription, qty: Number(body.qty) || 0,
        vehicleNo: body.vehicleNo || null, driverName: body.driverName || null, purpose: body.purpose || null,
        authorizedBy: body.authorizedBy || null, status: body.status || 'Open',
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating gate pass:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit gate passes' }, { status: 403 })
    const record = await pdb.finGatePass.update({
      where: { id: Number(id) },
      data: { ...(data.status !== undefined ? { status: data.status } : {}) },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating gate pass:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete gate passes' }, { status: 403 })
    await pdb.finGatePass.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting gate pass:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
