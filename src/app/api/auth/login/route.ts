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

    // Check if SUPERADMIN_DATABASE_URL is configured
    if (!process.env.SUPERADMIN_DATABASE_URL) {
      console.error('SUPERADMIN_DATABASE_URL is not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
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

    // Session cookies — no maxAge means they expire when browser is closed.
    // Client-side inactivity timer handles the 30-minute auto-logout.
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      // No maxAge → session cookie → cleared on browser close
    }

    // JS-readable session marker (NOT httpOnly). Like the others it's a session
    // cookie, so a full browser close clears it. The client checks for it on load
    // and, if it's gone while localStorage still holds the user, forces a logout —
    // this is what actually sends a returning user back to the login screen.
    response.cookies.set('erp_session', '1', { sameSite: 'lax', path: '/' })

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
  } catch (error: any) {
    console.error('Login error:', error)
    
    // Return specific error messages for common issues
    if (error.code === 'P2021') {
      return NextResponse.json(
        { success: false, error: 'Database not configured. Please run database migrations.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
