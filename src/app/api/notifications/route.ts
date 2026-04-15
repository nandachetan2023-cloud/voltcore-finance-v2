import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Fetch notifications for current user
export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from session/auth
    // For now, returning system-wide notifications
    
    // Example: Get pending leave requests count
    const pendingLeaveCount = 0; // await db.leaveRequest.count({ where: { status: 'pending' } })
    
    // Example: Get unprocessed biometric logs
    const unprocessedBiometricCount = await db.biometricRawLog.count({
      where: { processed: false },
    })

    const notifications: any[] = []

    // Add notification for unprocessed biometric logs
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

    // Add notification for pending leave requests
    if (pendingLeaveCount > 0) {
      notifications.push({
        id: 'leave-pending',
        title: 'Pending Leave Requests',
        message: `${pendingLeaveCount} leave requests awaiting approval`,
        time: 'Today',
        type: 'info',
        link: '/hrms/leave',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
      },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
      },
      { status: 500 }
    )
  }
}

// POST: Mark notification as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId } = body

    // TODO: Mark notification as read in database
    // await db.notification.update({
    //   where: { id: notificationId },
    //   data: { read: true },
    // })

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark notification as read',
      },
      { status: 500 }
    )
  }
}
