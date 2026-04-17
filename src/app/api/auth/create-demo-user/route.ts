import { NextRequest, NextResponse } from 'next/server'
import { createDemoUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const user = await createDemoUser({
      name,
      email,
      password,
      phone,
    })

    return NextResponse.json({
      success: true,
      message: 'Demo user created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'demo',
        moduleAccess: ['organization', 'hrms'],
      },
    })
  } catch (error: any) {
    console.error('Create demo user error:', error)
    
    // Handle unique constraint violation (duplicate email)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create demo user' },
      { status: 500 }
    )
  }
}