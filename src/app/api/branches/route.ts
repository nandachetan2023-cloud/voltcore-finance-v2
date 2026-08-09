import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** A branch synced from a biometric site carries its origin in `address`. */
const SITE_TAG = 'Site ID: '
const siteTag = (siteId: string) => `${SITE_TAG}${siteId}`

/**
 * Syncs biometric sites from the superadmin DB into the tenant's Branch table.
 * Branch = Site everywhere — one source of truth.
 *
 * Matching is by siteId (persisted in `address` as "Site ID: <siteId>"), NOT
 * by name. Matching on name meant a renamed site found no existing row and
 * created a SECOND branch, leaving the old name in every site dropdown
 * forever. Keying on the stable id lets a rename update the existing row.
 *
 * Sites that are inactive or deleted upstream have their branch renamed only;
 * the Branch row itself is kept because employees, holidays and attendance
 * rules reference it, and deleting it would break those. Such orphans are
 * filtered out of the list instead (see GET).
 */
async function syncBiometricSitesAsBranches(db: any, tenantId: string) {
  try {
    const sites = await superadminDb.biometricSiteConfig.findMany({
      where: { tenantId, isActive: true },
      select: { siteId: true, siteName: true },
    })

    for (const site of sites) {
      const tag = siteTag(site.siteId)

      // Match ONLY on the siteId tag. Adopting an untagged branch by name was
      // tempting — it avoids a duplicate when a tenant hand-created a branch
      // that happens to share the site's name — but stamping it would make a
      // tenant-owned branch look site-derived, so deactivating the site would
      // then hide a branch the tenant created and still relies on. Leaving it
      // untagged keeps it permanently visible, which is the safer default.
      const existing = await db.branch.findFirst({ where: { address: tag } })

      if (!existing) {
        // Branch.name is unique, so a rename colliding with an unrelated
        // branch would throw. Skip rather than fail the whole request.
        const nameTaken = await db.branch.findFirst({ where: { name: site.siteName } })
        if (nameTaken) continue
        await db.branch.create({ data: { name: site.siteName, address: tag } })
        continue
      }

      // 3. Rename in place when the upstream site name changed.
      if (existing.name !== site.siteName) {
        const nameTaken = await db.branch.findFirst({
          where: { name: site.siteName, id: { not: existing.id } },
        })
        if (nameTaken) continue // another branch already owns that name
        await db.branch.update({ where: { id: existing.id }, data: { name: site.siteName } })
      }
    }
  } catch {
    // Silently ignore sync errors — branches still work without biometric sites
  }
}

// GET: List all branches (auto-synced from biometric sites)
//
// Returns only branches that are still selectable: those backed by an ACTIVE
// biometric site, plus branches the tenant created directly (no site tag).
//
// A branch whose site was deleted or deactivated upstream is withheld so it
// stops appearing in site dropdowns — but it is NOT deleted, because
// employees, holidays and attendance rules reference it. If such a branch
// still has employees it is returned and flagged `isOrphaned`, since hiding a
// site that 100 people are assigned to would make them unfilterable.
//
// ?includeInactive=true returns everything, for admin screens that manage
// branches rather than select one.
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Auto-sync biometric sites as branches before returning
    const tenantId = request.cookies.get('erp_tenant_id')?.value
    if (tenantId) {
      await syncBiometricSitesAsBranches(db, tenantId)
    }

    const branches = await db.branch.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { Employee: true } } },
    })

    if (includeInactive || !tenantId) {
      return NextResponse.json({ success: true, data: branches })
    }

    // Which siteIds are still active upstream?
    const activeSites = await superadminDb.biometricSiteConfig
      .findMany({ where: { tenantId, isActive: true }, select: { siteId: true } })
      .catch(() => [] as { siteId: string }[])
    const activeTags = new Set(activeSites.map(s => siteTag(s.siteId)))

    const visible = branches
      .filter((b: any) => {
        const addr = (b.address || '').trim()
        // Not site-derived → a tenant-created branch, always selectable.
        if (!addr.startsWith(SITE_TAG)) return true
        // Site-derived → only while its site is still active…
        if (activeTags.has(addr)) return true
        // …or while employees still point at it.
        return b._count.Employee > 0
      })
      .map((b: any) => {
        const addr = (b.address || '').trim()
        const isOrphaned = addr.startsWith(SITE_TAG) && !activeTags.has(addr)
        const { _count, ...rest } = b
        return { ...rest, employeeCount: _count.Employee, isOrphaned }
      })

    return NextResponse.json({ success: true, data: visible })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}

// POST: Create branch
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { name, address, monthlyWorkingDays } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const branch = await db.branch.create({
      data: {
        name,
        address,
        monthlyWorkingDays: typeof monthlyWorkingDays === 'number' ? monthlyWorkingDays : 26,
      },
    })

    return NextResponse.json({ success: true, data: branch }, { status: 201 })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create branch' },
      { status: 500 }
    )
  }
}

// PUT: Update branch by id
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.branch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      )
    }

    if (data.monthlyWorkingDays !== undefined) {
      data.monthlyWorkingDays = parseInt(data.monthlyWorkingDays) || 26
    }
    if (data.otType1Divisor !== undefined) {
      data.otType1Divisor = parseInt(data.otType1Divisor) || 26
    }
    if (data.otType2Divisor !== undefined) {
      data.otType2Divisor = parseInt(data.otType2Divisor) || 26
    }

    const branch = await db.branch.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: branch })
  } catch (error) {
    console.error('Error updating branch:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update branch' },
      { status: 500 }
    )
  }
}

// DELETE: Delete branch by id
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.branch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      )
    }

    await db.branch.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting branch:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete branch' },
      { status: 500 }
    )
  }
}
