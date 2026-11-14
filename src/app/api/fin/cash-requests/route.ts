import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { nextPrefixedCode } from '@/lib/auto-number'
import { assertPermission } from '@/lib/fin-rbac'
import { recomputePettyCashBalances } from '@/lib/petty-cash-balance'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  site: { select: { id: true, name: true, siteCode: true, responsiblePerson: true, pettyCashLimit: true } },
}

// Employee cash / advance request workflow:
//   Pending --approve--> Approved --disburse--> Disbursed (creates a Credit voucher)
//                 \--reject--> Rejected
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const status = searchParams.get('status')
    const where: any = {}
    if (status) where.status = status
    const records = await pdb.finCashRequest.findMany({ where, orderBy: { createdAt: 'desc' }, include: INCLUDE })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching cash requests:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch cash requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const missing = ['employeeName', 'amount', 'purpose'].filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })

    const actorEmail = request.cookies.get('erp_user_email')?.value || body.actor || ''
    const actor = actorEmail || body.requestedBy || ''
    const site = body.siteId ? await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } }) : null
    const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_CREATE', { request, module: 'PettyCash', siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })

    const yr = new Date().getFullYear()
    const requestNo = body.requestNo || await nextPrefixedCode(pdb, 'finCashRequest', 'requestNo', `CR/${yr}/`, 4)
    const record = await pdb.finCashRequest.create({
      data: {
        requestNo,
        employeeName: String(body.employeeName).trim(),
        siteId: body.siteId ? Number(body.siteId) : null,
        amount: Number(body.amount),
        purpose: String(body.purpose).trim(),
        neededBy: body.neededBy && !isNaN(new Date(body.neededBy).getTime()) ? new Date(body.neededBy) : null,
        requestedBy: actorEmail || null,
        status: 'Pending',
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating cash request:', error)
    return NextResponse.json({ success: false, error: 'Failed to create cash request' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, comments } = body as { id?: number; action?: string; comments?: string }
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (!action) return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const req = await pdb.finCashRequest.findUnique({ where: { id: Number(id) }, include: INCLUDE })
    if (!req) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })

    const actorEmail = request.cookies.get('erp_user_email')?.value || body.actor || ''
    const yr = new Date().getFullYear()

    if (action === 'approve') {
      if (req.status !== 'Pending') return NextResponse.json({ success: false, error: `Cannot approve a request that is ${req.status}` }, { status: 400 })
      const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_APPROVE', { request, module: 'PettyCash', siteCode: req.site?.siteCode ?? null })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      const record = await pdb.finCashRequest.update({ where: { id: req.id }, data: { status: 'Approved', approvedBy: actorEmail || null, approvedAt: new Date() }, include: INCLUDE })
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'reject') {
      if (req.status !== 'Pending') return NextResponse.json({ success: false, error: `Cannot reject a request that is ${req.status}` }, { status: 400 })
      if (!comments) return NextResponse.json({ success: false, error: 'A reason is required to reject' }, { status: 400 })
      const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_APPROVE', { request, module: 'PettyCash', siteCode: req.site?.siteCode ?? null })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      const record = await pdb.finCashRequest.update({ where: { id: req.id }, data: { status: 'Rejected', rejectedReason: comments, approvedBy: actorEmail || null, approvedAt: new Date() }, include: INCLUDE })
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'disburse') {
      if (req.status !== 'Approved') return NextResponse.json({ success: false, error: `Cannot disburse a request that is ${req.status}` }, { status: 400 })
      const denied = await assertPermission(pdb, actorEmail, 'PETTYCASH_APPROVE', { request, module: 'PettyCash', siteCode: req.site?.siteCode ?? null })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })

      // Create the Credit voucher for the cash going out against the approved request
      const voucherNo = await nextPrefixedCode(pdb, 'finPettyCash', 'voucherNo', `PV/${yr}/`, 4)
      const balance = 0
      const description = `Cash disbursed to ${req.employeeName} — ${req.purpose}${req.requestNo ? ` (${req.requestNo})` : ''}`
      const [voucher] = await pdb.$transaction([
        pdb.finPettyCash.create({
          data: {
            voucherNo,
            date: new Date(),
            description,
            amount: req.amount,
            type: 'Credit',
            category: 'ADVANCE',
            siteId: req.siteId,
            linkedType: 'Direct',
            authorizedBy: actorEmail || null,
            custodian: req.site?.responsiblePerson || null,
            submittedBy: actorEmail || null,
            submittedAt: new Date(),
            approvedBy: actorEmail || null,
            approvedAt: new Date(),
            approvalStatus: 'Approved',
            paymentMode: 'Cash',
            balance,
            remarks: `Linked to cash request ${req.requestNo}`,
          },
        }),
      ])
      const record = await pdb.finCashRequest.update({
        where: { id: req.id },
        data: { status: 'Disbursed', voucherId: voucher.id },
        include: INCLUDE,
      })
      await pdb.finApprovalLog.create({
        data: { entityType: 'FinCashRequest', entityId: String(req.id), status: 'Disbursed', action: 'Disburse', makerId: actorEmail || null, comments: req.requestNo, finPettyCashId: voucher.id },
      })
      await recomputePettyCashBalances(pdb)
      return NextResponse.json({ success: true, data: record })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Error processing cash request:', error)
    return NextResponse.json({ success: false, error: 'Failed to process cash request' }, { status: 500 })
  }
}
