import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST: dispatch payslips for a payroll run
// Sets payslipGenerated = true only on items where it is currently false
// This prevents double-dispatch — already dispatched items are untouched
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { payrollRunId } = await request.json()
    if (!payrollRunId) {
      return NextResponse.json({ success: false, error: 'payrollRunId required' }, { status: 400 })
    }

    const runId = parseInt(payrollRunId)

    // Verify the run exists
    const run = await db.payrollRun.findUnique({ where: { id: runId } })
    if (!run) {
      return NextResponse.json({ success: false, error: 'Payroll run not found' }, { status: 404 })
    }

    // Count how many are already dispatched (to report back)
    const alreadyDispatched = await db.payrollItem.count({
      where: { payrollRunId: runId, payslipGenerated: true },
    })

    // Only update items not yet dispatched — prevents duplicates
    const result = await db.payrollItem.updateMany({
      where: {
        payrollRunId: runId,
        payslipGenerated: false,
      },
      data: {
        payslipGenerated: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        dispatched: result.count,
        alreadyDispatched,
        total: result.count + alreadyDispatched,
      },
    })
  } catch (e) {
    console.error('Dispatch error:', e)
    return NextResponse.json({ success: false, error: 'Failed to dispatch payslips' }, { status: 500 })
  }
}

// GET: check dispatch status for a payroll run
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const payrollRunId = searchParams.get('payrollRunId')
    if (!payrollRunId) {
      return NextResponse.json({ success: false, error: 'payrollRunId required' }, { status: 400 })
    }

    const runId = parseInt(payrollRunId)
    const [total, dispatched] = await Promise.all([
      db.payrollItem.count({ where: { payrollRunId: runId } }),
      db.payrollItem.count({ where: { payrollRunId: runId, payslipGenerated: true } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        total,
        dispatched,
        pending: total - dispatched,
        isFullyDispatched: total > 0 && dispatched === total,
      },
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch dispatch status' }, { status: 500 })
  }
}
