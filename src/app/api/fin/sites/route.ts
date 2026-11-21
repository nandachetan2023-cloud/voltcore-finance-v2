import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { getAssignedSiteScope, isTenantAdmin } from '@/lib/fin-rbac'
import { nextSeriesCode, withCodeRetry, isBlank } from '@/lib/auto-number'
import { validateSiteDates } from '@/lib/fin-site-validation'

export const dynamic = 'force-dynamic'

async function validateSiteFields(pdb: any, fields: any) {
  if (typeof fields.name !== 'string' || !fields.name.trim()) {
    return { error: 'Site name is required' }
  }

  const customerId = Number(fields.customerId)
  if (!Number.isSafeInteger(customerId) || customerId < 1) {
    return { error: 'A customer is required' }
  }

  const customer = await pdb.finParty.findFirst({
    where: { id: customerId, partyType: 'Customer' },
    select: { id: true },
  })
  if (!customer) return { error: 'Select a valid customer' }

  const dates = validateSiteDates(fields.startDate, fields.endDate)
  if (!dates.ok) return { error: dates.error }

  return {
    fields: {
      customerId,
      startDate: dates.startDate,
      endDate: dates.endDate,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)

    // Site-scoped finance users (a site custodian, a site manager) only get the
    // sites they are assigned to, so every site dropdown built from this list —
    // petty cash vouchers, replenishment, custodian dashboard — is limited to
    // their own site. Tenant admins and accounts with an all-sites assignment
    // (Finance Head, Director) are unaffected, and so are accounts with no
    // finance assignment at all (HR-side screens keep the full list).
    let where: any = {}
    if (!isTenantAdmin(request)) {
      const email = request.cookies.get('erp_user_email')?.value || ''
      const scope = await getAssignedSiteScope(pdb, email)
      if (scope.scoped) where = { siteCode: { in: scope.siteCodes } }
    }

    const records = await pdb.finSite.findMany({ where, orderBy: { name: 'asc' }, include: { customer: { select: { id: true, name: true } } } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'A site record is required' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    const validation = await validateSiteFields(pdb, body)
    if ('error' in validation) return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    // The site code is generated here; a caller-supplied one (import) is honoured.
    const { siteCode, ...rest } = body
    const data = { ...rest, ...validation.fields }
    const record = isBlank(siteCode)
      ? await withCodeRetry(() => nextSeriesCode(pdb, 'site'), (code) => pdb.finSite.create({ data: { ...data, siteCode: code } }))
      : await pdb.finSite.create({ data: { ...data, siteCode } })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating:', error)
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'A site record is required' }, { status: 400 })
    }
    const { id, ...data } = body
    const siteId = Number(id)
    if (!Number.isSafeInteger(siteId) || siteId < 1) return NextResponse.json({ success: false, error: 'A valid id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const existing = await pdb.finSite.findUnique({ where: { id: siteId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })

    const validation = await validateSiteFields(pdb, {
      name: data.name === undefined ? existing.name : data.name,
      customerId: data.customerId === undefined ? existing.customerId : data.customerId,
      startDate: data.startDate === undefined ? existing.startDate : data.startDate,
      endDate: data.endDate === undefined ? existing.endDate : data.endDate,
    })
    if ('error' in validation) return NextResponse.json({ success: false, error: validation.error }, { status: 400 })

    const record = await pdb.finSite.update({ where: { id: siteId }, data: { ...data, ...validation.fields } })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdb = getDbForRequest(request)

    const idsParam = searchParams.get('ids')
    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter((n) => !isNaN(n))
      if (ids.length === 0) return NextResponse.json({ success: false, error: 'No valid ids provided' }, { status: 400 })
      const result = await pdb.finSite.deleteMany({ where: { id: { in: ids } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await pdb.finSite.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
