import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  // When editing, pass ?excludeUserId=<id> to keep that user's employee in the list
  const excludeUserId = new URL(request.url).searchParams.get('excludeUserId')

  try {
    // Get employeeIds already linked to active users for this tenant
    let takenEmployeeIds: number[] = []
    if (tenantId) {
      const existingUsers = await superadminDb.tenantUser.findMany({
        where: {
          tenantId,
          isActive: true,
          employeeId: { not: null },
          ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
        },
        select: { employeeId: true },
      }).catch(() => [])
      takenEmployeeIds = existingUsers.map(u => u.employeeId).filter((id): id is number => id !== null)
    }

    const employees = await db.employee.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        ...(takenEmployeeIds.length > 0 ? { id: { notIn: takenEmployeeIds } } : {}),
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        Department: { select: { name: true } },
        Designation: { select: { name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: employees.map(e => ({
        id: e.id,
        employeeCode: e.employeeCode,
        name: `${e.firstName} ${e.middleName ? e.middleName + ' ' : ''}${e.lastName}`.trim(),
        email: e.email,
        phone: e.phone || '',
        department: e.Department?.name || '',
        designation: e.Designation?.name || '',
      })),
    })
  } catch (e) {
    console.error('Tenant employees fetch error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch employees' }, { status: 500 })
  }
}
