import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

// GET: List all active biometric sites for the current tenant (from superadmin DB)
export async function GET(request: NextRequest) {
  try {
    // Get the current user's tenant ID from cookies
    const tenantId = request.cookies.get('erp_tenant_id')?.value

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
