import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission, getPermittedSiteScope } from '@/lib/fin-rbac'
import { nextSeriesCode, withCodeRetry } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

function actorFor(request: NextRequest) {
  return request.cookies.get('erp_user_email')?.value || request.headers.get('x-actor-email') || ''
}

function outstandingBalance(invoice: { balanceAmount: number; grandTotal: number; receivedAmount: number; tdsDeduction: number; status: string }) {
  if (invoice.status === 'Paid') return 0
  if (invoice.balanceAmount > 0) return Math.round(invoice.balanceAmount * 100) / 100
  return Math.max(0, Math.round((invoice.grandTotal - invoice.receivedAmount - invoice.tdsDeduction) * 100) / 100)
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const denied = await assertPermission(pdb, actor, 'AR_VIEW', { request, module: 'AR' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
    const scope = await getPermittedSiteScope(pdb, actor, 'AR_VIEW')
    const records = await pdb.finReceipt.findMany({
      where: scope.allSites ? undefined : { siteCode: { in: scope.siteCodes } },
      orderBy: { receiptDate: 'desc' },
      include: { party: { select: { id: true, name: true } }, bankAccount: { select: { id: true, accountName: true } }, allocations: { include: { invoice: { select: { id: true, invoiceNo: true, grandTotal: true } } } } },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch receipts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const allocations = Array.isArray(body.allocations) ? body.allocations : []
    const amount = Number(body.amount)
    const partyId = Number(body.partyId)
    const mode = String(body.mode || 'NEFT')
    if (!Number.isInteger(partyId) || !Number.isFinite(amount) || amount <= 0 || !allocations.length) {
      return NextResponse.json({ success: false, error: 'Select a customer, allocate the receipt to invoices, and enter a positive amount' }, { status: 400 })
    }
    if (mode !== 'Cash' && !Number.isInteger(Number(body.bankAccountId))) {
      return NextResponse.json({ success: false, error: 'Select the bank account that received the funds' }, { status: 400 })
    }
    const date = body.receiptDate ? new Date(body.receiptDate) : new Date()
    if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, error: 'Invalid receipt date' }, { status: 400 })
    const denied = await assertPermission(pdb, actor, 'AR_CREATE', { request, module: 'AR' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create receipts' }, { status: 403 })

    const party = await pdb.finParty.findUnique({ where: { id: partyId }, select: { id: true, name: true, partyType: true, isActive: true } })
    if (!party || !party.isActive || !['Customer', 'Other'].includes(party.partyType)) {
      return NextResponse.json({ success: false, error: 'Active customer not found' }, { status: 404 })
    }
    const seen = new Set<number>()
    const normalized: Array<{ invoiceId: number; amount: number; tdsAmount: number }> = []
    for (const allocation of allocations) {
      if (!allocation || typeof allocation !== 'object') {
        return NextResponse.json({ success: false, error: 'Each allocation must reference an invoice' }, { status: 400 })
      }
      const invoiceId = Number(allocation.invoiceId)
      const cashAmount = Number(allocation.amount)
      const tdsAmount = Number(allocation.tdsAmount || 0)
      if (!Number.isInteger(invoiceId) || !Number.isFinite(cashAmount) || cashAmount < 0 || !Number.isFinite(tdsAmount) || tdsAmount < 0) {
        return NextResponse.json({ success: false, error: 'Each allocation needs a valid invoice and non-negative cash/TDS amounts' }, { status: 400 })
      }
      if (seen.has(invoiceId)) return NextResponse.json({ success: false, error: 'Each invoice may appear only once per receipt' }, { status: 400 })
      seen.add(invoiceId)
      normalized.push({ invoiceId, amount: cashAmount, tdsAmount })
    }
    const allocatedCash = Math.round(normalized.reduce((sum: number, allocation: any) => sum + allocation.amount, 0) * 100) / 100
    if (allocatedCash !== Math.round(amount * 100) / 100) {
      return NextResponse.json({ success: false, error: 'Receipt amount must equal the total cash allocated to invoices' }, { status: 400 })
    }

    const invoices = await pdb.finInvoice.findMany({
      where: { id: { in: normalized.map((allocation: any) => allocation.invoiceId) } },
      include: { site: { select: { siteCode: true } } },
    })
    if (invoices.length !== normalized.length) return NextResponse.json({ success: false, error: 'One or more selected invoices no longer exist' }, { status: 404 })
    const invoiceMap = new Map(invoices.map((invoice: any) => [invoice.id, invoice]))
    for (const allocation of normalized) {
      const invoice: any = invoiceMap.get(allocation.invoiceId)
      if (!invoice || invoice.partyId !== partyId) {
        return NextResponse.json({ success: false, error: 'All allocated invoices must belong to the selected customer' }, { status: 400 })
      }
      if (invoice.status === 'Draft' || invoice.status === 'Rejected') {
        return NextResponse.json({ success: false, error: `Invoice ${invoice.invoiceNo} is not issued and cannot receive payment` }, { status: 409 })
      }
      if (allocation.amount + allocation.tdsAmount > outstandingBalance(invoice) + 0.001) {
        return NextResponse.json({ success: false, error: `Allocation exceeds the outstanding balance on invoice ${invoice.invoiceNo}` }, { status: 400 })
      }
      const siteDenied = await assertPermission(pdb, actor, 'AR_CREATE', { request, module: 'AR', siteCode: invoice.site?.siteCode ?? null })
      if (!siteDenied.allowed) return NextResponse.json({ success: false, error: siteDenied.reason || 'Not allowed for one or more invoice sites' }, { status: 403 })
    }

    const bankAccountId = mode === 'Cash' ? null : Number(body.bankAccountId)
    if (bankAccountId !== null) {
      const bankAccount = await pdb.bankAccount.findUnique({ where: { id: bankAccountId }, select: { id: true, status: true } })
      if (!bankAccount || bankAccount.status !== 'Active') {
        return NextResponse.json({ success: false, error: 'The selected bank account is not active' }, { status: 400 })
      }
    }

    const siteCodes = [...new Set(invoices.map((invoice: any) => invoice.site?.siteCode).filter(Boolean))]
    const record = await withCodeRetry(
      () => nextSeriesCode(pdb, 'receipt'),
      (receiptNo) => pdb.finReceipt.create({
        data: {
          receiptNo,
          receiptDate: date,
          partyName: party.name,
          partyId,
          bankAccountId,
          invoiceRef: normalized.length === 1 ? invoices[0].invoiceNo : `${normalized.length} invoices`,
          amount,
          mode,
          bankRef: String(body.bankRef || '').trim() || null,
          jobCode: invoices.length === 1 ? invoices[0].jobCode : null,
          siteCode: siteCodes.length === 1 ? siteCodes[0] : null,
          status: 'Draft',
          createdBy: actor || null,
          allocations: { create: normalized },
        },
        include: { allocations: { include: { invoice: { select: { id: true, invoiceNo: true, grandTotal: true } } } } },
      }),
    )
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating receipt:', error)
    return NextResponse.json({ success: false, error: 'Failed to create receipt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const receipt = await pdb.finReceipt.findUnique({ where: { id: Number(id) }, select: { id: true, status: true, siteCode: true } })
    if (!receipt) return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 })
    const denied = await assertPermission(pdb, actor, 'AR_DELETE', { request, module: 'AR', entityId: id, siteCode: receipt.siteCode })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete receipts' }, { status: 403 })
    if (receipt.status !== 'Draft' && receipt.status !== 'Rejected') {
      return NextResponse.json({ success: false, error: 'Only draft or rejected receipts can be deleted' }, { status: 409 })
    }
    await pdb.finReceipt.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete receipt' }, { status: 500 })
  }
}
