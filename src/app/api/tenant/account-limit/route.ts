/**
 * Returns the current tenant's account usage vs the cap set by the superadmin.
 * Read-only for the tenant admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAccountUsage } from '@/lib/account-limit'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const usage = await getAccountUsage(tenantId)
    const tenant = await superadminDb.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true } as any,
    })
    const enabledModules = (tenant as any)?.enabledModules || 'all'
    return NextResponse.json({ success: true, data: { ...usage, enabledModules } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch account usage' }, { status: 500 })
  }
}
