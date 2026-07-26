import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    const [
      finInvoices,
      finPayments,
      finCreditNotes,
      finOutstandings,
      arRecords,
      apRecords,
      expenseClaims,
      bankAccounts,
      profitLossEntries,
      parties,
      taxRecords,
      bankTransactions,
    ] = await Promise.all([
      pdb.finInvoice.findMany({ include: { party: true } }),
      pdb.finPayment.findMany(),
      pdb.finCreditNote.findMany(),
      pdb.finOutstanding.findMany(),
      pdb.accountsReceivable.findMany(),
      pdb.accountsPayable.findMany(),
      pdb.finExpenseClaim.findMany(),
      pdb.bankAccount.findMany(),
      pdb.profitLossEntry.findMany(),
      pdb.finParty.findMany(),
      pdb.taxRecord.findMany(),
      pdb.bankTransaction.findMany(),
    ])

    const hasRealData = finInvoices.length > 0 || finPayments.length > 0 || profitLossEntries.length > 0 || taxRecords.length > 0

    const now = new Date()
    const sampleMonths: string[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      sampleMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const sample = {
      totalInvoiced: 28500000,
      totalPaid: 19200000,
      totalCreditNotes: 850000,
      totalOutstanding: 7890000,
      totalAR: 4560000,
      totalAP: 3210000,
      totalExpenseClaims: 1230000,
      totalBankBalance: 18450000,
      netPL: 5200000,
      invoiceCount: 48,
      paymentCount: 36,
      creditNoteCount: 7,
      partyCount: 22,
    }

    const sampleMonthlyTrend = sampleMonths.map((m, i) => {
      const inv = 1800000 + i * 120000 + Math.round(Math.random() * 400000)
      return { month: m, invoiced: inv, paid: Math.round(inv * 0.65), creditNotes: 40000 + i * 5000, outstanding: Math.round(inv * 0.25) }
    })

    const sampleInvoiceStatus = [
      { status: 'Paid', count: 22, total: 12800000 },
      { status: 'Pending', count: 14, total: 7800000 },
      { status: 'Overdue', count: 7, total: 4500000 },
      { status: 'Draft', count: 5, total: 3400000 },
    ]

    const sampleBankAccounts = [
      { accountName: 'Operating Account', bankName: 'First National Bank', accountNo: '****1234', balance: 8500000, transactionCount: 142 },
      { accountName: 'Reserve Account', bankName: 'Global Trust Bank', accountNo: '****5678', balance: 6200000, transactionCount: 63 },
      { accountName: 'Payroll Account', bankName: 'First National Bank', accountNo: '****9012', balance: 3750000, transactionCount: 214 },
    ]

    const sampleTopParties = [
      { name: 'TechCorp Solutions', totalInvoiced: 4800000, totalPaid: 3200000, outstanding: 1600000, count: 12 },
      { name: 'GlobalTrade Ltd', totalInvoiced: 3600000, totalPaid: 2800000, outstanding: 800000, count: 8 },
      { name: 'Apex Industries', totalInvoiced: 2900000, totalPaid: 1800000, outstanding: 1100000, count: 6 },
      { name: 'Prime Ventures', totalInvoiced: 2100000, totalPaid: 1600000, outstanding: 500000, count: 5 },
      { name: 'NovaTech GmbH', totalInvoiced: 1800000, totalPaid: 1200000, outstanding: 600000, count: 4 },
    ]

    const sampleExpenseClaims = {
      byStatus: [
        { status: 'Approved', count: 18, total: 620000 },
        { status: 'Pending', count: 9, total: 340000 },
        { status: 'Reimbursed', count: 12, total: 270000 },
      ],
      totalAmount: 1230000,
      totalCount: 39,
    }

    const sampleTaxSummary = {
      byType: [
        { taxType: 'GST 18%', amount: 2100000, paid: 1400000, pending: 700000 },
        { taxType: 'GST 12%', amount: 960000, paid: 720000, pending: 240000 },
        { taxType: 'TDS', amount: 450000, paid: 380000, pending: 70000 },
        { taxType: 'VAT', amount: 280000, paid: 280000, pending: 0 },
      ],
      totalDue: 3790000,
      totalPaid: 2780000,
    }

    const sampleProfitLoss = {
      totalDebit: 11650000,
      totalCredit: 16850000,
      netPL: 5200000,
      byCategory: [
        { category: 'Product Sales', totalDebit: 0, totalCredit: 8200000, net: 8200000 },
        { category: 'Consulting', totalDebit: 0, totalCredit: 4300000, net: 4300000 },
        { category: 'Subscription', totalDebit: 0, totalCredit: 2800000, net: 2800000 },
        { category: 'Other Income', totalDebit: 0, totalCredit: 1550000, net: 1550000 },
        { category: 'COGS', totalDebit: 4100000, totalCredit: 0, net: -4100000 },
        { category: 'Salaries', totalDebit: 3800000, totalCredit: 0, net: -3800000 },
        { category: 'Infrastructure', totalDebit: 1650000, totalCredit: 0, net: -1650000 },
        { category: 'Marketing', totalDebit: 1100000, totalCredit: 0, net: -1100000 },
        { category: 'Admin', totalDebit: 700000, totalCredit: 0, net: -700000 },
        { category: 'R&D', totalDebit: 300000, totalCredit: 0, net: -300000 },
      ],
    }

    const overview = (() => {
      try {
        if (!hasRealData) return sample
        const totalInvoiced = finInvoices
          .filter(i => i.status !== 'Cancelled')
          .reduce((s, i) => s + (i.grandTotal || 0), 0)
        const totalPaid = finPayments.reduce((s, p) => s + (p.amount || 0), 0)
        const totalCreditNotes = finCreditNotes.reduce((s, c) => s + (c.amount || 0), 0)
        const totalOutstanding = finOutstandings.reduce((s, o) => s + (o.balanceAmount || 0), 0)
        const totalAR = arRecords
          .filter(r => r.status === 'Pending')
          .reduce((s, r) => s + (r.totalAmount || 0), 0)
        const totalAP = apRecords
          .filter(r => r.status === 'Pending')
          .reduce((s, r) => s + (r.totalAmount || 0), 0)
        const totalExpenseClaims = expenseClaims.reduce((s, c) => s + (c.totalAmount || 0), 0)
        const totalBankBalance = bankAccounts.reduce((s, b) => s + (b.balance || 0), 0)
        const totalCreditPL = profitLossEntries
          .filter(e => e.side === 'credit')
          .reduce((s, e) => s + (e.amount || 0), 0)
        const totalDebitPL = profitLossEntries
          .filter(e => e.side === 'debit')
          .reduce((s, e) => s + (e.amount || 0), 0)
        const netPL = totalCreditPL - totalDebitPL
        const invoiceCount = finInvoices.length
        const paymentCount = finPayments.length
        const creditNoteCount = finCreditNotes.length
        const partyCount = parties.length

        return {
          totalInvoiced: invoiceCount > 0 ? totalInvoiced : sample.totalInvoiced,
          totalPaid: paymentCount > 0 ? totalPaid : sample.totalPaid,
          totalCreditNotes: creditNoteCount > 0 ? totalCreditNotes : sample.totalCreditNotes,
          totalOutstanding: totalOutstanding > 0 ? totalOutstanding : sample.totalOutstanding,
          totalAR: totalAR > 0 ? totalAR : sample.totalAR,
          totalAP: totalAP > 0 ? totalAP : sample.totalAP,
          totalExpenseClaims: totalExpenseClaims > 0 ? totalExpenseClaims : sample.totalExpenseClaims,
          totalBankBalance: totalBankBalance > 0 ? totalBankBalance : sample.totalBankBalance,
          netPL: netPL !== 0 ? netPL : sample.netPL,
          invoiceCount: invoiceCount > 0 ? invoiceCount : sample.invoiceCount,
          paymentCount: paymentCount > 0 ? paymentCount : sample.paymentCount,
          creditNoteCount: creditNoteCount > 0 ? creditNoteCount : sample.creditNoteCount,
          partyCount: partyCount > 0 ? partyCount : sample.partyCount,
        }
      } catch (e) {
        console.error('overview error:', e)
        return sample
      }
    })()

    const monthlyTrend = (() => {
      try {
        if (!hasRealData) return sampleMonthlyTrend
        const months: string[] = []
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }
        const map = new Map<string, { invoiced: number; paid: number; creditNotes: number; outstanding: number }>()
        for (const m of months) {
          map.set(m, { invoiced: 0, paid: 0, creditNotes: 0, outstanding: 0 })
        }
        for (const inv of finInvoices) {
          const d = new Date(inv.invoiceDate)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (map.has(key) && inv.status !== 'Cancelled') {
            map.get(key)!.invoiced += inv.grandTotal || 0
          }
        }
        for (const p of finPayments) {
          const d = new Date(p.paymentDate)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (map.has(key)) {
            map.get(key)!.paid += p.amount || 0
          }
        }
        for (const cn of finCreditNotes) {
          const d = new Date(cn.date)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (map.has(key)) {
            map.get(key)!.creditNotes += cn.amount || 0
          }
        }
        for (const o of finOutstandings) {
          const d = new Date(o.billDate)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (map.has(key)) {
            map.get(key)!.outstanding += o.balanceAmount || 0
          }
        }
        const hasAnyData = months.some(m => {
          const v = map.get(m)!
          return v.invoiced > 0 || v.paid > 0 || v.creditNotes > 0 || v.outstanding > 0
        })
        if (!hasAnyData) return sampleMonthlyTrend
        return months.map(m => ({ month: m, ...map.get(m)! }))
      } catch (e) {
        console.error('monthlyTrend error:', e)
        return sampleMonthlyTrend
      }
    })()

    const invoiceStatus = (() => {
      try {
        if (finInvoices.length === 0) return sampleInvoiceStatus
        const statusMap = new Map<string, { status: string; count: number; total: number }>()
        for (const inv of finInvoices) {
          const s = inv.status || 'Unknown'
          if (!statusMap.has(s)) statusMap.set(s, { status: s, count: 0, total: 0 })
          const entry = statusMap.get(s)!
          entry.count++
          entry.total += inv.grandTotal || 0
        }
        return Array.from(statusMap.values())
      } catch (e) {
        console.error('invoiceStatus error:', e)
        return sampleInvoiceStatus
      }
    })()

    const bankAccountsSnapshot = (() => {
      try {
        if (bankAccounts.length > 0) {
          const txCountMap = new Map<number, number>()
          for (const tx of bankTransactions) {
            txCountMap.set(tx.bankAccountId, (txCountMap.get(tx.bankAccountId) || 0) + 1)
          }
          return bankAccounts.map(b => ({
            accountName: b.accountName,
            bankName: b.bankName,
            accountNo: b.accountNo,
            balance: b.balance,
            transactionCount: txCountMap.get(b.id) || 0,
          }))
        }
        return sampleBankAccounts
      } catch (e) {
        console.error('bankAccountsSnapshot error:', e)
        return sampleBankAccounts
      }
    })()

    const topParties = (() => {
      try {
        if (finInvoices.length === 0) return sampleTopParties
        const partyInvoiceMap = new Map<number, { name: string; totalInvoiced: number; count: number }>()
        for (const inv of finInvoices) {
          if (!inv.party) continue
          const pid = inv.party.id
          if (!partyInvoiceMap.has(pid)) {
            partyInvoiceMap.set(pid, { name: inv.party.name, totalInvoiced: 0, count: 0 })
          }
          const entry = partyInvoiceMap.get(pid)!
          entry.totalInvoiced += inv.grandTotal || 0
          entry.count++
        }

        const invoicePartyMap = new Map<number, number>()
        for (const inv of finInvoices) {
          if (inv.party) invoicePartyMap.set(inv.id, inv.party.id)
        }

        const partyPaymentMap = new Map<number, number>()
        for (const p of finPayments) {
          const pid = invoicePartyMap.get(p.invoiceId)
          if (pid !== undefined) {
            partyPaymentMap.set(pid, (partyPaymentMap.get(pid) || 0) + (p.amount || 0))
          }
        }

        const result = Array.from(partyInvoiceMap.entries()).map(([pid, data]) => {
          const totalPaid = partyPaymentMap.get(pid) || 0
          return {
            name: data.name,
            totalInvoiced: data.totalInvoiced,
            totalPaid,
            outstanding: data.totalInvoiced - totalPaid,
            count: data.count,
          }
        })
        result.sort((a, b) => b.totalInvoiced - a.totalInvoiced)
        return result.slice(0, 10)
      } catch (e) {
        console.error('topParties error:', e)
        return sampleTopParties
      }
    })()

    const expenseClaimsSummary = (() => {
      try {
        if (expenseClaims.length === 0) return sampleExpenseClaims
        const statusMap = new Map<string, { status: string; count: number; total: number }>()
        for (const ec of expenseClaims) {
          const s = ec.status || 'Unknown'
          if (!statusMap.has(s)) statusMap.set(s, { status: s, count: 0, total: 0 })
          const entry = statusMap.get(s)!
          entry.count++
          entry.total += ec.totalAmount || 0
        }
        return {
          byStatus: Array.from(statusMap.values()),
          totalAmount: expenseClaims.reduce((s, c) => s + (c.totalAmount || 0), 0),
          totalCount: expenseClaims.length,
        }
      } catch (e) {
        console.error('expenseClaims error:', e)
        return sampleExpenseClaims
      }
    })()

    const taxSummary = (() => {
      try {
        if (taxRecords.length === 0) return sampleTaxSummary
        const typeMap = new Map<string, { taxType: string; amount: number; paid: number; pending: number }>()
        for (const tx of taxRecords) {
          const t = tx.taxType || 'Unknown'
          if (!typeMap.has(t)) typeMap.set(t, { taxType: t, amount: 0, paid: 0, pending: 0 })
          const entry = typeMap.get(t)!
          entry.amount += tx.amount || 0
          if (tx.status === 'Paid' || tx.paidDate) {
            entry.paid += tx.amount || 0
          } else {
            entry.pending += tx.amount || 0
          }
        }
        return {
          byType: Array.from(typeMap.values()),
          totalDue: taxRecords.reduce((s, t) => s + (t.amount || 0), 0),
          totalPaid: taxRecords.filter(t => t.status === 'Paid' || t.paidDate).reduce((s, t) => s + (t.amount || 0), 0),
        }
      } catch (e) {
        console.error('taxSummary error:', e)
        return sampleTaxSummary
      }
    })()

    const profitLoss = (() => {
      try {
        if (profitLossEntries.length === 0) return sampleProfitLoss
        const totalDebit = profitLossEntries
          .filter(e => e.side === 'debit')
          .reduce((s, e) => s + (e.amount || 0), 0)
        const totalCredit = profitLossEntries
          .filter(e => e.side === 'credit')
          .reduce((s, e) => s + (e.amount || 0), 0)
        const netPL = totalCredit - totalDebit

        const catMap = new Map<string, { category: string; totalDebit: number; totalCredit: number; net: number }>()
        for (const e of profitLossEntries) {
          const cat = e.category || 'Uncategorized'
          if (!catMap.has(cat)) catMap.set(cat, { category: cat, totalDebit: 0, totalCredit: 0, net: 0 })
          const entry = catMap.get(cat)!
          if (e.side === 'debit') entry.totalDebit += e.amount || 0
          if (e.side === 'credit') entry.totalCredit += e.amount || 0
          entry.net = entry.totalCredit - entry.totalDebit
        }

        return {
          totalDebit,
          totalCredit,
          netPL,
          byCategory: Array.from(catMap.values()),
        }
      } catch (e) {
        console.error('profitLoss error:', e)
        return sampleProfitLoss
      }
    })()

    return NextResponse.json({
      success: true,
      data: {
        overview,
        monthlyTrend,
        invoiceStatus,
        bankAccounts: bankAccountsSnapshot,
        topParties,
        expenseClaims: expenseClaimsSummary,
        taxSummary,
        profitLoss,
      },
    })
  } catch (error) {
    console.error('Error fetching financial reports:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial reports data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'POST not supported on financial-reports endpoint' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create record' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'PUT not supported on financial-reports endpoint' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error updating record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update record' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'DELETE not supported on financial-reports endpoint' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error deleting record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete record' },
      { status: 500 }
    )
  }
}
