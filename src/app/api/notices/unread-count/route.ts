import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: unread notice count for sidebar badge
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    if (!cookieEmpId) return NextResponse.json({ success: true, count: 0 })

    const employeeId = parseInt(cookieEmpId)
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { Department: { select: { name: true } }, Designation: { select: { name: true } } },
    })

    const deptName = employee?.Department?.name || null
    const desigName = employee?.Designation?.name || null
    const now = new Date()

    const total = await db.notice.count({
      where: {
        AND: [
          { OR: [{ targetDept: null }, ...(deptName ? [{ targetDept: deptName }] : [])] },
          { OR: [{ targetDesig: null }, ...(desigName ? [{ targetDesig: desigName }] : [])] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { reads: { none: { employeeId } } },
        ],
      },
    })

    return NextResponse.json({ success: true, count: total })
  } catch (e) {
    return NextResponse.json({ success: true, count: 0 })
  }
}
