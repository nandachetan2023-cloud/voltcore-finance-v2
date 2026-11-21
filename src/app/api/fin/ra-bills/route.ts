import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finMootBill.findMany({
      orderBy: { raDate: 'desc' },
      include: {
        job: { select: { id: true, jobCode: true, description: true, siteId: true } },
        po: { select: { id: true, poNo: true, vendorName: true, totalAmount: true } },
      },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching RA bills:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

async function validateRaBillData(pdb: any, data: Record<string, any>) {
  const jobCode = String(data.jobCode || '').trim()
  const siteId = data.siteId ? Number(data.siteId) : null
  const poId = data.poId ? Number(data.poId) : null

  if (!jobCode) return { error: 'Job code is required' } as const

  // Validate job exists
  const job = await pdb.finJob.findUnique({
    where: { jobCode },
    select: { id: true, jobCode: true, description: true, siteId: true, poId: true },
  })
  if (!job) return { error: `Job ${jobCode} not found` } as const

  // If siteId provided, validate it matches the job's site
  if (siteId && job.siteId !== siteId) {
    return { error: `Job ${jobCode} belongs to a different site` } as const
  }

  // If poId provided, validate it exists and belongs to the same site
  if (poId) {
    const po = await pdb.finPurchaseOrder.findUnique({
      where: { id: poId },
      select: { id: true, poNo: true, siteId: true },
    })
    if (!po) return { error: `Purchase order ${poId} not found` } as const
    if (job.siteId && po.siteId !== job.siteId) {
      return { error: `Purchase order does not belong to the same site as the job` } as const
    }
  }

  return {
    jobCode,
    jobId: job.id,
    siteId: siteId || job.siteId,
    poId,
  } as const
}

function computeBillAmounts(poTotal: number, workPercent: number, previousWork: number, withholdingPct: number) {
  const total = Math.max(0, Number(poTotal) || 0)
  const wp = Math.max(0, Math.min(Number(workPercent) || 0, 100))
  const prevWork = Math.max(0, Math.min(Number(previousWork) || 0, 100))
  const withholding = Math.max(0, Number(withholdingPct) || 0)

  // Bill for the incremental work since the last RA: (this % - already billed %) of PO total.
  const incremental = Math.max(0, Math.min(wp - prevWork, 100 - prevWork))
  const billAmount = Math.round(incremental * 0.01 * total * 100) / 100
  const deducted = Math.round(billAmount * (withholding / 100) * 100) / 100
  const netRavFor = Math.round((billAmount - deducted) * 100) / 100

  return { total, wp, prevWork, withholding, billAmount, deducted, netRavFor }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const validated = await validateRaBillData(pdb, body)
    if ('error' in validated) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 })
    }

    const { jobCode, jobId, siteId, poId } = validated
    const poTotal = Number(body.poTotal) || 0
    const workPercent = Number(body.workPercent) || 0
    const previousWork = Number(body.previousWork) || 0
    const withholdingPct = Number(body.withholding) || 0
    const billedSoFar = Number(body.billedSoFar) || 0

    const amounts = computeBillAmounts(poTotal, workPercent, previousWork, withholdingPct)

    const record = await pdb.finMootBill.create({
      data: {
        raNo: body.raNo || `RA-${Date.now()}`,
        raDate: body.raDate ? new Date(body.raDate) : new Date(),
        siteCode: body.siteCode || null,
        siteId,
        jobCode,
        jobId,
        jobName: body.jobName || '',
        poNo: body.poNo || null,
        poId,
        poTotal: amounts.total,
        workPercent: amounts.wp,
        billAmount: amounts.billAmount,
        previousWork: amounts.prevWork,
        billedSoFar,
        deducted: amounts.deducted,
        withholding: amounts.withholding,
        netRavFor: amounts.netRavFor,
        invoiceNo: body.invoiceNo || null,
        status: body.status || 'Draft',
        remarks: body.remarks || null,
      },
      include: {
        job: { select: { id: true, jobCode: true, description: true } },
        po: { select: { id: true, poNo: true, vendorName: true, totalAmount: true } },
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
        const cumulativePct = Math.round((amounts.prevWork + amounts.wp) * 100) / 100
        await pdb.finInvoice.update({ where: { id: inv.id }, data: { workPercent: cumulativePct } })
      }
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating RA bill:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)

    const existing = await pdb.finMootBill.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ success: false, error: 'RA bill not found' }, { status: 404 })

    // Merge incoming data with existing for validation
    const merged = { ...existing, ...data }
    const validated = await validateRaBillData(pdb, merged)
    if ('error' in validated) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 })
    }

    if (data.raDate) data.raDate = new Date(data.raDate)

    // Recompute derived amounts from the current + incoming values
    const total = data.poTotal !== undefined ? Number(data.poTotal) : existing.poTotal
    const wp = data.workPercent !== undefined ? Number(data.workPercent) : existing.workPercent
    const prevWork = data.previousWork !== undefined ? Number(data.previousWork) : existing.previousWork
    const withholdingPct = data.withholding !== undefined ? Number(data.withholding) : existing.withholding

    const amounts = computeBillAmounts(total, wp, prevWork, withholdingPct)

    data.poTotal = amounts.total
    data.workPercent = amounts.wp
    data.previousWork = amounts.prevWork
    data.withholding = amounts.withholding
    data.billAmount = amounts.billAmount
    data.deducted = amounts.deducted
    data.netRavFor = amounts.netRavFor
    if ('billedSoFar' in data) data.billedSoFar = Number(data.billedSoFar)

    const record = await pdb.finMootBill.update({
      where: { id: Number(id) },
      data,
      include: {
        job: { select: { id: true, jobCode: true, description: true } },
        po: { select: { id: true, poNo: true, vendorName: true, totalAmount: true } },
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating RA bill:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)
    const idsParam = searchParams.get('ids')
    const id = searchParams.get('id')
    const ids = idsParam
      ? idsParam.split(',').map(Number).filter(Boolean)
      : id ? [Number(id)] : []

    if (!ids.length) return NextResponse.json({ success: false, error: 'id or ids is required' }, { status: 400 })

    const result = await pdb.finMootBill.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Error deleting RA bill:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}