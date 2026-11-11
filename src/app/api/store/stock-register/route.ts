import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Stock Register — the "Index Wise" register from the client Excel formats,
 * backed by FinStockLedger (every GRN post and every store issue already
 * writes a ledger line with a running balance).
 *
 * GET /api/store/stock-register
 *   → index of every store item: sku, name, unit, min (reorder) stock, totals
 *     and current balance — what the Excel "Index" sheet shows.
 * GET /api/store/stock-register?itemCode=CBL-011
 *   → the per-item register: one row per ledger entry with opening/received/
 *     issued/closing + PO / job / issue-to enrichment — the Excel item sheet.
 */

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request);
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode') || undefined;

    if (itemCode) {
      const item = await pdb.item.findFirst({
        where: { OR: [{ sku: itemCode }, { name: itemCode }] },
        select: { id: true, sku: true, name: true, reorderLevel: true, reorderQty: true, Uom_Item_uomIdToUom: { select: { code: true } } },
      });

      const entries = await pdb.finStockLedger.findMany({
        where: { itemCode },
        orderBy: [{ postingDate: 'asc' }, { id: 'asc' }],
      });

      // Enrich receipts with the PO number and the GRN's vendor (the Excel
      // register shows PO Number + GRN/DC No. side by side).
      const grnNos = entries.filter(e => e.referenceType === 'Stock Receipt' && e.referenceNo).map(e => e.referenceNo!) as string[];
      const grns = grnNos.length
        ? await pdb.finStoreGrn.findMany({
            where: { grnNo: { in: grnNos } },
            select: { grnNo: true, po: { select: { poNo: true, vendorName: true } }, vendorName: true },
          })
        : [];
      const grnMap = new Map(grns.map(g => [g.grnNo, g]));

      let running = 0;
      const rows = entries.map(e => {
        const opening = round3(e.balanceQty - e.qtyIn + e.qtyOut);
        running = e.balanceQty;
        const grn = e.referenceNo ? grnMap.get(e.referenceNo) : undefined;
        return {
          id: e.id,
          date: e.postingDate,
          referenceType: e.referenceType,
          referenceNo: e.referenceNo,
          poNo: grn?.po?.poNo ?? null,
          vendorName: grn?.po?.vendorName ?? grn?.vendorName ?? null,
          jobCode: e.jobCode,
          siteCode: e.siteCode,
          opening,
          received: e.qtyIn,
          issued: e.qtyOut,
          closing: e.balanceQty,
          rate: e.rate,
          value: e.referenceType === 'Stock Receipt' ? e.valueIn : e.valueOut,
          remarks: e.remarks,
        };
      });

      const totals = {
        received: round3(entries.filter(e => e.referenceType === 'Stock Receipt').reduce((s, e) => s + e.qtyIn, 0)),
        returned: round3(entries.filter(e => e.referenceType === 'Stock Return').reduce((s, e) => s + e.qtyIn, 0)),
        issued: round3(entries.reduce((s, e) => s + e.qtyOut, 0)),
        balance: running,
      };
      const reorderLevel = Number(item?.reorderLevel ?? 0);

      return NextResponse.json({
        success: true,
        data: {
          item: item ? { id: item.id, itemCode: item.sku, name: item.name, unit: item.Uom_Item_uomIdToUom?.code ?? 'Nos', reorderLevel } : { itemCode, name: itemCode, unit: 'Nos', reorderLevel: 0 },
          entries: rows,
          totals,
          reorderLevel,
          belowMin: reorderLevel > 0 && running < reorderLevel,
        },
      });
    }

    // ── Index mode ───────────────────────────────────────────────────
    const storeItems = await pdb.item.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true, reorderLevel: true, Uom_Item_uomIdToUom: { select: { code: true } } },
      orderBy: { sku: 'asc' },
    });

    const agg = await pdb.finStockLedger.groupBy({
      by: ['itemCode'],
      _sum: { qtyIn: true, qtyOut: true, valueIn: true, valueOut: true },
    });
    const aggMap = new Map(agg.map(a => [a.itemCode, a]));

    const index = storeItems.map(it => {
      const a = aggMap.get(it.sku);
      const totalIn = round3(a?._sum.qtyIn ?? 0);
      const totalOut = round3(a?._sum.qtyOut ?? 0);
      const balance = round3(totalIn - totalOut);
      const reorderLevel = Number(it.reorderLevel ?? 0);
      return {
        itemId: it.id,
        itemCode: it.sku,
        itemName: it.name,
        unit: it.Uom_Item_uomIdToUom?.code ?? 'Nos',
        reorderLevel,
        totalIn,
        totalOut,
        balance,
        value: round3(Number(a?._sum.valueIn ?? 0) - Number(a?._sum.valueOut ?? 0)),
        belowMin: reorderLevel > 0 && balance < reorderLevel,
      };
    });

    return NextResponse.json({ success: true, data: index });
  } catch (error) {
    console.error('Error building stock register:', error);
    return NextResponse.json({ success: false, error: 'Failed to build stock register' }, { status: 500 });
  }
}
