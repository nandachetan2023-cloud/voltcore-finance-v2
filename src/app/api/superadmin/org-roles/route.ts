import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const roles = await superadminDb.orgRole.findMany({
      where: tenantId ? { tenantId } : {},
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { level: 'asc' },
    })
    return NextResponse.json({ success: true, data: roles })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, name, level, maxUsers, moduleAccess, departments, designations, branches, color } = body
    if (!tenantId || !name) {
      return NextResponse.json({ success: false, error: 'tenantId and name are required' }, { status: 400 })
    }
    const role = await superadminDb.orgRole.create({
      data: {
        tenantId, name,
        level: parseInt(level) || 1,
        maxUsers: parseInt(maxUsers) || 0,
        moduleAccess: moduleAccess || 'all',
        departments: departments || '',
        designations: designations || '',
        branches: branches || '',
        color: color || '#5a6878',
      },
    })
    return NextResponse.json({ success: true, data: role }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'Role name already exists for this tenant' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create role' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    if (data.level) data.level = parseInt(data.level)
    if (data.maxUsers !== undefined) data.maxUsers = parseInt(data.maxUsers) || 0
    const role = await superadminDb.orgRole.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: role })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    // Check if role is used in any approval steps
    const usedInSteps = await superadminDb.approvalStep.count({
      where: { OR: [{ approverRoleId: id }, { selfEscalateToRoleId: id }] },
    })
    if (usedInSteps > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete role — it is used in approval chains' }, { status: 400 })
    }
    await superadminDb.orgRole.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete role' }, { status: 500 })
  }
}
