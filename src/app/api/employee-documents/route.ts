import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Aggregate all documents per employee
// - Onboarding task documents (documentPath stored in OnboardingTask)
// - Certificates (filePath stored in Certification, linked by empId = employeeCode)
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    // Fetch all active employees with basic info
    const employees = await db.employee.findMany({
      where: {
        isDeleted: false,
        ...(employeeId ? { id: parseInt(employeeId) } : {}),
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        Department: { select: { name: true } },
        Designation: { select: { name: true } },
        employmentStatus: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    })

    // Fetch onboarding tasks that have documents
    const onboardingDocs = await db.onboardingTask.findMany({
      where: {
        documentPath: { not: null },
        checklist: {
          ...(employeeId ? { employeeId: parseInt(employeeId) } : {}),
        },
      },
      select: {
        id: true,
        documentPath: true,
        documentMimeType: true,
        completedAt: true,
        checklist: {
          select: {
            employeeId: true,
            Employee: { select: { employeeCode: true } },
          },
        },
        templateTask: { select: { title: true, description: true } },
      },
    })

    // Fetch certifications
    const certifications = await db.certification.findMany({
      where: {
        filePath: { not: null },
        ...(employeeId
          ? {
              checklist: undefined, // not filtered by id here — filter below by empId
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build a map: employeeCode → certs
    const certsByCode: Record<string, any[]> = {}
    for (const cert of certifications) {
      if (!cert.empId) continue
      if (!certsByCode[cert.empId]) certsByCode[cert.empId] = []
      certsByCode[cert.empId].push(cert)
    }

    // Build a map: employeeId → onboarding docs
    const onboardingByEmpId: Record<number, any[]> = {}
    for (const doc of onboardingDocs) {
      const empId = doc.checklist?.employeeId
      if (!empId) continue
      if (!onboardingByEmpId[empId]) onboardingByEmpId[empId] = []
      onboardingByEmpId[empId].push({
        id: doc.id,
        type: 'onboarding',
        title: doc.templateTask?.title || 'Onboarding Document',
        description: doc.templateTask?.description || null,
        fileName: doc.documentPath,
        mimeType: doc.documentMimeType,
        uploadedAt: doc.completedAt,
        downloadUrl: `/api/onboarding/document?taskId=${doc.id}`,
      })
    }

    // Merge into per-employee result
    const result = employees.map(emp => {
      const onboardingDocsList = onboardingByEmpId[emp.id] || []
      const certsList = (certsByCode[emp.employeeCode] || []).map((c: any) => ({
        id: c.id,
        type: 'certificate',
        title: c.name,
        description: `Issued by ${c.issuedBy} · ${c.status}`,
        fileName: c.filePath?.split('/').pop() || c.filePath,
        mimeType: null,
        uploadedAt: c.issueDate,
        expiryDate: c.expiryDate,
        status: c.status,
        downloadUrl: c.filePath,
      }))

      return {
        ...emp,
        documents: [...onboardingDocsList, ...certsList],
        onboardingCount: onboardingDocsList.length,
        certCount: certsList.length,
      }
    })

    // If single employee requested, return just that
    if (employeeId) {
      return NextResponse.json({ success: true, data: result[0] || null })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    console.error('employee-documents error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch employee documents' }, { status: 500 })
  }
}
