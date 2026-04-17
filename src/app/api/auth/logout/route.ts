import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ success: true })
  const clear = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 0 }
  response.cookies.set('erp_user_role', '', clear)
  response.cookies.set('erp_tenant_db', '', clear)
  response.cookies.set('erp_tenant_id', '', clear)
  response.cookies.set('erp_allowed_modules', '', clear)
  response.cookies.set('erp_user_email', '', clear)
  response.cookies.set('erp_employee_id', '', clear)
  return response
}
