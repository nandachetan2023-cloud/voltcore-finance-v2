import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  job: { select: { id: true, jobCode: true, description: true } },
  po: { select: { id: true, poNo: true, vendorName: true } },
  lines: { include: { item: { select: { id: true, sku: true, name: true } } } },
}

// Post a GRN to inventory: flips status to Posted and writes a Stock Receipt
// ledger line per accepted qty — the link between PDF screen 6 (GRN & Quality
// Inspection) and screen 7 (Inventory Ledger).
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await ctx.params
    const id = Number(idParam)
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const body = await request.json().catch(() => ({}))
    const grn = await pdb.finStoreGrn.findUnique({ where: { id }, include: INCLUDE })
    if (!grn) return NextResponse.json({ success: false, error: 'GRN not found' }, { status: 404 })
    if (grn.status === 'Posted') return NextResponse.json({ success: false, error: 'GRN is already posted' }, { status: 400 })

    const denied = await assertPermission(pdb, body.actor || request.headers.get('x-actor-email') || '', 'INVENTORY_EDIT', {
      request, module: 'Inventory', entityId: String(id), siteCode: grn.site?.siteCode ?? null,
    })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to post GRNs' }, { status: 403 })

    const acceptedLines = grn.lines.filter((l: { qtyAccepted: number }) => l.qtyAccepted > 0)
    if (!acceptedLines.length) return NextResponse.json({ success: false, error: 'Nothing accepted — cannot post an empty GRN' }, { status: 400 })

    for (const line of acceptedLines) {
      const itemCode = line.item?.sku || `ITEM-${line.itemId}`
      const last = await pdb.finStockLedger.findFirst({
        where: { itemCode },
        orderBy: { id: 'desc' },
        select: { balanceQty: true },
      })
      const balanceQty = Math.round(((last?.balanceQty ?? 0) + line.qtyAccepted) * 1000) / 1000
      await pdb.finStockLedger.create({
        data: {
          entryNo: `SL-${grn.grnNo.replace(/[^\w-]/g, '')}-${line.id}`,
          postingDate: grn.grnDate,
          itemCode,
          itemName: line.item?.name || itemCode,
          unit: 'Nos',
          warehouse: grn.site?.name || null,
          warehouseId: null,
          qtyIn: line.qtyAccepted,
          qtyOut: 0,
          balanceQty,
          rate: line.rate,
          valueIn: Math.round(line.qtyAccepted * line.rate * 100) / 100,
          valueOut: 0,
          referenceType: 'Stock Receipt',
          referenceNo: grn.grnNo,
          jobCode: grn.job?.jobCode || null,
          siteCode: grn.site?.siteCode || null,
          remarks: `GRN ${grn.grnNo} posting${line.remarks ? ` — ${line.remarks}` : ''}`,
        },
      })
    }

    const record = await pdb.finStoreGrn.update({ where: { id }, data: { status: 'Posted' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: record, postedLines: acceptedLines.length })
  } catch (error) {
    console.error('Error posting GRN:', error)
    return NextResponse.json({ success: false, error: 'Failed to post GRN' }, { status: 500 })
  }
}
