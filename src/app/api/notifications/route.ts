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

// GET: Fetch notifications for the current user
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const userEmail = getCallerEmail(request)
  const role = getCallerRole(request)
  const isAdmin = role === 'admin'

  try {
    const dbNotifications: any[] = []

    if (userEmail) {
      // Personal notifications + admin broadcast
      const whereClause: any = {
        isRead: false,
        OR: [{ userEmail }],
      }
      if (isAdmin) {
        whereClause.OR.push({ userEmail: '__admin_broadcast__' })
      }

      const rows = await db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      dbNotifications.push(...rows.map(n => ({
        id: String(n.id),
        title: n.title,
        message: n.message,
        time: formatTime(n.createdAt),
        type: n.type,
        link: n.link,
        isRead: n.isRead,
        entityType: n.entityType,
        entityId: n.entityId,
      })))
    } else if (isAdmin) {
      // No email cookie — fetch admin broadcast notifications
      const rows = await db.notification.findMany({
        where: { userEmail: '__admin_broadcast__', isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      dbNotifications.push(...rows.map(n => ({
        id: String(n.id),
        title: n.title,
        message: n.message,
        time: formatTime(n.createdAt),
        type: n.type,
        link: n.link,
        isRead: n.isRead,
        entityType: n.entityType,
        entityId: n.entityId,
      })))
    }

    // Merge: db notifications only — live system checks removed.
    // Notifications are created in the DB when events happen (leave submitted,
    // request approved, etc.) and cleared when marked as read.
    return NextResponse.json({
      success: true,
      data: { notifications: dbNotifications, count: dbNotifications.length },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST: Mark notification(s) as read
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { notificationId, markAllRead, userEmail } = body

    if (markAllRead && userEmail) {
      // Mark personal notifications as read
      await db.notification.updateMany({
        where: { userEmail, isRead: false },
        data: { isRead: true },
      })
      // Also mark admin broadcast notifications as read
      await db.notification.updateMany({
        where: { userEmail: '__admin_broadcast__', isRead: false },
        data: { isRead: true },
      })
    } else if (notificationId) {
      await db.notification.update({
        where: { id: parseInt(notificationId) },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 })
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
