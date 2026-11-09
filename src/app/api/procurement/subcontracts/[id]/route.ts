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
    const { rest, startDate, endDate, milestones, retentionReleases, progressClaims } = normalizeSubcontractBody(body)
    if (milestones.length) {
      await pdb.finSubcontractMilestone.deleteMany({ where: { subcontractId: id } })
      await pdb.finSubcontractMilestone.createMany({ data: childRows(milestones, 'dueDate').map(m => ({ ...m, subcontractId: id })) })
    }
    if (retentionReleases.length) {
      await pdb.finSubcontractRetentionRelease.deleteMany({ where: { subcontractId: id } })
      await pdb.finSubcontractRetentionRelease.createMany({ data: childRows(retentionReleases, 'date').map(r => ({ ...r, subcontractId: id })) })
    }
    if (progressClaims.length) {
      await pdb.finSubcontractProgressClaim.deleteMany({ where: { subcontractId: id } })
      await pdb.finSubcontractProgressClaim.createMany({ data: childRows(progressClaims, 'date').map(c => ({ ...c, subcontractId: id })) })
    }
    const data: Record<string, unknown> = { ...rest }
    if (startDate) data.startDate = startDate
    if (endDate) data.endDate = endDate
    const record = await pdb.finSubcontract.update({ where: { id }, data, include: SC_INCLUDE })
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
