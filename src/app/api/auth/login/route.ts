import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { user, error } = await authenticateUser(email, password)

    if (!user) {
      return NextResponse.json(
        { success: false, error: error || 'Invalid credentials' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true, user })

    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    }

    // Role cookie (superadmin | admin | demo)
    response.cookies.set('erp_user_role', user.role, cookieOpts)

    // Tenant DB URL cookie (empty for superadmin)
    if (user.dbUrl) {
      response.cookies.set('erp_tenant_db', encodeURIComponent(user.dbUrl), cookieOpts)
    } else {
      response.cookies.delete('erp_tenant_db')
    }

    // Tenant ID cookie (for biometric and other superadmin-DB lookups)
    if (user.tenantId) {
      response.cookies.set('erp_tenant_id', user.tenantId, cookieOpts)
    } else {
      response.cookies.delete('erp_tenant_id')
    }

    // Allowed modules cookie (for frontend store)
    response.cookies.set('erp_allowed_modules', user.allowedModules, cookieOpts)

    // User email cookie (for notification lookup)
    response.cookies.set('erp_user_email', user.email, cookieOpts)

    // Employee ID cookie (for self-service modules)
    if (user.employeeId) {
      response.cookies.set('erp_employee_id', String(user.employeeId), cookieOpts)
    } else {
      response.cookies.delete('erp_employee_id')
    }

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
