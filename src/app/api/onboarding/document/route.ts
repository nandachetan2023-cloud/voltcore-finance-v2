import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// POST: Upload document for an onboarding task
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const formData = await request.formData()
    const taskId = formData.get('taskId')
    const file = formData.get('file') as File | null

    if (!taskId || !file) {
      return NextResponse.json({ success: false, error: 'taskId and file are required' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'File type not allowed. Use PDF, JPG, PNG, or Word documents.' }, { status: 415 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const task = await db.onboardingTask.update({
      where: { id: parseInt(taskId.toString()) },
      data: {
        documentPath: file.name,
        documentData: buffer,
        documentMimeType: file.type,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    // Check if all tasks in the checklist are done
    const allTasks = await db.onboardingTask.findMany({ where: { checklistId: task.checklistId } })
    const allDone = allTasks.every(t => t.status === 'completed' || t.status === 'skipped')
    if (allDone) {
      await db.onboardingChecklist.update({
        where: { id: task.checklistId },
        data: { status: 'completed', completedAt: new Date(), updatedAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      data: { taskId: task.id, fileName: file.name, size: file.size, mimeType: file.type },
    })
  } catch (e) {
    console.error('Document upload error:', e)
    return NextResponse.json({ success: false, error: 'Failed to upload document' }, { status: 500 })
  }
}

// GET: Download document for an onboarding task
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'taskId required' }, { status: 400 })
    }

    const task = await db.onboardingTask.findUnique({
      where: { id: parseInt(taskId) },
      select: { documentData: true, documentPath: true, documentMimeType: true },
    })

    if (!task?.documentData) {
      return NextResponse.json({ success: false, error: 'No document found for this task' }, { status: 404 })
    }

    return new NextResponse(task.documentData, {
      headers: {
        'Content-Type': task.documentMimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${task.documentPath || 'document'}"`,
        'Content-Length': task.documentData.length.toString(),
      },
    })
  } catch (e) {
    console.error('Document download error:', e)
    return NextResponse.json({ success: false, error: 'Failed to download document' }, { status: 500 })
  }
}

// DELETE: Remove document from a task
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { taskId } = await request.json()
    if (!taskId) return NextResponse.json({ success: false, error: 'taskId required' }, { status: 400 })

    await db.onboardingTask.update({
      where: { id: parseInt(taskId) },
      data: { documentData: null, documentPath: null, documentMimeType: null },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to remove document' }, { status: 500 })
  }
}
