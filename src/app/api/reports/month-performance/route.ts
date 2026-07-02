import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { buildMonthPerformanceWorkbook } from '@/lib/services/month-performance-report'

export const dynamic = 'force-dynamic'

// GET: Month Performance Register (.xlsx) in the eTimeOffice block layout.
//   ?month=5&year=2026            → all active employees
//   ?month=5&year=2026&employeeId=12  → single employee
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '')
    const year = parseInt(searchParams.get('year') || '')
    const employeeIdRaw = searchParams.get('employeeId')

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: 'Valid month (1-12) and year are required' }, { status: 400 })
    }

    const employeeIds = employeeIdRaw ? [parseInt(employeeIdRaw)].filter(n => !Number.isNaN(n)) : undefined

    // Company name for the report header (from the tenant registry).
    let companyName = ''
    const tenantId = request.cookies.get('erp_tenant_id')?.value
    if (tenantId) {
      const tenant = await superadminDb.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null)
      companyName = tenant?.name || ''
    }

    const buffer = await buildMonthPerformanceWorkbook(db, { month, year, employeeIds, companyName })

    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const scope = employeeIds ? `Emp${employeeIds[0]}` : 'AllEmployees'
    const filename = `MonthPerformance_${MON[month - 1]}${year}_${scope}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('Month performance report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate month performance report' }, { status: 500 })
  }
}
