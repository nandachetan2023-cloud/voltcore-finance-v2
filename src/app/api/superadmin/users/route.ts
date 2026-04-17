import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// GET: list all tenant users (optionally filter by tenantId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const users = await superadminDb.tenantUser.findMany({
      where: tenantId ? { tenantId } : {},
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    })
    // Never return password
    return NextResponse.json({
      success: true,
      data: users.map(({ password: _, ...u }) => u),
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST: create tenant user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, name, email, password, phone, allowedModules } = body
    if (!tenantId || !name || !email || !password) {
      return NextResponse.json({ success: false, error: 'tenantId, name, email and password are required' }, { status: 400 })
    }
    const hash = await bcrypt.hash(password, 12)
    const user = await superadminDb.tenantUser.create({
      data: {
        tenantId, name, email,
        password: hash,
        phone: phone || '',
        allowedModules: allowedModules || 'all',
        createdBySuperadmin: true,  // superadmin-created users are exempt from maxUsers limit
      },
    })
    const { password: _, ...safe } = user
    return NextResponse.json({ success: true, data: safe }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'Email already exists for this tenant' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 })
  }
}

// PUT: update tenant user (name, phone, allowedModules, isActive, or reset password)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, password, ...rest } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const data: any = { ...rest }
    if (password && password.trim()) {
      data.password = await bcrypt.hash(password, 12)
    }
    const user = await superadminDb.tenantUser.update({ where: { id }, data })
    const { password: _, ...safe } = user
    return NextResponse.json({ success: true, data: safe })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE: delete tenant user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await superadminDb.tenantUser.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 })
  }
}
