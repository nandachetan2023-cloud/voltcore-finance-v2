import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { sendOTPEmail } from '@/lib/services/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Generate a 6-digit OTP
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()

    // Check if user exists — either superadmin or tenant user
    let userName: string | undefined
    let userType: 'superadmin' | 'tenant' = 'tenant'

    const superAdmin = await superadminDb.superAdminUser.findUnique({
      where: { email: emailLower },
      select: { name: true, isActive: true },
    })

    if (superAdmin) {
      if (!superAdmin.isActive) {
        return NextResponse.json(
          { success: false, error: 'Account is inactive. Contact support.' },
          { status: 403 }
        )
      }
      userName = superAdmin.name
      userType = 'superadmin'
    } else {
      const tenantUser = await superadminDb.tenantUser.findFirst({
        where: { email: emailLower, isActive: true },
        select: { name: true },
      })

      if (!tenantUser) {
        // Don't reveal whether email exists — always return success
        return NextResponse.json({ success: true })
      }
      userName = tenantUser.name
      userType = 'tenant'
    }

    // Delete any existing unused OTPs for this email
    await superadminDb.passwordResetOTP.deleteMany({
      where: { email: emailLower, used: false },
    })

    // Generate OTP and store it
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await superadminDb.passwordResetOTP.create({
      data: {
        email: emailLower,
        otp,
        userType,
        expiresAt,
      },
    })

    // Send OTP email
    try {
      await sendOTPEmail(emailLower, otp, userName)
    } catch (emailErr: any) {
      console.error('Failed to send OTP email:', emailErr.message)
      // Delete the OTP we just created since email failed
      await superadminDb.passwordResetOTP.delete({ where: { id: (await superadminDb.passwordResetOTP.findFirst({ where: { email: emailLower, used: false }, orderBy: { createdAt: 'desc' } }))!.id } }).catch(() => {})
      return NextResponse.json(
        { success: false, error: `Email delivery failed: ${emailErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    )
  }
}
