/**
 * Returns a lightweight list of active employees from the tenant's own DB.
 * Used by the User Management form to link a login account to an employee record.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const employees = await db.employee.findMany({
      where: { isDeleted: false, isActive: true },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        Department: { select: { name: true } },
        Designation: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: employees.map(e => ({
        id: e.id,
        employeeCode: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        department: e.Department?.name || '',
        designation: e.Designation?.name || '',
      })),
    })
  } catch (e) {
    console.error('Tenant employees fetch error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch employees' }, { status: 500 })
  }
}
