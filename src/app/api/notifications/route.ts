import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getCallerEmail(request: NextRequest): string | null {
  // Try cookie first, then parse from erp_auth_user if available
  return request.cookies.get('erp_user_email')?.value || null
}

function getCallerRole(request: NextRequest): string {
  return request.cookies.get('erp_user_role')?.value || 'admin'
}

const shape = (n: any) => ({
  id: String(n.id),
  title: n.title,
  message: n.message,
  time: formatTime(n.createdAt),
  createdAt: n.createdAt,
  type: n.type,
  link: n.link,
  isRead: n.isRead,
  entityType: n.entityType,
  entityId: n.entityId,
})

// GET: Fetch notifications for the current user.
//
// Default (no params) returns UNREAD only — the header bell relies on that.
// The Notifications module passes ?status=all|read and paginates, which is why
// read rows are reachable at all: before this they were filtered out
// permanently, so marking something read destroyed the only way to see it.
//
//   ?status=unread (default) | read | all
//   ?entityType=leave|tour|request|…   filter by source
//   ?type=info|success|warning|error   filter by severity
//   ?q=<text>                          search title + message
//   ?limit / ?offset                   pagination (module view)
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const userEmail = getCallerEmail(request)
  const role = getCallerRole(request)
  const isAdmin = role === 'admin'

  try {
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || 'unread').toLowerCase()
    const entityType = searchParams.get('entityType')
    const type = searchParams.get('type')
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Recipient scope: personal rows, plus the admin broadcast pseudo-inbox.
    const recipients: any[] = []
    if (userEmail) recipients.push({ userEmail })
    if (isAdmin) recipients.push({ userEmail: '__admin_broadcast__' })
    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        data: { notifications: [], count: 0, total: 0, unreadCount: 0, hasMore: false },
      })
    }

    const where: any = { OR: recipients }
    if (status === 'unread') where.isRead = false
    else if (status === 'read') where.isRead = true
    // status === 'all' → no isRead constraint

    if (entityType) where.entityType = entityType
    if (type) where.type = type
    if (q) {
      // AND the search against the recipient scope rather than widening OR,
      // which would otherwise leak other people's notifications.
      where.AND = [{
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { message: { contains: q, mode: 'insensitive' } },
        ],
      }]
    }

    const [rows, total, unreadCount] = await Promise.all([
      db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      db.notification.count({ where }),
      db.notification.count({ where: { OR: recipients, isRead: false } }),
    ])

    const notifications = rows.map(shape)

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        // `count` stays the returned-row count for the existing bell consumer.
        count: notifications.length,
        total,
        unreadCount,
        hasMore: offset + notifications.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST: mark read/unread, or mark-all.
//
//   { notificationId }                 mark one read   (legacy shape, kept)
//   { notificationId, isRead: false }  mark one unread
//   { markAllRead: true }              mark everything in scope read
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const callerEmail = getCallerEmail(request)
  const isAdmin = getCallerRole(request) === 'admin'
  try {
    const body = await request.json()
    const { notificationId, markAllRead, isRead } = body

    if (markAllRead) {
      // Scope to the CALLER's cookie, not a body-supplied email — trusting the
      // body would let anyone mark another user's notifications read. The
      // broadcast inbox is only included for admins, who are the only ones
      // that can see it in GET.
      const recipients: any[] = []
      if (callerEmail) recipients.push({ userEmail: callerEmail })
      if (isAdmin) recipients.push({ userEmail: '__admin_broadcast__' })
      if (recipients.length === 0) {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
      }
      const r = await db.notification.updateMany({
        where: { OR: recipients, isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, data: { updated: r.count } })
    }

    if (notificationId) {
      // Verify the row belongs to the caller before touching it — ids are
      // sequential integers, so without this any id could be flipped.
      const existing = await db.notification.findUnique({ where: { id: parseInt(notificationId) } })
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })
      }
      const ownsIt = existing.userEmail === callerEmail
        || (isAdmin && existing.userEmail === '__admin_broadcast__')
      if (!ownsIt) {
        return NextResponse.json({ success: false, error: 'Not your notification' }, { status: 403 })
      }
      await db.notification.update({
        where: { id: parseInt(notificationId) },
        data: { isRead: isRead === false ? false : true },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'notificationId or markAllRead required' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 })
  }
}

// DELETE: remove notifications the caller owns.
//   { notificationId }      delete one
//   { clearRead: true }     delete every read notification in scope
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  const callerEmail = getCallerEmail(request)
  const isAdmin = getCallerRole(request) === 'admin'
  try {
    const body = await request.json()
    const { notificationId, clearRead } = body

    const recipients: any[] = []
    if (callerEmail) recipients.push({ userEmail: callerEmail })
    if (isAdmin) recipients.push({ userEmail: '__admin_broadcast__' })
    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    if (clearRead) {
      const r = await db.notification.deleteMany({ where: { OR: recipients, isRead: true } })
      return NextResponse.json({ success: true, data: { deleted: r.count } })
    }

    if (notificationId) {
      const existing = await db.notification.findUnique({ where: { id: parseInt(notificationId) } })
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })
      }
      const ownsIt = existing.userEmail === callerEmail
        || (isAdmin && existing.userEmail === '__admin_broadcast__')
      if (!ownsIt) {
        return NextResponse.json({ success: false, error: 'Not your notification' }, { status: 403 })
      }
      await db.notification.delete({ where: { id: parseInt(notificationId) } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'notificationId or clearRead required' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 })
  }
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
