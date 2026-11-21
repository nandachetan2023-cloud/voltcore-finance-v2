import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

const CHECKLISTS = {
  Daily: [
    { id: 'cleanliness', label: 'Open the store and inspect cleanliness (5S: Sort, Set in Order, Shine)' },
    { id: 'pending-receipts', label: 'Review pending material receipts' },
    { id: 'inspect-receipts', label: 'Inspect incoming material quantity, specification, condition, and transit damage' },
    { id: 'grn-register', label: 'Prepare GRNs and update the stock register for receipts' },
    { id: 'approved-mrs', label: 'Confirm material issues are against approved MRS only' },
    { id: 'returns', label: 'Inspect unused returns and update stock records' },
    { id: 'critical-stock', label: 'Check critical stock and minimum/reorder levels' },
    { id: 'daily-report', label: 'Prepare the daily material report' },
    { id: 'secure-store', label: 'Lock and secure the store at close of work' },
    { id: 'backup', label: 'Confirm daily backup of store records and ERP entries is completed' },
    { id: 'fifo', label: 'Use FIFO for consumables and verify older stock is issued first' },
    { id: 'safe-stacking', label: 'Check safe stacking, clear access ways, and labelled locations' },
    { id: 'material-tags', label: 'Verify stored materials are tagged with material code, quantity, and location' },
    { id: 'weather-protection', label: 'Check materials are protected from rain, dust, and corrosion' },
    { id: 'cylinders', label: 'Check gas cylinders are stored upright, secured, and segregated' },
    { id: 'fire-safety', label: 'Check fire-safety equipment and emergency access are unobstructed' },
    { id: 'high-value', label: 'Keep high-value items in the designated locked area' },
  ],
  Weekly: [
    { id: 'critical-count', label: 'Physically verify critical stock items' },
    { id: 'fifo-review', label: 'Review FIFO rotation for consumables' },
    { id: 'location-labels', label: 'Check that materials and storage locations are clearly labelled' },
    { id: 'weather-protection', label: 'Inspect protection of stored materials from rain, dust, and corrosion' },
    { id: 'five-s-audit', label: 'Complete a 5S inspection of store areas' },
    { id: 'safe-stacking', label: 'Inspect stacking, aisles, and access ways for safety' },
    { id: 'cylinders', label: 'Inspect gas-cylinder segregation and restraint' },
    { id: 'fire-safety', label: 'Check fire-safety equipment access and visible condition' },
    { id: 'high-value', label: 'Verify high-value stock is secured' },
  ],
  Monthly: [
    { id: 'stock-audit', label: 'Complete the monthly stock audit and reconcile book vs physical quantities' },
    { id: 'critical-review', label: 'Review shortages, reorder levels, and procurement recommendations' },
    { id: 'slow-moving', label: 'Review slow-moving and dead stock for action' },
    { id: 'tool-register', label: 'Reconcile tool issue/return register and toolbox checklist' },
    { id: 'fifo-review', label: 'Review FIFO controls for consumables' },
    { id: 'safety-review', label: 'Review 5S, stacking, cylinder storage, and fire-safety observations' },
    { id: 'damage-loss', label: 'Review damaged, lost, scrap, and supplier-return records' },
    { id: 'backup', label: 'Confirm store records and ERP entries are backed up' },
  ],
} as const

type RoutineType = keyof typeof CHECKLISTS
const isRoutineType = (value: string): value is RoutineType => Object.prototype.hasOwnProperty.call(CHECKLISTS, value)

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = Number(searchParams.get('siteId'))
    const routineType = searchParams.get('routineType') || 'Daily'
    const dateText = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const routineDate = parseDate(dateText)
    if (!Number.isInteger(siteId) || siteId <= 0) return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 })
    if (!isRoutineType(routineType)) return NextResponse.json({ success: false, error: 'routineType must be Daily, Weekly, or Monthly' }, { status: 400 })
    if (!routineDate) return NextResponse.json({ success: false, error: 'date must be a valid YYYY-MM-DD date' }, { status: 400 })

    const db = getDbForRequest(request)
    const record = await db.finStoreRoutineCheck.findUnique({
      where: { siteId_routineDate_routineType: { siteId, routineDate, routineType } },
      include: { site: { select: { id: true, name: true, siteCode: true } } },
    })
    return NextResponse.json({ success: true, data: { template: CHECKLISTS[routineType], record } })
  } catch (error) {
    console.error('[api store/routine-checklists GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to load routine checklist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const siteId = Number(body.siteId)
    const routineType = String(body.routineType || '')
    const dateText = String(body.routineDate || '')
    const routineDate = parseDate(dateText)
    if (!Number.isInteger(siteId) || siteId <= 0) return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 })
    if (!isRoutineType(routineType)) return NextResponse.json({ success: false, error: 'routineType must be Daily, Weekly, or Monthly' }, { status: 400 })
    if (!routineDate) return NextResponse.json({ success: false, error: 'routineDate must be a valid YYYY-MM-DD date' }, { status: 400 })
    const template = CHECKLISTS[routineType]
    if (!Array.isArray(body.checks) || body.checks.length !== template.length) {
      return NextResponse.json({ success: false, error: 'Complete every checklist item before saving' }, { status: 400 })
    }

    const checks = new Map<string, { status: string; note: string }>()
    for (const check of body.checks) {
      if (typeof check?.id !== 'string' || checks.has(check.id) || !template.some(item => item.id === check.id)) {
        return NextResponse.json({ success: false, error: 'Checklist contains an invalid or duplicate item' }, { status: 400 })
      }
      if (!['Done', 'Issue', 'N/A'].includes(check.status)) {
        return NextResponse.json({ success: false, error: 'Select Done, Issue, or N/A for every checklist item' }, { status: 400 })
      }
      const note = typeof check.note === 'string' ? check.note.trim() : ''
      if (check.status === 'Issue' && !note) {
        return NextResponse.json({ success: false, error: `Add corrective action for ${check.id}` }, { status: 400 })
      }
      checks.set(check.id, { status: check.status, note })
    }

    const db = getDbForRequest(request)
    const site = await db.finSite.findUnique({ where: { id: siteId }, select: { siteCode: true } })
    if (!site) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })
    const actor = String(body.actor || '')
    const denied = await assertPermission(db, actor, 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site.siteCode })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to save store checklists' }, { status: 403 })

    const completedBy = String(body.completedBy || actor).trim()
    if (!completedBy) return NextResponse.json({ success: false, error: 'completedBy is required' }, { status: 400 })
    const normalizedChecks = template.flatMap(item => {
      const check = checks.get(item.id)
      return check ? [{ id: item.id, ...check }] : []
    })
    if (normalizedChecks.length !== template.length) {
      return NextResponse.json({ success: false, error: 'Complete every checklist item before saving' }, { status: 400 })
    }
    const record = await db.finStoreRoutineCheck.upsert({
      where: { siteId_routineDate_routineType: { siteId, routineDate, routineType } },
      create: { siteId, routineDate, routineType, completedBy, checks: normalizedChecks },
      update: { completedBy, checks: normalizedChecks },
      include: { site: { select: { id: true, name: true, siteCode: true } } },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('[api store/routine-checklists POST]', error)
    return NextResponse.json({ success: false, error: 'Failed to save routine checklist' }, { status: 500 })
  }
}
