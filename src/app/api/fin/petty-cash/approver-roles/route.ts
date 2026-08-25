import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { upsertFinUserRole } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// Lightweight approver-role resolver used by the Petty Cash Approval Queue:
// returns the roles + site scopes for a user (or all assignments) from the
// FinUserRole table. Migrated from the old FinApprovalRole model.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const pdb = getDbForRequest(request)
    const include = { role: { select: { id: true, code: true, name: true, level: true, readOnly: true, color: true } } }
    if (email) {
      const records = await pdb.finUserRole.findMany({ where: { userEmail: email, isActive: true }, include })
      return NextResponse.json({ success: true, data: records })
    }
    const records = await pdb.finUserRole.findMany({ orderBy: { userEmail: 'asc' }, include })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching approver roles:', error)
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

    const legacyMap: Record<string, string> = { Custodian: 'CUSTODIAN', Supervisor: 'FIN_EXEC', Finance: 'FINANCE_MGR' }
    const roleCodeResolved = legacyMap[role || ''] || role
    const roleRow = roleCodeResolved ? await pdb.finRole.findUnique({ where: { code: roleCodeResolved } }) : null
    if (!roleRow) return NextResponse.json({ success: false, error: 'Unknown role' }, { status: 400 })

    const record = await upsertFinUserRole(pdb, {
      userEmail, roleId: roleRow.id, siteCode: siteCode || null, userName: body.userName || null,
    })
    const full = await pdb.finUserRole.findUnique({
      where: { id: record.id },
      include: { role: { select: { id: true, code: true, name: true, level: true, readOnly: true, color: true } } },
    })
    if (!full) return NextResponse.json({ success: false, error: 'Failed to load saved role' }, { status: 500 })
    return NextResponse.json({ success: true, data: full })
  } catch (error) {
    console.error('Error upserting approver role:', error)
    return NextResponse.json({ success: false, error: 'Failed to save role' }, { status: 500 })
  }
}