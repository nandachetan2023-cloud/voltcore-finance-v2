import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

function actorFor(request: NextRequest) {
  return request.cookies.get('erp_user_email')?.value || request.headers.get('x-actor-email') || ''
}

function validateRates(data: Record<string, unknown>) {
  const keys = ['cgstRate', 'sgstRate', 'igstRate', 'cessRate'] as const
  for (const key of keys) {
    const value = Number(data[key])
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return `${key} must be a percentage from 0 to 100`
    }
  }
  const cgstRate = Number(data.cgstRate)
  const sgstRate = Number(data.sgstRate)
  const igstRate = Number(data.igstRate)
  if ((cgstRate > 0) !== (sgstRate > 0)) return 'CGST and SGST must both be set or both be zero'
  if (cgstRate > 0 && igstRate > 0) return 'A tax code cannot combine intra-state and inter-state GST'
  return null
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const actor = actorFor(request)
    const adminView = await assertPermission(pdb, actor, 'ADMIN_VIEW', { request, module: 'Admin', entityId: 'tax-code' })
    const arView = adminView.allowed ? adminView : await assertPermission(pdb, actor, 'AR_VIEW', { request, module: 'AR', entityId: 'tax-code' })
    const access = arView.allowed ? arView : await assertPermission(pdb, actor, 'AP_VIEW', { request, module: 'AP', entityId: 'tax-code' })
    if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || 'Not allowed' }, { status: 403 })

    const codes = await pdb.finTaxCode.findMany({ orderBy: [{ status: 'asc' }, { code: 'asc' }] })
    return NextResponse.json({ success: true, data: codes })
  } catch (error) {
    console.error('Error fetching finance tax codes:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch tax codes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const actor = actorFor(request)
    const denied = await assertPermission(pdb, actor, 'ADMIN_CREATE', { request, module: 'Admin', entityId: 'tax-code' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
    if (!String(body.code || '').trim() || !String(body.description || '').trim()) {
      return NextResponse.json({ success: false, error: 'Tax code and description are required' }, { status: 400 })
    }
    const rates = {
      cgstRate: body.cgstRate ?? 0,
      sgstRate: body.sgstRate ?? 0,
      igstRate: body.igstRate ?? 0,
      cessRate: body.cessRate ?? 0,
    }
    const rateError = validateRates(rates)
    if (rateError) return NextResponse.json({ success: false, error: rateError }, { status: 400 })

    const code = await pdb.finTaxCode.create({
      data: {
        code: String(body.code).trim().toUpperCase(),
        description: String(body.description).trim(),
        hsnSac: String(body.hsnSac || '').trim() || null,
        cgstRate: Number(rates.cgstRate),
        sgstRate: Number(rates.sgstRate),
        igstRate: Number(rates.igstRate),
        cessRate: Number(rates.cessRate),
        inputAccountCode: String(body.inputAccountCode || '').trim() || null,
        outputAccountCode: String(body.outputAccountCode || '').trim() || null,
        createdBy: actor || null,
      },
    })
    return NextResponse.json({ success: true, data: code }, { status: 201 })
  } catch (error) {
    console.error('Error creating finance tax code:', error)
    return NextResponse.json({ success: false, error: 'Failed to create tax code (code may already exist)' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const actor = actorFor(request)
    if (!body.id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const code = await pdb.finTaxCode.findUnique({ where: { id: Number(body.id) } })
    if (!code) return NextResponse.json({ success: false, error: 'Tax code not found' }, { status: 404 })

    if (body.action === 'approve') {
      const denied = await assertPermission(pdb, actor, 'ADMIN_EDIT', { request, module: 'Admin', entityId: String(code.id) })
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
      if (code.status !== 'Draft') return NextResponse.json({ success: false, error: 'Only draft tax codes can be approved' }, { status: 409 })
      if (code.createdBy && code.createdBy.toLowerCase() === actor.toLowerCase()) {
        return NextResponse.json({ success: false, error: 'A different Finance approver must approve this tax code' }, { status: 403 })
      }
      const [inputAccount, outputAccount] = await Promise.all([
        code.inputAccountCode ? pdb.finAccount.findUnique({ where: { accountCode: code.inputAccountCode } }) : null,
        code.outputAccountCode ? pdb.finAccount.findUnique({ where: { accountCode: code.outputAccountCode } }) : null,
      ])
      if (!inputAccount?.isActive || !['Asset', 'Current Asset'].includes(inputAccount.type)) {
        return NextResponse.json({ success: false, error: 'Configure an active input GST asset account before approval' }, { status: 400 })
      }
      if (!outputAccount?.isActive || !['Liability', 'Current Liability'].includes(outputAccount.type)) {
        return NextResponse.json({ success: false, error: 'Configure an active output GST liability account before approval' }, { status: 400 })
      }
      const approved = await pdb.finTaxCode.update({
        where: { id: code.id },
        data: { status: 'Approved', approvedBy: actor, approvedAt: new Date() },
      })
      return NextResponse.json({ success: true, data: approved })
    }

    const denied = await assertPermission(pdb, actor, 'ADMIN_EDIT', { request, module: 'Admin', entityId: String(code.id) })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed' }, { status: 403 })
    if (code.status !== 'Draft') return NextResponse.json({ success: false, error: 'Approved tax codes are immutable; create a new code for changes' }, { status: 409 })
    const mergedRates = {
      cgstRate: body.cgstRate ?? code.cgstRate,
      sgstRate: body.sgstRate ?? code.sgstRate,
      igstRate: body.igstRate ?? code.igstRate,
      cessRate: body.cessRate ?? code.cessRate,
    }
    const rateError = validateRates(mergedRates)
    if (rateError) return NextResponse.json({ success: false, error: rateError }, { status: 400 })

    const updated = await pdb.finTaxCode.update({
      where: { id: code.id },
      data: {
        ...(body.code !== undefined ? { code: String(body.code).trim().toUpperCase() } : {}),
        ...(body.description !== undefined ? { description: String(body.description).trim() } : {}),
        ...(body.hsnSac !== undefined ? { hsnSac: String(body.hsnSac || '').trim() || null } : {}),
        ...(body.cgstRate !== undefined ? { cgstRate: Number(body.cgstRate) } : {}),
        ...(body.sgstRate !== undefined ? { sgstRate: Number(body.sgstRate) } : {}),
        ...(body.igstRate !== undefined ? { igstRate: Number(body.igstRate) } : {}),
        ...(body.cessRate !== undefined ? { cessRate: Number(body.cessRate) } : {}),
        ...(body.inputAccountCode !== undefined ? { inputAccountCode: String(body.inputAccountCode || '').trim() || null } : {}),
        ...(body.outputAccountCode !== undefined ? { outputAccountCode: String(body.outputAccountCode || '').trim() || null } : {}),
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating finance tax code:', error)
    return NextResponse.json({ success: false, error: 'Failed to update tax code' }, { status: 500 })
  }
}
