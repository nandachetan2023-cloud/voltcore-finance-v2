import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const where: any = {}
    if (siteId) where.siteId = Number(siteId)
    const records = await pdb.finPettyCashReconciliation.findMany({
      where,
      orderBy: { reconDate: 'desc' },
      include: { site: { select: { id: true, name: true, siteCode: true } } },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching reconciliations:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const opening = Number(body.openingCash) || 0
    const received = Number(body.cashReceived) || 0
    const paid = Number(body.cashPaid) || 0
    const expected = Math.round((opening + received - paid) * 100) / 100
    const physical = Number(body.physicalCash) || 0
    const variance = Math.round((physical - expected) * 100) / 100
    const shortage = variance < 0 ? Math.abs(variance) : 0
    const excess = variance > 0 ? variance : 0
    const record = await pdb.finPettyCashReconciliation.create({
      data: {
        fundId: body.fundId ? Number(body.fundId) : null,
        siteId: body.siteId ? Number(body.siteId) : null,
        custodian: body.custodian || null,
        reconDate: body.reconDate ? new Date(body.reconDate) : new Date(),
        openingCash: opening,
        cashReceived: received,
        cashPaid: paid,
        expectedCash: expected,
        physicalCash: physical,
        variance,
        shortage,
        excess,
        remarks: body.remarks || null,
        status: body.status || 'Draft',
        createdBy: body.createdBy || null,
      },
      include: { site: { select: { id: true, name: true, siteCode: true } } },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating reconciliation:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...raw } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const existing = await pdb.finPettyCashReconciliation.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'Reconciliation not found' }, { status: 404 })
    if (existing.status === 'Closed') return NextResponse.json({ success: false, error: 'This period is closed — records cannot be edited' }, { status: 400 })
    const data: any = { ...raw }
    if (data.reconDate) data.reconDate = new Date(data.reconDate)
    for (const k of ['openingCash', 'cashReceived', 'cashPaid', 'physicalCash']) if (data[k] !== undefined) data[k] = Number(data[k]) || 0
    if (data.openingCash !== undefined || data.cashReceived !== undefined || data.cashPaid !== undefined) {
      const o = Number(data.openingCash ?? raw.openingCash) || 0
      const r = Number(data.cashReceived ?? raw.cashReceived) || 0
      const p = Number(data.cashPaid ?? raw.cashPaid) || 0
      data.expectedCash = Math.round((o + r - p) * 100) / 100
      const ph = Number(data.physicalCash ?? raw.physicalCash) || 0
      data.variance = Math.round((ph - data.expectedCash) * 100) / 100
      data.shortage = data.variance < 0 ? Math.abs(data.variance) : 0
      data.excess = data.variance > 0 ? data.variance : 0
    }
    if (raw.status === 'Closed') {
      // Closing a period: the variance must be documented, and the counted physical cash carries forward
      const remarks = (raw.remarks ?? existing.remarks) as string | null | undefined
      if (existing.variance !== 0 && !remarks) {
        return NextResponse.json({ success: false, error: 'Document the variance in Remarks before closing the period' }, { status: 400 })
      }
      data.status = 'Closed'
      data.carryForward = Number(data.physicalCash ?? existing.physicalCash) || 0
    } else if (data.carryForward !== undefined) {
      delete data.carryForward // never client-asserted
    }
    const record = await pdb.finPettyCashReconciliation.update({ where: { id: Number(id) }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating reconciliation:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}