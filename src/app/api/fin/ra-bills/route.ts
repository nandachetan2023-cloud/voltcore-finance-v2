import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finMootBill.findMany({
      orderBy: { raDate: 'desc' },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching RA bills:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobCode, poTotal, workPercent } = body
    if (!jobCode) return NextResponse.json({ success: false, error: 'jobCode required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const total = Number(poTotal) || 0
    const wp = Number(workPercent) || 0
    const prevWork = Number(body.previousWork) || 0
    // Bill for the incremental work since the last RA: (this % - already billed %) of PO total.
    const incremental = Math.max(0, Math.min(wp - prevWork, 100 - prevWork))
    const billAmount = Math.round(incremental * 0.01 * total * 100) / 100
    const withholdingPct = Number(body.withholding) || 0
    const deducted = Math.round(billAmount * (withholdingPct / 100) * 100) / 100
    const billedSoFar = Number(body.billedSoFar) || 0
    const netRavFor = Math.round((billAmount - deducted) * 100) / 100
    const record = await pdb.finMootBill.create({
      data: {
        raNo: body.raNo || `RA-${Date.now()}`,
        raDate: body.raDate ? new Date(body.raDate) : new Date(),
        siteCode: body.siteCode || null,
        siteId: body.siteId ? Number(body.siteId) : null,
        jobCode,
        jobName: body.jobName || '',
        poNo: body.poNo || null,
        poId: body.poId ? Number(body.poId) : null,
        poTotal: total,
        workPercent: wp,
        billAmount,
        previousWork: prevWork,
        billedSoFar,
        deducted,
        withholding: withholdingPct,
        netRavFor,
        invoiceNo: body.invoiceNo || null,
        status: body.status || 'Draft',
        remarks: body.remarks || null,
      },
    })
    // Cross-post: when a RA is Invoiced with an invoiceNo, sync the cumulative
    // %-work onto the matching FinInvoice so invoicing reflects RA progress.
    if ((body.status || 'Draft') === 'Invoiced' && body.invoiceNo) {
      const inv = await pdb.finInvoice.findFirst({
        where: { invoiceNo: body.invoiceNo },
        orderBy: { id: 'desc' },
      })
      if (inv) {
        const cumulativePct = Math.round((prevWork + incremental) * 100) / 100
        await pdb.finInvoice.update({ where: { id: inv.id }, data: { workPercent: cumulativePct } })
      }
    }
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const existing = await pdb.finMootBill.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'RA bill not found' }, { status: 404 })
    if (data.raDate) data.raDate = new Date(data.raDate)
    // Recompute derived amounts from the current + incoming values so an edited
    // %-work / PO total / withholding keeps billAmount, deducted and netRavFor in sync.
    const total = data.poTotal !== undefined ? Number(data.poTotal) : existing.poTotal
    const wp = data.workPercent !== undefined ? Number(data.workPercent) : existing.workPercent
    const prevWork = data.previousWork !== undefined ? Number(data.previousWork) : existing.previousWork
    const withholdingPct = data.withholding !== undefined ? Number(data.withholding) : existing.withholding
    const incremental = Math.max(0, Math.min(wp - prevWork, 100 - prevWork))
    const billAmount = Math.round(incremental * 0.01 * total * 100) / 100
    const deducted = Math.round(billAmount * (withholdingPct / 100) * 100) / 100
    const netRavFor = Math.round((billAmount - deducted) * 100) / 100
    data.poTotal = total
    data.workPercent = wp
    data.previousWork = prevWork
    data.withholding = withholdingPct
    data.billAmount = billAmount
    data.deducted = deducted
    data.netRavFor = netRavFor
    if ('billedSoFar' in data) data.billedSoFar = Number(data.billedSoFar)
    const record = await pdb.finMootBill.update({ where: { id: Number(id) }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
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
      const r = await pdb.finMootBill.deleteMany({ where: { id: { in: list } } })
      return NextResponse.json({ success: true, deleted: r.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await pdb.finMootBill.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}