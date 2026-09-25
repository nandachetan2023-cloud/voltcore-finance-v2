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

    // Branch only stores name/address, but the Sites UI shows state, project,
    // incharge, status and manpower. Fill those from the data that does exist:
    //   • manpower                        → live headcount on the branch
    //   • state / project / incharge / …  → the matching FinSite row (by name)
    // Without this the client received `undefined` for every one of those
    // fields, which made its manpower total NaN.
    const [branches, finSites] = await Promise.all([
      db.branch.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { Employee: true } } },
      }),
      (db.finSite.findMany() as Promise<any[]>).catch(() => [] as any[]),
    ])

    const byName = new Map<string, any>(finSites.map((s: any) => [s.name.trim().toLowerCase(), s]))

    const data = branches.map((b: any) => {
      const fin = byName.get(b.name.trim().toLowerCase())
      return {
        id: b.id,
        name: b.name,
        address: b.address ?? '',
        state: fin?.state ?? '',
        project: fin?.projectType ?? '',
        incharge: fin?.responsiblePerson ?? '',
        status: fin?.status ?? 'Active',
        manpower: b._count?.Employee ?? 0,
        siteCode: fin?.siteCode ?? null,
        monthlyWorkingDays: b.monthlyWorkingDays,
        otType1Divisor: b.otType1Divisor,
        otType2Divisor: b.otType2Divisor,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { name, address } = await request.json()
    if (!name) return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    const branch = await db.branch.create({ data: { name, address: address ?? null } })
    return NextResponse.json({ success: true, data: branch }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create site' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { id, name, address, monthlyWorkingDays, otType1Divisor, otType2Divisor } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    // Only whitelisted Branch columns — the Sites form also posts state/project/
    // incharge/status/manpower, which live on FinSite (or are derived) and would
    // make Prisma reject the whole update as unknown arguments.
    // The Sites UI keeps ids as strings; Branch.id is an Int.
    const branchId = Number(id)
    if (!Number.isInteger(branchId)) return NextResponse.json({ success: false, error: 'invalid id' }, { status: 400 })
    const branch = await db.branch.update({
      where: { id: branchId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address: address ?? null } : {}),
        ...(monthlyWorkingDays !== undefined ? { monthlyWorkingDays } : {}),
        ...(otType1Divisor !== undefined ? { otType1Divisor } : {}),
        ...(otType2Divisor !== undefined ? { otType2Divisor } : {}),
      },
    })
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
    const branchId = Number(id)
    if (!Number.isInteger(branchId)) return NextResponse.json({ success: false, error: 'invalid id' }, { status: 400 })
    await db.branch.delete({ where: { id: branchId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete site' }, { status: 500 })
  }
}
