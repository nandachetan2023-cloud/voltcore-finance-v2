import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { SC_INCLUDE, childRows, normalizeSubcontractBody } from '@/lib/procurement-subcontract'

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
      const year = new Date().getFullYear()
      const count = (await pdb.finSubcontract.count()) + 1
      rest.subcontractNo = `SC-${year}-${String(count).padStart(3, '0')}`
    }
    const record = await pdb.finSubcontract.create({
      data: {
        ...rest,
        startDate,
        endDate,
        milestones: milestones.length ? { create: childRows(milestones, 'dueDate') } : undefined,
        retentionReleases: retentionReleases.length ? { create: childRows(retentionReleases, 'date') } : undefined,
        progressClaims: progressClaims.length ? { create: childRows(progressClaims, 'date') } : undefined,
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
    const { rest, startDate, endDate, milestones, retentionReleases, progressClaims } = normalizeSubcontractBody(body)
    if (milestones) {
      await pdb.finSubcontractMilestone.deleteMany({ where: { subcontractId: id } })
      if (milestones.length) await pdb.finSubcontractMilestone.createMany({ data: childRows(milestones, 'dueDate').map(m => ({ ...m, subcontractId: id })) })
    }
    if (retentionReleases) {
      await pdb.finSubcontractRetentionRelease.deleteMany({ where: { subcontractId: id } })
      if (retentionReleases.length) await pdb.finSubcontractRetentionRelease.createMany({ data: childRows(retentionReleases, 'date').map(r => ({ ...r, subcontractId: id })) })
    }
    if (progressClaims) {
      await pdb.finSubcontractProgressClaim.deleteMany({ where: { subcontractId: id } })
      if (progressClaims.length) await pdb.finSubcontractProgressClaim.createMany({ data: childRows(progressClaims, 'date').map(c => ({ ...c, subcontractId: id })) })
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
