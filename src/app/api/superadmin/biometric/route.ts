import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

// GET: list biometric configs (optionally filter by tenantId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const configs = await superadminDb.biometricSiteConfig.findMany({
      where: tenantId ? { tenantId } : {},
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'asc' },
    })
    // Never return password
    return NextResponse.json({
      success: true,
      data: configs.map(({ password: _, ...c }) => c),
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch biometric configs' }, { status: 500 })
  }
}

// POST: create biometric config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, siteId, siteName, baseUrl, corporateId, username, password } = body
    if (!tenantId || !siteId || !siteName || !corporateId || !username || !password) {
      return NextResponse.json({ success: false, error: 'tenantId, siteId, siteName, corporateId, username and password are required' }, { status: 400 })
    }
    const config = await superadminDb.biometricSiteConfig.create({
      data: {
        tenantId, siteId, siteName,
        baseUrl: baseUrl || 'https://api.etimeoffice.com/api',
        corporateId, username, password,
        isActive: true,
      },
    })
    const { password: _, ...safe } = config
    return NextResponse.json({ success: true, data: safe }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'Site ID already exists for this tenant' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create biometric config' }, { status: 500 })
  }
}

// PUT: update biometric config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, password, ...rest } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const data: any = { ...rest }
    if (password && password.trim()) data.password = password
    const config = await superadminDb.biometricSiteConfig.update({ where: { id }, data })
    const { password: _, ...safe } = config
    return NextResponse.json({ success: true, data: safe })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update biometric config' }, { status: 500 })
  }
}

// DELETE: delete biometric config
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await superadminDb.biometricSiteConfig.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete biometric config' }, { status: 500 })
  }
}
