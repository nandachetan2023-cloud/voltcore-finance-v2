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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

    const [grns, issues, returns, scrap, mrs, tools, equipment, gatePasses, verifications, storeItems, purchaseOrders, grnHistory, toolIssueLogs, routineChecks, toolItems] = await Promise.all([
      db.finStoreGrn.findMany({
        where: { siteId, grnDate: { gte: from, lt: to }, status: { not: 'Rejected' } },
        select: {
          id: true,
          grnNo: true,
          grnDate: true,
          vendorName: true,
          po: { select: { poNo: true, vendorName: true } },
          lines: { select: { itemId: true, amount: true, materialCategory: true } },
        },
      }),
      db.finStoreIssue.findMany({
        where: { siteId, issueDate: { gte: from, lt: to }, status: { not: 'Reversed' } },
        select: {
          id: true,
          issueNo: true,
          issueDate: true,
          issuedTo: true,
          contractorName: true,
          mrs: { select: { department: true } },
          job: { select: { jobCode: true } },
          lines: { select: { itemId: true, qty: true, amount: true } },
        },
      }),
      db.finMaterialReturn.findMany({
        where: { siteId, returnDate: { gte: from, lt: to } },
        select: { id: true, returnNo: true, returnType: true, vendorName: true, lines: { select: { itemId: true, qty: true, condition: true } } },
      }),
      db.finScrapEntry.findMany({
        where: { siteId, scrapDate: { gte: from, lt: to } },
        select: { id: true, scrapNo: true, scrapDate: true, itemId: true, description: true, scrapType: true, location: true, disposedTo: true, disposalStatus: true, remarks: true, qty: true, unit: true, estimatedValue: true },
      }),
      db.finMaterialRequisition.groupBy({
        by: ['status'],
        where: { siteId, mrsDate: { gte: from, lt: to } },
        _count: { _all: true },
      }),
      db.finTool.groupBy({ by: ['status'], where: { siteId }, _count: { _all: true } }),
      db.finEquipment.findMany({
        where: { siteId },
        select: { name: true, status: true, nextService: true, validityDate: true },
      }),
      db.finGatePass.findMany({
        where: { siteId, gatePassDate: { gte: from, lt: to } },
        select: { status: true },
      }),
      db.finPhysicalVerification.findMany({
        where: { siteId, verificationDate: { gte: from, lt: to } },
        select: {
          id: true,
          verificationNo: true,
          verificationDate: true,
          lines: { select: { itemId: true, bookQty: true, physicalQty: true, variance: true, remarks: true } },
        },
      }),
      db.item.findMany({
        where: { isActive: true },
        select: { id: true, sku: true, name: true, reorderLevel: true, Uom_Item_uomIdToUom: { select: { code: true } } },
      }),
      db.finPurchaseOrder.findMany({
        where: { siteId, status: { notIn: ['Completed', 'Cancelled', 'Rejected'] } },
        select: {
          poNo: true,
          vendorName: true,
          date: true,
          orderCompletionDate: true,
          items: { select: { description: true, unitOfMeasure: true, quantity: true, receivedQty: true, unitRate: true } },
        },
      }),
      db.finStoreGrn.findMany({
        where: { siteId, grnDate: { lt: to }, status: { not: 'Rejected' } },
        select: { grnDate: true, lines: { select: { itemId: true, materialCategory: true } } },
        orderBy: { grnDate: 'desc' },
      }),
      db.finToolIssueLog.findMany({
        where: {
          tool: { siteId },
          OR: [
            { issueDate: { gte: from, lt: to } },
            { returnDate: { gte: from, lt: to } },
          ],
        },
        select: {
          issueDate: true,
          returnDate: true,
          qty: true,
          condition: true,
        },
      }),
      db.finStoreRoutineCheck.findMany({
        where: { siteId, routineDate: { gte: from, lt: to } },
        select: { routineDate: true, routineType: true, completedBy: true, checks: true },
      }),
      db.finTool.findMany({
        where: { siteId },
        select: { toolCode: true, name: true, category: true, status: true, calibrationDueDate: true },
      }),
    ])

    // Ledger entries for this site (ledger keys off itemCode/siteCode, not ids)
    const siteCode = site.siteCode
    const [ledgerBefore, ledgerMonth] = await Promise.all([
      db.finStockLedger.findMany({
        where: { siteCode, postingDate: { lt: from } },
        select: { itemCode: true, qtyIn: true, qtyOut: true, rate: true, valueIn: true, valueOut: true },
      }),
      db.finStockLedger.findMany({
        where: { siteCode, postingDate: { gte: from, lt: to } },
        select: { itemCode: true, itemName: true, qtyIn: true, qtyOut: true, rate: true, referenceType: true, referenceNo: true, valueIn: true, valueOut: true },
      }),
    ])
    const ledgerHistory = await db.finStockLedger.findMany({
      where: { siteCode, postingDate: { lt: to }, qtyOut: { gt: 0 } },
      select: { itemCode: true, postingDate: true },
      orderBy: { postingDate: 'desc' },
    })

    // Per-item aggregation
    const byItem = new Map<string, {
      itemCode: string
      itemName: string
      unit: string
      opening: number
      openingValue: number
      received: number
      issued: number
      returnedQty: number
      supplierReturnedQty: number
      scrapQty: number
      damagedLostQty: number
      varianceCount: number
      latestRate: number
      valueIn: number
      valueOut: number
      damagedReturnQty: number
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
          openingValue: 0,
          received: 0,
          issued: 0,
          returnedQty: 0,
          supplierReturnedQty: 0,
          scrapQty: 0,
          damagedLostQty: 0,
          varianceCount: 0,
          latestRate: 0,
          valueIn: 0,
          valueOut: 0,
          damagedReturnQty: 0,
        })
      }
      return r
    }

    for (const e of ledgerBefore) {
      const r = row(e.itemCode)
      r.opening += e.qtyIn - e.qtyOut
      r.openingValue += e.valueIn - e.valueOut
      r.latestRate = e.rate || r.latestRate
    }
    for (const e of ledgerMonth) {
      const r = row(e.itemCode, e.itemName)
      if (e.referenceType === 'Stock Receipt') r.received += e.qtyIn
      else if (e.referenceType === 'Stock Return') r.returnedQty += e.qtyIn
      else if (e.referenceType === 'Supplier Return') r.supplierReturnedQty += e.qtyOut
      else if (e.referenceType === 'Material Issue') r.issued += e.qtyOut
      r.valueIn += e.valueIn
      r.valueOut += e.valueOut
      r.latestRate = e.rate || r.latestRate
    }
    for (const ret of returns) {
      if (ret.returnType === 'Supplier') continue
      for (const line of ret.lines) {
        if (line.condition?.toLowerCase() !== 'damaged') continue
        const code = storeItems.find(i => i.id === line.itemId)?.sku
        if (code) row(code).damagedReturnQty += line.qty
      }
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
        returnedToSupplier: round3(r.supplierReturnedQty),
        closing: round3(r.opening + r.received + r.returnedQty - r.issued - r.supplierReturnedQty),
        scrapQty: round3(r.scrapQty),
        damagedLostQty: round3(r.damagedLostQty + r.damagedReturnQty),
        damagedReturnQty: round3(r.damagedReturnQty),
        varianceCount: r.varianceCount,
        stockValue: round2(r.openingValue + r.valueIn - r.valueOut),
        rate: r.latestRate,
        reorderLevel: Number(storeItems.find(i => i.sku === r.itemCode)?.reorderLevel ?? 0),
      }))
      .filter(r => r.opening !== 0 || r.received !== 0 || r.issued !== 0 || r.returned !== 0 || r.returnedToSupplier !== 0 || r.scrapQty !== 0 || r.damagedLostQty !== 0 || r.varianceCount !== 0)
      .sort((a, b) => a.itemCode.localeCompare(b.itemCode))

    const round = round2
    const receivedValue = grns.reduce((s, g) => s + g.lines.reduce((x, l) => x + l.amount, 0), 0)
    const issuedValue = issues.reduce((s, i) => s + i.lines.reduce((x, l) => x + l.amount, 0), 0)
    const scrapValue = scrap.reduce((s, x) => s + x.estimatedValue, 0)
    const scrapQtyTotal = scrap.reduce((s, x) => s + x.qty, 0)
    const damagedLostQtyTotal = scrap.filter(s => { const t = (s.scrapType || '').toLowerCase(); return t === 'damaged' || t === 'lost' }).reduce((s, x) => s + x.qty, 0)
    const siteReturns = returns.filter(ret => ret.returnType !== 'Supplier')
    const supplierReturns = returns.filter(ret => ret.returnType === 'Supplier')
    const damagedReturnQtyTotal = siteReturns.reduce((sum, ret) =>
      sum + ret.lines.filter(line => line.condition?.toLowerCase() === 'damaged').reduce((lineSum, line) => lineSum + line.qty, 0), 0)
    const supplierReturnLedger = ledgerMonth.filter(entry => entry.referenceType === 'Supplier Return')
    const supplierReturnValueByNo = new Map<string, number>()
    for (const entry of supplierReturnLedger) {
      if (!entry.referenceNo) continue
      supplierReturnValueByNo.set(entry.referenceNo, (supplierReturnValueByNo.get(entry.referenceNo) ?? 0) + entry.valueOut)
    }
    const returnsBySupplier = new Map<string, { supplier: string; returnCount: number; qty: number; value: number }>()
    for (const ret of supplierReturns) {
      const supplier = ret.vendorName || 'Unspecified'
      const group = returnsBySupplier.get(supplier) ?? { supplier, returnCount: 0, qty: 0, value: 0 }
      group.returnCount++
      group.qty += ret.lines.reduce((sum, line) => sum + line.qty, 0)
      group.value += supplierReturnValueByNo.get(ret.returnNo) ?? 0
      returnsBySupplier.set(supplier, group)
    }

    const mrsCount = (...statuses: string[]) =>
      mrs.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g._count._all, 0)
    const toolCount = (status: string) => tools.find((t) => t.status === status)?._count._all ?? 0

    const aggregateIssues = (key: (issue: typeof issues[number]) => string | null | undefined) => {
      const groups = new Map<string, { name: string; issueCount: number; qty: number; value: number }>()
      for (const issue of issues) {
        const name = key(issue)?.trim()
        if (!name) continue
        const group = groups.get(name) ?? { name, issueCount: 0, qty: 0, value: 0 }
        group.issueCount++
        for (const line of issue.lines) {
          group.qty += line.qty
          group.value += line.amount
        }
        groups.set(name, group)
      }
      return [...groups.values()].map(group => ({ ...group, qty: round3(group.qty), value: round(group.value) }))
    }

    const supplierReceipts = new Map<string, { supplier: string; grnCount: number; value: number }>()
    const poReceipts = new Map<string, { poNo: string; supplier: string; grnCount: number; value: number }>()
    for (const grn of grns) {
      const supplier = grn.vendorName || grn.po?.vendorName || 'Unspecified'
      const value = grn.lines.reduce((sum, line) => sum + line.amount, 0)
      const supplierRow = supplierReceipts.get(supplier) ?? { supplier, grnCount: 0, value: 0 }
      supplierRow.grnCount++
      supplierRow.value += value
      supplierReceipts.set(supplier, supplierRow)
      if (grn.po?.poNo) {
        const poRow = poReceipts.get(grn.po.poNo) ?? { poNo: grn.po.poNo, supplier, grnCount: 0, value: 0 }
        poRow.grnCount++
        poRow.value += value
        poReceipts.set(grn.po.poNo, poRow)
      }
    }

    const pendingMaterials = purchaseOrders.flatMap(po => po.items
      .filter(item => item.quantity > item.receivedQty)
      .map(item => ({
        poNo: po.poNo,
        supplier: po.vendorName,
        description: item.description,
        unit: item.unitOfMeasure,
        ordered: item.quantity,
        received: item.receivedQty,
        pending: round3(item.quantity - item.receivedQty),
        expectedDate: po.orderCompletionDate,
        overdue: !!po.orderCompletionDate && po.orderCompletionDate < new Date(),
      })))

    const latestIssueByItem = new Map<string, Date>()
    for (const entry of ledgerHistory) {
      if (!latestIssueByItem.has(entry.itemCode)) latestIssueByItem.set(entry.itemCode, entry.postingDate)
    }
    const monthEndingStock = new Map<string, number>()
    for (const e of ledgerBefore) monthEndingStock.set(e.itemCode, (monthEndingStock.get(e.itemCode) ?? 0) + e.qtyIn - e.qtyOut)
    for (const e of ledgerMonth) monthEndingStock.set(e.itemCode, (monthEndingStock.get(e.itemCode) ?? 0) + e.qtyIn - e.qtyOut)
    const slowMovingCutoff = new Date(to)
    slowMovingCutoff.setUTCDate(slowMovingCutoff.getUTCDate() - 90)
    const slowMoving = storeItems.flatMap(item => {
      const balance = round3(monthEndingStock.get(item.sku) ?? 0)
      const lastIssued = latestIssueByItem.get(item.sku)
      if (balance <= 0 || (lastIssued && lastIssued >= slowMovingCutoff)) return []
      return [{ itemCode: item.sku, itemName: item.name, balance, unit: item.Uom_Item_uomIdToUom?.code ?? 'Nos', lastIssuedAt: lastIssued ?? null, daysSinceIssue: lastIssued ? Math.floor((to.getTime() - lastIssued.getTime()) / 86400000) : null }]
    })
    const belowReorderLevel = storeItems.flatMap(item => {
      const balance = round3(monthEndingStock.get(item.sku) ?? 0)
      const reorderLevel = Number(item.reorderLevel ?? 0)
      return reorderLevel > 0 && balance < reorderLevel
        ? [{ itemCode: item.sku, itemName: item.name, balance, reorderLevel, unit: item.Uom_Item_uomIdToUom?.code ?? 'Nos' }]
        : []
    })
    const categoryByItemId = new Map<number, string>()
    for (const grn of grnHistory) {
      for (const line of grn.lines) {
        const category = line.materialCategory?.trim()
        if (category && !categoryByItemId.has(line.itemId)) categoryByItemId.set(line.itemId, category)
      }
    }
    const consumables = items.filter(item =>
      item.itemId !== null && /consumable/i.test(categoryByItemId.get(item.itemId) ?? ''),
    )

    const latestVarianceLines = verifications.flatMap(verification =>
      verification.lines.filter(line => line.variance !== 0).map(line => ({
        verificationId: verification.id,
        verificationNo: verification.verificationNo,
        verificationDate: verification.verificationDate,
        itemCode: storeItems.find(item => item.id === line.itemId)?.sku ?? `ITEM-${line.itemId}`,
        bookQty: line.bookQty,
        physicalQty: line.physicalQty,
        variance: line.variance,
        remarks: line.remarks,
      })))
    const openingStockValue = ledgerBefore.reduce((sum, entry) => sum + entry.valueIn - entry.valueOut, 0)
    const receivedStockValue = ledgerMonth.filter(entry => entry.referenceType === 'Stock Receipt').reduce((sum, entry) => sum + entry.valueIn, 0)
    const siteReturnStockValue = ledgerMonth.filter(entry => entry.referenceType === 'Stock Return').reduce((sum, entry) => sum + entry.valueIn, 0)
    const issuedStockValue = ledgerMonth.filter(entry => entry.referenceType === 'Material Issue').reduce((sum, entry) => sum + entry.valueOut, 0)
    const supplierReturnStockValue = supplierReturnLedger.reduce((sum, entry) => sum + entry.valueOut, 0)
    const closingStockValue = openingStockValue + receivedStockValue + siteReturnStockValue - issuedStockValue - supplierReturnStockValue
    const serviceDueItems = equipment.filter(item => item.nextService && item.nextService < to)
    const majorReceipts = grns.map(grn => ({
      grnNo: grn.grnNo,
      date: grn.grnDate,
      supplier: grn.vendorName || grn.po?.vendorName || 'Unspecified',
      value: round(grn.lines.reduce((sum, line) => sum + line.amount, 0)),
    })).sort((a, b) => b.value - a.value).slice(0, 5)
    const highValueIssues = issues.map(issue => ({
      issueNo: issue.issueNo,
      date: issue.issueDate,
      receiver: issue.issuedTo || 'Unspecified',
      contractor: issue.contractorName || 'Unspecified',
      workArea: issue.job?.jobCode || 'Unspecified',
      value: round(issue.lines.reduce((sum, line) => sum + line.amount, 0)),
    })).sort((a, b) => b.value - a.value).slice(0, 5)
    const improvementActions = routineChecks.flatMap(record => {
      const checks = Array.isArray(record.checks) ? record.checks : []
      return checks.flatMap(check => {
        if (!isRecord(check) || check.status !== 'Issue' || typeof check.note !== 'string' || !check.note.trim()) return []
        return [{
          date: record.routineDate,
          frequency: record.routineType,
          completedBy: record.completedBy,
          checklistItem: typeof check.id === 'string' ? check.id : 'Unspecified',
          action: check.note.trim(),
        }]
      })
    })
    const damageLossIncidents = scrap.map(entry => ({
      scrapNo: entry.scrapNo,
      date: entry.scrapDate,
      description: entry.description,
      type: entry.scrapType || 'Scrap',
      qty: round3(entry.qty),
      unit: entry.unit,
      location: entry.location || 'Unspecified',
      disposalStatus: entry.disposalStatus,
      disposedTo: entry.disposedTo || 'Unspecified',
      value: round(entry.estimatedValue),
      remarks: entry.remarks || '',
    })).sort((a, b) => b.value - a.value).slice(0, 10)
    const toolActivity = {
      issued: round3(toolIssueLogs.filter(log => log.issueDate >= from && log.issueDate < to).reduce((sum, log) => sum + log.qty, 0)),
      returned: round3(toolIssueLogs.filter(log => log.returnDate && log.returnDate >= from && log.returnDate < to).reduce((sum, log) => sum + log.qty, 0)),
      damaged: toolIssueLogs.filter(log => log.condition?.toLowerCase() === 'damaged').length,
      lost: toolIssueLogs.filter(log => log.condition?.toLowerCase() === 'lost').length,
    }
    const calibrationDueItems = toolItems
      .filter(tool => tool.calibrationDueDate && tool.calibrationDueDate < to)
      .map(tool => ({ toolCode: tool.toolCode, name: tool.name, category: tool.category, status: tool.status, calibrationDueDate: tool.calibrationDueDate }))

    return NextResponse.json({
      success: true,
      data: {
        month,
        site: { id: site.id, siteCode: site.siteCode, name: site.name },
        summary: {
          materialReceived: { count: grns.length, value: round(receivedValue) },
          materialIssued: { count: issues.length, value: round(issuedValue) },
          materialReturned: {
            count: siteReturns.length,
            qty: round3(siteReturns.reduce((sum, ret) => sum + ret.lines.reduce((lineSum, line) => lineSum + line.qty, 0), 0)),
            value: round(siteReturnStockValue),
          },
          returnsToSupplier: {
            count: supplierReturns.length,
            qty: round3(supplierReturns.reduce((sum, ret) => sum + ret.lines.reduce((lineSum, line) => lineSum + line.qty, 0), 0)),
            value: round(supplierReturnStockValue),
          },
          returnsBySupplier: [...returnsBySupplier.values()].map(group => ({ ...group, qty: round3(group.qty), value: round(group.value) })),
          scrap: { count: scrap.length, value: round(scrapValue), qty: round3(scrapQtyTotal), damagedLostQty: round3(damagedLostQtyTotal + damagedReturnQtyTotal) },
          stockValue: {
            opening: round(openingStockValue),
            received: round(receivedStockValue),
            returned: round(siteReturnStockValue),
            issued: round(issuedStockValue),
            returnedToSupplier: round(supplierReturnStockValue),
            closing: round(closingStockValue),
          },
          receiptsBySupplier: [...supplierReceipts.values()].map(item => ({ ...item, value: round(item.value) })),
          receiptsByPurchaseOrder: [...poReceipts.values()].map(item => ({ ...item, value: round(item.value) })),
          issuesByDepartment: aggregateIssues(issue => issue.mrs?.department),
          issuesByWorkArea: aggregateIssues(issue => issue.job?.jobCode),
          issuesByReceiver: aggregateIssues(issue => issue.issuedTo),
          issuesByContractor: aggregateIssues(issue => issue.contractorName),
          consumables,
          pendingMaterials,
          slowMoving,
          belowReorderLevel,
          varianceDetails: latestVarianceLines,
          serviceDueItems: serviceDueItems.map(item => ({ name: item.name, status: item.status, nextService: item.nextService, validityDate: item.validityDate })),
          keyObservations: {
            majorReceipts,
            highValueIssues,
            criticalShortages: belowReorderLevel,
            damageLossIncidents,
            improvementActions,
          },
          calibrationDueItems,
          mrs: { pending: mrsCount('Draft', 'Pending'), approved: mrsCount('Approved', 'Issued'), rejected: mrsCount('Rejected') },
          tools: {
            issued: toolCount('Issued'),
            available: toolCount('Available'),
            underRepair: toolCount('Under Repair'),
            lost: toolCount('Lost'),
          },
          toolActivity,
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
