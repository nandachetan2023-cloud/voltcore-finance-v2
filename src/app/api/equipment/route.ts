import { NextRequest } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { createWithCode, fail, ok, optStr, parseId, serverError, str, toDate, ymd } from '@/lib/asset-api'

export const dynamic = 'force-dynamic'

const STATUSES = ['Operational', 'Maintenance', 'Decommissioned']

const toRow = (e: any) => ({
  id: String(e.id),
  eqId: e.equipmentCode,
  name: e.name,
  site: e.site,
  status: e.status,
  lastPM: ymd(e.lastPM),
  nextPM: ymd(e.nextPM),
  issue: e.issue,
  assignedTo: e.assignedTo,
  utilization: e.utilization,
})

const clampUtil = (v: unknown) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)))

export async function GET(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const rows = await db.equipment.findMany({ orderBy: { id: 'desc' } })
    return ok(rows.map(toRow))
  } catch (e) {
    return serverError('equipment GET', e, 'Failed to load equipment')
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const name = str(b.name)
    const site = str(b.site)
    if (!name || !site) return fail('Equipment name and site are required')
    const status = STATUSES.includes(b.status) ? b.status : 'Operational'
    const lastPM = toDate(b.lastPM)
    const nextPM = toDate(b.nextPM)
    if (lastPM === undefined || nextPM === undefined) return fail('Invalid PM date')

    const created = await createWithCode(
      'EQ',
      async () => (await db.equipment.findFirst({ orderBy: { id: 'desc' }, select: { equipmentCode: true } }))?.equipmentCode ?? null,
      (equipmentCode) =>
        db.equipment.create({
          data: {
            equipmentCode,
            name,
            site,
            status,
            lastPM,
            nextPM,
            issue: optStr(b.issue),
            assignedTo: optStr(b.assignedTo),
            utilization: clampUtil(b.utilization),
          },
        }),
    )
    return ok(toRow(created), 201)
  } catch (e) {
    return serverError('equipment POST', e, 'Failed to add equipment')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const id = parseId(b.id)
    if (!id) return fail('Equipment id is required')

    const data: Record<string, unknown> = {}
    if ('name' in b) {
      if (!str(b.name)) return fail('Equipment name is required')
      data.name = str(b.name)
    }
    if ('site' in b) {
      if (!str(b.site)) return fail('Site is required')
      data.site = str(b.site)
    }
    if ('status' in b) {
      if (!STATUSES.includes(b.status)) return fail('Invalid status')
      data.status = b.status
    }
    for (const k of ['lastPM', 'nextPM'] as const) {
      if (k in b) {
        const d = toDate(b[k])
        if (d === undefined) return fail('Invalid PM date')
        data[k] = d
      }
    }
    if ('issue' in b) data.issue = optStr(b.issue)
    if ('assignedTo' in b) data.assignedTo = optStr(b.assignedTo)
    if ('utilization' in b) data.utilization = clampUtil(b.utilization)

    const updated = await db.equipment.update({ where: { id }, data })
    return ok(toRow(updated))
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Equipment not found', 404)
    return serverError('equipment PUT', e, 'Failed to update equipment')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const id = parseId((await request.json()).id)
    if (!id) return fail('Equipment id is required')
    await db.equipment.delete({ where: { id } })
    return ok({ id: String(id) })
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Equipment not found', 404)
    return serverError('equipment DELETE', e, 'Failed to delete equipment')
  }
}
