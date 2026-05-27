import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

// GET: List all active biometric sites for the current tenant (from superadmin DB)
export async function GET(request: NextRequest) {
  try {
    // Get the current user's tenant ID from cookies or query param
    const tenantId = request.cookies.get('erp_tenant_id')?.value
      || new URL(request.url).searchParams.get('tenantId')
    const role = request.cookies.get('erp_user_role')?.value

    // Superadmin: return all active sites across all tenants
    if ((role === 'superadmin' || role === 'admin') && !tenantId) {
      // For admin without tenantId, try to resolve from tenant DB URL
      const tenantDbUrl = request.cookies.get('erp_tenant_db')?.value
      if (tenantDbUrl) {
        // Find the tenant by DB URL
        try {
          const tenant = await superadminDb.tenant.findFirst({
            where: { dbUrl: decodeURIComponent(tenantDbUrl) },
            select: { id: true },
          })
          if (tenant) {
            const sites = await superadminDb.biometricSiteConfig.findMany({
              where: { tenantId: tenant.id, isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true, siteId: true, siteName: true },
            })
            return NextResponse.json({ success: true, data: sites })
          }
        } catch {}
      }

      // Superadmin fallback: return all sites
      if (role === 'superadmin') {
        const sites = await superadminDb.biometricSiteConfig.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { id: true, siteId: true, siteName: true, tenantId: true },
        })
        return NextResponse.json({ success: true, data: sites })
      }

      // Admin with no tenant context — return empty
      return NextResponse.json({ success: true, data: [] })
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID not found in session' },
        { status: 401 }
      )
    }

    // Fetch biometric sites from superadmin database
    const sites = await superadminDb.biometricSiteConfig.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        siteId: true,
        siteName: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: sites,
    })
  } catch (error) {
    console.error('Error fetching biometric sites:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch biometric sites' },
      { status: 500 }
    )
  }
}
