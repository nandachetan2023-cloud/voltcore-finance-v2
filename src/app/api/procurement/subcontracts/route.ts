import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = { milestones: true, retentionReleases: true, progressClaims: true }

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finSubcontract.findMany({ include: INCLUDE, orderBy: { startDate: 'desc' } })
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
    const { milestones, retentionReleases, progressClaims, ...data } = body
    if (!data.subcontractNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.finSubcontract.count()) + 1
      data.subcontractNo = `SC-${year}-${String(count).padStart(3, '0')}`
    }
    const record = await pdb.finSubcontract.create({
      data: {
        ...data,
        milestones: milestones ? { create: milestones } : undefined,
        retentionReleases: retentionReleases ? { create: retentionReleases } : undefined,
        progressClaims: progressClaims ? { create: progressClaims } : undefined,
      },
      include: INCLUDE,
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
    const { id, milestones, retentionReleases, progressClaims, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (milestones) {
      await pdb.finSubcontractMilestone.deleteMany({ where: { subcontractId: id } })
      await pdb.finSubcontractMilestone.createMany({ data: milestones.map((m: any) => ({ ...m, subcontractId: id })) })
    }
    if (retentionReleases) {
      await pdb.finSubcontractRetentionRelease.deleteMany({ where: { subcontractId: id } })
      await pdb.finSubcontractRetentionRelease.createMany({ data: retentionReleases.map((r: any) => ({ ...r, subcontractId: id })) })
    }
    if (progressClaims) {
      await pdb.finSubcontractProgressClaim.deleteMany({ where: { subcontractId: id } })
      await pdb.finSubcontractProgressClaim.createMany({ data: progressClaims.map((c: any) => ({ ...c, subcontractId: id })) })
    }
    const record = await pdb.finSubcontract.update({ where: { id }, data, include: INCLUDE })
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
