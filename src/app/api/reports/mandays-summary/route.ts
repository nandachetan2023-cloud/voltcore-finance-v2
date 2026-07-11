import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { buildManDaysSummaryWorkbook } from '@/lib/services/mandays-summary-report'

export const dynamic = 'force-dynamic'

// GET: Mandays Summary Report (.xlsx) in the HIL SummaryReport layout.
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

    // Contractor name for the report (from the tenant registry).
    let contractorName = 'UPASANA ASSOCIATE'
    const tenantId = request.cookies.get('erp_tenant_id')?.value
    if (tenantId) {
      const tenant = await superadminDb.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null)
      if (tenant?.name) contractorName = tenant.name
    }

    const buffer = await buildManDaysSummaryWorkbook(db, { month, year, employeeIds, contractorName })

    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const scope = employeeIds ? `Emp${employeeIds[0]}` : 'AllEmployees'
    const filename = `SummaryReport_${MON[month - 1]}${year}_${scope}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('Mandays summary report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate mandays summary report' }, { status: 500 })
  }
}
