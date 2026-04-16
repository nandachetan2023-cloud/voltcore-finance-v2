import { NextResponse } from 'next/server'
import { loadBiometricSites } from '@/lib/biometric'

export const dynamic = 'force-dynamic'

// GET: List all configured biometric sites
export async function GET() {
  try {
    const sites = loadBiometricSites()
    
    const siteList = sites.map(site => ({
      id: site.id,
      name: site.name,
    }))

    return NextResponse.json({
      success: true,
      data: siteList,
    })
  } catch (error) {
    console.error('Error fetching biometric sites:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch biometric sites' },
      { status: 500 }
    )
  }
}
