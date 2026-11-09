import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { SC_INCLUDE, childRows, normalizeSubcontractBody } from '@/lib/procurement-subcontract'
import { nextSeriesCode, withCodeRetry } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finSubcontract.findMany({ include: SC_INCLUDE, orderBy: { startDate: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching subcontracts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { rest, startDate, endDate, milestones, retentionReleases, progressClaims } = normalizeSubcontractBody(body)
    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate and endDate are required' }, { status: 400 })
    }
    if (!rest.subcontractNo) {
      const record = await withCodeRetry(
        () => nextSeriesCode(pdb, 'subcontract'),
        (code) => pdb.finSubcontract.create({
          data: {
            ...rest,
            subcontractNo: code,
            startDate,
            endDate,
            milestones: milestones?.length ? { create: childRows(milestones, 'dueDate') } : undefined,
            retentionReleases: retentionReleases?.length ? { create: childRows(retentionReleases, 'date') } : undefined,
            progressClaims: progressClaims?.length ? { create: childRows(progressClaims, 'date') } : undefined,
          } as any,
          include: SC_INCLUDE,
        }),
      )
      return NextResponse.json({ success: true, data: record }, { status: 201 })
    }
    const record = await pdb.finSubcontract.create({
      data: {
        ...rest,
        startDate,
        endDate,
        milestones: milestones?.length ? { create: childRows(milestones, 'dueDate') } : undefined,
        retentionReleases: retentionReleases?.length ? { create: childRows(retentionReleases, 'date') } : undefined,
        progressClaims: progressClaims?.length ? { create: childRows(progressClaims, 'date') } : undefined,
      } as any,
      include: SC_INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating subcontract:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finSubcontract.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subcontract:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
