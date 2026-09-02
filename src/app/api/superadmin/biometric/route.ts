import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { getClientForUrl } from '@/lib/db'

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

    const newSiteName: string | undefined = typeof rest.siteName === 'string' ? rest.siteName.trim() : undefined
    const siteNameChanged = !!newSiteName && newSiteName !== existing.siteName

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

    // Cascade renames into the tenant's DB:
    //  - siteId  → punch/sync logs, so they keep resolving to the right site
    //  - siteName → the matching Branch row, so every site dropdown shows the
    //    new name immediately instead of keeping the stale one alongside it
    let cascade: { rawLogs: number; syncLogs: number; branchRenamed: boolean } | null = null
    if (siteIdChanged || siteNameChanged) {
      const tenant = await superadminDb.tenant.findUnique({ where: { id: existing.tenantId } })
      if (tenant?.dbUrl) {
        const tenantDb = getClientForUrl(tenant.dbUrl)
        let rawCount = 0
        let syncCount = 0
        let branchRenamed = false

        if (siteIdChanged) {
          try {
            const raw = await tenantDb.biometricRawLog.updateMany({
              where: { siteId: existing.siteId },
              data: { siteId: newSiteId! },
            })
            const sync = await tenantDb.biometricSyncLog.updateMany({
              where: { siteId: existing.siteId },
              data: { siteId: newSiteId! },
            })
            rawCount = raw.count
            syncCount = sync.count
          } catch (err) {
            console.error('[Biometric config] Failed to cascade siteId rename to tenant DB:', err)
          }
        }

        // Branch rows are tagged "Site ID: <siteId>" by the /api/branches sync.
        try {
          const oldTag = `Site ID: ${existing.siteId}`
          const newTag = `Site ID: ${newSiteId ?? existing.siteId}`
          const branch =
            (await tenantDb.branch.findFirst({ where: { address: oldTag } })) ||
            (await tenantDb.branch.findFirst({ where: { address: newTag } })) ||
            // Pre-tag rows: fall back to the OLD name, which is what the
            // branch would have been created with.
            (await tenantDb.branch.findFirst({ where: { name: existing.siteName } }))

          if (branch) {
            const finalName = newSiteName ?? existing.siteName
            // Branch.name is unique — skip the rename if another branch owns it.
            const clash = await tenantDb.branch.findFirst({
              where: { name: finalName, id: { not: branch.id } },
            })
            await tenantDb.branch.update({
              where: { id: branch.id },
              data: {
                ...(clash ? {} : { name: finalName }),
                address: newTag,
              },
            })
            branchRenamed = !clash && branch.name !== finalName
          }
        } catch (err) {
          console.error('[Biometric config] Failed to cascade siteName to tenant Branch:', err)
        }

        cascade = { rawLogs: rawCount, syncLogs: syncCount, branchRenamed }
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
