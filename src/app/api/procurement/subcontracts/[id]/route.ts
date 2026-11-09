import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { SC_INCLUDE, childRows, normalizeSubcontractBody } from '@/lib/procurement-subcontract'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id: idParam } = await ctx.params
    const id = Number(idParam)
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const existing = await pdb.finSubcontract.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 })
    const { rest, startDate, endDate, milestones, retentionReleases, progressClaims } = normalizeSubcontractBody(body)
    const record = await pdb.$transaction(async (tx) => {
      if (milestones !== undefined) {
        await tx.finSubcontractMilestone.deleteMany({ where: { subcontractId: id } })
        if (milestones.length) await tx.finSubcontractMilestone.createMany({ data: childRows(milestones, 'dueDate').map(m => ({ ...m, subcontractId: id })) })
      }
      if (retentionReleases !== undefined) {
        await tx.finSubcontractRetentionRelease.deleteMany({ where: { subcontractId: id } })
        if (retentionReleases.length) await tx.finSubcontractRetentionRelease.createMany({ data: childRows(retentionReleases, 'date').map(r => ({ ...r, subcontractId: id })) })
      }
      if (progressClaims !== undefined) {
        await tx.finSubcontractProgressClaim.deleteMany({ where: { subcontractId: id } })
        if (progressClaims.length) await tx.finSubcontractProgressClaim.createMany({ data: childRows(progressClaims, 'date').map(c => ({ ...c, subcontractId: id })) })
      }
      const data: Record<string, unknown> = { ...rest }
      if (startDate) data.startDate = startDate
      if (endDate) data.endDate = endDate
      return tx.finSubcontract.update({ where: { id }, data, include: SC_INCLUDE })
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating subcontract:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { id: idParam } = await ctx.params
    const id = Number(idParam)
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finSubcontract.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subcontract:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
