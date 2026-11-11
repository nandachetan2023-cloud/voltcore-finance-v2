import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { nextPrefixedCode } from '@/lib/auto-number'
import { postGrnLinesToLedger } from '@/lib/store-ledger'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true } },
  job: { select: { id: true, jobCode: true, description: true } },
  po: { select: { id: true, poNo: true, vendorName: true } },
  lines: { include: { item: { select: { id: true, sku: true, name: true } } } },
}

// qtyAccepted defaults to qtyReceived only when genuinely omitted — a caller
// explicitly sending 0 (a fully-rejected line) must not fall back to
// qtyReceived via `||`, since 0 is falsy but a legitimate accepted quantity.
const resolveAccepted = (l: any) => l.qtyAccepted !== undefined && l.qtyAccepted !== null && l.qtyAccepted !== ''
  ? Number(l.qtyAccepted) || 0
  : Number(l.qtyReceived) || 0

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finStoreGrn.findMany({ orderBy: { grnDate: 'desc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching GRNs:', error)
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create GRNs' }, { status: 403 })
    const { lines, ...data } = body
    if (!data.grnNo) {
      const year = new Date().getFullYear()
      data.grnNo = await nextPrefixedCode(pdb, 'finStoreGrn', 'grnNo', `GRN/${year}/`, 4)
    }
    const jobForLedger = data.jobId ? await pdb.finJob.findUnique({ where: { id: Number(data.jobId) }, select: { jobCode: true } }) : null

    // Create + (when posted) ledger posting in one transaction so a Posted
    // GRN is always in stock, never a draft that silently holds inventory.
    const record = await pdb.$transaction(async (tx) => {
      const created = await tx.finStoreGrn.create({
        data: {
          grnNo: data.grnNo,
          grnDate: new Date(data.grnDate || Date.now()),
          poId: data.poId ? Number(data.poId) : null,
          siteId: Number(data.siteId),
          jobId: data.jobId ? Number(data.jobId) : null,
          vendorName: data.vendorName || null,
          dcNo: data.dcNo || null,
          invoiceNo: data.invoiceNo || null,
          timeOfReceipt: data.timeOfReceipt || null,
          projectName: data.projectName || null,
          siteLocation: data.siteLocation || null,
          gateEntryNo: data.gateEntryNo || null,
          vehicleNo: data.vehicleNo || null,
          lrDetails: data.lrDetails || null,
          storeLocation: data.storeLocation || null,
          receivedBy: data.receivedBy || null,
          status: data.status || 'Draft',
          remarks: data.remarks || null,
          lines: lines?.length ? {
            create: lines.map((l: any) => ({
              itemId: Number(l.itemId),
              poItemId: l.poItemId ? Number(l.poItemId) : null,
              qtyOrdered: Number(l.qtyOrdered) || 0,
              qtyReceived: Number(l.qtyReceived) || 0,
              qtyAccepted: resolveAccepted(l),
              qtyRejected: Number(l.qtyRejected) || 0,
              rate: Number(l.rate) || 0,
              amount: resolveAccepted(l) * (Number(l.rate) || 0),
              condition: l.condition || 'Good',
              remarks: l.remarks || null,
              materialCategory: l.materialCategory || null,
              batchHeatNo: l.batchHeatNo || null,
              damageTransit: l.damageTransit || null,
              inspectionStatus: l.inspectionStatus || null,
            })),
          } : undefined,
        },
        include: INCLUDE,
      })

      if ((data.status || 'Draft') === 'Posted') {
        await postGrnLinesToLedger(
          tx,
          {
            grnNo: created.grnNo,
            grnDate: created.grnDate,
            lines: created.lines.map((l: any) => ({ ...l, item: l.item })),
          },
          site?.name ?? null,
          site?.siteCode ?? null,
          jobForLedger?.jobCode ?? null,
        )
      }

      return created
    })

    // Reconcile against the PO line's receivedQty when a poItemId is given —
    // keeps Purchase's own 3-way-match / receivedQty in sync with the store.
    if (lines?.length) {
      for (const l of lines) {
        if (l.poItemId) {
          await pdb.finPOItem.update({
            where: { id: Number(l.poItemId) },
            data: { receivedQty: { increment: resolveAccepted(l) } },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating GRN:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, lines, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const site = data.siteId ? await pdb.finSite.findUnique({ where: { id: Number(data.siteId) } }) : null
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_EDIT', { request, module: 'Inventory', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit GRNs' }, { status: 403 })
    if (Array.isArray(lines)) {
      await pdb.finStoreGrnLine.deleteMany({ where: { grnId: Number(id) } })
    }
    const record = await pdb.finStoreGrn.update({
      where: { id: Number(id) },
      data: {
        ...(data.grnDate ? { grnDate: new Date(data.grnDate) } : {}),
        ...(data.poId !== undefined ? { poId: data.poId ? Number(data.poId) : null } : {}),
        ...(data.siteId !== undefined ? { siteId: Number(data.siteId) } : {}),
        ...(data.jobId !== undefined ? { jobId: data.jobId ? Number(data.jobId) : null } : {}),
        ...(data.vendorName !== undefined ? { vendorName: data.vendorName } : {}),
        ...(data.dcNo !== undefined ? { dcNo: data.dcNo } : {}),
        ...(data.invoiceNo !== undefined ? { invoiceNo: data.invoiceNo } : {}),
        ...(data.timeOfReceipt !== undefined ? { timeOfReceipt: data.timeOfReceipt } : {}),
        ...(data.projectName !== undefined ? { projectName: data.projectName } : {}),
        ...(data.siteLocation !== undefined ? { siteLocation: data.siteLocation } : {}),
        ...(data.gateEntryNo !== undefined ? { gateEntryNo: data.gateEntryNo } : {}),
        ...(data.vehicleNo !== undefined ? { vehicleNo: data.vehicleNo } : {}),
        ...(data.lrDetails !== undefined ? { lrDetails: data.lrDetails } : {}),
        ...(data.storeLocation !== undefined ? { storeLocation: data.storeLocation } : {}),
        ...(data.receivedBy !== undefined ? { receivedBy: data.receivedBy } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
        lines: lines?.length ? {
          create: lines.map((l: any) => ({
            itemId: Number(l.itemId),
            poItemId: l.poItemId ? Number(l.poItemId) : null,
            qtyOrdered: Number(l.qtyOrdered) || 0,
            qtyReceived: Number(l.qtyReceived) || 0,
            qtyAccepted: resolveAccepted(l),
            qtyRejected: Number(l.qtyRejected) || 0,
            rate: Number(l.rate) || 0,
            amount: resolveAccepted(l) * (Number(l.rate) || 0),
            condition: l.condition || 'Good',
            remarks: l.remarks || null,
            materialCategory: l.materialCategory || null,
            batchHeatNo: l.batchHeatNo || null,
            damageTransit: l.damageTransit || null,
            inspectionStatus: l.inspectionStatus || null,
          })),
        } : undefined,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating GRN:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete GRNs' }, { status: 403 })
    // Remove the stock-ledger lines this GRN posted so the Stock Register
    // stays consistent after a delete (entryNo is deterministic per line).
    const grn = await pdb.finStoreGrn.findUnique({ where: { id: Number(id) }, select: { grnNo: true } })
    if (grn) {
      const prefix = `SL-${String(grn.grnNo).replace(/[^\w-]/g, '')}-L`
      await pdb.finStockLedger.deleteMany({ where: { entryNo: { startsWith: prefix } } })
    }
    await pdb.finStoreGrn.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting GRN:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
