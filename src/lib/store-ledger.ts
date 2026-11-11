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

const round3 = (n: number) => Math.round(n * 1000) / 1000
const entryFor = (voucherNo: string, lineId: number) =>
  `SL-${String(voucherNo).replace(/[^\w-]/g, '')}-L${lineId}`

/** Post accepted GRN lines to the ledger. Call inside a transaction. */
export async function postGrnLinesToLedger(
  tx: any,
  grn: { grnNo: string; grnDate: Date; lines: Array<{ id: number; itemId: number; qtyAccepted: number; rate: number; remarks: string | null; item: { sku: string; name: string } | null }> },
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
        warehouse: siteName,
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
export async function postIssueLinesToLedger(
  tx: any,
  issue: { issueNo: string; issueDate: Date; lines: Array<{ id: number; itemId: number; qty: number; rate: number }> },
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
    const rate = Number(l.rate) || 0
    const last = await tx.finStockLedger.findFirst({
      where: { itemCode },
      orderBy: { id: 'desc' },
      select: { balanceQty: true },
    })
    const balanceQty = round3((last?.balanceQty ?? 0) - qty)
    const entryNo = entryFor(issue.issueNo, l.id)
    const existing = await tx.finStockLedger.findFirst({ where: { entryNo }, select: { id: true } })
    if (existing) continue
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
        valueOut: Math.round(qty * rate * 100) / 100,
        referenceType: 'Material Issue',
        referenceNo: issue.issueNo,
        jobCode,
        siteCode,
        remarks: `Issue ${issue.issueNo}${issuedTo ? ` — to ${issuedTo}` : ''}${remarksText ? ` — ${remarksText}` : ''}`,
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
        rate: last?.rate ?? 0,
        valueIn: 0,
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
