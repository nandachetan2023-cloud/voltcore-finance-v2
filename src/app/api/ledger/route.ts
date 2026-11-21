import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { nextLedgerCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const [finRecords, postedLines] = await Promise.all([
      pdb.finAccount.findMany({
        orderBy: { accountCode: 'asc' },
        include: { parent: { select: { accountCode: true } } },
      }),
      pdb.finJournalLine.findMany({
        where: { entry: { is: { status: 'Posted' } } },
        select: { accountId: true, debit: true, credit: true },
      }),
    ])
    const accountTypes = new Map(finRecords.map(account => [account.id, account.type]))
    const finBalances = new Map<number, number>()
    for (const line of postedLines) {
      const type = accountTypes.get(line.accountId)
      const isDebitNormal = type === 'Asset' || type === 'Expense'
      const movement = isDebitNormal ? line.debit - line.credit : line.credit - line.debit
      finBalances.set(line.accountId, (finBalances.get(line.accountId) || 0) + movement)
    }

    const records = finRecords
      .map(r => ({
        id: r.id,
        source: 'fin',
        accountCode: r.accountCode,
        name: r.name,
        group: r.group,
        type: r.type,
        parentAccount: r.parent?.accountCode || null,
        balance: finBalances.get(r.id) || 0,
        status: r.isActive ? 'Active' : 'Inactive',
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching ledger:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    // The account code is generated here; a caller-supplied one (import) is honoured.
    const record = isBlank(body.accountCode)
      ? await withCodeRetry(() => nextLedgerCode(pdb), (accountCode) => pdb.ledgerAccount.create({ data: { ...body, accountCode } }))
      : await pdb.ledgerAccount.create({ data: body })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating ledger account:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, source, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (source === 'fin') return NextResponse.json({ success: false, error: 'Chart of Accounts entries are read-only' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.ledgerAccount.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating ledger account:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (searchParams.get('source') === 'fin') return NextResponse.json({ success: false, error: 'Chart of Accounts entries are read-only' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.ledgerAccount.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ledger account:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
