import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { nextPrefixedCode } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  logs: { orderBy: { logDate: 'desc' as const }, take: 10 },
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finEquipment.findMany({ orderBy: { equipmentCode: 'asc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching equipment:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create equipment' }, { status: 403 })
    let equipmentCode = body.equipmentCode
    if (!equipmentCode) {
      equipmentCode = await nextPrefixedCode(pdb, 'finEquipment', 'equipmentCode', `EQ-`, 4)
    }
    const record = await pdb.finEquipment.create({
      data: {
        equipmentCode, name: body.name, type: body.type || null, siteId: Number(body.siteId),
        status: body.status || 'Active', operatorName: body.operatorName || null,
        make: body.make || null, srNo: body.srNo || null, capacity: body.capacity || null,
        location: body.location || null,
        validityDate: body.validityDate ? new Date(body.validityDate) : null,
        lastService: body.lastService ? new Date(body.lastService) : null,
        nextService: body.nextService ? new Date(body.nextService) : null,
        remarks: body.remarks || null,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, log, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_EDIT', { request, module: 'Inventory', entityId: String(id) })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit equipment' }, { status: 403 })
    if (log) {
      await pdb.finEquipmentLog.create({
        data: {
          equipmentId: Number(id), logDate: new Date(log.logDate || Date.now()),
          hoursUsed: log.hoursUsed ? Number(log.hoursUsed) : null, kmReading: log.kmReading ? Number(log.kmReading) : null,
          fuelConsumed: log.fuelConsumed ? Number(log.fuelConsumed) : null, remarks: log.remarks || null,
        },
      })
    } else {
      await pdb.finEquipment.update({
        where: { id: Number(id) },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.siteId !== undefined ? { siteId: Number(data.siteId) } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.operatorName !== undefined ? { operatorName: data.operatorName } : {}),
          ...(data.make !== undefined ? { make: data.make } : {}),
          ...(data.srNo !== undefined ? { srNo: data.srNo } : {}),
          ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
          ...(data.location !== undefined ? { location: data.location } : {}),
          ...(data.validityDate !== undefined ? { validityDate: data.validityDate ? new Date(data.validityDate) : null } : {}),
          ...(data.lastService !== undefined ? { lastService: data.lastService ? new Date(data.lastService) : null } : {}),
          ...(data.nextService !== undefined ? { nextService: data.nextService ? new Date(data.nextService) : null } : {}),
          ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
        },
      })
    }
    const record = await pdb.finEquipment.findUnique({ where: { id: Number(id) }, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating equipment:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete equipment' }, { status: 403 })
    await pdb.finEquipmentLog.deleteMany({ where: { equipmentId: Number(id) } })
    await pdb.finEquipment.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
