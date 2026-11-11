import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { nextPrefixedCode } from '@/lib/auto-number'
import { postReturnLinesToLedger } from '@/lib/store-ledger'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  job: { select: { id: true, jobCode: true, description: true } },
  lines: { include: { item: { select: { id: true, sku: true, name: true } } } },
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finMaterialReturn.findMany({ orderBy: { returnDate: 'desc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching returns:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create material returns' }, { status: 403 })
    const { lines, ...data } = body
    if (!data.returnNo) {
      const year = new Date().getFullYear()
      data.returnNo = await nextPrefixedCode(pdb, 'finMaterialReturn', 'returnNo', `MRN/${year}/`, 4)
    }
    const jobForLedger = data.jobId ? await pdb.finJob.findUnique({ where: { id: Number(data.jobId) }, select: { jobCode: true } }) : null

    const record = await pdb.$transaction(async (tx) => {
      const created = await tx.finMaterialReturn.create({
        data: {
          returnNo: data.returnNo,
          returnDate: new Date(data.returnDate || Date.now()),
          siteId: Number(data.siteId),
          jobId: data.jobId ? Number(data.jobId) : null,
          returnedBy: data.returnedBy || null,
          receivedBy: data.receivedBy || null,
          remarks: data.remarks || null,
          lines: lines?.length ? {
            create: lines.map((l: any) => ({
              itemId: Number(l.itemId),
              qty: Number(l.qty) || 0,
              condition: l.condition || 'Good',
              remarks: l.remarks || null,
            })),
          } : undefined,
        },
        include: INCLUDE,
      })

      if (created.lines?.length) {
        await postReturnLinesToLedger(
          tx,
          created,
          site?.name ?? null,
          site?.siteCode ?? null,
          jobForLedger?.jobCode ?? null,
          data.returnedBy || null,
        )
      }

      return created
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating return:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete material returns' }, { status: 403 })
    // Remove the stock-ledger lines this return posted so the Stock Register
    // stays consistent after a delete (entryNo is deterministic per line).
    const ret = await pdb.finMaterialReturn.findUnique({ where: { id: Number(id) }, select: { returnNo: true } })
    if (ret) {
      const prefix = `SL-${String(ret.returnNo).replace(/[^\w-]/g, '')}-L`
      await pdb.finStockLedger.deleteMany({ where: { entryNo: { startsWith: prefix } } })
    }
    await pdb.finMaterialReturn.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting return:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
