import { NextRequest, NextResponse } from 'next/server'
import { demoDb } from '@/lib/db'
import { createDemoUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - list all demo users (admin only)
export async function GET() {
  try {
    const users = await demoDb.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: users.map(u => ({ ...u, role: 'demo', moduleAccess: ['organization', 'hrms'] })),
    })
  } catch (error) {
    console.error('List demo users error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch demo users' },
      { status: 500 }
    )
  }
}

// POST - create a new demo user (admin only)
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

    const user = await createDemoUser({ name, email, password, phone })

    return NextResponse.json({
      success: true,
      message: 'Demo user created successfully',
      data: { ...user, role: 'demo', moduleAccess: ['organization', 'hrms'] },
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Email already exists in demo database' },
        { status: 409 }
      )
    }
    console.error('Create demo user error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create demo user' },
      { status: 500 }
    )
  }
}

// PATCH - toggle demo user active status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, isActive } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await demoDb.user.update({
      where: { id },
      data: { isActive, updatedAt: new Date() },
      select: { id: true, name: true, email: true, isActive: true },
    })

    return NextResponse.json({
      success: true,
      message: `Demo user ${isActive ? 'activated' : 'deactivated'}`,
      data: user,
    })
  } catch (error) {
    console.error('Update demo user error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update demo user' },
      { status: 500 }
    )
  }
}
