import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Ultra inbox - FinNotification filtered by finYear, siteCode, priority, status
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const actor = request.headers.get('x-actor-email')?.trim() || searchParams.get('actor')?.trim() || ''
    const status = searchParams.get('status') // unread|read|all
    const finYear = searchParams.get('finYear')
    const siteCode = searchParams.get('siteCode')
    const priority = searchParams.get('priority') // P0|P1|P2
    const take = Math.min(Number(searchParams.get('take')||'50'), 100)

    if (!actor) return NextResponse.json({ success: false, error: 'actor required (x-actor-email)' }, { status: 400 })

    const where: any = { userEmail: actor }
    if (status && status !== 'all') where.status = status
    if (finYear) where.finYear = finYear
    if (siteCode) where.siteCode = siteCode
    if (priority) where.priority = priority

    const [rows, unreadCount] = await Promise.all([
      pdb.finNotification.findMany({ where, orderBy: { createdAt: 'desc' }, take }),
      pdb.finNotification.count({ where: { userEmail: actor, status: 'unread' } }),
    ])

    return NextResponse.json({ success: true, data: { notifications: rows, unreadCount, finYear, siteCode } })
  } catch (e:any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST: bulk actions - read|actioned|snooze|escalate|archive
export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const { action, ids, snoozedUntil, actor } = body as { action: string; ids: number[]; snoozedUntil?: string; actor?: string }
    const actorEmail = actor || request.headers.get('x-actor-email') || ''

    if (!action || !Array.isArray(ids) || ids.length===0) return NextResponse.json({ success:false, error:'action and ids required' }, { status:400 })

    let data: any = {}
    if (action === 'read') data = { status: 'read', isRead: true, readAt: new Date() }
    else if (action === 'actioned') data = { status: 'actioned', isRead: true }
    else if (action === 'snooze') data = { status: 'snoozed', snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : new Date(Date.now()+ 60*60*1000) }
    else if (action === 'escalate') data = { status: 'escalated', escalatedAt: new Date(), escalatedTo: actorEmail }
    else if (action === 'archive') data = { status: 'archived' }
    else return NextResponse.json({ success:false, error:'unknown action' }, { status:400 })

    const res = await pdb.finNotification.updateMany({ where: { id: { in: ids.map(Number) }, userEmail: actorEmail }, data })
    return NextResponse.json({ success: true, updated: res.count })
  } catch (e:any) {
    return NextResponse.json({ success:false, error:e.message }, { status:500 })
  }
}
