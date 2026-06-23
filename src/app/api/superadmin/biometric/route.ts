import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { PrismaClient } from '@prisma/client'

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

    // Load the existing config so we can detect a siteId change
    const existing = await superadminDb.biometricSiteConfig.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 })

    const data: any = { ...rest }
    if (password && password.trim()) data.password = password

    const newSiteId: string | undefined = typeof rest.siteId === 'string' ? rest.siteId.trim() : undefined
    const siteIdChanged = !!newSiteId && newSiteId !== existing.siteId

    if (siteIdChanged) {
      // Guard: don't collide with another site config for the same tenant
      const clash = await superadminDb.biometricSiteConfig.findFirst({
        where: { tenantId: existing.tenantId, siteId: newSiteId, id: { not: id } },
      })
      if (clash) {
        return NextResponse.json({ success: false, error: `Site ID "${newSiteId}" already exists for this tenant` }, { status: 409 })
      }
    }

    const config = await superadminDb.biometricSiteConfig.update({ where: { id }, data })

    // Cascade the siteId rename into the tenant's DB so existing punch/sync
    // logs keep resolving to the right site (otherwise they orphan to the raw id).
    let cascade: { rawLogs: number; syncLogs: number } | null = null
    if (siteIdChanged) {
      const tenant = await superadminDb.tenant.findUnique({ where: { id: existing.tenantId } })
      if (tenant?.dbUrl) {
        const tenantDb = new PrismaClient({ datasources: { db: { url: tenant.dbUrl } } })
        try {
          const raw = await tenantDb.biometricRawLog.updateMany({
            where: { siteId: existing.siteId },
            data: { siteId: newSiteId! },
          })
          const sync = await tenantDb.biometricSyncLog.updateMany({
            where: { siteId: existing.siteId },
            data: { siteId: newSiteId! },
          })
          cascade = { rawLogs: raw.count, syncLogs: sync.count }
        } catch (err) {
          console.error('[Biometric config] Failed to cascade siteId rename to tenant DB:', err)
        } finally {
          await tenantDb.$disconnect()
        }
      }
    }

    const { password: _, ...safe } = config
    return NextResponse.json({ success: true, data: safe, cascade })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'Site ID already exists for this tenant' }, { status: 409 })
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
