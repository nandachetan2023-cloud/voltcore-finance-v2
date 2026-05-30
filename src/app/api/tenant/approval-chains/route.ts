/**
 * Tenant-scoped approval-chain management.
 * The tenant admin builds approval chains for their own roles. Chains live in
 * the superadmin DB but are always filtered/verified by the caller's tenantId.
 */
import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('erp_tenant_id')?.value || null
}

// GET: list chains for this tenant
export async function GET(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const chains = await superadminDb.approvalChain.findMany({
      where: { tenantId },
      include: {
        requesterRole: { select: { id: true, name: true, color: true, level: true } },
        steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ success: true, data: chains })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch chains' }, { status: 500 })
  }
}

// helper: confirm a role id belongs to this tenant
async function roleBelongs(tenantId: string, roleId: string | null | undefined): Promise<boolean> {
  if (!roleId) return true
  const r = await superadminDb.orgRole.findFirst({ where: { id: roleId, tenantId } })
  return !!r
}

// POST: create chain
export async function POST(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { requesterRoleId, name, description, steps } = body
    if (!name) return NextResponse.json({ success: false, error: 'Chain name is required' }, { status: 400 })

    // Verify all referenced roles belong to this tenant
    if (!(await roleBelongs(tenantId, requesterRoleId))) {
      return NextResponse.json({ success: false, error: 'Invalid requester role' }, { status: 400 })
    }
    for (const s of steps || []) {
      if (!(await roleBelongs(tenantId, s.approverRoleId))) {
        return NextResponse.json({ success: false, error: 'Invalid approver role in chain' }, { status: 400 })
      }
    }

    const chain = await superadminDb.approvalChain.create({
      data: {
        tenantId,
        requesterRoleId: requesterRoleId || null,
        name,
        description: description || '',
        isActive: true,
        steps: steps?.length ? {
          create: steps.map((s: any, i: number) => ({
            stepNumber: i + 1,
            approverRoleId: s.approverRoleId,
            scope: s.scope || 'universal',
            selfEscalateToRoleId: s.selfEscalateToRoleId || null,
            isRequired: s.isRequired !== false,
          })),
        } : undefined,
      },
      include: {
        requesterRole: { select: { id: true, name: true, color: true, level: true } },
        steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } },
      },
    })
    return NextResponse.json({ success: true, data: chain }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'A chain for this role already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create chain' }, { status: 500 })
  }
}

// PUT: update chain (verified to belong to this tenant)
export async function PUT(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, steps, requesterRoleId, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const existing = await superadminDb.approvalChain.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Chain not found' }, { status: 404 })

    if (!(await roleBelongs(tenantId, requesterRoleId))) {
      return NextResponse.json({ success: false, error: 'Invalid requester role' }, { status: 400 })
    }

    await superadminDb.approvalChain.update({
      where: { id },
      data: { name: data.name, description: data.description, isActive: data.isActive, requesterRoleId: requesterRoleId || null },
    })

    if (steps !== undefined) {
      for (const s of steps) {
        if (!(await roleBelongs(tenantId, s.approverRoleId))) {
          return NextResponse.json({ success: false, error: 'Invalid approver role in chain' }, { status: 400 })
        }
      }
      await superadminDb.approvalStep.deleteMany({ where: { chainId: id } })
      if (steps.length > 0) {
        await superadminDb.approvalStep.createMany({
          data: steps.map((s: any, i: number) => ({
            chainId: id,
            stepNumber: i + 1,
            approverRoleId: s.approverRoleId,
            scope: s.scope || 'universal',
            selfEscalateToRoleId: s.selfEscalateToRoleId || null,
            isRequired: s.isRequired !== false,
          })),
        })
      }
    }

    const updated = await superadminDb.approvalChain.findUnique({
      where: { id },
      include: {
        requesterRole: { select: { id: true, name: true, color: true, level: true } },
        steps: { include: { approverRole: true }, orderBy: { stepNumber: 'asc' } },
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update chain' }, { status: 500 })
  }
}

// DELETE: remove chain (verified to belong to this tenant)
export async function DELETE(request: NextRequest) {
  const tenantId = getTenantId(request)
  if (!tenantId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const existing = await superadminDb.approvalChain.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Chain not found' }, { status: 404 })

    await superadminDb.approvalChain.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete chain' }, { status: 500 })
  }
}
