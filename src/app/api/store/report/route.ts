import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Site Store — monthly report (the "Monthly Report" tab in site-store.tsx).
 *
 * GET ?siteId=<id>&month=YYYY-MM
 *
 * Movement figures cover documents dated inside the month:
 *  - received  = accepted qty/value on GRNs that aren't Rejected
 *  - issued    = store issues that aren't Reversed
 *  - returned  = material return notes
 *  - scrap     = scrap entries (estimated value)
 * MRS, gate-pass and verification counts are for the month; tool status is the
 * site's current position, since tools have no per-month state.
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const siteId = Number(searchParams.get('siteId'))
    const month = searchParams.get('month') ?? ''

    if (!Number.isInteger(siteId) || siteId <= 0) {
      return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 })
    }
    const m = /^(\d{4})-(\d{2})$/.exec(month)
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
      return NextResponse.json({ success: false, error: 'month must be YYYY-MM' }, { status: 400 })
    }
    const from = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1))
    const to = new Date(Date.UTC(Number(m[1]), Number(m[2]), 1))

    const site = await db.finSite.findUnique({ where: { id: siteId }, select: { id: true } })
    if (!site) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })

    const item = { select: { id: true, sku: true, name: true } }
    const [grns, issues, returns, scrap, mrs, tools, gatePasses, verifications] = await Promise.all([
      db.finStoreGrn.findMany({
        where: { siteId, grnDate: { gte: from, lt: to }, status: { not: 'Rejected' } },
        select: { lines: { select: { itemId: true, qtyAccepted: true, amount: true, item } } },
      }),
      db.finStoreIssue.findMany({
        where: { siteId, issueDate: { gte: from, lt: to }, status: { not: 'Reversed' } },
        select: { lines: { select: { itemId: true, qty: true, amount: true, item } } },
      }),
      db.finMaterialReturn.findMany({
        where: { siteId, returnDate: { gte: from, lt: to } },
        select: { lines: { select: { itemId: true, qty: true, item } } },
      }),
      db.finScrapEntry.findMany({
        where: { siteId, scrapDate: { gte: from, lt: to } },
        select: { estimatedValue: true },
      }),
      db.finMaterialRequisition.groupBy({
        by: ['status'],
        where: { siteId, mrsDate: { gte: from, lt: to } },
        _count: { _all: true },
      }),
      db.finTool.groupBy({ by: ['status'], where: { siteId }, _count: { _all: true } }),
      db.finGatePass.findMany({
        where: { siteId, gatePassDate: { gte: from, lt: to } },
        select: { status: true },
      }),
      db.finPhysicalVerification.findMany({
        where: { siteId, verificationDate: { gte: from, lt: to } },
        select: { lines: { select: { variance: true } } },
      }),
    ])

    // Item-wise movement
    type Mv = { itemId: number; sku: string; name: string; received: number; issued: number; returned: number }
    const movement = new Map<number, Mv>()
    const row = (it: { id: number; sku: string; name: string }) => {
      let r = movement.get(it.id)
      if (!r) movement.set(it.id, (r = { itemId: it.id, sku: it.sku, name: it.name, received: 0, issued: 0, returned: 0 }))
      return r
    }
    let receivedValue = 0
    for (const g of grns) for (const l of g.lines) {
      row(l.item).received += l.qtyAccepted
      receivedValue += l.amount
    }
    let issuedValue = 0
    for (const i of issues) for (const l of i.lines) {
      row(l.item).issued += l.qty
      issuedValue += l.amount
    }
    for (const r of returns) for (const l of r.lines) row(l.item).returned += l.qty

    const round = (n: number) => Math.round(n * 100) / 100
    const itemMovement = [...movement.values()]
      .map((r) => ({ ...r, received: round(r.received), issued: round(r.issued), returned: round(r.returned) }))
      .sort((a, b) => a.sku.localeCompare(b.sku))

    const mrsCount = (...statuses: string[]) =>
      mrs.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g._count._all, 0)
    const toolCount = (status: string) => tools.find((t) => t.status === status)?._count._all ?? 0

    return NextResponse.json({
      success: true,
      data: {
        month,
        materialReceived: { count: grns.length, value: round(receivedValue) },
        materialIssued: { count: issues.length, value: round(issuedValue) },
        materialReturned: { count: returns.length },
        scrap: { count: scrap.length, value: round(scrap.reduce((s, x) => s + x.estimatedValue, 0)) },
        // Drafts haven't been decided yet, so they count as pending; Issued MRSs were approved first.
        mrs: { pending: mrsCount('Draft', 'Pending'), approved: mrsCount('Approved', 'Issued'), rejected: mrsCount('Rejected') },
        tools: {
          issued: toolCount('Issued'),
          available: toolCount('Available'),
          underRepair: toolCount('Under Repair'),
          lost: toolCount('Lost'),
        },
        gatePasses: { count: gatePasses.length, open: gatePasses.filter((g) => g.status === 'Open').length },
        physicalVerification: {
          count: verifications.length,
          itemsWithVariance: verifications.reduce((s, v) => s + v.lines.filter((l) => l.variance !== 0).length, 0),
        },
        itemMovement,
      },
    })
  } catch (error) {
    console.error('[api store/report GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to build monthly report' }, { status: 500 })
  }
}
