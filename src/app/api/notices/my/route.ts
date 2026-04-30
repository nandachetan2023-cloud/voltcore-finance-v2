import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: notices visible to the logged-in employee, with isRead flag
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    if (!cookieEmpId) {
      return NextResponse.json({ success: false, error: 'Not linked to an employee record' }, { status: 400 })
    }
    const employeeId = parseInt(cookieEmpId)

    // Get employee's dept and designation
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: {
        Department: { select: { name: true } },
        Designation: { select: { name: true } },
      },
    })

    const deptName = employee?.Department?.name || null
    const desigName = employee?.Designation?.name || null
    const now = new Date()

    // Fetch notices targeted at this employee
    const notices = await db.notice.findMany({
      where: {
        AND: [
          { OR: [{ targetDept: null }, ...(deptName ? [{ targetDept: deptName }] : [])] },
          { OR: [{ targetDesig: null }, ...(desigName ? [{ targetDesig: desigName }] : [])] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      include: {
        reads: { where: { employeeId }, select: { readAt: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    })

    const data = notices.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      targetDept: n.targetDept,
      targetDesig: n.targetDesig,
      isPinned: n.isPinned,
      publishedAt: n.publishedAt,
      expiresAt: n.expiresAt,
      createdByName: n.createdByName,
      isRead: n.reads.length > 0,
      readAt: n.reads[0]?.readAt || null,
    }))

    const unreadCount = data.filter(n => !n.isRead).length

    return NextResponse.json({ success: true, data, unreadCount })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch notices' }, { status: 500 })
  }
}
