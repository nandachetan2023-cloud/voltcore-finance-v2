import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const chains = await superadminDb.approvalChain.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        tenant: { select: { name: true, slug: true } },
        requesterRole: { select: { id: true, name: true, color: true, level: true } },
        steps: {
          include: { approverRole: true },
          orderBy: { stepNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ success: true, data: chains })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch chains' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, requesterRoleId, name, description, steps } = body
    if (!tenantId || !name) {
      return NextResponse.json({ success: false, error: 'tenantId and name are required' }, { status: 400 })
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, steps, requesterRoleId, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    await superadminDb.approvalChain.update({
      where: { id },
      data: { ...data, requesterRoleId: requesterRoleId || null },
    })

    if (steps !== undefined) {
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await superadminDb.approvalChain.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete chain' }, { status: 500 })
  }
}
