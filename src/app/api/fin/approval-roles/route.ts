import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { upsertFinUserRole } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// Finance approval-role assignments — migrated on top of FinUserRole.
// Kept for backward compatibility with the older approval-queue / passing
// screens; the canonical API is /api/fin/rbac/assignments. `role` accepts the
// legacy names (Custodian | Supervisor | Finance) OR full role codes,
// and `siteId` is translated to a siteCode for scoping.
const LEGACY_ROLE_MAP: Record<string, string> = {
  Custodian: 'CUSTODIAN',
  Supervisor: 'FIN_EXEC',
  Finance: 'FINANCE_MGR',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const pdb = getDbForRequest(request)
    if (email) {
      const rows = await pdb.finUserRole.findMany({
        where: { userEmail: email, isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { role: { select: { id: true, code: true, name: true, level: true, readOnly: true, color: true } } },
      })
      return NextResponse.json({ success: true, data: rows })
    }
    const rows = await pdb.finUserRole.findMany({
      orderBy: [{ userEmail: 'asc' }],
      include: { role: { select: { id: true, code: true, name: true, level: true, readOnly: true, color: true } } },
    })
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error('Error fetching approval roles:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, userName, role, siteCode } = body as {
      userEmail?: string; userName?: string; role?: string; siteCode?: string | null
    }
    const pdb = getDbForRequest(request)
    if (!userEmail) return NextResponse.json({ success: false, error: 'userEmail is required' }, { status: 400 })

    const roleCode = LEGACY_ROLE_MAP[role || ''] || role
    if (!roleCode || !['CUSTODIAN', 'SUPERVISOR', 'FINANCE_MGR', 'FIN_EXEC', 'REQUESTER', 'DEPT_HEAD', 'DIRECTOR', 'AUDITOR'].includes(roleCode)) {
      return NextResponse.json({ success: false, error: 'unknown role' }, { status: 400 })
    }
    const roleRow = await pdb.finRole.findUnique({ where: { code: roleCode } })
    if (!roleRow) return NextResponse.json({ success: false, error: 'Role not found' }, { status: 400 })

    const record = await upsertFinUserRole(pdb, {
      userEmail, roleId: roleRow.id, siteCode: siteCode || null, userName: userName || null,
    })
    const full = await pdb.finUserRole.findUnique({
      where: { id: record.id },
      include: { role: { select: { id: true, code: true, name: true, level: true, readOnly: true, color: true } } },
    })
    if (!full) return NextResponse.json({ success: false, error: 'Failed to load saved role' }, { status: 500 })
    return NextResponse.json({ success: true, data: full })
  } catch (error) {
    console.error('Error upserting approval role:', error)
    return NextResponse.json({ success: false, error: 'Failed to save role' }, { status: 500 })
  }
}