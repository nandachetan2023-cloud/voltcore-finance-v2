import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { resolveLedgerScope } from '@/lib/services/leave-ledger-scope'

export const dynamic = 'force-dynamic'

// GET: Leave ledger — active employees the caller may see, with ALL their
// leave requests. Scoped on the server (see
// src/lib/services/leave-ledger-scope.ts): admins get everyone, everyone else
// only their own ledger — the client never receives anyone else's rows.
//
// Kept separate from GET /api/leave, which returns only the requests awaiting
// the caller's approval and is paginated — neither is right for balances.
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const scope = await resolveLedgerScope(
      request.cookies.get('erp_tenant_id')?.value || null,
      request.cookies.get('erp_user_email')?.value,
      request.cookies.get('erp_user_role')?.value,
    )

    const allEmployees = await db.employee.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        employmentStatus: true,
        departmentId: true,
        designationId: true,
        Department: { select: { name: true } },
        Designation: { select: { name: true } },
        Branch: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
    })

    const employees = allEmployees.filter(e =>
      e.employmentStatus?.toLowerCase() === 'active' &&
      (scope.kind === 'all' || scope.canSee(e.id)),
    )

    const records = employees.length === 0 ? [] : await db.leaveRequest.findMany({
      where: { isDeleted: false, employeeId: { in: employees.map(e => e.id) } },
      select: {
        id: true,
        employeeId: true,
        leaveType: true,
        fromDate: true,
        toDate: true,
        days: true,
        reason: true,
        status: true,
        appliedDate: true,
        createdAt: true,
      },
      orderBy: { appliedDate: 'desc' },
    })

    return NextResponse.json(
      { success: true, data: { employees, records } },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
    )
  } catch (error) {
    console.error('Error fetching leave ledger:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave ledger' },
      { status: 500 },
    )
  }
}
