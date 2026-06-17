import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  const userRole = request.cookies.get('erp_user_role')?.value

  if (!tenantId || !userRole) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true, role: userRole })
}
