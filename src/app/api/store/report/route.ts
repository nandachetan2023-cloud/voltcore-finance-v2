import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Site Store — Monthly Report (client "Mechanical_Store_Registers_Formats"
 * Monthly Report format):
 *
 *   Sl.No | Item Code | Item Details | Opening Stock | Material Received |
 *   Material Issued | Material Returned | Closing Stock | Scrap Generated |
 *   Damaged/Lost Material | Pending Material | Tools & Equipment Status |
 *   Inventory Variance | Stock Value
 *
 * Movement figures are read straight from FinStockLedger (posted by GRN create
 * / post, store issue and material return), so they always reconcile with the
 * per-item Stock Register.
 *
 * GET ?siteId=<id>&month=YYYY-MM
 */
const round2 = (n: number) => Math.round(n * 100) / 100
const round3 = (n: number) => Math.round(n * 1000) / 1000

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

    const site = await db.finSite.findUnique({ where: { id: siteId }, select: { id: true, siteCode: true, name: true } })
    if (!site) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })

    const [grns, issues, returns, scrap, mrs, tools, gatePasses, verifications, storeItems] = await Promise.all([
      db.finStoreGrn.findMany({
        where: { siteId, grnDate: { gte: from, lt: to }, status: { not: 'Rejected' } },
        select: { id: true, lines: { select: { amount: true } } },
      }),
      db.finStoreIssue.findMany({
        where: { siteId, issueDate: { gte: from, lt: to }, status: { not: 'Reversed' } },
        select: { id: true, lines: { select: { amount: true } } },
      }),
      db.finMaterialReturn.findMany({
        where: { siteId, returnDate: { gte: from, lt: to } },
        select: { id: true, lines: { select: { itemId: true, qty: true } } },
      }),
      db.finScrapEntry.findMany({
        where: { siteId, scrapDate: { gte: from, lt: to } },
        select: { id: true, itemId: true, qty: true, scrapType: true, estimatedValue: true },
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
        select: { id: true, lines: { select: { itemId: true, variance: true } } },
      }),
      db.item.findMany({
        where: { isActive: true },
        select: { id: true, sku: true, name: true, reorderLevel: true, Uom_Item_uomIdToUom: { select: { code: true } } },
      }),
    ])

    // Ledger entries for this site (ledger keys off itemCode/siteCode, not ids)
    const siteCode = site.siteCode
    const [ledgerBefore, ledgerMonth] = await Promise.all([
      db.finStockLedger.findMany({
        where: { siteCode, postingDate: { lt: from } },
        select: { itemCode: true, qtyIn: true, qtyOut: true, rate: true },
      }),
      db.finStockLedger.findMany({
        where: { siteCode, postingDate: { gte: from, lt: to } },
        select: { itemCode: true, itemName: true, qtyIn: true, qtyOut: true, rate: true, referenceType: true, valueIn: true, valueOut: true },
      }),
    ])

    // Per-item aggregation
    const byItem = new Map<string, {
      itemCode: string
      itemName: string
      unit: string
      opening: number
      received: number
      issued: number
      returnedQty: number
      scrapQty: number
      damagedLostQty: number
      varianceCount: number
      latestRate: number
      valueIn: number
      valueOut: number
    }>()

    const row = (code: string, nameFallback?: string) => {
      let r = byItem.get(code)
      if (!r) {
        const storeItem = storeItems.find(i => i.sku === code)
        byItem.set(code, r = {
          itemCode: code,
          itemName: storeItem?.name ?? nameFallback ?? code,
          unit: storeItem?.Uom_Item_uomIdToUom?.code ?? 'Nos',
          opening: 0,
          received: 0,
          issued: 0,
          returnedQty: 0,
          scrapQty: 0,
          damagedLostQty: 0,
          varianceCount: 0,
          latestRate: 0,
          valueIn: 0,
          valueOut: 0,
        })
      }
      return r
    }

    for (const e of ledgerBefore) {
      const r = row(e.itemCode)
      r.opening += e.qtyIn - e.qtyOut
      r.latestRate = e.rate || r.latestRate
    }
    for (const e of ledgerMonth) {
      const r = row(e.itemCode, e.itemName)
      if (e.referenceType === 'Stock Receipt') r.received += e.qtyIn
      else if (e.referenceType === 'Stock Return') r.returnedQty += e.qtyIn
      else r.issued += e.qtyOut
      r.valueIn += e.valueIn
      r.valueOut += e.valueOut
      r.latestRate = e.rate || r.latestRate
    }
    // Per-item scrap / damaged-lost / variance — keyed off itemId, mapped via store SKU
    const skuById = new Map(storeItems.map(i => [i.id, i.sku]))
    for (const s of scrap) {
      if (!s.itemId) continue
      const code = skuById.get(s.itemId)
      if (!code) continue
      const r = row(code)
      r.scrapQty += s.qty
      const t = (s.scrapType || 'Scrap').toLowerCase()
      if (t === 'damaged' || t === 'lost') r.damagedLostQty += s.qty
    }
    for (const v of verifications) {
      for (const l of v.lines) {
        if (l.variance === 0) continue
        const code = skuById.get(l.itemId)
        if (!code) continue
        row(code).varianceCount += 1
      }
    }
    const items = [...byItem.values()]
      .map(r => ({
        itemId: storeItems.find(i => i.sku === r.itemCode)?.id ?? null,
        itemCode: r.itemCode,
        itemName: r.itemName,
        unit: r.unit,
        opening: round3(r.opening),
        received: round3(r.received),
        issued: round3(r.issued),
        returned: round3(r.returnedQty),
        closing: round3(r.opening + r.received + r.returnedQty - r.issued),
        scrapQty: round3(r.scrapQty),
        damagedLostQty: round3(r.damagedLostQty),
        varianceCount: r.varianceCount,
        stockValue: round2(round3(r.opening + r.received + r.returnedQty - r.issued) * r.latestRate),
        rate: r.latestRate,
        reorderLevel: Number(storeItems.find(i => i.sku === r.itemCode)?.reorderLevel ?? 0),
      }))
      .filter(r => r.opening !== 0 || r.received !== 0 || r.issued !== 0 || r.returned !== 0 || r.scrapQty !== 0 || r.varianceCount !== 0)
      .sort((a, b) => a.itemCode.localeCompare(b.itemCode))

    const round = round2
    const receivedValue = grns.reduce((s, g) => s + g.lines.reduce((x, l) => x + l.amount, 0), 0)
    const issuedValue = issues.reduce((s, i) => s + i.lines.reduce((x, l) => x + l.amount, 0), 0)
    const scrapValue = scrap.reduce((s, x) => s + x.estimatedValue, 0)
    const scrapQtyTotal = scrap.reduce((s, x) => s + x.qty, 0)
    const damagedLostQtyTotal = scrap.filter(s => { const t = (s.scrapType || '').toLowerCase(); return t === 'damaged' || t === 'lost' }).reduce((s, x) => s + x.qty, 0)

    const mrsCount = (...statuses: string[]) =>
      mrs.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g._count._all, 0)
    const toolCount = (status: string) => tools.find((t) => t.status === status)?._count._all ?? 0

    return NextResponse.json({
      success: true,
      data: {
        month,
        site: { id: site.id, siteCode: site.siteCode, name: site.name },
        summary: {
          materialReceived: { count: grns.length, value: round(receivedValue) },
          materialIssued: { count: issues.length, value: round(issuedValue) },
          materialReturned: { count: returns.length },
          scrap: { count: scrap.length, value: round(scrapValue), qty: round3(scrapQtyTotal), damagedLostQty: round3(damagedLostQtyTotal) },
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
        },
        items,
      },
    })
  } catch (error) {
    console.error('[api store/report GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to build monthly report' }, { status: 500 })
  }
}
