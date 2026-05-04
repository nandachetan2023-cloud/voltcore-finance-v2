import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, OTP, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()

    // Find the OTP record
    const otpRecord = await superadminDb.passwordResetOTP.findFirst({
      where: {
        email: emailLower,
        otp: otp.trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password based on user type
    if (otpRecord.userType === 'superadmin') {
      await superadminDb.superAdminUser.update({
        where: { email: emailLower },
        data: { password: hashedPassword },
      })
    } else {
      // Update all tenant users with this email (could be in multiple tenants)
      await superadminDb.tenantUser.updateMany({
        where: { email: emailLower },
        data: { password: hashedPassword },
      })
    }

    // Mark OTP as used
    await superadminDb.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    })

    // Clean up old OTPs for this email
    await superadminDb.passwordResetOTP.deleteMany({
      where: { email: emailLower, used: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
}
