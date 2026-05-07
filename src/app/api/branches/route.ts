import { getDbForRequest } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Syncs biometric sites from superadmin DB into the tenant's Branch table.
 * This ensures Branch = Site everywhere — one source of truth.
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
  } catch {
    // Silently ignore sync errors — branches still work without biometric sites
  }
}

// GET: List all branches (auto-synced from biometric sites)
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    // Auto-sync biometric sites as branches before returning
    const tenantId = request.cookies.get('erp_tenant_id')?.value
    if (tenantId) {
      await syncBiometricSitesAsBranches(db, tenantId)
    }

    const branches = await db.branch.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: branches })
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
    const { name, address } = body

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
