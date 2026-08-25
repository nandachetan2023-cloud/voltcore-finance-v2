import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// ── Access audit log: compliance review with filters ───────────────
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('email')
    const moduleName = searchParams.get('module')
    const success = searchParams.get('success')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))

    // Part of the same admin-only Finance Access Control screen as
    // roles/assignments/sod-rules — gate on Admin:VIEW for consistency.
    const actor = request.headers.get('x-actor-email') || ''
    const allowed = await assertPermission(pdb, actor, 'ADMIN_VIEW', { request, module: 'Admin', entityId: 'audit' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const where: any = {
      ...(userEmail ? { userEmail } : {}),
      ...(moduleName ? { module: moduleName } : {}),
      ...(success ? { success: success === 'true' } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    }

    const [total, rows] = await pdb.$transaction([
      pdb.finAccessAuditLog.count({ where }),
      pdb.finAccessAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({ success: true, data: rows, total, page, limit: pageSize })
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch audit log' }, { status: 500 })
  }
}