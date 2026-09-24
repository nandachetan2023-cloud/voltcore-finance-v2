import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { getInboxOwner } from '@/lib/notification-bus'
import { maybeRunFinOverdueAlerts } from '@/lib/services/fin-overdue-alerts'

export const dynamic = 'force-dynamic'

// GET: Ultra inbox - FinNotification filtered by finYear, siteCode, priority, status
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const actor = getInboxOwner(request)
    const status = searchParams.get('status') // unread|read|actioned|snoozed|archived|all
    const finYear = searchParams.get('finYear')
    const siteCode = searchParams.get('siteCode')
    const priority = searchParams.get('priority') // P0|P1|P2
    const take = Math.min(Number(searchParams.get('take')||'50'), 100)

    if (!actor) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
    const me = { equals: actor, mode: 'insensitive' as const }
    maybeRunFinOverdueAlerts(pdb)

    // Snoozes that have run out come back as unread.
    await pdb.finNotification.updateMany({
      where: { userEmail: me, status: 'snoozed', snoozedUntil: { lte: new Date() } },
      data: { status: 'unread' },
    }).catch(() => {})

    const where: any = { userEmail: me }
    if (status && status !== 'all') where.status = status
    else if (!status) where.status = { not: 'archived' }
    if (finYear) where.finYear = finYear
    if (siteCode) where.siteCode = siteCode
    if (priority) where.priority = priority

    const [rows, unreadCount, facets] = await Promise.all([
      pdb.finNotification.findMany({ where, orderBy: { createdAt: 'desc' }, take }),
      pdb.finNotification.count({ where: { userEmail: me, status: 'unread' } }),
      pdb.finNotification.findMany({
        where: { userEmail: me },
        select: { siteCode: true, finYear: true },
        distinct: ['siteCode', 'finYear'],
        take: 200,
      }),
    ])
    const sites = [...new Set(facets.map((f: any) => f.siteCode).filter(Boolean))].sort()
    const finYears = [...new Set(facets.map((f: any) => f.finYear).filter(Boolean))].sort().reverse()

    return NextResponse.json({ success: true, data: { notifications: rows, unreadCount, sites, finYears } })
  } catch (e:any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST: bulk actions - read|unread|actioned|snooze|escalate|archive
export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const { action, ids, snoozedUntil, escalateTo } = body as { action: string; ids: number[]; snoozedUntil?: string; escalateTo?: string }
    const actorEmail = getInboxOwner(request)
    if (!actorEmail) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
    const me = { equals: actorEmail, mode: 'insensitive' as const }

    if (!action || !Array.isArray(ids) || ids.length===0) return NextResponse.json({ success:false, error:'action and ids required' }, { status:400 })

    let data: any = {}
    if (action === 'read') data = { status: 'read', isRead: true, readAt: new Date() }
    else if (action === 'unread') data = { status: 'unread', isRead: false, readAt: null }
    else if (action === 'actioned') data = { status: 'actioned', isRead: true }
    else if (action === 'snooze') data = { status: 'snoozed', snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : new Date(Date.now()+ 60*60*1000) }
    else if (action === 'escalate') data = { status: 'escalated', escalatedAt: new Date(), escalatedTo: escalateTo || null }
    else if (action === 'archive') data = { status: 'archived', isRead: true }
    else return NextResponse.json({ success:false, error:'unknown action' }, { status:400 })

    const res = await pdb.finNotification.updateMany({ where: { id: { in: ids.map(Number) }, userEmail: me }, data })
    return NextResponse.json({ success: true, updated: res.count })
  } catch (e:any) {
    return NextResponse.json({ success:false, error:e.message }, { status:500 })
  }
}
