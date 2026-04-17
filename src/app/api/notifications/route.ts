import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper: get caller's email from cookie (set at login via erp_auth_user in localStorage,
// but we use the erp_user_role cookie + a separate user-email cookie we'll set)
function getCallerEmail(request: NextRequest): string | null {
  return request.cookies.get('erp_user_email')?.value || null
}

// GET: Fetch notifications for the current user
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  const userEmail = getCallerEmail(request)

  try {
    // If we have a user email, fetch their personal notifications
    if (userEmail) {
      const role = request.cookies.get('erp_user_role')?.value
      const isAdmin = role === 'admin'

      // Build query: personal notifications + admin broadcast if admin
      const whereClause: any = {
        isRead: false,
        OR: [{ userEmail }],
      }
      if (isAdmin) {
        whereClause.OR.push({ userEmail: '__admin_broadcast__' })
      }

      const notifications = await db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return NextResponse.json({
        success: true,
        data: {
          notifications: notifications.map(n => ({
            id: String(n.id),
            title: n.title,
            message: n.message,
            time: formatTime(n.createdAt),
            type: n.type,
            link: n.link,
            isRead: n.isRead,
            entityType: n.entityType,
            entityId: n.entityId,
          })),
          count: notifications.length,
        },
      })
    }

    // Fallback: system-wide notifications (biometric, etc.)
    const unprocessedBiometricCount = await db.biometricRawLog.count({
      where: { processed: false },
    }).catch(() => 0)

    const notifications: any[] = []
    if (unprocessedBiometricCount > 0) {
      notifications.push({
        id: 'biometric-unprocessed',
        title: 'Unprocessed Biometric Logs',
        message: `${unprocessedBiometricCount} biometric logs need processing`,
        time: 'Just now',
        type: 'warning',
        link: '/hrms/biometric',
      })
    }

    return NextResponse.json({
      success: true,
      data: { notifications, count: notifications.length },
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
      await db.notification.updateMany({
        where: { userEmail, isRead: false },
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
