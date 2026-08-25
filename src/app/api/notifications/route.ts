import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export async function GET(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const userEmail = request.nextUrl.searchParams.get('userEmail')?.trim() || undefined
    const where = userEmail ? { userEmail } : {}
    const rows = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const notifications = rows.map((n) => ({
      id: String(n.id),
      type: n.type,
      title: n.title,
      message: n.message,
      time: relativeTime(n.createdAt),
      entityType: n.entityType,
      entityId: n.entityId,
      link: n.link,
    }))
    return NextResponse.json({ success: true, data: { notifications } })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ success: true, data: { notifications: [] } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const body = await request.json()

    // Mark all read for a user
    if (body.markAllRead) {
      await db.notification.updateMany({
        where: { userEmail: body.userEmail || '', isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true })
    }

    // Mark a single notification read
    if (body.notificationId) {
      await db.notification.updateMany({
        where: { id: Number(body.notificationId) },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true })
    }

    // Create a notification (used by the Finance Assistant to share alerts)
    const n = await db.notification.create({
      data: {
        userId: body.userId ?? 0,
        userEmail: body.userEmail ?? '',
        title: body.title ?? 'Notification',
        message: body.message ?? '',
        type: body.type ?? 'info',
        link: body.link ?? '',
        entityType: body.entityType ?? 'finance',
        entityId: body.entityId ?? null,
      },
    })
    return NextResponse.json({ success: true, data: { id: n.id } })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save notification' }, { status: 500 })
  }
}
