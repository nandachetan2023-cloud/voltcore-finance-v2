import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = { lines: { include: { account: true } } }

// Flattens a FinJournalEntry + its FinJournalLine[] into one flat row per
// line — the shape journal-entries.tsx / create-journal-entry.tsx already
// expect (each line shares the parent entry's header fields), so migrating
// off the legacy flat `JournalEntry` model requires no UI changes.
function flatten(entry: any) {
  return entry.lines.map((line: any) => ({
    id: line.id,
    entryId: entry.id,
    entryNo: entry.entryNo,
    date: entry.entryDate,
    siteId: entry.siteId,
    jobCode: entry.jobCode,
    poNo: entry.poNo,
    costCenter: entry.costCenter,
    department: entry.department,
    projectManager: entry.projectManager,
    voucherType: entry.voucherType,
    status: entry.status,
    submittedBy: entry.submittedBy,
    submittedAt: entry.submittedAt,
    approvedBy: entry.approvedBy,
    approvedAt: entry.approvedAt,
    rejectionReason: entry.rejectionReason,
    attachmentPath: entry.attachmentPath,
    account: line.account?.accountCode ?? '',
    accountName: line.account?.name ?? null,
    debit: line.debit,
    credit: line.credit,
    description: line.description ?? entry.description,
    reference: entry.reference,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const entryNo = searchParams.get('entryNo')

    const entries = entryNo
      ? await pdb.finJournalEntry.findMany({ where: { entryNo }, include: INCLUDE, orderBy: { id: 'asc' } })
      : await pdb.finJournalEntry.findMany({ include: INCLUDE, orderBy: { entryDate: 'desc' } })

    const records = entries.flatMap(flatten)
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

    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one line is required' }, { status: 400 })
    }
    if (!body.siteId) {
      return NextResponse.json({ success: false, error: 'Site is required' }, { status: 400 })
    }

    // Resolve each line's account CODE to a real FinAccount id — this is
    // the whole point of the migration off the legacy flat model, where
    // `account` was just a free string with no referential integrity.
    const resolvedLines: { accountId: number; description: string | null; debit: number; credit: number; costCenter: string | null; jobCode: string | null; siteCode: string | null; department: string | null; projectManager: string | null }[] = []
    for (const line of body.lines) {
      if (!line.account) continue
      const account = await pdb.finAccount.findUnique({ where: { accountCode: line.account } })
      if (!account) {
        return NextResponse.json({ success: false, error: `Unknown account code: ${line.account}` }, { status: 400 })
      }
      resolvedLines.push({
        accountId: account.id,
        description: line.description || body.description || null,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        costCenter: body.costCenter || null,
        jobCode: body.jobCode || null,
        siteCode: null,
        department: body.department || null,
        projectManager: body.projectManager || null,
      })
    }
    if (resolvedLines.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one line with an account is required' }, { status: 400 })
    }

    const totalDebit = resolvedLines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = resolvedLines.reduce((s, l) => s + l.credit, 0)

    let entryNo = body.entryNo
    if (!entryNo) {
      const year = new Date(body.date || Date.now()).getFullYear()
      const count = (await pdb.finJournalEntry.count()) + 1
      entryNo = `JE/${year}/${String(count).padStart(4, '0')}`
    }

    const entry = await pdb.finJournalEntry.create({
      data: {
        entryNo,
        entryDate: new Date(body.date),
        reference: body.reference || null,
        description: body.description || null,
        siteId: Number(body.siteId),
        finSiteId: Number(body.siteId),
        jobCode: body.jobCode || null,
        poNo: body.poNo || null,
        costCenter: body.costCenter || null,
        department: body.department || null,
        projectManager: body.projectManager || null,
        voucherType: body.voucherType || 'Journal',
        status: 'Draft',
        attachmentPath: body.attachmentPath || null,
        totalDebit,
        totalCredit,
        lines: { create: resolvedLines },
      },
      include: INCLUDE,
    })

    return NextResponse.json({ success: true, data: flatten(entry) }, { status: 201 })
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

    // This PUT only handles header-level edits (description, reference,
    // costing tags) on a single entry — line-level edits go through the
    // batch endpoint (delete-and-recreate), same as before the migration.
    const updateData: any = {}
    if (data.description !== undefined) updateData.description = data.description
    if (data.reference !== undefined) updateData.reference = data.reference
    if (data.siteId !== undefined) updateData.siteId = Number(data.siteId)
    if (data.jobCode !== undefined) updateData.jobCode = data.jobCode
    if (data.poNo !== undefined) updateData.poNo = data.poNo
    if (data.costCenter !== undefined) updateData.costCenter = data.costCenter
    if (data.department !== undefined) updateData.department = data.department
    if (data.projectManager !== undefined) updateData.projectManager = data.projectManager
    if (data.voucherType !== undefined) updateData.voucherType = data.voucherType
    if (data.attachmentPath !== undefined) updateData.attachmentPath = data.attachmentPath

    const entry = await pdb.finJournalEntry.update({ where: { id: Number(id) }, data: updateData, include: INCLUDE })
    return NextResponse.json({ success: true, data: flatten(entry) })
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
    // `id` here is a FinJournalLine id (per the flattened row shape) — find
    // its parent entry and delete the whole entry (cascades to lines) so a
    // multi-line entry can't be left unbalanced by deleting a single line.
    const line = await pdb.finJournalLine.findUnique({ where: { id: Number(id) } })
    if (!line) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 })
    await pdb.finJournalEntry.delete({ where: { id: line.entryId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
