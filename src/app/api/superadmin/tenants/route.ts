import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

// GET: list all tenants
export async function GET() {
  try {
    const tenants = await superadminDb.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true, biometric: true } } },
    })
    return NextResponse.json({ success: true, data: tenants })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: 'Failed to fetch tenants' }, { status: 500 })
  }
}

// POST: create tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, dbUrl, notes, logoUrl, maxAccounts, enabledModules } = body
    if (!name || !slug || !dbUrl) {
      return NextResponse.json({ success: false, error: 'name, slug and dbUrl are required' }, { status: 400 })
    }
    const tenant = await superadminDb.tenant.create({
      data: {
        name, slug: slug.toLowerCase().replace(/\s+/g, '-'), dbUrl,
        notes: notes || '', status: 'active', logoUrl: logoUrl || null,
        maxAccounts: maxAccounts != null ? parseInt(String(maxAccounts)) || 0 : 0,
        enabledModules: enabledModules || 'all',
      } as any,
    })
    return NextResponse.json({ success: true, data: tenant }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'Slug already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create tenant' }, { status: 500 })
  }
}

// PUT: update tenant
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    if (data.maxAccounts !== undefined) data.maxAccounts = parseInt(String(data.maxAccounts)) || 0
    const tenant = await superadminDb.tenant.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: tenant })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update tenant' }, { status: 500 })
  }
}

// DELETE: delete tenant
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await superadminDb.tenant.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete tenant' }, { status: 500 })
  }
}
