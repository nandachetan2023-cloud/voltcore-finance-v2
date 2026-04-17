import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
    }

    const sa = await superadminDb.superAdminUser.findUnique({ where: { email } })
    if (!sa || !sa.isActive) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, sa.password)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const response = NextResponse.json({
      success: true,
      user: { id: sa.id, name: sa.name, email: sa.email, role: 'superadmin' },
    })

    const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 }
    response.cookies.set('erp_superadmin_auth', sa.id, opts)

    return response
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 })
  }
}
