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
        steps: {
          include: {
            approverRole: true,
            selfEscalateTo: true,
          },
          orderBy: { stepNumber: 'asc' },
        },
      },
      orderBy: { requestType: 'asc' },
    })
    return NextResponse.json({ success: true, data: chains })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch chains' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, requestType, name, description, steps } = body
    if (!tenantId || !requestType || !name) {
      return NextResponse.json({ success: false, error: 'tenantId, requestType and name are required' }, { status: 400 })
    }

    const chain = await superadminDb.approvalChain.create({
      data: {
        tenantId, requestType, name,
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
      include: { steps: { include: { approverRole: true, selfEscalateTo: true }, orderBy: { stepNumber: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: chain }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: 'A chain for this request type already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create chain' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, steps, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    // Update chain metadata
    await superadminDb.approvalChain.update({ where: { id }, data })

    // If steps provided, replace all steps
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
      include: { steps: { include: { approverRole: true, selfEscalateTo: true }, orderBy: { stepNumber: 'asc' } } },
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
    await superadminDb.approvalChain.delete({ where: { id } }) // steps cascade
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete chain' }, { status: 500 })
  }
}
