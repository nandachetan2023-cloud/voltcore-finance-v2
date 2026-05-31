import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    const [arRecords, apRecords, bankAccounts, journalEntries, budgetItems, workOrders, paymentAdvices, pettyCash, finInvoices, purchaseOrders, parties] = await Promise.all([
      pdb.accountsReceivable.findMany(),
      pdb.accountsPayable.findMany(),
      pdb.bankAccount.findMany(),
      pdb.journalEntry.findMany(),
      pdb.budgetItem.findMany(),
      pdb.finWorkOrder.findMany(),
      pdb.finPaymentAdvice.findMany(),
      pdb.finPettyCash.findMany(),
      pdb.finInvoice.findMany(),
      pdb.finPurchaseOrder.findMany(),
      pdb.finParty.findMany(),
    ])

    // ── KPIs ──
    const totalRevenue = arRecords.filter(r => r.status === 'Received').reduce((s, r) => s + r.totalAmount, 0)
    const totalInvoiced = arRecords.reduce((s, r) => s + r.totalAmount, 0)
    const accountsReceivablePending = arRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Received').reduce((s, r) => s + r.totalAmount, 0)
    const accountsReceivableReceived = arRecords.filter(r => r.status === 'Received').reduce((s, r) => s + r.totalAmount, 0)
    const accountsReceivableOverdue = arRecords.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.totalAmount, 0)
    const accountsPayablePending = apRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Paid').reduce((s, r) => s + r.totalAmount, 0)
    const accountsPayablePaid = apRecords.filter(r => r.status === 'Paid').reduce((s, r) => s + r.totalAmount, 0)
    const accountsPayableOverdue = apRecords.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.totalAmount, 0)
    const totalBankBalance = bankAccounts.reduce((s, b) => s + b.balance, 0)
    const totalExpenses = journalEntries.filter(e => e.voucherType === 'Payment' || e.voucherType === 'Journal').reduce((s, e) => s + e.debit, 0)
    const totalExpensesPending = apRecords.filter(r => r.status === 'Pending').reduce((s, r) => s + r.totalAmount, 0)
    const totalExpensesApproved = apRecords.filter(r => r.status === 'Paid' || r.status === 'Partially Paid').reduce((s, r) => s + r.totalAmount, 0)
    const totalBudgetPlanned = budgetItems.reduce((s, b) => s + b.planned, 0)
    const totalBudgetActual = budgetItems.reduce((s, b) => s + b.actual, 0)
    const budgetVariance = totalBudgetPlanned - totalBudgetActual

    // ── Work Orders ──
    const totalWorkOrderValue = workOrders.reduce((s, w) => s + (w.orderAmount || 0), 0)
    const totalWorkOrderBilled = workOrders.reduce((s, w) => s + (w.billRaisedAmount || 0), 0)
    const totalWorkOrderUnexecuted = workOrders.reduce((s, w) => s + (w.unexecutedAmount || 0), 0)
    const totalWorkOrderReceived = workOrders.reduce((s, w) => s + (w.receivedAgainstBill || 0), 0)
    const activeWorkOrders = workOrders.filter(w => w.status === 'Active').length

    // ── Payment Advices ──
    const totalPaymentAdvices = paymentAdvices.reduce((s, p) => s + (p.totalAmount || 0), 0)

    // ── Petty Cash ──
    const pettyCashIn = pettyCash.filter(p => p.type === 'Credit').reduce((s, p) => s + (p.amount || 0), 0)
    const pettyCashOut = pettyCash.filter(p => p.type === 'Debit').reduce((s, p) => s + (p.amount || 0), 0)
    const pettyCashBalance = pettyCashIn - pettyCashOut

    // ── Site Invoices (FinInvoice) ──
    const totalSiteInvoiceValue = finInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0)
    const totalSiteInvoiceCount = finInvoices.length

    // ── Purchase Orders ──
    const totalPOValueAll = purchaseOrders.reduce((s, p) => s + (p.totalAmount || 0), 0)
    const openPOCount = purchaseOrders.filter(p => p.status !== 'Closed').length
    const openPOValue = purchaseOrders.filter(p => p.status !== 'Closed').reduce((s, p) => s + (p.totalAmount || 0), 0)

    // ── Active vendor/party count ──
    const activeVendorCount = parties.length

    // ── Monthly Trends ──
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const year = 2025
    const monthlyMap = new Map<string, { revenue: number; expenses: number; cashIn: number; cashOut: number }>()
    for (const m of months) monthlyMap.set(`${m} ${year}`, { revenue: 0, expenses: 0, cashIn: 0, cashOut: 0 })
    for (const je of journalEntries) {
      const d = new Date(je.date)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      if (monthlyMap.has(key)) {
        const entry = monthlyMap.get(key)!
        if (je.voucherType === 'Receipt') { entry.cashIn += je.debit; entry.revenue += je.debit }
        else if (je.voucherType === 'Payment') { entry.cashOut += je.credit; entry.expenses += je.credit }
        else if (je.voucherType === 'Journal' && je.debit > 0) { entry.expenses += je.debit }
      }
    }
    const monthlyTrends = months.map(m => {
      const data = monthlyMap.get(`${m} ${year}`) || { revenue: 0, expenses: 0, cashIn: 0, cashOut: 0 }
      return { month: m, year, ...data }
    })

    const apSummary = {
      pending: accountsPayablePending,
      paid: accountsPayablePaid,
      overdue: accountsPayableOverdue,
      total: apRecords.reduce((s, r) => s + r.totalAmount, 0),
    }
    const arSummary = {
      pending: accountsReceivablePending,
      received: accountsReceivableReceived,
      overdue: accountsReceivableOverdue,
      total: arRecords.reduce((s, r) => s + r.totalAmount, 0),
    }

    const bankAccountsFormatted = bankAccounts.map(b => ({
      accountName: b.accountName, bankName: b.bankName, accountNo: b.accountNo,
      type: b.type, balance: b.balance, status: b.status,
    }))

    const recentTransactions = journalEntries.slice(-10).reverse().map(je => ({
      id: String(je.id),
      entryNo: je.entryNo,
      date: je.date instanceof Date ? je.date.toISOString().split('T')[0] : String(je.date).split('T')[0],
      account: je.accountName || je.account,
      debit: je.debit, credit: je.credit,
      description: je.description || '', reference: je.reference || '', status: je.status,
    }))

    const budgetItemsFormatted = budgetItems.map(b => ({
      category: b.category, description: b.description, planned: b.planned,
      actual: b.actual, variance: b.variance, period: b.period, month: b.month || '', status: b.status,
    }))

    // ── Alerts: real overdue AR/AP + due-soon AP ──
    const fmtAmt = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`
    const now = Date.now()
    const soon = now + 7 * 86400000
    const alerts: { type: string; desc: string; amount: string; urgent: boolean }[] = []
    for (const r of apRecords.filter(r => r.status === 'Overdue')) {
      alerts.push({ type: 'Overdue Payable', desc: `${r.vendor} — bill ${r.billNo} overdue`, amount: fmtAmt(r.totalAmount), urgent: true })
    }
    for (const r of arRecords.filter(r => r.status === 'Overdue')) {
      alerts.push({ type: 'Overdue Receivable', desc: `${r.client} — invoice ${r.invoiceNo} overdue`, amount: fmtAmt(r.totalAmount), urgent: true })
    }
    for (const r of apRecords.filter(r => r.status === 'Pending' && r.dueDate && new Date(r.dueDate).getTime() <= soon && new Date(r.dueDate).getTime() >= now)) {
      alerts.push({ type: 'Approaching Due', desc: `${r.vendor} — bill ${r.billNo} due soon`, amount: fmtAmt(r.totalAmount), urgent: false })
    }
    const alertsTop = alerts.slice(0, 8)

    // ── Module counts (for Quick Links badges) ──
    const moduleCounts = {
      accountsPayable: apRecords.length,
      accountsReceivable: arRecords.length,
      bankCash: bankAccounts.length,
      journalEntries: journalEntries.length,
      budget: budgetItems.length,
      workOrders: workOrders.length,
      paymentAdvices: paymentAdvices.length,
      pettyCash: pettyCash.length,
      siteInvoices: finInvoices.length,
      purchaseOrders: purchaseOrders.length,
      parties: parties.length,
    }

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalRevenue, totalInvoiced, accountsReceivablePending, accountsReceivableReceived,
          accountsReceivableOverdue, accountsPayablePending, accountsPayablePaid, accountsPayableOverdue,
          totalBankBalance, totalExpenses, totalExpensesPending, totalExpensesApproved,
          totalPayrollPaid: 0, totalPayrollPending: 0, totalPayrollGross: 0,
          totalPOValue: totalPOValueAll, totalPOOpen: openPOValue,
          totalBudgetPlanned, totalBudgetActual, budgetVariance,
          // newly synced modules
          totalWorkOrderValue, totalWorkOrderBilled, totalWorkOrderUnexecuted, totalWorkOrderReceived, activeWorkOrders,
          totalPaymentAdvices,
          pettyCashIn, pettyCashOut, pettyCashBalance,
          totalSiteInvoiceValue, totalSiteInvoiceCount,
          openPOCount, openPOValue,
          activeVendorCount,
        },
        monthlyTrends,
        apSummary,
        arSummary,
        budgetItems: budgetItemsFormatted,
        bankAccounts: bankAccountsFormatted,
        recentTransactions,
        alerts: alertsTop,
        moduleCounts,
      },
    })
  } catch (error) {
    console.error('Error fetching finance dashboard:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
