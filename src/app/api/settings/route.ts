import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Return all settings as key-value object
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const settings = await db.companySettings.findMany({
      select: { key: true, value: true, label: true, group: true },
      orderBy: { group: 'asc' },
    })

    const settingsMap: Record<string, string> = {}
    for (const s of settings) {
      settingsMap[s.key] = s.value
    }

    return NextResponse.json({ success: true, data: { settings: settingsMap } })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT: Upsert settings — accepts { settings: { key: value, ... }, group?: string }
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { settings, groups } = body

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json({ success: false, error: 'settings object required' }, { status: 400 })
    }

    for (const [key, value] of Object.entries(settings)) {
      const group = groups?.[key] || 'general'
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

      await db.companySettings.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value), label, group, updatedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  }
}
