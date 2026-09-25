import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

const INCLUDE = { lines: { include: { account: true } } }

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
    account: line.account?.accountCode ?? '',
    accountName: line.account?.name ?? null,
    debit: line.debit,
    credit: line.credit,
    description: line.description ?? entry.description,
    reference: entry.reference,
  }))
}

// Edit-mode save for a multi-line entry: delete-and-recreate its lines
// (same approach the legacy model used), now against the real
// FinJournalEntry/FinJournalLine pair with account-code resolution.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entryNo, lines, ...base } = body
    if (!entryNo) return NextResponse.json({ success: false, error: 'entryNo is required' }, { status: 400 })
    if (!lines?.length) return NextResponse.json({ success: false, error: 'lines array is required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    const existing = await pdb.finJournalEntry.findFirst({ where: { entryNo } })
    if (!existing) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 })
    if (existing.status === 'Posted') {
      return NextResponse.json({ success: false, error: 'Cannot edit a Posted journal entry — it has already been approved and reconciled to the GL' }, { status: 400 })
    }
    const site = base.siteId ? await pdb.finSite.findUnique({ where: { id: Number(base.siteId) } }) : (existing.siteId ? await pdb.finSite.findUnique({ where: { id: existing.siteId } }) : null)
    const denied = await assertPermission(pdb, base.actor || '', 'GL_EDIT', { request, module: 'GL', entityId: String(existing.id), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit journal entries' }, { status: 403 })

    const resolvedLines: { accountId: number; description: string | null; debit: number; credit: number; costCenter: string | null; jobCode: string | null; siteCode: string | null; department: string | null; projectManager: string | null }[] = []
    for (const line of lines) {
      if (!line.account) continue
      const account = await pdb.finAccount.findUnique({ where: { accountCode: line.account } })
      if (!account) return NextResponse.json({ success: false, error: `Unknown account code: ${line.account}` }, { status: 400 })
      resolvedLines.push({
        accountId: account.id,
        description: line.description || base.description || null,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        costCenter: base.costCenter || null,
        jobCode: base.jobCode || null,
        siteCode: null,
        department: base.department || null,
        projectManager: base.projectManager || null,
      })
    }
    if (resolvedLines.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one line with an account is required' }, { status: 400 })
    }
    const totalDebit = resolvedLines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = resolvedLines.reduce((s, l) => s + l.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ success: false, error: `Entry is unbalanced: total debit ${totalDebit} does not equal total credit ${totalCredit}` }, { status: 400 })
    }

    const entry = await pdb.$transaction(async (tx) => {
      await tx.finJournalLine.deleteMany({ where: { entryId: existing.id } })
      return tx.finJournalEntry.update({
        where: { id: existing.id },
        data: {
          entryDate: base.date ? new Date(base.date) : undefined,
          reference: base.reference ?? undefined,
          description: base.description ?? undefined,
          siteId: base.siteId ? Number(base.siteId) : undefined,
          jobCode: base.jobCode ?? undefined,
          poNo: base.poNo ?? undefined,
          costCenter: base.costCenter ?? undefined,
          department: base.department ?? undefined,
          projectManager: base.projectManager ?? undefined,
          voucherType: base.voucherType ?? undefined,
          attachmentPath: base.attachmentPath !== undefined ? (base.attachmentPath || null) : undefined,
          totalDebit,
          totalCredit,
          lines: { create: resolvedLines },
        },
        include: INCLUDE,
      })
    })

    return NextResponse.json({ success: true, data: flatten(entry) })
  } catch (error) {
    console.error('Error batch updating journal entries:', error)
    return NextResponse.json({ success: false, error: 'Failed to update entries' }, { status: 500 })
  }
}
