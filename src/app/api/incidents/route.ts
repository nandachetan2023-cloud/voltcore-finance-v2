import { NextRequest } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { createWithCode, fail, ok, optStr, parseId, serverError, str, toDate, ymd } from '@/lib/asset-api'

export const dynamic = 'force-dynamic'

const TYPES = ['Near Miss', 'First Aid', 'Property Damage', 'LTI', 'Fatality', 'Hazard ID']
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Investigating', 'Open', 'Closed']

const toRow = (i: any) => ({
  id: String(i.id),
  refNo: i.refNo,
  date: ymd(i.date),
  site: i.site,
  type: i.type,
  severity: i.severity,
  person: i.person,
  status: i.status,
  description: i.description,
  action: i.action,
  createdAt: i.createdAt.toISOString(),
})

export async function GET(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const rows = await db.incident.findMany({ orderBy: [{ date: 'desc' }, { id: 'desc' }] })
    return ok(rows.map(toRow))
  } catch (e) {
    return serverError('incidents GET', e, 'Failed to load incidents')
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const site = str(b.site)
    const person = str(b.person)
    const date = toDate(b.date)
    if (!date || !site || !person || !b.type || !b.severity) return fail('Date, site, type, severity and person are required')
    if (!TYPES.includes(b.type)) return fail('Invalid incident type')
    if (!SEVERITIES.includes(b.severity)) return fail('Invalid severity')
    const status = STATUSES.includes(b.status) ? b.status : 'Investigating'

    const created = await createWithCode(
      'INC',
      async () => (await db.incident.findFirst({ orderBy: { id: 'desc' }, select: { refNo: true } }))?.refNo ?? null,
      (refNo) =>
        db.incident.create({
          data: { refNo, date, site, type: b.type, severity: b.severity, person, status, description: optStr(b.description), action: optStr(b.action) },
        }),
    )
    return ok(toRow(created), 201)
  } catch (e) {
    return serverError('incidents POST', e, 'Failed to report incident')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const id = parseId(b.id)
    if (!id) return fail('Incident id is required')

    const data: Record<string, unknown> = {}
    if ('date' in b) {
      const d = toDate(b.date)
      if (!d) return fail('Invalid date')
      data.date = d
    }
    for (const k of ['site', 'person'] as const) {
      if (k in b) {
        if (!str(b[k])) return fail(`${k} cannot be empty`)
        data[k] = str(b[k])
      }
    }
    if ('type' in b) {
      if (!TYPES.includes(b.type)) return fail('Invalid incident type')
      data.type = b.type
    }
    if ('severity' in b) {
      if (!SEVERITIES.includes(b.severity)) return fail('Invalid severity')
      data.severity = b.severity
    }
    if ('status' in b) {
      if (!STATUSES.includes(b.status)) return fail('Invalid status')
      data.status = b.status
    }
    if ('description' in b) data.description = optStr(b.description)
    if ('action' in b) data.action = optStr(b.action)

    const updated = await db.incident.update({ where: { id }, data })
    return ok(toRow(updated))
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Incident not found', 404)
    return serverError('incidents PUT', e, 'Failed to update incident')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const id = parseId((await request.json()).id)
    if (!id) return fail('Incident id is required')
    await db.incident.delete({ where: { id } })
    return ok({ id: String(id) })
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Incident not found', 404)
    return serverError('incidents DELETE', e, 'Failed to delete incident')
  }
}
