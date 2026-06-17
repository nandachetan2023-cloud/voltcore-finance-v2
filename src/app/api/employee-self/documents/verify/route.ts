import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/employee-self/documents/verify
// Body: { taskId: number, action: "confirm" | "dispute", remark?: string }
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    if (!cookieEmpId) {
      return NextResponse.json({ success: false, error: 'Not linked to an employee record' }, { status: 400 })
    }
    const employeeId = parseInt(cookieEmpId)

    const { taskId, action, remark } = await request.json()
    if (!taskId || !action || !['confirm', 'dispute'].includes(action)) {
      return NextResponse.json({ success: false, error: 'taskId and action ("confirm"|"dispute") required' }, { status: 400 })
    }

    // Verify the task belongs to this employee
    const task = await db.onboardingTask.findUnique({
      where: { id: taskId },
      include: { checklist: { select: { employeeId: true } } },
    })
    if (!task || task.checklist.employeeId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Task not found or not yours' }, { status: 404 })
    }
    if (!task.documentPath) {
      return NextResponse.json({ success: false, error: 'No document on this task' }, { status: 400 })
    }

    const updateData: any = {
      employeeVerifiedAt: action === 'confirm' ? new Date() : null,
      employeeRemark: action === 'dispute' ? (remark || null) : null,
    }

    await db.onboardingTask.update({ where: { id: taskId }, data: updateData })

    return NextResponse.json({ success: true, data: { verified: action === 'confirm', taskId } })
  } catch (e) {
    console.error('Document verify error:', e)
    return NextResponse.json({ success: false, error: 'Failed to process verification' }, { status: 500 })
  }
}
