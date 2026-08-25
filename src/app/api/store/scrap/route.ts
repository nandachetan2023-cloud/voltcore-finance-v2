import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  job: { select: { id: true, jobCode: true, description: true } },
  item: { select: { id: true, sku: true, name: true } },
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finScrapEntry.findMany({ orderBy: { scrapDate: 'desc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching scrap entries:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    if (!body.siteId || !body.description) return NextResponse.json({ success: false, error: 'siteId and description are required' }, { status: 400 })
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } })
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create scrap entries' }, { status: 403 })
    let scrapNo = body.scrapNo
    if (!scrapNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.finScrapEntry.count()) + 1
      scrapNo = `SCR/${year}/${String(count).padStart(4, '0')}`
    }
    const record = await pdb.finScrapEntry.create({
      data: {
        scrapNo, scrapDate: new Date(body.scrapDate || Date.now()), siteId: Number(body.siteId),
        jobId: body.jobId ? Number(body.jobId) : null, itemId: body.itemId ? Number(body.itemId) : null,
        description: body.description, qty: Number(body.qty) || 0, unit: body.unit || 'Nos',
        estimatedValue: Number(body.estimatedValue) || 0, disposalStatus: body.disposalStatus || 'Pending',
        remarks: body.remarks || null,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating scrap entry:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit scrap entries' }, { status: 403 })
    const record = await pdb.finScrapEntry.update({
      where: { id: Number(id) },
      data: { ...(data.disposalStatus !== undefined ? { disposalStatus: data.disposalStatus } : {}), ...(data.remarks !== undefined ? { remarks: data.remarks } : {}) },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating scrap entry:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete scrap entries' }, { status: 403 })
    await pdb.finScrapEntry.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scrap entry:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
