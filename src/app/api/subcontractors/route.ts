import { NextRequest } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { fail, ok, parseId, serverError, str } from '@/lib/asset-api'

export const dynamic = 'force-dynamic'

const REG = ['Done', 'Pending', 'Missing']
const LICENCE = ['Valid', 'Pending', 'Expired']
const COMPLIANCE = ['Compliant', 'Non-Compliant']

const toRow = (s: any) => ({
  id: String(s.id),
  name: s.name,
  trade: s.trade,
  workers: s.workers,
  site: s.site,
  pfReg: s.pfReg,
  esiReg: s.esiReg,
  labourLic: s.labourLic,
  compliance: s.compliance,
})

const toWorkers = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))

export async function GET(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const rows = await db.subcontractor.findMany({ orderBy: { id: 'desc' } })
    return ok(rows.map(toRow))
  } catch (e) {
    return serverError('subcontractors GET', e, 'Failed to load subcontractors')
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const name = str(b.name)
    const trade = str(b.trade)
    const site = str(b.site)
    if (!name || !trade || !site) return fail('Company name, trade and site are required')
    const created = await db.subcontractor.create({
      data: {
        name,
        trade,
        site,
        workers: toWorkers(b.workers),
        pfReg: REG.includes(b.pfReg) ? b.pfReg : 'Pending',
        esiReg: REG.includes(b.esiReg) ? b.esiReg : 'Pending',
        labourLic: LICENCE.includes(b.labourLic) ? b.labourLic : 'Pending',
        compliance: COMPLIANCE.includes(b.compliance) ? b.compliance : 'Non-Compliant',
      },
    })
    return ok(toRow(created), 201)
  } catch (e) {
    return serverError('subcontractors POST', e, 'Failed to add subcontractor')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const b = await request.json()
    const id = parseId(b.id)
    if (!id) return fail('Subcontractor id is required')

    const data: Record<string, unknown> = {}
    for (const k of ['name', 'trade', 'site'] as const) {
      if (k in b) {
        if (!str(b[k])) return fail(`${k} cannot be empty`)
        data[k] = str(b[k])
      }
    }
    if ('workers' in b) data.workers = toWorkers(b.workers)
    const enums: [string, string[]][] = [['pfReg', REG], ['esiReg', REG], ['labourLic', LICENCE], ['compliance', COMPLIANCE]]
    for (const [k, allowed] of enums) {
      if (k in b) {
        if (!allowed.includes(b[k])) return fail(`Invalid ${k}`)
        data[k] = b[k]
      }
    }

    const updated = await db.subcontractor.update({ where: { id }, data })
    return ok(toRow(updated))
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Subcontractor not found', 404)
    return serverError('subcontractors PUT', e, 'Failed to update subcontractor')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const id = parseId((await request.json()).id)
    if (!id) return fail('Subcontractor id is required')
    await db.subcontractor.delete({ where: { id } })
    return ok({ id: String(id) })
  } catch (e: any) {
    if (e?.code === 'P2025') return fail('Subcontractor not found', 404)
    return serverError('subcontractors DELETE', e, 'Failed to delete subcontractor')
  }
}
