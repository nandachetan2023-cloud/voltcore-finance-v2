import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    const [arRecords, apRecords, bankAccounts, journalEntries, budgetItems, paymentAdvices, pettyCash, finInvoices, purchaseOrders, parties, expenseClaims, creditNotes, assets, alerts, followUps, accounts, finJournalEntries, materialIssues, mootBills, finSites] = await Promise.all([
      pdb.accountsReceivable.findMany(),
      pdb.accountsPayable.findMany(),
      pdb.bankAccount.findMany(),
      pdb.journalEntry.findMany(),
      pdb.budgetItem.findMany(),
      pdb.finPaymentAdvice.findMany(),
      pdb.finPettyCash.findMany(),
      pdb.finInvoice.findMany(),
      pdb.finPurchaseOrder.findMany(),
      pdb.finParty.findMany(),
      pdb.finExpenseClaim.findMany(),
      pdb.finCreditNote.findMany(),
      pdb.finAsset.findMany(),
      pdb.finAlert.findMany(),
      pdb.finFollowUp.findMany(),
      pdb.finAccount.findMany(),
      pdb.finJournalEntry.findMany(),
      pdb.finMaterialIssue.findMany(),
      pdb.finMootBill.findMany(),
      pdb.finSite.findMany(),
    ])

    const finMaterialIssues = materialIssues
    const raBills = mootBills    // ── Legacy KPIs ──
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

    // ── Payment Advices ──
    const totalPaymentAdvices = paymentAdvices.reduce((s, p) => s + (p.totalAmount || 0), 0)

    // ── Petty Cash ──
    const pettyCashIn = pettyCash.filter(p => p.type === 'Credit').reduce((s, p) => s + (p.amount || 0), 0)
    const pettyCashOut = pettyCash.filter(p => p.type === 'Debit').reduce((s, p) => s + (p.amount || 0), 0)
    const pettyCashBalance = pettyCashIn - pettyCashOut

    // ── Site Invoices (FinInvoice) ──
    const totalSiteInvoiceValue = finInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0)
    const totalSiteInvoiceCount = finInvoices.length
    const pendingSiteInvoices = finInvoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid').length

    // ── Purchase Orders ──
    const totalPOValueAll = purchaseOrders.reduce((s, p) => s + (p.totalAmount || 0), 0)
    const openPOCount = purchaseOrders.filter(p => p.status !== 'Closed').length
    const openPOValue = purchaseOrders.filter(p => p.status !== 'Closed').reduce((s, p) => s + (p.totalAmount || 0), 0)

    // ── Active vendor/party count ──
    const activeVendorCount = parties.length

    // ── Expense Claims ──
    const totalExpenseClaims = expenseClaims.reduce((s, c) => s + (c.totalAmount || 0), 0)
    const pendingExpenseClaims = expenseClaims.filter(c => c.status === 'Pending' || c.status === 'Submitted').length
    const approvedExpenseClaims = expenseClaims.filter(c => c.status === 'Approved' || c.status === 'Paid').length

    // ── Credit Notes ──
    const totalCreditNotes = creditNotes.reduce((s, c) => s + (c.amount || 0), 0)
    const openCreditNotes = creditNotes.filter(c => c.status !== 'Closed' && c.status !== 'Adjusted').length

    // ── Fixed Assets ──
    const totalAssetCost = assets.reduce((s, a) => s + (a.cost || 0), 0)
    const activeAssets = assets.filter(a => a.status === 'Active' || a.status === 'In Use').length

    // ── Alerts ──
    const alertCount = alerts.length
    const urgentAlerts = alerts.filter(a => a.type === 'Overdue' || a.type === 'Critical').length
    const unreadAlerts = alerts.filter(a => !a.isRead).length

    // ── Follow-ups ──
    const openFollowUps = followUps.filter(f => f.status === 'Open' || f.status === 'Pending').length
    const overdueFollowUps = followUps.filter(f => f.status === 'Overdue').length

    // ── Chart of Accounts ──
    const assetAccountsCount = accounts.filter(a => a.type === 'Asset').length
    const liabilityAccountsCount = accounts.filter(a => a.type === 'Liability').length
    const equityAccountsCount = accounts.filter(a => a.type === 'Equity').length
    const incomeAccountsCount = accounts.filter(a => a.type === 'Income' || a.type === 'Revenue').length
    const expenseAccountsCount = accounts.filter(a => a.type === 'Expense').length

    // ── Journal Entries (new) ──
    const totalJournalDebits = finJournalEntries.reduce((s, je) => s + (je.totalDebit || 0), 0)
    const totalJournalCredits = finJournalEntries.reduce((s, je) => s + (je.totalCredit || 0), 0)
    const draftJournals = finJournalEntries.filter(je => je.status === 'Draft').length
    const postedJournals = finJournalEntries.filter(je => je.status === 'Posted').length

    // ── Monthly Trends (dynamic year — current FY) ──
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const year = now.getFullYear()
    const monthlyMap = new Map<string, { revenue: number; expenses: number; cashIn: number; cashOut: number }>()
    for (const m of months) monthlyMap.set(`${m} ${year}`, { revenue: 0, expenses: 0, cashIn: 0, cashOut: 0 })

    // Aggregate from both legacy JournalEntry and FinJournalEntry
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
    for (const fje of finJournalEntries) {
      const d = new Date(fje.entryDate)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      if (monthlyMap.has(key)) {
        const entry = monthlyMap.get(key)!
        entry.cashIn += Number(fje.totalCredit || 0)
        entry.revenue += Number(fje.totalCredit || 0)
        entry.cashOut += Number(fje.totalDebit || 0)
        entry.expenses += Number(fje.totalDebit || 0)
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

    // ── Alerts: real overdue AR/AP + due-soon AP + system alerts ──
    const fmtAmt = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`
    const nowTs = Date.now()
    const soon = nowTs + 7 * 86400000
    const alertsList: { type: string; desc: string; amount: string; urgent: boolean }[] = []
    for (const r of apRecords.filter(r => r.status === 'Overdue')) {
      alertsList.push({ type: 'Overdue Payable', desc: `${r.vendor} — bill ${r.billNo} overdue`, amount: fmtAmt(r.totalAmount), urgent: true })
    }
    for (const r of arRecords.filter(r => r.status === 'Overdue')) {
      alertsList.push({ type: 'Overdue Receivable', desc: `${r.client} — invoice ${r.invoiceNo} overdue`, amount: fmtAmt(r.totalAmount), urgent: true })
    }
    for (const r of apRecords.filter(r => r.status === 'Pending' && r.dueDate && new Date(r.dueDate).getTime() <= soon && new Date(r.dueDate).getTime() >= nowTs)) {
      alertsList.push({ type: 'Approaching Due', desc: `${r.vendor} — bill ${r.billNo} due soon`, amount: fmtAmt(r.totalAmount), urgent: false })
    }
    for (const a of alerts.filter(a => !a.isRead).slice(0, 5)) {
      alertsList.push({ type: a.type, desc: a.title, amount: a.amount ? fmtAmt(Number(a.amount)) : '—', urgent: a.type === 'Overdue' || a.type === 'Critical' })
    }
    const alertsTop = alertsList.slice(0, 8)

    // ── Site-wise P&L ──────────────────────────────
    // Revenue from site invoices (grandTotal), cost from material issues + PO spend per site.
    const siteRevenue = new Map<number, number>()
    for (const inv of finInvoices) siteRevenue.set(inv.siteId, (siteRevenue.get(inv.siteId) || 0) + (inv.grandTotal || 0))
    const siteCost = new Map<number, number>()
    for (const mi of materialIssues) {
      if (mi.siteId) siteCost.set(mi.siteId, (siteCost.get(mi.siteId) || 0) + (mi.amount || 0))
    }
    const sitePnl = finSites
      .map(s => {
        const revenue = siteRevenue.get(s.id) || 0
        const cost = siteCost.get(s.id) || 0
        return { siteCode: s.siteCode, siteName: s.name, revenue, cost, profit: revenue - cost }
      })
      .sort((a, b) => b.profit - a.profit)

    // ── Job-wise Profitability ─────────────────────
    const jobRevenue = new Map<string, number>()
    for (const inv of finInvoices) if (inv.jobCode) jobRevenue.set(inv.jobCode, (jobRevenue.get(inv.jobCode) || 0) + (inv.grandTotal || 0))
    const jobCost = new Map<string, number>()
    for (const mi of materialIssues) if (mi.jobCode) jobCost.set(mi.jobCode, (jobCost.get(mi.jobCode) || 0) + (mi.amount || 0))
    const jobPnl = [...new Set([...jobRevenue.keys(), ...jobCost.keys()])]
      .map(job => {
        const revenue = jobRevenue.get(job) || 0
        const cost = jobCost.get(job) || 0
        return { jobCode: job, revenue, cost, profit: revenue - cost }
      })
      .sort((a, b) => b.profit - a.profit)

    // ── Pending Approvals ─────────────────────────
    const pendingApprovals = [
      ...finJournalEntries.filter(je => je.status === 'Draft' || je.status === 'Pending').map(je => ({ module: 'Journal', ref: je.entryNo, status: je.status })),
      ...purchaseOrders.filter(p => p.status === 'Pending' || p.status === 'Draft').map(p => ({ module: 'Purchase Order', ref: p.poNo || `PO-${p.id}`, status: p.status })),
      ...finInvoices.filter(i => i.status === 'Pending' || i.status === 'Draft').map(i => ({ module: 'Invoice', ref: i.invoiceNo, status: i.status })),
      ...expenseClaims.filter(c => c.status === 'Pending' || c.status === 'Submitted').map(c => ({ module: 'Expense Claim', ref: c.claimNo || `EC-${c.id}`, status: c.status })),
      ...raBills.filter(r => r.status === 'Draft' || r.status === 'Submitted').map(r => ({ module: 'RA Bill', ref: r.raNo, status: r.status })),
    ]
    const pendingApprovalCount = pendingApprovals.length

    // ── GST / TDS due alerts ──────────────────────
    const gstDueTotal = finInvoices.filter(i => i.status === 'Pending' || i.status === 'Unpaid').reduce((s, i) => s + (i.gstValue || 0), 0)
    const gstDueCount = finInvoices.filter(i => (i.status === 'Pending' || i.status === 'Unpaid') && (i.gstValue || 0) > 0).length
    const tdsDueTotal = finInvoices.reduce((s, i) => s + (i.tdsDeduction || 0), 0)
    const taxDue = { gstTotal: gstDueTotal, gstCount: gstDueCount, tdsTotal: tdsDueTotal, tdsCount: finInvoices.length }

    // ── Customer-wise Profitability ───────────────
    // Revenue = site invoices (via partyId); Cost = material issues mapped to a
    // customer through the invoice's site (a site belongs to one customer).
    const customerById = new Map(parties.map(p => [p.id, p]))
    const siteCustomer = new Map(finSites.map(s => [s.id, s.customerId]))
    // Build invoice revenue per customer directly (invoices carry partyId).
    const custRevenue = new Map<number, number>()
    const custInvoiceCount = new Map<number, number>()
    for (const inv of finInvoices) {
      if (inv.partyId) {
        custRevenue.set(inv.partyId, (custRevenue.get(inv.partyId) || 0) + (inv.grandTotal || 0))
        custInvoiceCount.set(inv.partyId, (custInvoiceCount.get(inv.partyId) || 0) + 1)
      }
    }
    // Cost per customer: for each material issue, find its site's customer.
    const custCost = new Map<number, number>()
    for (const mi of materialIssues) {
      const custId = mi.siteId ? siteCustomer.get(mi.siteId) : undefined
      if (custId != null) custCost.set(custId, (custCost.get(custId) || 0) + (mi.amount || 0))
    }
    const customerPnl = [...new Set([...custRevenue.keys(), ...custCost.keys()])]
      .map(cid => {
        const party = customerById.get(cid)
        const revenue = custRevenue.get(cid) || 0
        const cost = custCost.get(cid) || 0
        const profit = revenue - cost
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0
        return { customerId: cid, customer: party?.name || party?.shortName || `Customer ${cid}`, revenue, cost, profit, margin: Math.round(margin * 10) / 10, invoices: custInvoiceCount.get(cid) || 0 }
      })
      .sort((a, b) => b.profit - a.profit)

    // ── Module counts ──
    const moduleCounts = {
      accountsPayable: apRecords.length,
      accountsReceivable: arRecords.length,
      bankCash: bankAccounts.length,
      journalEntries: journalEntries.length + finJournalEntries.length,
      budget: budgetItems.length,
      paymentAdvices: paymentAdvices.length,
      pettyCash: pettyCash.length,
      siteInvoices: finInvoices.length,
      purchaseOrders: purchaseOrders.length,
      parties: parties.length,
      expenseClaims: expenseClaims.length,
      creditNotes: creditNotes.length,
      assets: assets.length,
      alerts: alerts.length,
      followUps: followUps.length,
      accounts: accounts.length,
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
          totalPaymentAdvices,
          pettyCashIn, pettyCashOut, pettyCashBalance,
          totalSiteInvoiceValue, totalSiteInvoiceCount, pendingSiteInvoices,
          openPOCount, openPOValue,
          activeVendorCount,
          // New KPIs
          totalExpenseClaims, pendingExpenseClaims, approvedExpenseClaims,
          totalCreditNotes, openCreditNotes,
          totalAssetCost, activeAssets,
          alertCount, urgentAlerts, unreadAlerts,
          openFollowUps, overdueFollowUps,
          assetAccountsCount, liabilityAccountsCount, equityAccountsCount, incomeAccountsCount, expenseAccountsCount,
          totalJournalDebits, totalJournalCredits, draftJournals, postedJournals,
        },
        monthlyTrends,
        apSummary,
        arSummary,
        budgetItems: budgetItemsFormatted,
        bankAccounts: bankAccountsFormatted,
        recentTransactions,
        alerts: alertsTop,
        moduleCounts,
        sitePnl,
        jobPnl,
        pendingApprovals,
        pendingApprovalCount,
        taxDue,
        customerPnl,
        syncedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching finance dashboard:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
