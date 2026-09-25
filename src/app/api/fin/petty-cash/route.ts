import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission, getPermittedSiteScope, isTenantAdmin } from '@/lib/fin-rbac'
import { nextSiteBalance, recomputePettyCashBalances } from '@/lib/petty-cash-balance'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    // Site scoping: a custodian/site manager must only ever see their own site's
    // vouchers. The identity comes from the httpOnly session cookie set at login
    // — never from a client-supplied header, which the caller could forge.
    // Tenant admins/superadmins keep the full cross-site view (read-only listing;
    // posting and approving still need an explicit FinUserRole grant).
    const email = request.cookies.get('erp_user_email')?.value || ''
    let where: any = {}
    if (!isTenantAdmin(request)) {
      const scope = await getPermittedSiteScope(pdb, email, 'PETTYCASH_VIEW')
      if (!scope.allSites) {
        if (scope.siteCodes.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Not allowed to view petty cash vouchers' },
            { status: 403 },
          )
        }
        where = { site: { siteCode: { in: scope.siteCodes } } }
      }
    }

    const records = await pdb.finPettyCash.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        party: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, totalAmount: true } },
        expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
      },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const isReplenishment = body.type === 'Credit' && (body.category === 'Replenishment' || /replenish/i.test(body.description || ''))
    const requiredKeys = isReplenishment ? ['siteId'] : ['siteId', 'jobCode']
    const missing = requiredKeys.filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })

    const site = body.siteId ? await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } }) : null
    // The session cookie is the identity the gate is checked against — `body.actor`
    // is client-supplied and could name someone with wider site access.
    const actorEmail = request.cookies.get('erp_user_email')?.value || body.actor || ''
    const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_CREATE', { request, module: 'PettyCash', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create petty cash vouchers' }, { status: 403 })

    // Requester supplies description/amount/category/jobCode; everything costing-related is derived automatically.
    if (!body.costCenter) body.costCenter = site?.siteCode ? `CC-${site.siteCode}` : null
    if (!body.department) body.department = 'Site Operations'
    if (!body.projectManager) body.projectManager = site?.responsiblePerson || null
    if (!body.authorizedBy) body.authorizedBy = actorEmail || body.actor || null
    if (!body.type) body.type = 'Debit'
    if (!body.paymentMode) body.paymentMode = 'Cash'
    if (!body.linkedType) body.linkedType = body.poId ? 'PO' : body.expenseClaimId ? 'ExpenseClaim' : 'Direct'

    if (!body.voucherNo) {
      const yr = new Date().getFullYear()
      const count = (await pdb.finPettyCash.count()) + 1
      body.voucherNo = `PV/${yr}/${String(count).padStart(4, '0')}`
    }

    // Running balance is per SITE and counts approved vouchers only — a global
    // sequence made one site's ledger show another site's cumulative figure.
    const balance = await nextSiteBalance(pdb, body.siteId ? Number(body.siteId) : null, {
      type: body.type || 'Debit',
      amount: Number(body.amount) || 0,
      approvalStatus: body.approvalStatus ?? null,
    })

    const record = await pdb.finPettyCash.create({
      data: {
        voucherNo: body.voucherNo,
        date: new Date(body.date),
        description: body.description,
        amount: Number(body.amount),
        type: body.type || 'Debit',
        category: body.category || null,
        partyId: body.partyId ? Number(body.partyId) : null,
        siteId: body.siteId ? Number(body.siteId) : null,
        poId: body.poId ? Number(body.poId) : null,
        expenseClaimId: body.expenseClaimId ? Number(body.expenseClaimId) : null,
        linkedType: body.linkedType || 'Direct',
        authorizedBy: body.authorizedBy || null,
        paymentMode: body.paymentMode || 'Cash',
        balance,
        referenceNo: body.referenceNo || null,
        remarks: body.remarks || null,
        billAttachmentPath: body.billAttachmentPath || null,
        jobCode: body.jobCode || null,
        costCenter: body.costCenter || null,
        department: body.department || null,
        projectManager: body.projectManager || null,
        custodian: body.custodian || null,
        limitAmount: body.limitAmount ? Number(body.limitAmount) : null,
      },
      include: {
        party: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, totalAmount: true } },
        expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
      },
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
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)

    const missing = ['siteId', 'jobCode'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })

    const site = body.siteId ? await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } }) : null
    const actorEmail = request.cookies.get('erp_user_email')?.value || body.actor || ''
    const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_EDIT', { request, module: 'PettyCash', entityId: String(id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit petty cash vouchers' }, { status: 403 })

    // Also gate on the voucher's CURRENT site: without this a site-scoped user
    // could edit (and re-home) another site's voucher just by posting their own
    // siteId in the body.
    const existing = await pdb.finPettyCash.findUnique({
      where: { id: Number(id) },
      select: { site: { select: { siteCode: true } } },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Voucher not found' }, { status: 404 })
    if (existing.site?.siteCode && existing.site.siteCode !== site?.siteCode) {
      const deniedAtSource = await assertPermission(pdb, actorEmail, 'PETTYCASH_EDIT', { request, module: 'PettyCash', entityId: String(id), siteCode: existing.site.siteCode })
      if (!deniedAtSource.allowed) return NextResponse.json({ success: false, error: `Not allowed to edit vouchers of site ${existing.site.siteCode}` }, { status: 403 })
    }

    if (!data.costCenter) data.costCenter = site?.siteCode ? `CC-${site.siteCode}` : data.costCenter
    if (!data.department) data.department = data.department || 'Site Operations'
    if (!data.projectManager) data.projectManager = site?.responsiblePerson || data.projectManager

    const updateData: any = {}
    if (data.voucherNo !== undefined) updateData.voucherNo = data.voucherNo
    if (data.date !== undefined) updateData.date = new Date(data.date)
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = Number(data.amount)
    if (data.type !== undefined) updateData.type = data.type
    if (data.category !== undefined) updateData.category = data.category
    if (data.partyId !== undefined) updateData.partyId = data.partyId ? Number(data.partyId) : null
    if (data.siteId !== undefined) updateData.siteId = data.siteId ? Number(data.siteId) : null
    if (data.poId !== undefined) updateData.poId = data.poId ? Number(data.poId) : null
    if (data.expenseClaimId !== undefined) updateData.expenseClaimId = data.expenseClaimId ? Number(data.expenseClaimId) : null
    if (data.linkedType !== undefined) updateData.linkedType = data.linkedType
    if (data.authorizedBy !== undefined) updateData.authorizedBy = data.authorizedBy
    if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo
    if (data.remarks !== undefined) updateData.remarks = data.remarks
    if (data.billAttachmentPath !== undefined) updateData.billAttachmentPath = data.billAttachmentPath
    if (data.jobCode !== undefined) updateData.jobCode = data.jobCode
    if (data.costCenter !== undefined) updateData.costCenter = data.costCenter
    if (data.department !== undefined) updateData.department = data.department
    if (data.projectManager !== undefined) updateData.projectManager = data.projectManager
    if (data.custodian !== undefined) updateData.custodian = data.custodian
    if (data.limitAmount !== undefined) updateData.limitAmount = data.limitAmount ? Number(data.limitAmount) : null

    const record = await pdb.finPettyCash.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        party: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, totalAmount: true } },
        expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
      },
    })
    // Amount/type/site may all have changed — re-walk every affected ledger.
    await recomputePettyCashBalances(pdb)
    const refreshed = await pdb.finPettyCash.findUnique({
      where: { id: record.id },
      include: {
        party: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, siteCode: true } },
        po: { select: { id: true, poNo: true, totalAmount: true } },
        expenseClaim: { select: { id: true, claimNo: true, totalAmount: true } },
      },
    })
    return NextResponse.json({ success: true, data: refreshed ?? record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)

    const actor = request.cookies.get('erp_user_email')?.value || request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, actor, 'PETTYCASH_DELETE', { request, module: 'PettyCash' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete petty cash vouchers' }, { status: 403 })

    // Site scope of the caller — a site-scoped user may only delete their own
    // site's vouchers, never another site's.
    const scope = isTenantAdmin(request)
      ? { allSites: true, siteCodes: [] as string[] }
      : await getPermittedSiteScope(pdb, actor, 'PETTYCASH_DELETE')
    const siteGuard: any = scope.allSites ? {} : { site: { siteCode: { in: scope.siteCodes } } }

    const idsParam = searchParams.get('ids')
    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter((n) => !isNaN(n))
      if (ids.length === 0) return NextResponse.json({ success: false, error: 'No valid ids provided' }, { status: 400 })
      const result = await pdb.finPettyCash.deleteMany({ where: { id: { in: ids }, ...siteGuard } })
      if (result.count > 0) await recomputePettyCashBalances(pdb)
      if (result.count < ids.length) {
        return NextResponse.json(
          { success: true, deleted: result.count, warning: 'Some vouchers belong to sites you cannot delete in and were skipped' },
        )
      }
      return NextResponse.json({ success: true, deleted: result.count })
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const removed = await pdb.finPettyCash.deleteMany({ where: { id: Number(id), ...siteGuard } })
    if (removed.count === 0) return NextResponse.json({ success: false, error: 'Voucher not found in your site scope' }, { status: 403 })
    await recomputePettyCashBalances(pdb)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
