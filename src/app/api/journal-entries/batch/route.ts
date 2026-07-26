import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entryNo, lines, ...base } = body
    if (!entryNo) return NextResponse.json({ success: false, error: 'entryNo is required' }, { status: 400 })
    if (!lines?.length) return NextResponse.json({ success: false, error: 'lines array is required' }, { status: 400 })

    const pdb = getDbForRequest(request)

    const records = await pdb.$transaction(async (tx) => {
      await tx.journalEntry.deleteMany({ where: { entryNo } })
      const created = await Promise.all(
        lines.map((line: any) =>
          tx.journalEntry.create({
            data: {
              entryNo,
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
      return created
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error batch updating journal entries:', error)
    return NextResponse.json({ success: false, error: 'Failed to update entries' }, { status: 500 })
  }
}
