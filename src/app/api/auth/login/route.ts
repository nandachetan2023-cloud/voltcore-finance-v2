import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeCode, password } = body

    if (!employeeCode || !password) {
      return NextResponse.json(
        { success: false, error: 'User ID and password are required' },
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

    const { user, error } = await authenticateUser(employeeCode, password)

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
    }

    response.cookies.set('erp_user_role', user.role, cookieOpts)

    if (user.dbUrl) {
      response.cookies.set('erp_tenant_db', encodeURIComponent(user.dbUrl), cookieOpts)
    } else {
      response.cookies.delete('erp_tenant_db')
    }

    if (user.tenantId) {
      response.cookies.set('erp_tenant_id', user.tenantId, cookieOpts)
    } else {
      response.cookies.delete('erp_tenant_id')
    }

    response.cookies.set('erp_allowed_modules', user.allowedModules, cookieOpts)
    response.cookies.set('erp_user_email', user.email, cookieOpts)

    if (user.employeeId) {
      response.cookies.set('erp_employee_id', String(user.employeeId), cookieOpts)
    } else {
      response.cookies.delete('erp_employee_id')
    }

    return response
  } catch (error: any) {
    console.error('Login error:', error)

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
