import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Fetch current user's onboarding data + admin-provided employee data
export async function GET(request: NextRequest) {
  const userEmail = request.cookies.get('erp_user_email')?.value
  const tenantId = request.cookies.get('erp_tenant_id')?.value

  if (!userEmail || !tenantId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const user = await superadminDb.tenantUser.findFirst({
      where: { email: userEmail, tenantId },
      select: {
        id: true,
        employeeId: true,
        onboardingStatus: true,
        onboardingData: true,
        onboardingSubmittedAt: true,
        onboardingRejectionReason: true,
      } as any,
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Also fetch the employee record so the form knows which fields were set by admin
    let employeeData: Record<string, any> | null = null
    if ((user as any).employeeId) {
      try {
        const db = getDbForRequest(request)
        const employee = await db.employee.findUnique({
          where: { id: (user as any).employeeId as number },
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            maritalStatus: true,
            bloodGroup: true,
            fatherName: true,
            currentAddress: true,
            currentCity: true,
            currentState: true,
            currentPincode: true,
            permanentAddress: true,
            permanentCity: true,
            permanentState: true,
            permanentPincode: true,
            bankName: true,
            bankAccount: true,
            bankIfsc: true,
            panNumber: true,
            aadharNumber: true,
            uanNumber: true,
            esicNumber: true,
            emergencyContactName: true,
            emergencyContactRelation: true,
            emergencyContactPhone: true,
            departmentId: true,
            designationId: true,
            branchId: true,
            dateOfJoining: true,
            employmentType: true,
            employmentStatus: true,
            natureOfDesignation: true,
            monthlyGrossSalary: true,
          },
        })
        if (employee) {
          employeeData = employee as any
        }
      } catch (e) {
        console.warn('Could not fetch employee data for onboarding form:', e)
      }
    }

    return NextResponse.json({ success: true, data: { ...(user as any), employeeData } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch onboarding data' }, { status: 500 })
  }
}

// POST: Submit onboarding form
export async function POST(request: NextRequest) {
  const userEmail = request.cookies.get('erp_user_email')?.value
  const tenantId = request.cookies.get('erp_tenant_id')?.value

  if (!userEmail || !tenantId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { formData } = body

    if (!formData) {
      return NextResponse.json({ success: false, error: 'Form data is required' }, { status: 400 })
    }

    const user = await superadminDb.tenantUser.findFirst({
      where: { email: userEmail, tenantId },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if ((user as any).onboardingStatus !== 'pending' && (user as any).onboardingStatus !== 'rejected') {
      return NextResponse.json({ success: false, error: 'Onboarding form already submitted or not required' }, { status: 400 })
    }

    await superadminDb.tenantUser.update({
      where: { id: user.id },
      data: {
        onboardingStatus: 'submitted',
        onboardingData: formData,
        onboardingSubmittedAt: new Date(),
        onboardingRejectionReason: null,
      } as any,
    })

    // Notify admin that a joining form has been submitted
    try {
      const db = (await import('@/lib/db')).db
      await db.notification.create({
        data: {
          userId: 0,
          userEmail: '__admin_broadcast__',
          title: 'Joining Form Submitted — Approval Required',
          message: `${user.name} (${user.email}) has submitted their joining form and is awaiting your approval.`,
          type: 'info',
          entityType: 'onboarding',
          link: 'onboarding-approvals',
          isRead: false,
          createdAt: new Date(),
        },
      })
    } catch (e) {
      console.warn('Could not create onboarding notification:', e)
    }

    return NextResponse.json({ success: true, message: 'Onboarding form submitted successfully' })
  } catch (error) {
    console.error('Onboarding submit error:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit onboarding form' }, { status: 500 })
  }
}

// PUT: Admin approve/reject onboarding (called from user management)
export async function PUT(request: NextRequest) {
  const role = request.cookies.get('erp_user_role')?.value
  const tenantId = request.cookies.get('erp_tenant_id')?.value

  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  if (!tenantId && role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, action } = body // action: 'approve' | 'reject'

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'userId and action are required' }, { status: 400 })
    }

    const user = await superadminDb.tenantUser.findFirst({
      where: { id: userId, ...(tenantId ? { tenantId } : {}) },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (action === 'approve') {
      const formData: any = (user as any).onboardingData || {}

      await superadminDb.tenantUser.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'approved',
          onboardingApprovedAt: new Date(),
        } as any,
      })

      // Transfer uploaded documents to OnboardingTask so they appear in
      // Employee Documents and My Documents (same logic as onboarding-approvals)
      if ((user as any).employeeId && formData) {
        try {
          const db = getDbForRequest(request)
          const docFields: Record<string, string> = {
            docPanCard: 'PAN Card',
            docAadhar: 'Aadhar Card',
            docPassport: 'Passport',
            docVoterId: 'Voter ID / Driving License',
            docVaccineCert: 'Vaccine Certificate',
            docEducationCert: 'Education Certificate',
            docPrevEmployment: 'Previous Employment Proof',
            docResume: 'Resume / CV',
            docBankProof: 'Bank Account Proof',
            docPhotograph: 'Passport Size Photograph',
            docFamilyPhoto: 'Family Photo (ESI)',
          }

          const uploadedDocs = Object.entries(docFields).filter(([field]) => {
            const f = formData[field]
            return f && f.data && f.data.includes(',')
          })

          if (uploadedDocs.length > 0) {
            let template = await db.checklistTemplate.findFirst({
              where: { name: 'Joining Documents' },
              select: { id: true },
            })
            if (!template) {
              template = await db.checklistTemplate.create({
                data: {
                  name: 'Joining Documents',
                  description: 'Documents uploaded during employee onboarding joining form',
                  isActive: true,
                  updatedAt: new Date(),
                },
              })
            }

            let checklist = await db.onboardingChecklist.findFirst({
              where: { employeeId: (user as any).employeeId, templateId: template.id },
            })
            if (!checklist) {
              checklist = await db.onboardingChecklist.create({
                data: {
                  employeeId: (user as any).employeeId,
                  templateId: template.id,
                  status: 'completed',
                  startedAt: new Date(),
                  completedAt: new Date(),
                  updatedAt: new Date(),
                },
              })
            }

            for (const [field, docTitle] of uploadedDocs) {
              const fileData = formData[field]
              const base64 = fileData.data.split(',')[1]
              if (!base64) continue
              const buffer = Buffer.from(base64, 'base64')

              let templateTask = await db.checklistTemplateTask.findFirst({
                where: { templateId: template.id, title: docTitle },
              })
              if (!templateTask) {
                templateTask = await db.checklistTemplateTask.create({
                  data: {
                    templateId: template.id,
                    title: docTitle,
                    description: 'Uploaded during joining form',
                    assignedRole: 'hr',
                    requiresDocument: true,
                    documentNecessary: true,
                    order: 99,
                  },
                })
              }

              const existingTask = await db.onboardingTask.findFirst({
                where: { checklistId: checklist.id, templateTaskId: templateTask.id },
              })
              if (existingTask) {
                await db.onboardingTask.update({
                  where: { id: existingTask.id },
                  data: {
                    status: 'completed',
                    documentPath: fileData.name,
                    documentData: buffer,
                    documentMimeType: fileData.type || 'application/octet-stream',
                    completedAt: new Date(),
                  },
                })
              } else {
                await db.onboardingTask.create({
                  data: {
                    checklistId: checklist.id,
                    templateTaskId: templateTask.id,
                    status: 'completed',
                    documentPath: fileData.name,
                    documentData: buffer,
                    documentMimeType: fileData.type || 'application/octet-stream',
                    completedAt: new Date(),
                  },
                })
              }
            }
          }
        } catch (e) {
          console.warn('Document transfer failed during onboarding approval:', e)
        }
      }

      return NextResponse.json({ success: true, message: 'Onboarding approved' })
    } else if (action === 'reject') {
      // Reset to pending so user can re-fill
      await superadminDb.tenantUser.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'pending',
          onboardingData: null,
          onboardingSubmittedAt: null,
        } as any,
      })
      return NextResponse.json({ success: true, message: 'Onboarding rejected — user can re-submit' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Onboarding approval error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process onboarding action' }, { status: 500 })
  }
}
