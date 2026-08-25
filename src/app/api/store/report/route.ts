import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Monthly store report — aggregates this module's own registers for a site
// and month. Note: without a running stock-balance ledger (out of scope for
// this pass — see the Site Store module notes), "opening/closing stock" is
// not computable here; this reports material MOVEMENT for the month instead
// (received / issued / returned / scrapped), which is what every other
// register in this module actually records.
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const month = searchParams.get('month') // YYYY-MM
    if (!siteId || !month) return NextResponse.json({ success: false, error: 'siteId and month are required' }, { status: 400 })
    const [y, m] = month.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59)
    const siteIdNum = Number(siteId)

    const [grns, issues, returns, scrap, mrsList, tools, gatePasses, verifications] = await Promise.all([
      pdb.finStoreGrn.findMany({ where: { siteId: siteIdNum, grnDate: { gte: start, lte: end } }, include: { lines: { include: { item: true } } } }),
      pdb.finStoreIssue.findMany({ where: { siteId: siteIdNum, issueDate: { gte: start, lte: end } }, include: { lines: { include: { item: true } } } }),
      pdb.finMaterialReturn.findMany({ where: { siteId: siteIdNum, returnDate: { gte: start, lte: end } }, include: { lines: { include: { item: true } } } }),
      pdb.finScrapEntry.findMany({ where: { siteId: siteIdNum, scrapDate: { gte: start, lte: end } } }),
      pdb.finMaterialRequisition.findMany({ where: { siteId: siteIdNum } }),
      pdb.finTool.findMany({ where: { siteId: siteIdNum } }),
      pdb.finGatePass.findMany({ where: { siteId: siteIdNum, gatePassDate: { gte: start, lte: end } } }),
      pdb.finPhysicalVerification.findMany({ where: { siteId: siteIdNum, verificationDate: { gte: start, lte: end } }, include: { lines: true } }),
    ])

    const receivedValue = grns.reduce((s, g) => s + g.lines.reduce((ls, l) => ls + l.amount, 0), 0)
    const issuedValue = issues.reduce((s, i) => s + i.lines.reduce((ls, l) => ls + l.amount, 0), 0)
    const scrapValue = scrap.reduce((s, x) => s + x.estimatedValue, 0)

    // Item-wise movement summary
    const itemMap = new Map<number, { itemId: number; sku: string; name: string; received: number; issued: number; returned: number; scrapped: number }>()
    const bump = (itemId: number, sku: string, name: string, key: 'received' | 'issued' | 'returned' | 'scrapped', qty: number) => {
      const row = itemMap.get(itemId) || { itemId, sku, name, received: 0, issued: 0, returned: 0, scrapped: 0 }
      row[key] += qty
      itemMap.set(itemId, row)
    }
    grns.forEach(g => g.lines.forEach(l => bump(l.itemId, l.item.sku, l.item.name, 'received', l.qtyAccepted)))
    issues.forEach(i => i.lines.forEach(l => bump(l.itemId, l.item.sku, l.item.name, 'issued', l.qty)))
    returns.forEach(r => r.lines.forEach(l => bump(l.itemId, l.item.sku, l.item.name, 'returned', l.qty)))

    const varianceLines = verifications.flatMap(v => v.lines.filter(l => l.variance !== 0))

    return NextResponse.json({
      success: true,
      data: {
        siteId: siteIdNum, month,
        materialReceived: { count: grns.length, value: receivedValue },
        materialIssued: { count: issues.length, value: issuedValue },
        materialReturned: { count: returns.length },
        scrap: { count: scrap.length, value: scrapValue },
        mrs: {
          pending: mrsList.filter(x => x.status === 'Pending').length,
          approved: mrsList.filter(x => x.status === 'Approved').length,
          rejected: mrsList.filter(x => x.status === 'Rejected').length,
        },
        tools: {
          total: tools.length,
          issued: tools.filter(t => t.status === 'Issued').length,
          available: tools.filter(t => t.status === 'Available').length,
          underRepair: tools.filter(t => t.status === 'Under Repair').length,
          lost: tools.filter(t => t.status === 'Lost').length,
        },
        gatePasses: { count: gatePasses.length, open: gatePasses.filter(g => g.status === 'Open').length },
        physicalVerification: { count: verifications.length, itemsWithVariance: varianceLines.length, varianceLines },
        itemMovement: [...itemMap.values()],
      },
    })
  } catch (error) {
    console.error('Error building store report:', error)
    return NextResponse.json({ success: false, error: 'Failed to build report' }, { status: 500 })
  }
}
