import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { getClientForUrl } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: fetch departments and designations from a tenant's own DB
// Used by superadmin UI to populate dropdowns when defining OrgRoles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })

    const tenant = await superadminDb.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

    // Connect to tenant's DB (shared pooled client)
    const tenantDb = getClientForUrl(tenant.dbUrl)

    const [departments, designations] = await Promise.all([
      tenantDb.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      tenantDb.designation.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ])
    return NextResponse.json({ success: true, data: { departments, designations } })
  } catch (e) {
    console.error('Tenant data fetch error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch tenant data', data: { departments: [], designations: [] } })
  }
}
