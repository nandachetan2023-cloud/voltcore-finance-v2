import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finProjectProgress.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { milestones: { orderBy: { id: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching job progress:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobCode } = body
    if (!jobCode) return NextResponse.json({ success: false, error: 'jobCode required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    // Compute overall % from milestone weights (weighted by achievedPct) if not supplied.
    let overallPct = Number(body.overallPct) || 0
    const milestones = Array.isArray(body.milestones) ? body.milestones.filter((m: any) => m?.name) : []
    if (milestones.length) {
      const totalWeight = milestones.reduce((s: number, m: any) => s + (Number(m.pct) || 0), 0)
      if (totalWeight > 0) {
        overallPct = Math.round(milestones.reduce((s: number, m: any) => s + ((Number(m.pct) || 0) * (Number(m.achievedPct) || 0)) / 100, 0) * 100) / 100
      }
    }
    const currentMilestone = milestones.find((m: any) => !(Number(m.achievedPct) >= 100))?.name || milestones[milestones.length - 1]?.name || null
    const record = await pdb.finProjectProgress.create({
      data: {
        jobCode,
        jobName: body.jobName || '',
        siteCode: body.siteCode || null,
        siteId: body.siteId ? Number(body.siteId) : null,
        overallPct,
        status: body.status || 'In Progress',
        milestone: currentMilestone,
        notes: body.notes || null,
        milestones: { create: milestones.map((m: any) => ({
          name: m.name, pct: Number(m.pct) || 0, achievedPct: Number(m.achievedPct) || 0,
          done: (Number(m.achievedPct) || 0) >= 100,
          dueDate: m.dueDate ? new Date(m.dueDate) : null, notes: m.notes || null,
        })) },
      },
      include: { milestones: true },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const ids = searchParams.get('ids')
    if (ids) {
      const list = ids.split(',').map(Number).filter(Boolean)
      if (!list.length) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      const r = await pdb.finProjectProgress.deleteMany({ where: { id: { in: list } } })
      return NextResponse.json({ success: true, deleted: r.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await pdb.finProjectProgress.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
