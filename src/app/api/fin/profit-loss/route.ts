import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const site = searchParams.get('site')
    const month = searchParams.get('month')

    const where: Record<string, unknown> = {}
    if (site && site !== 'all') where.site = site
    if (month && month !== 'all') where.month = month

    const records = await (pdb as any).profitLossEntry.findMany({
      where,
      orderBy: [{ site: 'asc' }, { month: 'asc' }, { side: 'asc' }, { category: 'asc' }],
    })

    // Also return summary
    const sites = [...new Set(records.map((r: any) => r.site))]
    const months = [...new Set(records.map((r: any) => r.month))]
    const totalDebit = records.filter((r: any) => r.side === 'debit').reduce((s: number, r: any) => s + r.amount, 0)
    const totalCredit = records.filter((r: any) => r.side === 'credit').reduce((s: number, r: any) => s + r.amount, 0)

    return NextResponse.json({ success: true, data: records, summary: { sites, months, totalDebit, totalCredit, netPL: totalCredit - totalDebit } })
  } catch (error) {
    console.error('Error fetching P&L:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
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
    const site = searchParams.get('site')
    const pdb = getDbForRequest(request)

    if (id) {
      await (pdb as any).profitLossEntry.delete({ where: { id: Number(id) } })
    } else if (site) {
      await (pdb as any).profitLossEntry.deleteMany({ where: { site } })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting P&L:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
