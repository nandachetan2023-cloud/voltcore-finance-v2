import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { GL_ACCOUNTS } from '@/lib/gl-posting'

export const dynamic = 'force-dynamic'

function actorFor(request: NextRequest) {
  return request.cookies.get('erp_user_email')?.value || request.headers.get('x-actor-email') || ''
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function outstandingBalance(invoice: { balanceAmount: number; grandTotal: number; receivedAmount: number; tdsDeduction: number; status: string }) {
  if (invoice.status === 'Paid') return 0
  if (invoice.balanceAmount > 0) return roundMoney(invoice.balanceAmount)
  return Math.max(0, roundMoney(invoice.grandTotal - invoice.receivedAmount - invoice.tdsDeduction))
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params
    const receiptId = Number(rawId)
    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid receipt id' }, { status: 400 })
    }

    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const receipt = await pdb.finReceipt.findUnique({
      where: { id: receiptId },
      include: { allocations: { include: { invoice: { include: { site: true } } } } },
    })
    if (!receipt) return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 })
    if (receipt.status !== 'Draft') {
      return NextResponse.json({ success: false, error: 'Only draft receipts can be posted' }, { status: 409 })
    }
    if (receipt.createdBy && receipt.createdBy.toLowerCase() === actor.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'The receipt creator cannot post their own receipt' }, { status: 403 })
    }
    if (!receipt.allocations.length) {
      return NextResponse.json({ success: false, error: 'Receipt has no invoice allocations' }, { status: 400 })
    }

    const denied = await assertPermission(pdb, actor, 'AR_APPROVE', { request, module: 'AR', entityId: String(receipt.id), siteCode: receipt.siteCode })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to post receipts' }, { status: 403 })
    for (const siteCode of [...new Set(receipt.allocations.map((allocation: any) => allocation.invoice.site.siteCode))]) {
      const siteDenied = await assertPermission(pdb, actor, 'AR_APPROVE', { request, module: 'AR', entityId: String(receipt.id), siteCode })
      if (!siteDenied.allowed) return NextResponse.json({ success: false, error: siteDenied.reason || 'Not allowed for one or more invoice sites' }, { status: 403 })
    }

    const posted = await pdb.$transaction(async (tx: any) => {
      const current = await tx.finReceipt.findUnique({
        where: { id: receiptId },
        include: { allocations: true },
      })
      if (!current || current.status !== 'Draft') throw new Error('Receipt is no longer a draft')
      if (!current.allocations.length) throw new Error('Receipt has no invoice allocations')

      const invoices = await tx.finInvoice.findMany({
        where: { id: { in: current.allocations.map((allocation: any) => allocation.invoiceId) } },
        include: { site: true },
      })
      if (invoices.length !== current.allocations.length) throw new Error('One or more allocated invoices no longer exist')
      const invoiceMap = new Map(invoices.map((invoice: any) => [invoice.id, invoice]))
      const cashTotal = roundMoney(current.allocations.reduce((sum: number, allocation: any) => sum + allocation.amount, 0))
      if (cashTotal !== roundMoney(current.amount)) throw new Error('Receipt amount does not match the allocated cash amount')

      const tdsTotal = roundMoney(current.allocations.reduce((sum: number, allocation: any) => sum + allocation.tdsAmount, 0))
      const allocBySite = new Map<number, { siteId: number; siteCode: string; allocations: any[]; cash: number; tds: number }>()
      for (const allocation of current.allocations) {
        const invoice: any = invoiceMap.get(allocation.invoiceId)
        if (!invoice || invoice.partyId !== current.partyId) throw new Error('All allocated invoices must belong to this receipt customer')
        if (invoice.status === 'Draft' || invoice.status === 'Rejected') throw new Error(`Invoice ${invoice.invoiceNo} is not issued`)
        if (allocation.amount < 0 || allocation.tdsAmount < 0 || allocation.amount + allocation.tdsAmount > outstandingBalance(invoice) + 0.001) {
          throw new Error(`Allocation exceeds the outstanding balance on invoice ${invoice.invoiceNo}`)
        }
        const siteCode = invoice.site?.siteCode
        if (!siteCode) throw new Error(`Invoice ${invoice.invoiceNo} has no site code`)
        const group = allocBySite.get(invoice.siteId) || { siteId: invoice.siteId, siteCode, allocations: [], cash: 0, tds: 0 }
        group.allocations.push({ allocation, invoice })
        group.cash = roundMoney(group.cash + allocation.amount)
        group.tds = roundMoney(group.tds + allocation.tdsAmount)
        allocBySite.set(invoice.siteId, group)
      }

      const accountCodes = [GL_ACCOUNTS.ACCOUNTS_RECEIVABLE]
      if (current.mode === 'Cash') accountCodes.push(GL_ACCOUNTS.CASH)
      const accounts = await tx.finAccount.findMany({
        where: { accountCode: { in: accountCodes }, isActive: true, type: 'Asset' },
      })
      const accountsByCode = new Map(accounts.map((account: any) => [account.accountCode, account]))
      const arAccount: any = accountsByCode.get(GL_ACCOUNTS.ACCOUNTS_RECEIVABLE)
      if (!arAccount) throw new Error(`Active Accounts Receivable asset account ${GL_ACCOUNTS.ACCOUNTS_RECEIVABLE} is not configured`)

      let bankAccount: any = null
      let cashAccount: any = null
      if (current.mode === 'Cash') {
        cashAccount = accountsByCode.get(GL_ACCOUNTS.CASH)
        if (!cashAccount) throw new Error(`Active Cash asset account ${GL_ACCOUNTS.CASH} is not configured`)
      } else {
        if (!current.bankAccountId) throw new Error('A bank account is required for non-cash receipts')
        bankAccount = await tx.bankAccount.findUnique({ where: { id: current.bankAccountId }, include: { finAccount: true } })
        if (!bankAccount || bankAccount.status !== 'Active') throw new Error('The receiving bank account is not active')
        if (!bankAccount.finAccount || !bankAccount.finAccount.isActive || bankAccount.finAccount.type !== 'Asset') {
          throw new Error(`Map bank account "${bankAccount.accountName}" to an active Bank asset account before posting`)
        }
      }

      let tdsAccount: any = null
      if (tdsTotal > 0) {
        const tdsAccounts = await tx.finAccount.findMany({
          where: { name: { equals: 'TDS Receivable', mode: 'insensitive' }, type: 'Asset', isActive: true },
        })
        if (tdsAccounts.length !== 1) {
          throw new Error('Create exactly one active Asset account named "TDS Receivable" before posting receipts with TDS')
        }
        tdsAccount = tdsAccounts[0]
      }

      if (bankAccount) {
        const newBalance = roundMoney(bankAccount.balance + current.amount)
        await tx.bankTransaction.create({
          data: {
            bankAccountId: bankAccount.id,
            date: current.receiptDate,
            type: 'Deposit',
            transactionType: 'Receipt',
            amount: current.amount,
            balance: newBalance,
            reference: current.bankRef || current.receiptNo,
            party: current.partyName,
            description: `Customer receipt ${current.receiptNo}`,
            category: 'Receipt',
            siteCode: allocBySite.size === 1 ? [...allocBySite.values()][0].siteCode : null,
            jobCode: current.jobCode,
            status: 'Completed',
          },
        })
        await tx.bankAccount.update({ where: { id: bankAccount.id }, data: { balance: newBalance } })
      }

      for (const group of allocBySite.values()) {
        const lines: Array<{ accountId: number; description: string; debit: number; credit: number; jobCode: string | null; siteCode: string }> = []
        if (group.cash > 0) {
          lines.push({
            accountId: current.mode === 'Cash' ? cashAccount.id : bankAccount.finAccountId,
            description: `Cash received for ${current.receiptNo}`,
            debit: group.cash,
            credit: 0,
            jobCode: null,
            siteCode: group.siteCode,
          })
        }
        if (group.tds > 0) {
          lines.push({
            accountId: tdsAccount.id,
            description: `TDS withheld for ${current.receiptNo}`,
            debit: group.tds,
            credit: 0,
            jobCode: null,
            siteCode: group.siteCode,
          })
        }
        for (const { allocation, invoice } of group.allocations) {
          const credit = roundMoney(allocation.amount + allocation.tdsAmount)
          if (credit > 0) {
            lines.push({
              accountId: arAccount.id,
              description: `Settlement of invoice ${invoice.invoiceNo}`,
              debit: 0,
              credit,
              jobCode: invoice.jobCode,
              siteCode: group.siteCode,
            })
          }
          const remaining = roundMoney(outstandingBalance(invoice) - credit)
          await tx.finInvoice.update({
            where: { id: invoice.id },
            data: {
              receivedAmount: { increment: allocation.amount },
              amountPaid: { increment: allocation.amount },
              tdsDeduction: { increment: allocation.tdsAmount },
              balanceAmount: Math.max(0, remaining),
              receivedDate: current.receiptDate,
              voucherNo: current.receiptNo,
              status: remaining <= 0.01 ? 'Paid' : 'Partially Paid',
            },
          })
        }

        const totalDebit = roundMoney(lines.reduce((sum, line) => sum + line.debit, 0))
        const totalCredit = roundMoney(lines.reduce((sum, line) => sum + line.credit, 0))
        if (totalDebit <= 0 || totalDebit !== totalCredit) throw new Error('Receipt journal is not balanced')
        await tx.finJournalEntry.create({
          data: {
            entryNo: `JE-RCT/${current.receiptNo}/${group.siteId}`,
            entryDate: current.receiptDate,
            reference: current.receiptNo,
            description: `Customer receipt ${current.receiptNo} - ${current.partyName}`,
            siteId: group.siteId,
            finSiteId: group.siteId,
            jobCode: group.allocations.length === 1 ? group.allocations[0].invoice.jobCode : null,
            voucherType: 'Receipt',
            status: 'Posted',
            postedAt: new Date(),
            postedBy: actor,
            createdBy: current.createdBy,
            totalDebit,
            totalCredit,
            lines: { create: lines },
          },
        })
      }

      const updatedReceipt = await tx.finReceipt.update({
        where: { id: receiptId },
        data: { status: 'Posted', postedBy: actor, postedAt: new Date() },
        include: { allocations: { include: { invoice: { select: { id: true, invoiceNo: true, balanceAmount: true, status: true } } } } },
      })
      await tx.finApprovalLog.create({
        data: {
          entityType: 'FinReceipt',
          entityId: String(receiptId),
          status: 'Approved',
          action: 'Posted',
          makerId: current.createdBy,
          checkerId: actor,
          comments: `Posted receipt ${current.receiptNo}`,
        },
      })
      return updatedReceipt
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return NextResponse.json({ success: true, data: posted })
  } catch (error) {
    console.error('Error posting receipt:', error)
    if (error instanceof Error && (error.message.includes('no longer') || error.message.includes('Only draft'))) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 })
    }
    if (error instanceof Error && /not configured|not active|Map bank|Create exactly|not balanced|no site code|no invoice allocations|must belong|exceeds the outstanding|not issued|does not match|is required/i.test(error.message)) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Failed to post receipt' }, { status: 500 })
  }
}
