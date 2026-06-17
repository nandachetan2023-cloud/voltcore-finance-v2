import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 10 * 1024 * 1024
const DOC_TYPES = [
  'PAN Card', 'Aadhar Card', 'Passport', 'Voter ID / Driving License',
  'Vaccine Certificate', 'Education Certificate', 'Previous Employment Proof',
  'Resume / CV', 'Bank Account Proof', 'Passport Size Photograph', 'Family Photo (ESI)',
]

// POST: Upload a document for an existing employee (admin only)
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const role = request.cookies.get('erp_user_role')?.value
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const employeeId = formData.get('employeeId')
    const docType = formData.get('docType') as string
    const file = formData.get('file') as File | null

    if (!employeeId || !docType || !file) {
      return NextResponse.json({ success: false, error: 'employeeId, docType, and file are required' }, { status: 400 })
    }
    if (!DOC_TYPES.includes(docType)) {
      return NextResponse.json({ success: false, error: `Invalid document type. Allowed: ${DOC_TYPES.join(', ')}` }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
    }
    const allowedTypes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'File type not allowed. Use PDF, JPG, PNG, or Word documents.' }, { status: 415 })
    }

    const empId = parseInt(employeeId.toString())

    // Verify employee exists
    const employee = await db.employee.findUnique({ where: { id: empId } })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    // Get or create "Employee Documents" template
    let template = await db.checklistTemplate.findFirst({
      where: { name: 'Employee Documents' },
    })
    if (!template) {
      template = await db.checklistTemplate.create({
        data: {
          name: 'Employee Documents',
          description: 'General documents uploaded by admin for employees',
          isActive: true,
          updatedAt: new Date(),
        },
      })
    }

    // Get or create a template task for this document type
    let templateTask = await db.checklistTemplateTask.findFirst({
      where: { templateId: template.id, title: docType },
    })
    if (!templateTask) {
      templateTask = await db.checklistTemplateTask.create({
        data: {
          templateId: template.id,
          title: docType,
          description: `Admin-uploaded ${docType}`,
          assignedRole: 'hr',
          requiresDocument: true,
          documentNecessary: false,
          order: 99,
          updatedAt: new Date(),
        },
      })
    }

    // Get or create a checklist instance for this employee
    let checklist = await db.onboardingChecklist.findFirst({
      where: { employeeId: empId, templateId: template.id },
    })
    if (!checklist) {
      checklist = await db.onboardingChecklist.create({
        data: {
          employeeId: empId,
          templateId: template.id,
          status: 'in_progress',
          startedAt: new Date(),
          updatedAt: new Date(),
        },
      })
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upsert the task with document data
    const existingTask = await db.onboardingTask.findFirst({
      where: { checklistId: checklist.id, templateTaskId: templateTask.id },
    })

    let task
    if (existingTask) {
      task = await db.onboardingTask.update({
        where: { id: existingTask.id },
        data: {
          status: 'completed',
          documentPath: file.name,
          documentData: buffer,
          documentMimeType: file.type,
          completedAt: new Date(),
        },
      })
    } else {
      task = await db.onboardingTask.create({
        data: {
          checklistId: checklist.id,
          templateTaskId: templateTask.id,
          status: 'completed',
          documentPath: file.name,
          documentData: buffer,
          documentMimeType: file.type,
          completedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { taskId: task.id, fileName: file.name, size: file.size, mimeType: file.type, docType },
    })
  } catch (e) {
    console.error('Employee document upload error:', e)
    return NextResponse.json({ success: false, error: 'Failed to upload document' }, { status: 500 })
  }
}

// DELETE: Remove a document by taskId (admin only)
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  const role = request.cookies.get('erp_user_role')?.value
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { taskId } = await request.json()
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'taskId required' }, { status: 400 })
    }

    await db.onboardingTask.update({
      where: { id: parseInt(taskId) },
      data: { documentData: null, documentPath: null, documentMimeType: null, status: 'pending', completedAt: null },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Employee document delete error:', e)
    return NextResponse.json({ success: false, error: 'Failed to remove document' }, { status: 500 })
  }
}
