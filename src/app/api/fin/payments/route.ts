import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { postJournalEntry, GL_ACCOUNTS } from '@/lib/gl-posting'

export const dynamic = 'force-dynamic'

/**
 * Finance Payment Center API.
 *
 * GET  -> outstanding payables, bank accounts, and recent outgoing payments.
 * POST -> make a payment. Atomically:
 *           - creates a BankTransaction (withdrawal) on the chosen account
 *           - decrements that account's balance
 *           - if linked to an AP bill, updates its status / paid amount
 */

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const [payables, bankAccounts, recentTxns] = await Promise.all([
      pdb.accountsPayable.findMany({
        where: { status: { in: ['Pending', 'Partially Paid', 'Overdue'] } },
        orderBy: { dueDate: 'asc' },
        include: { site: true },
      }),
      pdb.bankAccount.findMany({ where: { status: 'Active' }, orderBy: { accountName: 'asc' } }),
      pdb.bankTransaction.findMany({
        where: { type: 'Withdrawal' },
        orderBy: { date: 'desc' },
        take: 50,
        include: { bankAccount: { select: { accountName: true, bankName: true } } },
      }),
    ])

    const totalOutstanding = payables.reduce((s, p) => s + p.totalAmount, 0)
    const totalBankBalance = bankAccounts.reduce((s, b) => s + b.balance, 0)
    const paidThisMonth = recentTxns
      .filter((t) => {
        const d = new Date(t.date)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, t) => s + t.amount, 0)

    return NextResponse.json({
      success: true,
      data: {
        payables,
        bankAccounts,
        recentPayments: recentTxns,
        summary: { totalOutstanding, totalBankBalance, paidThisMonth, payableCount: payables.length },
      },
    })
  } catch (error) {
    console.error('[payments GET] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch payment data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      billId,            // optional AP bill id
      bankAccountId,     // required
      amount,            // required, > 0
      paymentMethod,     // NEFT / RTGS / IMPS / Cheque / Cash / UPI
      reference,         // UTR / cheque no
      party,             // payee name
      description,
      date,
      siteId,
      jobCode,
      poNo,
      costCenter,
      department,
      projectManager,
    } = body

    const pdb = getDbForRequest(request)

    const missing = ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager']
      .filter(k => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }

    // RBAC: making an outgoing payment requires AP_CREATE authority.
    const actorEmail = body.actor || request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, (actorEmail || '').trim(), 'AP_CREATE', { request, module: 'AP', siteCode: null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })

    if (!bankAccountId) return NextResponse.json({ success: false, error: 'Bank account is required' }, { status: 400 })
    const payAmount = Number(amount)
    if (!payAmount || payAmount <= 0) return NextResponse.json({ success: false, error: 'A positive amount is required' }, { status: 400 })

    const account = await pdb.bankAccount.findUnique({ where: { id: Number(bankAccountId) } })
    if (!account) return NextResponse.json({ success: false, error: 'Bank account not found' }, { status: 404 })
    if (account.balance < payAmount) {
      return NextResponse.json({ success: false, error: `Insufficient balance. Available: ₹${account.balance.toLocaleString('en-IN')}` }, { status: 400 })
    }

    let bill: Awaited<ReturnType<typeof pdb.accountsPayable.findUnique>> | null = null
    if (billId) {
      bill = await pdb.accountsPayable.findUnique({ where: { id: Number(billId) } })
      if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 })
    }

    const paymentDate = date ? new Date(date) : new Date()
    const newBalance = account.balance - payAmount
    const payee = party || bill?.vendor || 'Payment'
    const site = siteId ? await pdb.finSite.findUnique({ where: { id: Number(siteId) } }) : null

    const result = await pdb.$transaction(async (tx) => {
      // 1. Bank withdrawal transaction (records running balance)
      const txn = await tx.bankTransaction.create({
        data: {
          bankAccountId: account.id,
          date: paymentDate,
          type: 'Withdrawal',
          amount: payAmount,
          balance: newBalance,
          reference: reference || null,
          party: payee,
          description: description || (bill ? `Payment for bill ${bill.billNo}` : 'Outgoing payment'),
          category: 'Payment',
          status: 'Completed',
          siteCode: site?.siteCode || null,
          jobCode: jobCode || null,
          poNo: poNo || null,
          costCenter: costCenter || null,
          department: department || null,
          projectManager: projectManager || null,
        },
      })

      // 2. Decrement bank balance
      await tx.bankAccount.update({ where: { id: account.id }, data: { balance: newBalance } })

      // 3. Settle the bill if linked
      let updatedBill: Awaited<ReturnType<typeof tx.accountsPayable.update>> | null = null
      if (bill) {
        // Compare against the cumulative paidAmount, not just this payment —
        // a bill settled across multiple installments must still transition
        // to Paid once the running total reaches totalAmount.
        const newPaidAmount = bill.paidAmount + payAmount
        const fullyPaid = newPaidAmount >= bill.totalAmount
        updatedBill = await tx.accountsPayable.update({
          where: { id: bill.id },
          data: {
            paidAmount: newPaidAmount,
            status: fullyPaid ? 'Paid' : 'Partially Paid',
            paidDate: fullyPaid ? paymentDate : bill.paidDate,
            paymentMethod: paymentMethod || null,
            paymentRef: reference || null,
          },
        })
      }

      return { txn, updatedBill, newBalance }
    })

    // Auto-post the GL entry for this payment: Dr Vendor Payable / Cr Bank
    // (or Cash, if paid in cash). A posting failure must never block the
    // payment itself, so this runs after the transaction commits.
    await postJournalEntry(pdb, {
      prefix: 'JE-PAY',
      voucherType: 'Payment',
      entryDate: paymentDate,
      description: `Payment to ${payee}${bill ? ` for bill ${bill.billNo}` : ''}`,
      reference: reference || null,
      siteId: siteId ? Number(siteId) : null,
      jobCode: jobCode || null,
      poNo: poNo || null,
      costCenter: costCenter || null,
      department: department || null,
      projectManager: projectManager || null,
      lines: [
        { accountCode: GL_ACCOUNTS.VENDOR_PAYABLE, debit: payAmount, credit: 0 },
        { accountCode: paymentMethod === 'Cash' ? GL_ACCOUNTS.CASH : GL_ACCOUNTS.BANK, debit: 0, credit: payAmount },
      ],
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('[payments POST] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process payment' }, { status: 500 })
  }
}
