import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: List all biometric site configs for this tenant
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const sites = await db.biometricSiteConfig.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        siteId: true,
        siteName: true,
        baseUrl: true,
        corporateId: true,
        username: true,
        // Never return password in GET
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json({ success: true, data: sites })
  } catch (error) {
    console.error('Error fetching biometric configs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch biometric configs' }, { status: 500 })
  }
}

// POST: Create a new biometric site config
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { siteId, siteName, baseUrl, corporateId, username, password } = body

    if (!siteId || !siteName || !corporateId || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'siteId, siteName, corporateId, username and password are required' },
        { status: 400 }
      )
    }

    const config = await db.biometricSiteConfig.create({
      data: {
        siteId,
        siteName,
        baseUrl: baseUrl || 'https://api.etimeoffice.com/api',
        corporateId,
        username,
        password,
        isActive: true,
        updatedAt: new Date(),
      },
      select: {
        id: true, siteId: true, siteName: true, baseUrl: true,
        corporateId: true, username: true, isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: config }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'A site with this siteId already exists' }, { status: 409 })
    }
    console.error('Error creating biometric config:', error)
    return NextResponse.json({ success: false, error: 'Failed to create biometric config' }, { status: 500 })
  }
}

// PUT: Update a biometric site config
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, password, ...rest } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const updateData: any = { ...rest, updatedAt: new Date() }
    // Only update password if explicitly provided
    if (password && password.trim() !== '') {
      updateData.password = password
    }

    const config = await db.biometricSiteConfig.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true, siteId: true, siteName: true, baseUrl: true,
        corporateId: true, username: true, isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Error updating biometric config:', error)
    return NextResponse.json({ success: false, error: 'Failed to update biometric config' }, { status: 500 })
  }
}

// DELETE: Remove a biometric site config
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    await db.biometricSiteConfig.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting biometric config:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete biometric config' }, { status: 500 })
  }
}
