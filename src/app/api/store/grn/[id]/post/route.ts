import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { postGrnLinesToLedger } from '@/lib/store-ledger'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  job: { select: { id: true, jobCode: true, description: true } },
  po: { select: { id: true, poNo: true, vendorName: true } },
  lines: { include: { item: { select: { id: true, sku: true, name: true, Uom_Item_uomIdToUom: { select: { code: true } } } } } },
}

const ALREADY_POSTED = 'ALREADY_POSTED'

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

    // Single transaction: re-check status, insert any missing ledger lines, flip
    // the GRN. Ledger lines are keyed off the deterministic entryNo so a re-post
    // after a partial failure replays idempotently instead of duplicating stock.
    const postedLines = await pdb.$transaction(async (tx) => {
      const current = await tx.finStoreGrn.findUnique({ where: { id }, select: { status: true } })
      if (current?.status === 'Posted') throw new Error(ALREADY_POSTED)

      const written = await postGrnLinesToLedger(
        tx,
        { grnNo: grn.grnNo, grnDate: grn.grnDate, lines: acceptedLines },
        grn.site?.name || null,
        grn.site?.siteCode || null,
        grn.job?.jobCode || null,
      )

      await tx.finStoreGrn.update({ where: { id }, data: { status: 'Posted' } })
      return written
    }).catch((e: Error) => {
      if (e.message === ALREADY_POSTED) return null
      throw e
    })
    if (postedLines === null) {
      return NextResponse.json({ success: false, error: 'GRN is already posted' }, { status: 400 })
    }

    const record = await pdb.finStoreGrn.findUnique({ where: { id }, include: INCLUDE })
    return NextResponse.json({ success: true, data: record, postedLines })
  } catch (error) {
    console.error('Error posting GRN:', error)
    return NextResponse.json({ success: false, error: 'Failed to post GRN' }, { status: 500 })
  }
}
