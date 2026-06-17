import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeCode, oldPassword, newPassword } = body

    if (!employeeCode) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!oldPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password is required' },
        { status: 400 }
      )
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Find user by employeeCode or email
    const loginId = employeeCode
    const loginIdLower = loginId.toLowerCase()
    let tenantUser = await superadminDb.tenantUser.findFirst({
      where: { employeeCode: loginId, isActive: true },
    })
    if (!tenantUser) {
      tenantUser = await superadminDb.tenantUser.findFirst({
        where: { email: loginIdLower, isActive: true },
      })
    }

    if (!tenantUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify old password
    const valid = await bcrypt.compare(oldPassword, tenantUser.password)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash and update new password
    const hash = await bcrypt.hash(newPassword, 12)
    await superadminDb.tenantUser.update({
      where: { id: tenantUser.id },
      data: { password: hash },
    })

    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to change password. Please try again.' },
      { status: 500 }
    )
  }
}
