import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const PL_GROUPS = ['Revenue', 'Cost of Sales', 'Direct Expenses', 'Indirect Expenses'] as const
type PlGroup = (typeof PL_GROUPS)[number]

function isPlGroup(value: string | null | undefined): value is PlGroup {
  return !!value && (PL_GROUPS as readonly string[]).includes(value)
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function monthKeyOf(date: Date | string | null | undefined): string {
  const d = date ? new Date(String(date)) : new Date()
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = request.headers.get('x-actor-email') || request.cookies.get('erp_user_email')?.value || ''
    const denied = await assertPermission(pdb, actor, 'GL_VIEW', { request, module: 'GL' } as any)
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const siteFilter = searchParams.get('site')
    const jobFilter = searchParams.get('jobCode')
    const monthFilter = searchParams.get('month')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = { status: 'Posted' }
    if (from) where.entryDate = { gte: new Date(from) }
    if (to) where.entryDate = { ...(where.entryDate || {}), lte: new Date(to) }

    const entries = await pdb.finJournalEntry.findMany({
      where,
      include: { lines: { include: { account: true } } },
      orderBy: { entryDate: 'asc' },
    })

    const profitLossEntries: any[] = []
    for (const entry of entries) {
      const entrySiteCode = (entry as any).siteCode || (entry as any).site?.siteCode || null
      const jobCode = entry.jobCode || null
      const monthKey = monthKeyOf((entry as any).entryDate || (entry as any).createdAt)
      const lines = entry.lines || []
      const matchedSite = !siteFilter || siteFilter === 'all' || entrySiteCode === siteFilter
      const matchedJob = !jobFilter || jobFilter === 'all' || jobCode === jobFilter
      const matchedMonth = !monthFilter || monthFilter === 'all' || monthFilter === monthKey
      if (!matchedSite || !matchedJob || !matchedMonth) continue

      for (const line of lines) {
        const account = line.account
        if (!isPlGroup(account?.plGroup)) continue
        const amount = round2(line.debit > line.credit ? line.debit : line.credit)
        if (amount <= 0) continue
        const side = line.debit > line.credit ? 'debit' : 'credit'
        profitLossEntries.push({
          id: `gle-${entry.id}-line-${line.id}`,
          source: 'gl_journal',
          sourceId: entry.id,
          journalEntryId: entry.id,
          entryNo: entry.entryNo,
          siteCode: entrySiteCode,
          month: monthKey,
          jobCode,
          plGroup: account.plGroup,
          poNo: entry.poNo || null,
          category: account.plGroup,
          particular: `${entry.entryNo} - ${entry.description || ''}`,
          customer: null,
          side,
          amount,
        })
      }
    }

    const totalCredit = round2(profitLossEntries.filter((r) => r.side === 'credit').reduce((s, r) => s + r.amount, 0))
    const totalDebit = round2(profitLossEntries.filter((r) => r.side === 'debit').reduce((s, r) => s + r.amount, 0))

    const byPlGroup: Record<string, { income: number; expense: number; netPL: number }> = {}
    for (const group of PL_GROUPS) {
      const rows = profitLossEntries.filter((r) => r.plGroup === group)
      const income = round2(rows.filter((r) => r.side === 'credit').reduce((s, r) => s + r.amount, 0))
      const expense = round2(rows.filter((r) => r.side === 'debit').reduce((s, r) => s + r.amount, 0))
      byPlGroup[group] = { income, expense, netPL: round2(income - expense) }
    }

    const siteWiseMap = new Map<string, { income: number; expense: number; netPL: number }>()
    for (const r of profitLossEntries) {
      const key = r.siteCode || 'Unallocated'
      const bucket = siteWiseMap.get(key) || { income: 0, expense: 0, netPL: 0 }
      if (r.side === 'credit') bucket.income += r.amount
      else bucket.expense += r.amount
      bucket.netPL = round2(bucket.income - bucket.expense)
      siteWiseMap.set(key, bucket)
    }
    const siteWise = [...siteWiseMap.entries()].map(([site, v]) => ({ site, ...v }))

    return NextResponse.json({
      success: true,
      data: profitLossEntries,
      summary: {
        source: 'GL (Posted Journal Aggregation - statutory)',
        plGroups: PL_GROUPS,
        totalDebit,
        totalCredit,
        netPL: round2(totalCredit - totalDebit),
        byPlGroup,
        siteWise,
      },
    })
  } catch (error) {
    console.error('Error fetching GL P&L:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch GL profit and loss' }, { status: 500 })
  }
}
