import { NextRequest, NextResponse } from 'next/server';
import { superadminDb } from '@/lib/superadmin-db';
import { BiometricService, loadBiometricSites } from '@/lib/biometric';

export const dynamic = 'force-dynamic';

/**
 * Connection test for a biometric site.
 *
 * The UI (HRMS > Biometric Settings and the Superadmin > Biometric panel) calls
 * GET /api/biometric/test?siteId=… and reads
 *   data[0].format1.success / data[0].format2.success
 * The route used to be missing, so the request answered with Next's HTML 404
 * page and the client crashed on res.json() ("Unexpected token '<'").
 *
 * It tries the two punch-data formats the device exposes; a device that is
 * unreachable simply reports success:false with the reason — never an exception.
 */

const today = () => {
  const d = new Date()
  const iso = d.toISOString().slice(0, 10)
  return { from: iso, to: iso }
}

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('siteId') || undefined
  const tenantId = request.cookies.get('erp_tenant_id')?.value

  try {
    const config = await resolveConfig(siteId, tenantId)
    if (!config) {
      return NextResponse.json({
        success: false,
        error: siteId ? `No biometric configuration for site "${siteId}"` : 'No biometric site configured',
        data: [],
      })
    }

    const service = new BiometricService(config.config)
    const { from, to } = today()

    const [format1, format2] = await Promise.all([
      probe('InOutPunchData', () => service.fetchInOutPunchData('ALL', from, to)),
      probe('RawPunchData', () => service.fetchRawPunchData('ALL', from, to)),
    ])

    return NextResponse.json({
      success: true,
      data: [
        {
          siteId: config.id,
          siteName: config.name,
          format1,
          format2,
        },
      ],
    })
  } catch (error) {
    console.error('[biometric/test] Error testing connection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to test the biometric connection', data: [] },
      { status: 500 }
    )
  }
}

async function probe(label: string, run: () => Promise<unknown[]>) {
  try {
    const rows = await run()
    return { success: true, format: label, records: Array.isArray(rows) ? rows.length : 0 }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[biometric/test] ${label} probe failed:`, message)
    return { success: false, format: label, error: message, records: 0 }
  }
}

async function resolveConfig(siteId: string | undefined, tenantId: string | undefined) {
  if (tenantId) {
    try {
      const row = await superadminDb.biometricSiteConfig.findFirst({
        where: { tenantId, isActive: true, ...(siteId ? { siteId } : {}) },
        orderBy: { createdAt: 'asc' },
      })
      if (row) {
        return {
          id: row.siteId,
          name: row.siteName,
          config: {
            baseUrl: row.baseUrl,
            corporateId: row.corporateId,
            username: row.username,
            password: row.password,
            siteId: row.siteId,
            siteName: row.siteName,
          },
        }
      }
    } catch (error) {
      console.error('[biometric/test] Failed to load site config:', error)
    }
  }

  // Fall back to the .env-driven legacy sites
  const sites = loadBiometricSites()
  const site = siteId ? sites.find((s) => s.id === siteId) : sites[0]
  return site || null
}
