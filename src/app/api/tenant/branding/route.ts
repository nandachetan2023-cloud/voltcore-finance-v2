import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

// GET: Fetch tenant branding (logo, name) for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.cookies.get('erp_tenant_id')?.value

    if (!tenantId) {
      return NextResponse.json({ success: true, data: null })
    }

    const tenant = await superadminDb.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      } as any,
    })

    if (!tenant) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({ success: true, data: tenant })
  } catch (error) {
    console.error('Error fetching tenant branding:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch branding' }, { status: 500 })
  }
}
