import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toMonthKey(d: Date): string {
  const m = d.getMonth()
  const y = d.getFullYear()
  const suffix = y >= 2025 ? `-${String(y).slice(2)}` : `-${String(y).slice(2)}`
  return `${MONTH_KEYS[m]}${suffix}`
}

function extractSiteName(site: any): string {
  return site?.name || String(site?.id || 'Unknown')
}

function payrollMonthKey(year: number, month: number): string {
  const idx = Math.min(Math.max(month, 1), 12) - 1
  return `${MONTH_KEYS[idx]}-${String(year).slice(-2)}`
}

// Income is recognised GST-exclusive: taxable value only (CGST/SGST/IGST are
// output-tax liabilities, not revenue). Fall back gracefully for legacy rows.
function invoiceIncome(inv: { taxableValue?: number; invoiceValue?: number; grandTotal?: number; gstValue?: number }): number {
  const taxable = Number(inv.taxableValue) || 0
  if (taxable > 0) return taxable
  const invValue = Number(inv.invoiceValue) || 0
  if (invValue > 0) return invValue
  return (Number(inv.grandTotal) || 0) - (Number(inv.gstValue) || 0)
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const siteFilter = searchParams.get('site')
    const monthFilter = searchParams.get('month')

    const profitLossEntries: any[] = []

    // 1. Income from FinInvoice
    const invoices = await pdb.finInvoice.findMany({
      where: { status: { not: 'Draft' } },
      include: { site: { select: { name: true } }, party: { select: { name: true } } },
    })
    for (const inv of invoices) {
      const site = extractSiteName(inv.site)
      if (siteFilter && siteFilter !== 'all' && site !== siteFilter) continue
      const month = toMonthKey(new Date(inv.invoiceDate || inv.createdAt))
      if (monthFilter && monthFilter !== 'all' && month !== monthFilter) continue
      profitLossEntries.push({
        id: `inv-${inv.id}`,
        source: 'invoice',
        sourceId: inv.id,
        site,
        month,
        jobCode: inv.jobCode || null,
        poNo: inv.poNo || null,
        customer: inv.party?.name || null,
        side: 'credit',
        category: 'Sales Accounts',
        particular: `Invoice ${inv.invoiceNo || ''} - ${inv.party?.name || ''}`,
        amount: invoiceIncome(inv),
      })
    }

    // 2. Income from FinCreditNote (reduces income)
    const creditNotes = await pdb.finCreditNote.findMany({
      include: { site: { select: { name: true } }, invoice: { select: { party: { select: { name: true } } } } },
    })
    for (const cn of creditNotes) {
      const site = extractSiteName(cn.site)
      if (siteFilter && siteFilter !== 'all' && site !== siteFilter) continue
      const month = toMonthKey(new Date(cn.date || cn.createdAt))
      if (monthFilter && monthFilter !== 'all' && month !== monthFilter) continue
      profitLossEntries.push({
        id: `cn-${cn.id}`,
        source: 'credit_note',
        sourceId: cn.id,
        site,
        month,
        jobCode: cn.jobCode || null,
        poNo: cn.poNo || null,
        customer: cn.invoice?.party?.name || null,
        side: 'debit',
        category: 'Sales Accounts',
        particular: `Credit Note ${cn.creditNoteNo || ''}`,
        amount: cn.invoiceValue || cn.amount || 0,
      })
    }

    // 2b. Direct material cost from FinMaterialIssue (posted issues to jobs)
    const materialIssues = await pdb.finMaterialIssue.findMany({
      where: { status: 'Posted' },
    })
    for (const mi of materialIssues) {
      const site = mi.siteCode || (mi.siteId ? `Site ${mi.siteId}` : 'Unallocated')
      if (siteFilter && siteFilter !== 'all' && site !== siteFilter) continue
      const month = toMonthKey(new Date(mi.issueDate || mi.createdAt))
      if (monthFilter && monthFilter !== 'all' && month !== monthFilter) continue
      profitLossEntries.push({
        id: `mi-${mi.id}`,
        source: 'material_issue',
        sourceId: mi.id,
        site,
        month,
        jobCode: mi.jobCode || null,
        poNo: null,
        customer: null,
        side: 'debit',
        category: 'Purchase Accounts',
        particular: `Material Issue ${mi.issueNo} - ${mi.itemName || mi.description || ''}`,
        amount: mi.amount || 0,
      })
    }

    // 3. Expenses from FinExpenseClaim
    const claims = await pdb.finExpenseClaim.findMany({
      where: { OR: [{ approvalStatus: { in: ['Approved', 'Paid'] } }, { status: { in: ['Approved', 'Paid'] } }] },
      include: { site: { select: { name: true } } },
    })
    for (const claim of claims) {
      const site = extractSiteName(claim.site)
      if (siteFilter && siteFilter !== 'all' && site !== siteFilter) continue
      const month = toMonthKey(new Date(claim.date || claim.createdAt))
      if (monthFilter && monthFilter !== 'all' && month !== monthFilter) continue
      const cat = claim.expenseType === 'Advance' ? 'Indirect Expenses' : 'Direct Expenses'
      profitLossEntries.push({
        id: `exp-${claim.id}`,
        source: 'expense_claim',
        sourceId: claim.id,
        site,
        month,
        jobCode: claim.jobCode || null,
        poNo: null, // FinExpenseClaim only has poId, no poNo string
        customer: null, // FinExpenseClaim has no partyId
        side: 'debit',
        category: cat,
        particular: `Expense Claim ${claim.claimNo} - ${claim.expenseType || ''}`,
        amount: claim.totalAmount || 0,
      })
    }

    // 4. Expenses from FinPettyCash (Debit = money going out)
    const pettyRecords = await pdb.finPettyCash.findMany({
      where: { approvalStatus: 'Approved', expenseClaimId: null },
      include: { site: { select: { name: true } }, party: { select: { name: true } } },
    })
    for (const pr of pettyRecords) {
      if (pr.type !== 'Debit') continue
      const site = pr.site?.name || 'HO'
      if (siteFilter && siteFilter !== 'all' && site !== siteFilter) continue
      const month = toMonthKey(new Date(pr.date))
      if (monthFilter && monthFilter !== 'all' && month !== monthFilter) continue
      const cat = pr.category || 'Indirect Expenses'
      const partyName = pr.party?.name || ''
      profitLossEntries.push({
        id: `pc-${pr.id}`,
        source: 'petty_cash',
        sourceId: pr.id,
        site,
        month,
        jobCode: pr.jobCode || null,
        poNo: null, // FinPettyCash only has poId, no poNo string
        customer: partyName || null,
        side: 'debit',
        category: cat,
        particular: `Petty Cash ${pr.voucherNo} - ${pr.description}${partyName ? ` (${partyName})` : ''}`,
        amount: pr.amount,
      })
    }

    // 4b. Payroll / Salaries. PayrollRun is company-wide (no site/job split),
    // so it is posted to the 'HO' bucket as an indirect (overhead) cost.
    const payrollRuns = await pdb.payrollRun.findMany({
      where: {
        OR: [
          { processedAt: { not: null } },
          { status: { in: ['processed', 'completed', 'finalized', 'paid'] } },
        ],
      },
    })
    for (const pr of payrollRuns) {
      if (siteFilter && siteFilter !== 'all' && siteFilter !== 'HO') continue
      const month = payrollMonthKey(pr.year, pr.month)
      if (monthFilter && monthFilter !== 'all' && month !== monthFilter) continue
      profitLossEntries.push({
        id: `payroll-${pr.id}`,
        source: 'payroll',
        sourceId: pr.id,
        site: 'HO',
        month,
        jobCode: null, poNo: null, customer: null,
        side: 'debit',
        category: 'Indirect Expenses',
        particular: `Payroll ${pr.name} (${pr.totalEmployees} employees)`,
        amount: Number(pr.totalGross) || 0,
      })
    }

    // Payment advices settle recorded liabilities and are not expenses themselves.

    // 5. Existing manual ProfitLossEntry records
    const manualWhere: any = {}
    if (siteFilter && siteFilter !== 'all') manualWhere.site = siteFilter
    if (monthFilter && monthFilter !== 'all') manualWhere.month = monthFilter
    const manualRecords = await (pdb as any).profitLossEntry.findMany({ where: manualWhere })
    for (const mr of manualRecords) {
      profitLossEntries.push({
        id: mr.id,
        source: 'manual',
        sourceId: mr.id,
        site: mr.site,
        month: mr.month,
        jobCode: null, poNo: null, customer: null,
        side: mr.side,
        category: mr.category,
        particular: mr.particular,
        amount: mr.amount,
      })
    }

    // Aggregate by site, month, side, category
    const sites = [...new Set(profitLossEntries.map(r => r.site))].sort()
    const months = [...new Set(profitLossEntries.map(r => r.month))].sort()

    const totalCredit = profitLossEntries.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0)
    const totalDebit = profitLossEntries.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0)

    // Site-wise summaries
    const siteWise = sites.map(site => {
      const siteEntries = profitLossEntries.filter(r => r.site === site)
      const income = siteEntries.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0)
      const expense = siteEntries.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0)
      return { site, income, expense, netPL: income - expense }
    })

    // Job-wise / PO-wise / Customer-wise summaries — same filter/reduce
    // pattern as siteWise. Coverage note: FinExpenseClaim has no poNo/party
    // and FinCreditNote has no party, so those sources simply don't
    // contribute to the buckets they lack tags for (not hidden — the
    // underlying entries are still counted in totals/site/category views).
    const jobCodes = [...new Set(profitLossEntries.map(r => r.jobCode).filter(Boolean))].sort()
    const jobWise = jobCodes.map(jobCode => {
      const entries = profitLossEntries.filter(r => r.jobCode === jobCode)
      const income = entries.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0)
      const expense = entries.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0)
      return { jobCode, income, expense, netPL: income - expense }
    })

    const poNos = [...new Set(profitLossEntries.map(r => r.poNo).filter(Boolean))].sort()
    const poWise = poNos.map(poNo => {
      const entries = profitLossEntries.filter(r => r.poNo === poNo)
      const income = entries.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0)
      const expense = entries.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0)
      return { poNo, income, expense, netPL: income - expense }
    })

    const customers = [...new Set(profitLossEntries.map(r => r.customer).filter(Boolean))].sort()
    const customerWise = customers.map(customer => {
      const entries = profitLossEntries.filter(r => r.customer === customer)
      const income = entries.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0)
      const expense = entries.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0)
      return { customer, income, expense, netPL: income - expense }
    })

    // Category-wise aggregates
    const catAgg: Record<string, { debit: number; credit: number }> = {}
    for (const r of profitLossEntries) {
      if (!catAgg[r.category]) catAgg[r.category] = { debit: 0, credit: 0 }
      catAgg[r.category][r.side as 'debit' | 'credit'] += r.amount
    }

    // Monthly trend
    const monthlyTrend = months.map(m => {
      const mEntries = profitLossEntries.filter(r => r.month === m)
      const income = mEntries.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0)
      const expense = mEntries.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0)
      return { month: m, income, expense, netPL: income - expense }
    })

    // Source breakdown
    const sourceAgg: Record<string, { debit: number; credit: number }> = {}
    for (const r of profitLossEntries) {
      if (!sourceAgg[r.source]) sourceAgg[r.source] = { debit: 0, credit: 0 }
      sourceAgg[r.source][r.side as 'debit' | 'credit'] += r.amount
    }

    return NextResponse.json({
      success: true,
      data: profitLossEntries,
      summary: {
        source: 'Operational (Project/Operational Profitability — not statutory GL P&L)',
        sites, months,
        totalDebit, totalCredit,
        netPL: totalCredit - totalDebit,
        siteWise, jobWise, poWise, customerWise, catAgg, monthlyTrend, sourceAgg,
      },
    })
  } catch (error) {
    console.error('Error fetching P&L:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || body?.actor || ''
    const denied = await assertPermission(pdb, actor, 'GL_CREATE', { request, module: 'GL' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
    const record = await (pdb as any).profitLossEntry.create({ data: body })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating P&L entry:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || body?.actor || ''
    const denied = await assertPermission(pdb, actor, 'GL_CREATE', { request, module: 'GL' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
    const record = await (pdb as any).profitLossEntry.update({ where: { id: Number(id) }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating P&L entry:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, actor, 'GL_CREATE', { request, module: 'GL' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
    if (id) {
      await (pdb as any).profitLossEntry.delete({ where: { id: Number(id) } })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting P&L:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
