import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * /api/sites — unified alias for /api/branches.
 * Branch = Site in this system. Biometric sites are auto-synced into the Branch table.
 */

async function syncBiometricSitesAsBranches(db: any, tenantId: string) {
  try {
    const sites = await superadminDb.biometricSiteConfig.findMany({
      where: { tenantId, isActive: true },
      select: { siteId: true, siteName: true },
    })
    for (const site of sites) {
      const existing = await db.branch.findFirst({ where: { name: site.siteName } })
      if (!existing) {
        await db.branch.create({
          data: { name: site.siteName, address: `Site ID: ${site.siteId}` },
        })
      }
    }
  } catch {}
}

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const tenantId = request.cookies.get('erp_tenant_id')?.value
    if (tenantId) await syncBiometricSitesAsBranches(db, tenantId)

    const branches = await db.branch.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, data: branches })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { name, address } = await request.json()
    if (!name) return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    const branch = await db.branch.create({ data: { name, address } })
    return NextResponse.json({ success: true, data: branch }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create site' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { id, ...data } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const branch = await db.branch.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: branch })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update site' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await db.branch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete site' }, { status: 500 })
  }
}
