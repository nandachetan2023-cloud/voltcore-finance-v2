import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST: mark a notice as read for the current employee
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    if (!cookieEmpId) {
      return NextResponse.json({ success: false, error: 'Not linked to an employee record' }, { status: 400 })
    }
    const employeeId = parseInt(cookieEmpId)
    const { noticeId } = await request.json()
    if (!noticeId) return NextResponse.json({ success: false, error: 'noticeId required' }, { status: 400 })

    await db.noticeRead.upsert({
      where: { noticeId_employeeId: { noticeId: parseInt(noticeId), employeeId } },
      create: { noticeId: parseInt(noticeId), employeeId },
      update: {},
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 })
  }
}
