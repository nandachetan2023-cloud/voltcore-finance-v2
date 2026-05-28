import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all onboarding form submissions (pending + submitted + recently approved/rejected)
export async function GET(request: NextRequest) {
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  const role = request.cookies.get('erp_user_role')?.value

  if (!tenantId || (role !== 'admin' && role !== 'superadmin')) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // optional filter

    const where: any = { tenantId }
    if (status) {
      where.onboardingStatus = status
    } else {
      where.onboardingStatus = { in: ['pending', 'submitted', 'rejected'] }
    }

    const users = await superadminDb.tenantUser.findMany({
      where,
      orderBy: { onboardingSubmittedAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        onboardingStatus: true,
        onboardingData: true,
        onboardingSubmittedAt: true,
        onboardingApprovedAt: true,
        onboardingRejectionReason: true,
        createdAt: true,
      } as any,
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Onboarding approvals fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

// POST: Approve or reject an onboarding form submission
// On approve: copy form fields → employee record
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  const role = request.cookies.get('erp_user_role')?.value

  if (!tenantId || (role !== 'admin' && role !== 'superadmin')) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, action, rejectionReason } = body // action: 'approve' | 'reject'

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'userId and action are required' }, { status: 400 })
    }

    const user = await superadminDb.tenantUser.findFirst({
      where: { id: userId, tenantId },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if ((user as any).onboardingStatus !== 'submitted') {
      return NextResponse.json({ success: false, error: `User onboarding status is "${(user as any).onboardingStatus}", not "submitted"` }, { status: 400 })
    }

    if (action === 'reject') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 })
      }
      await superadminDb.tenantUser.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'rejected',
          onboardingRejectionReason: rejectionReason.trim(),
        } as any,
      })
      return NextResponse.json({ success: true, message: 'Onboarding rejected. User will be asked to re-submit.' })
    }

    if (action === 'approve') {
      const formData: any = (user as any).onboardingData || {}
      if (!user.employeeId) {
        return NextResponse.json({ success: false, error: 'No linked employee record' }, { status: 400 })
      }

      // Copy form data → employee record
      const updateData: any = {
        updatedAt: new Date(),
      }

      // Personal
      if (formData.firstName) updateData.firstName = formData.firstName
      if (formData.middleName !== undefined) updateData.middleName = formData.middleName || null
      if (formData.lastName) updateData.lastName = formData.lastName
      if (formData.dateOfBirth) updateData.dateOfBirth = new Date(formData.dateOfBirth)
      if (formData.gender) updateData.gender = formData.gender.toLowerCase()
      if (formData.maritalStatus) updateData.maritalStatus = formData.maritalStatus.toLowerCase()
      if (formData.bloodGroup) updateData.bloodGroup = formData.bloodGroup
      if (formData.fatherName) updateData.fatherName = formData.fatherName

      // Address (Present)
      const presentParts = [formData.presentDoorNo, formData.presentBuilding, formData.presentStreet, formData.presentLocation].filter(Boolean)
      if (presentParts.length) updateData.currentAddress = presentParts.join(', ')
      if (formData.presentCity) updateData.currentCity = formData.presentCity
      if (formData.presentState) updateData.currentState = formData.presentState
      if (formData.presentPincode) updateData.currentPincode = formData.presentPincode

      // Address (Permanent)
      const permParts = [formData.permanentDoorNo, formData.permanentBuilding, formData.permanentStreet, formData.permanentLocation].filter(Boolean)
      if (permParts.length) updateData.permanentAddress = permParts.join(', ')
      if (formData.permanentCity) updateData.permanentCity = formData.permanentCity
      if (formData.permanentState) updateData.permanentState = formData.permanentState
      if (formData.permanentPincode) updateData.permanentPincode = formData.permanentPincode

      // Bank & statutory
      if (formData.bankName) updateData.bankName = formData.bankName
      if (formData.bankAccount) updateData.bankAccount = formData.bankAccount
      if (formData.bankIfsc) updateData.bankIfsc = formData.bankIfsc
      if (formData.panNumber) updateData.panNumber = formData.panNumber
      if (formData.aadharNumber) updateData.aadharNumber = formData.aadharNumber
      if (formData.uanNumber) updateData.uanNumber = formData.uanNumber
      if (formData.esicNumber) updateData.esicNumber = formData.esicNumber

      // Emergency contact (using nominee as a fallback)
      if (formData.nomineeName) updateData.emergencyContactName = formData.nomineeName
      if (formData.nomineeRelation) updateData.emergencyContactRelation = formData.nomineeRelation

      await db.employee.update({
        where: { id: user.employeeId },
        data: updateData,
      })

      // Mark user as approved
      await superadminDb.tenantUser.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'approved',
          onboardingApprovedAt: new Date(),
          onboardingRejectionReason: null,
          phone: formData.phone || (user as any).phone || '',
        } as any,
      })

      // Update employee phone too if provided
      if (formData.phone) {
        await db.employee.update({
          where: { id: user.employeeId },
          data: { phone: formData.phone, updatedAt: new Date() },
        }).catch(() => {})
      }

      // Save uploaded documents to OnboardingTask records so they appear in
      // Employee Documents (admin) and My Documents (employee self-service)
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

      // Only process if there are actual uploaded files
      const uploadedDocs = Object.entries(docFields).filter(([field]) => {
        const f = formData[field]
        return f && f.data && f.data.includes(',')
      })

      if (uploadedDocs.length > 0) {
        // Get or create a "Joining Documents" template
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

        // Get or create a checklist instance for this employee
        let checklist = await db.onboardingChecklist.findFirst({
          where: { employeeId: user.employeeId, templateId: template.id },
        })
        if (!checklist) {
          checklist = await db.onboardingChecklist.create({
            data: {
              employeeId: user.employeeId,
              templateId: template.id,
              status: 'completed',
              startedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          })
        }

        // Save each uploaded document as an OnboardingTask
        for (const [field, docTitle] of uploadedDocs) {
          const fileData = formData[field]
          const base64 = fileData.data.split(',')[1]
          if (!base64) continue
          const buffer = Buffer.from(base64, 'base64')

          // Get or create a template task for this document type
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
                updatedAt: new Date(),
              },
            })
          }

          // Upsert the task with document data
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

      return NextResponse.json({ success: true, message: 'Onboarding approved. Employee record and documents updated.' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Onboarding approval error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to process approval' }, { status: 500 })
  }
}
