import { NextRequest } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { createWithCode, fail, ok, optStr, parseId, serverError, str, toDate } from '@/lib/asset-api'

export const dynamic = 'force-dynamic'

const STATUSES = ['Draft', 'Active', 'Expired', 'Revoked', 'Closed']

const toRow = (p: any) => ({
  id: String(p.id),
  permitNo: p.permitNo,
  type: p.type,
  location: p.location,
  issuedTo: p.issuedTo,
  expiry: p.expiry.toISOString(),
  status: p.status,
  description: p.description,
  precautions: p.precautions,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
})

export async function GET(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const rows = await db.workPermit.findMany({ orderBy: { id: 'desc' } })
    return ok(rows.map(toRow))
  } catch (e) {
    return serverError('permits GET', e, 'Failed to load permits')
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const type = str(b.type)
    const location = str(b.location)
    const issuedTo = str(b.issuedTo)
    if (!type || !location || !issuedTo || !b.expiry) return fail('Type, location, issued to and expiry are required')
    const expiry = toDate(b.expiry)
    if (!expiry) return fail('Invalid expiry date')
    const status = STATUSES.includes(b.status) ? b.status : 'Active'

    // The permit number is always allocated here — a client-supplied one is ignored.
    const created = await createWithCode(
      'PTW',
      async () => (await db.workPermit.findFirst({ orderBy: { id: 'desc' }, select: { permitNo: true } }))?.permitNo ?? null,
      (permitNo) =>
        db.workPermit.create({
          data: { permitNo, type, location, issuedTo, expiry, status, description: optStr(b.description), precautions: optStr(b.precautions) },
        }),
    )
    return ok(toRow(created), 201)
  } catch (e) {
    return serverError('permits POST', e, 'Failed to create permit')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const id = parseId(b.id)
    if (!id) return fail('Permit id is required')

    // Partial updates: the list sends only { id, status } for revoke/close.
    const data: Record<string, unknown> = {}
    for (const k of ['type', 'location', 'issuedTo'] as const) {
      if (k in b) {
        if (!str(b[k])) return fail(`${k} cannot be empty`)
        data[k] = str(b[k])
      }
    }
    if ('expiry' in b) {
      const d = toDate(b.expiry)
      if (!d) return fail('Invalid expiry date')
      data.expiry = d
    }
    if ('status' in b) {
      if (!STATUSES.includes(b.status)) return fail('Invalid status')
      data.status = b.status
    }
    if ('description' in b) data.description = optStr(b.description)
    if ('precautions' in b) data.precautions = optStr(b.precautions)

    const updated = await db.workPermit.update({ where: { id }, data })
    return ok(toRow(updated))
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Permit not found', 404)
    return serverError('permits PUT', e, 'Failed to update permit')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const id = parseId((await request.json()).id)
    if (!id) return fail('Permit id is required')
    await db.workPermit.delete({ where: { id } })
    return ok({ id: String(id) })
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Permit not found', 404)
    return serverError('permits DELETE', e, 'Failed to delete permit')
  }
}
