import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    if (!cookieEmpId) {
      return NextResponse.json({ success: false, error: 'Not linked to an employee record' }, { status: 400 })
    }
    const employeeId = parseInt(cookieEmpId)

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { employeeCode: true },
    })
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })

    // Onboarding documents
    const onboardingDocs = await db.onboardingTask.findMany({
      where: { checklist: { employeeId }, documentPath: { not: null } },
      select: {
        id: true, documentPath: true, documentMimeType: true, completedAt: true,
        templateTask: { select: { title: true, description: true } },
      },
    })

    // Certificates
    const certs = await db.certification.findMany({
      where: { empId: employee.employeeCode, filePath: { not: null } },
      orderBy: { createdAt: 'desc' },
    })

    const documents = [
      ...onboardingDocs.map(d => ({
        id: d.id,
        type: 'onboarding' as const,
        title: d.templateTask?.title || 'Onboarding Document',
        description: d.templateTask?.description || null,
        fileName: d.documentPath,
        mimeType: d.documentMimeType,
        uploadedAt: d.completedAt,
        downloadUrl: `/api/onboarding/document?taskId=${d.id}`,
      })),
      ...certs.map((c: any) => ({
        id: c.id,
        type: 'certificate' as const,
        title: c.name,
        description: `Issued by ${c.issuedBy} · ${c.status}`,
        fileName: c.filePath?.split('/').pop() || c.filePath,
        mimeType: null,
        uploadedAt: c.issueDate,
        expiryDate: c.expiryDate,
        status: c.status,
        downloadUrl: c.filePath,
      })),
    ]

    return NextResponse.json({ success: true, data: documents })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch documents' }, { status: 500 })
  }
}
