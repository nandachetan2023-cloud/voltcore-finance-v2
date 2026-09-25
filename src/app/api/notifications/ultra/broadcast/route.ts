import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { hasPermission, assertPermission } from '@/lib/fin-rbac'
import { getInboxOwner, emitNotification, deriveFinYear } from '@/lib/notification-bus'

export const dynamic = 'force-dynamic'

// Admin-authored Finance notifications ("Bank server maintenance tonight",
// "GST filing deadline Friday", …) — distinct from the automatic event
// notifications wired into the AP/AR/PO/JE/etc. routes.
//
// The sender is always the signed-in user (session cookie), never a
// client-supplied header, because this action can page every finance user
// at P0 — the identity that unlocks it must not be spoofable.

const TYPES = ['info', 'warning', 'error', 'success']
const PRIORITIES = ['P0', 'P1', 'P2']

type Audience =
  | { kind: 'all' }
  | { kind: 'role'; role: string; siteCode?: string | null }
  | { kind: 'site'; siteCode: string }
  | { kind: 'emails'; emails: string[] }

function recipientsFor(audience: Audience): string[] | string {
  switch (audience.kind) {
    case 'all': return 'site:ALL'
    case 'role': return audience.siteCode ? `role:${audience.role}:site:${audience.siteCode}` : `role:${audience.role}`
    case 'site': return `site:${audience.siteCode}`
    case 'emails': return audience.emails
  }
}

// GET: whether the signed-in user may broadcast, plus the broadcasts they've sent.
export async function GET(request: NextRequest) {
  try {
    const actor = getInboxOwner(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
    const pdb = getDbForRequest(request)

    const decision = await hasPermission(pdb, actor, 'ADMIN_CREATE')
    if (!decision.allowed) return NextResponse.json({ success: true, data: { canBroadcast: false, broadcasts: [] } })

    const recent = await pdb.finNotification.findMany({
      where: { entityType: 'Broadcast', actorEmail: { equals: actor, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      distinct: ['entityId'],
      take: 20,
    })
    const counts = recent.length
      ? await pdb.finNotification.groupBy({
          by: ['entityId'],
          where: { entityType: 'Broadcast', entityId: { in: recent.map((r: any) => r.entityId) } },
          _count: { id: true },
        })
      : []
    const countByEntity = new Map(counts.map((c: any) => [c.entityId, c._count.id]))

    return NextResponse.json({
      success: true,
      data: {
        canBroadcast: true,
        broadcasts: recent.map((r: any) => ({
          entityId: r.entityId,
          title: r.title,
          message: r.message,
          type: r.type,
          priority: r.priority,
          siteCode: r.siteCode,
          createdAt: r.createdAt,
          recipientCount: countByEntity.get(r.entityId) ?? 1,
        })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST: send a new broadcast.
// { title, message, type?, priority?, link?, finYear?,
//   audience: { kind: 'all' } | { kind: 'role', role, siteCode? } | { kind: 'site', siteCode } | { kind: 'emails', emails } }
export async function POST(request: NextRequest) {
  try {
    const actor = getInboxOwner(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
    const pdb = getDbForRequest(request)

    const denied = await assertPermission(pdb, actor, 'ADMIN_CREATE', { request, module: 'Admin', entityId: 'broadcast' })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to send finance notifications' }, { status: 403 })

    const body = await request.json()
    const title = String(body.title || '').trim()
    const message = String(body.message || '').trim()
    const type = TYPES.includes(body.type) ? body.type : 'info'
    const priority = PRIORITIES.includes(body.priority) ? body.priority : 'P2'
    const audience: Audience = body.audience || { kind: 'all' }

    if (!title || !message) return NextResponse.json({ success: false, error: 'title and message are required' }, { status: 400 })
    if (audience.kind === 'role' && !audience.role) return NextResponse.json({ success: false, error: 'role is required for a role audience' }, { status: 400 })
    if (audience.kind === 'site' && !audience.siteCode) return NextResponse.json({ success: false, error: 'siteCode is required for a site audience' }, { status: 400 })
    if (audience.kind === 'emails' && !audience.emails?.length) return NextResponse.json({ success: false, error: 'at least one email is required' }, { status: 400 })

    const siteCode = (audience.kind === 'role' || audience.kind === 'site') ? (audience.siteCode ?? null) : null
    const entityId = `BC-${Date.now()}`

    const sent = await emitNotification(pdb, {
      entityType: 'Broadcast',
      entityId,
      title,
      message,
      type,
      priority,
      siteCode,
      finYear: body.finYear || deriveFinYear(),
      link: body.link || null,
      actorEmail: actor,
      recipients: recipientsFor(audience),
    })

    if (sent === 0) return NextResponse.json({ success: false, error: 'No matching recipients were found for that audience' }, { status: 400 })
    return NextResponse.json({ success: true, sent, entityId }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
