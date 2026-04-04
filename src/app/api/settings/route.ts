import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Return all settings as key-value object
export async function GET() {
  try {
    const settings = await db.companySettings.findMany({
      select: {
        key: true,
        value: true,
        label: true,
      },
    })

    // Convert array to key-value object
    const settingsMap: Record<string, string> = {}
    const labelsMap: Record<string, string> = {}
    for (const s of settings) {
      settingsMap[s.key] = s.value
      labelsMap[s.key] = s.label
    }

    return NextResponse.json({
      success: true,
      data: {
        settings: settingsMap,
        labels: labelsMap,
      },
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT: Upsert settings (accept object of key-value pairs)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'settings object with key-value pairs is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const [key, value] of Object.entries(settings)) {
      const result = await db.companySettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          label: key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .trim(),
        },
      })
      results.push(result)
    }

    // Return updated settings as key-value map
    const settingsMap: Record<string, string> = {}
    for (const r of results) {
      settingsMap[r.key] = r.value
    }

    return NextResponse.json({ success: true, data: settingsMap })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
