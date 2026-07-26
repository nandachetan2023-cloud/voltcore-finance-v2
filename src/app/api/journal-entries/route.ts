import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const entryNo = searchParams.get('entryNo')

    let records
    if (entryNo) {
      records = await pdb.journalEntry.findMany({ where: { entryNo }, orderBy: { id: 'asc' } })
    } else {
      records = await pdb.journalEntry.findMany({ orderBy: { date: 'desc' } })
    }

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    // Support batch: { entryNo, date, siteId, voucherType, status, lines: [...] }
    if (body.lines && Array.isArray(body.lines)) {
      const { lines, ...base } = body
      const records = await pdb.$transaction(
        lines.map((line: any) =>
          pdb.journalEntry.create({
            data: {
              entryNo: base.entryNo,
              date: base.date,
              siteId: base.siteId || null,
              partyId: base.partyId || null,
              jobCode: base.jobCode || null,
              costCenter: base.costCenter || null,
              department: base.department || null,
              projectManager: base.projectManager || null,
              voucherType: base.voucherType,
              status: base.status,
              account: line.account,
              accountName: line.accountName || null,
              debit: line.debit || 0,
              credit: line.credit || 0,
              description: line.description || base.description || null,
              reference: line.reference || base.reference || null,
            },
          })
        )
      )
      return NextResponse.json({ success: true, data: records }, { status: 201 })
    }

    // Single-line (backward compatible)
    const record = await pdb.journalEntry.create({ data: body })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.journalEntry.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating journal entry:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.journalEntry.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
