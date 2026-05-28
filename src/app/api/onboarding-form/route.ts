import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

// GET: Fetch current user's onboarding data
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
        onboardingStatus: true,
        onboardingData: true,
        onboardingSubmittedAt: true,
        onboardingRejectionReason: true,
      } as any,
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
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
          link: '',
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
      await superadminDb.tenantUser.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'approved',
          onboardingApprovedAt: new Date(),
        } as any,
      })
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
