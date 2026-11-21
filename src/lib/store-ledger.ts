import { NextRequest } from 'next/server'

/**
 * Shared stock-ledger writer used by the GRN create/post routes, the store
 * issue route and the material-return route. Every movement in the store
 * lands in FinStockLedger so the per-item Stock Register (opening / received
 * / issued / closing + min stock) is always live.
 *
 * `entryNo` is deterministic (`SL-<voucherNo>-<itemId>`) so replays never
 * double-count stock.
 */

const round2 = (n: number) => Math.round(n * 100) / 100
const round3 = (n: number) => Math.round(n * 1000) / 1000
const entryFor = (voucherNo: string, lineId: number) =>
  `SL-${String(voucherNo).replace(/[^\w-]/g, '')}-L${lineId}`

/** Post accepted GRN lines to the ledger. Call inside a transaction. */
export async function postGrnLinesToLedger(
  tx: any,
  grn: { grnNo: string; grnDate: Date; lines: Array<{ id: number; itemId: number; qtyAccepted: number; rate: number; remarks: string | null; storageLocation?: string | null; item: { sku: string; name: string } | null }> },
  siteName: string | null,
  siteCode: string | null,
  jobCode: string | null,
) {
  let written = 0
  for (const line of grn.lines) {
    if (line.qtyAccepted <= 0) continue
    const item = await tx.item.findUnique({
      where: { id: Number(line.itemId) },
      select: { sku: true, name: true, Uom_Item_uomIdToUom: { select: { code: true } } },
    }).catch(() => null)
    const itemCode = item?.sku ?? line.item?.sku ?? `ITEM-${line.itemId}`
    const entryNo = entryFor(grn.grnNo, line.id)
    const existing = await tx.finStockLedger.findFirst({ where: { entryNo }, select: { id: true } })
    if (existing) continue
    const last = await tx.finStockLedger.findFirst({
      where: { itemCode },
      orderBy: { id: 'desc' },
      select: { balanceQty: true },
    })
    const balanceQty = round3((last?.balanceQty ?? 0) + line.qtyAccepted)
    await tx.finStockLedger.create({
      data: {
        entryNo,
        postingDate: grn.grnDate,
        itemCode,
        itemName: item?.name || line.item?.name || itemCode,
        unit: item?.Uom_Item_uomIdToUom?.code || 'Nos',
        warehouse: line.storageLocation || siteName,
        warehouseId: null,
        qtyIn: line.qtyAccepted,
        qtyOut: 0,
        balanceQty,
        rate: line.rate,
        valueIn: Math.round(line.qtyAccepted * line.rate * 100) / 100,
        valueOut: 0,
        referenceType: 'Stock Receipt',
        referenceNo: grn.grnNo,
        jobCode,
        siteCode,
        remarks: `GRN ${grn.grnNo}${line.remarks ? ` — ${line.remarks}` : ''}`,
      },
    })
    written++
  }
  return written
}

/** Post issued lines to the ledger (qtyOut). Call inside a transaction. */
type FifoLot = {
  entryNo: string
  referenceNo: string | null
  referenceType: string
  postingDate: Date
  rate: number
  remainingQty: number
}

type FifoAllocation = {
  sourceEntryNo: string
  sourceReferenceNo: string | null
  sourceType: string
  receivedDate: string
  qty: number
  rate: number
}

async function getFifoLots(tx: any, itemCode: string, postingDate: Date): Promise<FifoLot[]> {
  const movements = await tx.finStockLedger.findMany({
    where: { itemCode, postingDate: { lte: postingDate } },
    orderBy: [{ postingDate: 'asc' }, { id: 'asc' }],
    select: { entryNo: true, referenceNo: true, referenceType: true, postingDate: true, qtyIn: true, qtyOut: true, rate: true },
  })
  const lots: FifoLot[] = []
  let stockDeficit = 0
  for (const movement of movements) {
    if (movement.qtyIn > 0) {
      const deficitCovered = Math.min(stockDeficit, movement.qtyIn)
      stockDeficit = round3(stockDeficit - deficitCovered)
      const availableQty = round3(movement.qtyIn - deficitCovered)
      if (availableQty > 0) {
        lots.push({
          entryNo: movement.entryNo,
          referenceNo: movement.referenceNo,
          referenceType: movement.referenceType,
          postingDate: movement.postingDate,
          rate: movement.rate,
          remainingQty: availableQty,
        })
      }
    }
    let remainingOut = movement.qtyOut
    for (const lot of lots) {
      if (remainingOut <= 0) break
      const used = Math.min(lot.remainingQty, remainingOut)
      lot.remainingQty = round3(lot.remainingQty - used)
      remainingOut = round3(remainingOut - used)
    }
    if (remainingOut > 0) stockDeficit = round3(stockDeficit + remainingOut)
  }
  return lots.filter(lot => lot.remainingQty > 0)
}

function allocateFifo(lots: FifoLot[], requestedQty: number) {
  const availableQty = round3(lots.reduce((sum, lot) => sum + lot.remainingQty, 0))
  if (requestedQty > availableQty) return null
  let remaining = requestedQty
  let value = 0
  const allocations: FifoAllocation[] = []
  for (const lot of lots) {
    if (remaining <= 0) break
    const qty = round3(Math.min(lot.remainingQty, remaining))
    if (qty <= 0) continue
    allocations.push({
      sourceEntryNo: lot.entryNo,
      sourceReferenceNo: lot.referenceNo,
      sourceType: lot.referenceType,
      receivedDate: lot.postingDate.toISOString(),
      qty,
      rate: lot.rate,
    })
    lot.remainingQty = round3(lot.remainingQty - qty)
    remaining = round3(remaining - qty)
    value += qty * lot.rate
  }
  return remaining > 0
    ? null
    : { allocations, value: round2(value), rate: requestedQty > 0 ? Math.round((value / requestedQty) * 10000) / 10000 : 0 }
}

export class InsufficientStoreStockError extends Error {
  constructor(itemCode: string, requested: number, available: number, action = 'issue') {
    super(`Cannot ${action} ${requested} of ${itemCode}; only ${round3(available)} is available`)
    this.name = 'InsufficientStoreStockError'
  }
}

export async function postIssueLinesToLedger(
  tx: any,
  issue: { issueNo: string; issueDate: Date; lines: Array<{ id: number; itemId: number; qty: number; rate: number; amount: number; fifoAllocations?: unknown }> },
  siteName: string | null,
  siteCode: string | null,
  jobCode: string | null,
  issuedTo: string | null,
  remarksText: string | null,
) {
  let written = 0
  for (const l of issue.lines) {
    const item = await tx.item.findUnique({
      where: { id: Number(l.itemId) },
      select: { sku: true, name: true, Uom_Item_uomIdToUom: { select: { code: true } } },
    })
    const itemCode = item?.sku || `ITEM-${l.itemId}`
    const qty = Number(l.qty) || 0
    const entryNo = entryFor(issue.issueNo, l.id)
    const existing = await tx.finStockLedger.findFirst({ where: { entryNo }, select: { id: true } })
    if (existing) continue
    const lots = await getFifoLots(tx, itemCode, issue.issueDate)
    const availableQty = round3(lots.reduce((sum, lot) => sum + lot.remainingQty, 0))
    const fifo = allocateFifo(lots, qty)
    if (!fifo) throw new InsufficientStoreStockError(itemCode, qty, availableQty, 'issue')
    const rate = fifo.rate
    const amount = fifo.value
    const balanceQty = round3(availableQty - qty)
    l.rate = rate
    l.amount = amount
    l.fifoAllocations = fifo.allocations
    await tx.finStoreIssueLine.update({
      where: { id: l.id },
      data: { rate, amount, fifoAllocations: fifo.allocations },
    })
    const fifoText = fifo.allocations.map(allocation => `${allocation.sourceReferenceNo || allocation.sourceEntryNo}:${allocation.qty}`).join(', ')
    await tx.finStockLedger.create({
      data: {
        entryNo,
        postingDate: issue.issueDate,
        itemCode,
        itemName: item?.name || itemCode,
        unit: item?.Uom_Item_uomIdToUom?.code || 'Nos',
        warehouse: siteName,
        warehouseId: null,
        qtyIn: 0,
        qtyOut: qty,
        balanceQty,
        rate,
        valueIn: 0,
        valueOut: amount,
        referenceType: 'Material Issue',
        referenceNo: issue.issueNo,
        jobCode,
        siteCode,
        remarks: `Issue ${issue.issueNo}${issuedTo ? ` — to ${issuedTo}` : ''}${remarksText ? ` — ${remarksText}` : ''}; FIFO lots: ${fifoText}`,
      },
    })
    written++
  }
  return written
}

/** Post returned lines to the ledger (qtyIn — stock comes back). Call inside a transaction. */
export async function postReturnLinesToLedger(
  tx: any,
  ret: { returnNo: string; returnDate: Date; lines: Array<{ id: number; itemId: number; qty: number; condition: string | null }> },
  siteName: string | null,
  siteCode: string | null,
  jobCode: string | null,
  returnedBy: string | null,
) {
  let written = 0
  for (const l of ret.lines) {
    if (l.condition?.toLowerCase() !== 'good') continue
    const item = await tx.item.findUnique({
      where: { id: Number(l.itemId) },
      select: { sku: true, name: true, Uom_Item_uomIdToUom: { select: { code: true } } },
    })
    const itemCode = item?.sku || `ITEM-${l.itemId}`
    const qty = Number(l.qty) || 0
    const last = await tx.finStockLedger.findFirst({
      where: { itemCode },
      orderBy: { id: 'desc' },
      select: { balanceQty: true, rate: true },
    })
    const balanceQty = round3((last?.balanceQty ?? 0) + qty)
    const rate = last?.rate ?? 0
    const entryNo = entryFor(ret.returnNo, l.id)
    const existing = await tx.finStockLedger.findFirst({ where: { entryNo }, select: { id: true } })
    if (existing) continue
    await tx.finStockLedger.create({
      data: {
        entryNo,
        postingDate: ret.returnDate,
        itemCode,
        itemName: item?.name || itemCode,
        unit: item?.Uom_Item_uomIdToUom?.code || 'Nos',
        warehouse: siteName,
        warehouseId: null,
        qtyIn: qty,
        qtyOut: 0,
        balanceQty,
        rate,
        valueIn: Math.round(qty * rate * 100) / 100,
        valueOut: 0,
        referenceType: 'Stock Return',
        referenceNo: ret.returnNo,
        jobCode,
        siteCode,
        remarks: `Return ${ret.returnNo}${returnedBy ? ` — from ${returnedBy}` : ''}${l.condition ? ` (${l.condition})` : ''}`,
      },
    })
    written++
  }
  return written
}

/** Post supplier returns as stock out. Call inside a transaction. */
export async function postSupplierReturnLinesToLedger(
  tx: any,
  ret: { returnNo: string; returnDate: Date; vendorName: string | null; supplierDocNo: string | null; lines: Array<{ id: number; itemId: number; qty: number; remarks: string | null; fifoAllocations?: unknown }> },
  siteName: string | null,
  siteCode: string | null,
  jobCode: string | null,
) {
  let written = 0
  for (const line of ret.lines) {
    const entryNo = entryFor(ret.returnNo, line.id)
    const existing = await tx.finStockLedger.findFirst({ where: { entryNo }, select: { id: true } })
    if (existing) continue
    const item = await tx.item.findUnique({
      where: { id: Number(line.itemId) },
      select: { sku: true, name: true, Uom_Item_uomIdToUom: { select: { code: true } } },
    })
    const itemCode = item?.sku || `ITEM-${line.itemId}`
    const qty = Number(line.qty) || 0
    const lots = await getFifoLots(tx, itemCode, ret.returnDate)
    const available = round3(lots.reduce((sum, lot) => sum + lot.remainingQty, 0))
    const fifo = allocateFifo(lots, qty)
    if (!fifo) throw new InsufficientStoreStockError(itemCode, qty, available, 'return to supplier')
    const rate = fifo.rate
    const balanceQty = round3(available - qty)
    line.fifoAllocations = fifo.allocations
    await tx.finMaterialReturnLine.update({
      where: { id: line.id },
      data: { fifoAllocations: fifo.allocations },
    })
    const fifoText = fifo.allocations.map(allocation => `${allocation.sourceReferenceNo || allocation.sourceEntryNo}:${allocation.qty}`).join(', ')
    await tx.finStockLedger.create({
      data: {
        entryNo,
        postingDate: ret.returnDate,
        itemCode,
        itemName: item?.name || itemCode,
        unit: item?.Uom_Item_uomIdToUom?.code || 'Nos',
        warehouse: siteName,
        warehouseId: null,
        qtyIn: 0,
        qtyOut: qty,
        balanceQty,
        rate,
        valueIn: 0,
        valueOut: fifo.value,
        referenceType: 'Supplier Return',
        referenceNo: ret.returnNo,
        jobCode,
        siteCode,
        remarks: `Return ${ret.returnNo} to ${ret.vendorName || 'supplier'}${ret.supplierDocNo ? ` — ${ret.supplierDocNo}` : ''}${line.remarks ? ` — ${line.remarks}` : ''}; FIFO lots: ${fifoText}`,
      },
    })
    written++
  }
  return written
}
