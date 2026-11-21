import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission, getPermittedSiteScope } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

type RbacDecision = { allowed: boolean; reason?: string }

function actorFor(request: NextRequest, body?: any) {
  return request.cookies.get('erp_user_email')?.value || request.headers.get('x-actor-email') || body?.actor || ''
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000
}

function parseDate(value: unknown, fallback: Date): Date | null {
  if (value === undefined || value === null || value === '') return fallback
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

async function resolveSiteCode(pdb: any, siteCode?: string | null, siteId?: number | null): Promise<string | null> {
  if (siteCode && String(siteCode).trim()) return String(siteCode).trim()
  if (siteId) {
    const site = await pdb.finSite.findUnique({ where: { id: siteId }, select: { siteCode: true } })
    return site?.siteCode ?? null
  }
  return null
}

/**
 * Authorize a write against a site, and additionally require an all-sites
 * grant when the record has no site. Without the second check a site-scoped
 * user could create/delete an unallocated record because `hasPermission`
 * drops the site predicate when no siteCode is supplied.
 */
async function assertScoped(
  pdb: any,
  request: NextRequest,
  actor: string,
  permissionCode: string,
  siteCode: string | null,
  entityId?: string,
): Promise<RbacDecision> {
  const decision = await assertPermission(pdb, actor, permissionCode, {
    request,
    module: 'Inventory',
    entityId,
    siteCode,
  })
  if (!decision.allowed) return decision
  if (!siteCode) {
    const scope = await getPermittedSiteScope(pdb, actor, permissionCode)
    if (!scope.allSites) {
      return { allowed: false, reason: 'A site is required for a site-scoped user' }
    }
  }
  return decision
}

/** The live (not yet reversed) ledger outflow linked to a material issue. */
async function findLiveLinkedStock(tx: any, rec: any) {
  if (!rec?.itemCode) return null
  const linked = await tx.finStockLedger.findFirst({
    where: { itemCode: rec.itemCode, referenceType: 'Material Issue', referenceNo: rec.issueNo },
    orderBy: { id: 'desc' },
  })
  if (!linked) return null
  const reversed = await tx.finStockLedger.findFirst({
    where: {
      itemCode: linked.itemCode,
      referenceType: 'Material Issue Reversal',
      referenceNo: rec.issueNo,
      id: { gt: linked.id },
    },
    select: { id: true },
  })
  return reversed ? null : linked
}

/** Credit the Stock Ledger (qtyOut) for a posted issue. Call inside a transaction. */
async function postStockIssue(tx: any, rec: any) {
  if (rec.status !== 'Posted' || !rec.itemCode) return
  const qty = Number(rec.qty) || 0
  if (qty <= 0) return
  const last = await tx.finStockLedger.findFirst({
    where: rec.warehouseId ? { itemCode: rec.itemCode, warehouseId: rec.warehouseId } : { itemCode: rec.itemCode },
    orderBy: { id: 'desc' },
    select: { balanceQty: true },
  })
  const rate = Number(rec.rate) || 0
  await tx.finStockLedger.create({
    data: {
      entryNo: `SL-${rec.id}-${Date.now()}-MI`,
      postingDate: rec.issueDate,
      itemCode: rec.itemCode,
      itemName: rec.itemName || rec.itemCode,
      unit: rec.unit || 'Nos',
      warehouse: null,
      warehouseId: rec.warehouseId ?? null,
      qtyIn: 0,
      qtyOut: qty,
      balanceQty: round3((last?.balanceQty ?? 0) - qty),
      rate,
      valueIn: 0,
      valueOut: round2(qty * rate),
      referenceType: 'Material Issue',
      referenceNo: rec.issueNo,
      jobCode: rec.jobCode ?? null,
      siteCode: rec.siteCode ?? null,
      remarks: `Auto from Material Issue ${rec.issueNo} (${rec.remarks || rec.description || ''})`,
    },
  })
}

/** Restore stock for a posted issue by posting a linked reversal. Call inside a transaction. */
async function reverseStockIssue(tx: any, rec: any, linked: any) {
  if (!linked || !rec?.itemCode) return
  const qty = Number(linked.qtyOut) || 0
  if (qty <= 0) return
  const last = await tx.finStockLedger.findFirst({
    where: rec.warehouseId ? { itemCode: linked.itemCode, warehouseId: rec.warehouseId } : { itemCode: linked.itemCode },
    orderBy: { id: 'desc' },
    select: { balanceQty: true },
  })
  await tx.finStockLedger.create({
    data: {
      entryNo: `SL-${rec.id}-${Date.now()}-RVS`,
      postingDate: new Date(),
      itemCode: linked.itemCode,
      itemName: linked.itemName,
      unit: linked.unit,
      warehouse: linked.warehouse,
      warehouseId: linked.warehouseId,
      qtyIn: qty,
      qtyOut: 0,
      balanceQty: round3((last?.balanceQty ?? 0) + qty),
      rate: linked.rate,
      valueIn: linked.valueOut ?? 0,
      referenceType: 'Material Issue Reversal',
      referenceNo: rec.issueNo,
      jobCode: linked.jobCode,
      siteCode: linked.siteCode,
      remarks: `Reversal of Material Issue ${rec.issueNo}`,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const denied = await assertPermission(pdb, actor, 'Inventory_VIEW', { request, module: 'Inventory' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })

    const where: any = {}
    const scope = await getPermittedSiteScope(pdb, actor, 'Inventory_VIEW')
    if (!scope.allSites) {
      if (scope.siteCodes.length === 0) {
        return NextResponse.json({ success: false, error: 'No permitted sites for material issues' }, { status: 403 })
      }
      where.siteCode = { in: scope.siteCodes }
    }

    const records = await pdb.finMaterialIssue.findMany({
      where,
      orderBy: { issueDate: 'desc' },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching material issues:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobCode, description } = body
    if (!jobCode || !description) return NextResponse.json({ success: false, error: 'jobCode and description required' }, { status: 400 })
    const qty = Number(body.qty)
    if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ success: false, error: 'qty must be greater than zero' }, { status: 400 })
    const status = body.status || 'Draft'
    if (!['Draft', 'Posted', 'Reversed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }
    const issueDate = parseDate(body.issueDate, new Date())
    if (!issueDate) return NextResponse.json({ success: false, error: 'Invalid issueDate' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const actor = actorFor(request, body)
    const siteId = body.siteId ? Number(body.siteId) : null
    const siteCode = await resolveSiteCode(pdb, body.siteCode, siteId)
    const denied = await assertScoped(pdb, request, actor, 'Inventory_CREATE', siteCode)
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to post material issues' }, { status: 403 })

    const rate = Number(body.rate) || 0
    const amountInput = body.amount !== undefined && body.amount !== null && body.amount !== '' ? Number(body.amount) : qty * rate
    const amount = Number.isFinite(amountInput) ? round2(amountInput) : round2(qty * rate)

    const record = await pdb.$transaction(async (tx: any) => {
      const created = await tx.finMaterialIssue.create({
        data: {
          issueNo: body.issueNo || `MI-${Date.now()}`,
          issueDate,
          siteCode,
          siteId,
          jobCode,
          jobName: body.jobName || '',
          itemCode: body.itemCode || null,
          itemName: body.itemName || body.itemCode || '',
          warehouseId: body.warehouseId ? Number(body.warehouseId) : null,
          description,
          qty,
          unit: body.unit || 'Nos',
          rate,
          amount,
          wipAccount: body.wipAccount || null,
          status,
          remarks: body.remarks || null,
          createdBy: body.createdBy || actor || null,
        },
      })
      // Only an explicit 'Posted' issue moves stock; drafts stay out until posted.
      if (status === 'Posted') await postStockIssue(tx, created)
      return created
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const actor = actorFor(request, body)
    const existing = await pdb.finMaterialIssue.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'Material issue not found' }, { status: 404 })

    const denied = await assertScoped(pdb, request, actor, 'Inventory_EDIT', existing.siteCode, String(id))
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit material issues' }, { status: 403 })

    if (data.status !== undefined && !['Draft', 'Posted', 'Reversed'].includes(data.status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    const update: any = {}
    if (data.issueNo !== undefined) update.issueNo = data.issueNo
    if (data.issueDate !== undefined) {
      const d = parseDate(data.issueDate, new Date(existing.issueDate))
      if (!d) return NextResponse.json({ success: false, error: 'Invalid issueDate' }, { status: 400 })
      update.issueDate = d
    }
    if (data.siteCode !== undefined) update.siteCode = data.siteCode || null
    if (data.siteId !== undefined) update.siteId = data.siteId ? Number(data.siteId) : null
    if (data.jobCode !== undefined) update.jobCode = data.jobCode
    if (data.jobName !== undefined) update.jobName = data.jobName || ''
    if (data.itemCode !== undefined) update.itemCode = data.itemCode || null
    if (data.itemName !== undefined) update.itemName = data.itemName || ''
    if (data.warehouseId !== undefined) update.warehouseId = data.warehouseId ? Number(data.warehouseId) : null
    if (data.description !== undefined) update.description = data.description
    if (data.qty !== undefined) {
      const qty = Number(data.qty)
      if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ success: false, error: 'qty must be greater than zero' }, { status: 400 })
      update.qty = qty
    }
    if (data.unit !== undefined) update.unit = data.unit || 'Nos'
    if (data.rate !== undefined) {
      const rate = Number(data.rate)
      if (!Number.isFinite(rate)) return NextResponse.json({ success: false, error: 'Invalid rate' }, { status: 400 })
      update.rate = rate
    }
    if (data.wipAccount !== undefined) update.wipAccount = data.wipAccount || null
    if (data.status !== undefined) update.status = data.status
    if (data.remarks !== undefined) update.remarks = data.remarks || null

    const nextQty = update.qty ?? Number(existing.qty)
    const nextRate = update.rate ?? Number(existing.rate)
    if (data.amount !== undefined && data.amount !== null && data.amount !== '') {
      const amount = Number(data.amount)
      if (!Number.isFinite(amount)) return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
      update.amount = round2(amount)
    } else if (update.qty !== undefined || update.rate !== undefined) {
      update.amount = round2(nextQty * nextRate)
    }

    if (update.siteCode !== undefined && update.siteCode !== existing.siteCode) {
      const siteDenied = await assertScoped(pdb, request, actor, 'Inventory_EDIT', update.siteCode, String(id))
      if (!siteDenied.allowed) return NextResponse.json({ success: false, error: siteDenied.reason || 'Not allowed for the target site' }, { status: 403 })
    }

    const nextItemCode = update.itemCode !== undefined ? update.itemCode : existing.itemCode
    const nextWarehouseId = update.warehouseId !== undefined ? update.warehouseId : existing.warehouseId
    const nextStatus = update.status !== undefined ? update.status : existing.status
    const stockChanged =
      nextItemCode !== existing.itemCode ||
      nextQty !== Number(existing.qty) ||
      nextRate !== Number(existing.rate) ||
      nextWarehouseId !== existing.warehouseId ||
      nextStatus !== existing.status

    const record = await pdb.$transaction(async (tx: any) => {
      const live = await findLiveLinkedStock(tx, existing)
      // A posted issue that was edited (line/qty/warehouse/status changed), or a
      // stale ledger entry left against a non-posted record, must be reversed
      // before the new state is written.
      const shouldReverse = !!live && (stockChanged || existing.status !== 'Posted')
      if (shouldReverse) await reverseStockIssue(tx, existing, live)

      const updated = await tx.finMaterialIssue.update({ where: { id: existing.id }, data: update })
      const shouldPost = updated.status === 'Posted' && (stockChanged || shouldReverse || !live)
      if (shouldPost) await postStockIssue(tx, updated)
      return updated
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)

    const ids = searchParams.get('ids')
    if (ids) {
      const list = ids.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0)
      if (!list.length) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })

      const records = await pdb.finMaterialIssue.findMany({ where: { id: { in: list } } })
      if (!records.length) return NextResponse.json({ success: true, deleted: 0 })

      const sites = [...new Set(records.map((r) => r.siteCode))]
      for (const site of sites) {
        const denied = await assertScoped(pdb, request, actor, 'Inventory_DELETE', site, list.join(','))
        if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete material issues' }, { status: 403 })
      }

      // Reverse each linked Stock Ledger outflow before removing the issue, so
      // bulk deletes restore inventory the same way single deletes do.
      await pdb.$transaction(async (tx: any) => {
        for (const rec of records) {
          const live = await findLiveLinkedStock(tx, rec)
          if (live) await reverseStockIssue(tx, rec, live)
          await tx.finMaterialIssue.delete({ where: { id: rec.id } })
        }
      })
      return NextResponse.json({ success: true, deleted: records.length })
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const rec = await pdb.finMaterialIssue.findUnique({ where: { id: Number(id) } })
    if (!rec) return NextResponse.json({ success: false, error: 'Material issue not found' }, { status: 404 })

    const denied = await assertScoped(pdb, request, actor, 'Inventory_DELETE', rec.siteCode, id)
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete material issues' }, { status: 403 })

    await pdb.$transaction(async (tx: any) => {
      const live = await findLiveLinkedStock(tx, rec)
      if (live) await reverseStockIssue(tx, rec, live)
      await tx.finMaterialIssue.delete({ where: { id: rec.id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
