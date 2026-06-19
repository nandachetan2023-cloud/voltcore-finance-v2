import { NextRequest, NextResponse } from 'next/server'
import { createBiometricServiceFromDb, loadBiometricSitesFromDb } from '@/lib/biometric'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Process raw logs to attendance.
// Body: { rematch?: boolean, siteId?: string, force?: boolean }
//  - rematch=false (default): process only NEW (unprocessed) logs
//  - rematch=true: also re-evaluate previously skipped/unmatched logs
//    (used after assigning a shift or creating the employee — respects the
//    shift's effective date for each historical punch).
//  - force=true (with rematch=true): ALSO resets already-matched logs so ALL
//    processed raw logs are reprocessed (use when attendance records were
//    deleted but raw logs are still marked matched=true).
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const body = await request.json().catch(() => ({}))
    const rematch: boolean = !!body.rematch
    const force: boolean = !!body.force
    const siteId: string | undefined = body.siteId

    // Determine which sites to run against.
    let siteIds: (string | undefined)[]
    if (siteId) {
      siteIds = [siteId]
    } else if (rematch) {
      // Re-match needs to target each site individually (it filters by siteId).
      const sites = await loadBiometricSitesFromDb(db, tenantId)
      siteIds = sites.length > 0 ? sites.map(s => s.id) : [undefined]
    } else {
      siteIds = [undefined]
    }

    let totalReset = 0
    let totalProcessed = 0
    const processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }> = []
    const skippedRecords: Array<{ empCode: string; name: string; date: string; reason: string }> = []

    for (const sid of siteIds) {
      const biometricService = await createBiometricServiceFromDb(sid, db, tenantId)
      if (rematch) {
        const r = await biometricService.rematchUnmatched(force)
        totalReset += r.reset
        totalProcessed += r.processedCount
        processedEmployees.push(...r.processedEmployees)
        skippedRecords.push(...r.skippedRecords)
      } else {
        const r = await biometricService.processRawLogs()
        totalProcessed += r.processedCount
        processedEmployees.push(...r.processedEmployees)
        skippedRecords.push(...r.skippedRecords)
      }
    }

    return NextResponse.json({
      success: true,
      message: force ? 'Force re-match completed — all processed logs were re-evaluated' : (rematch ? 'Re-match completed' : 'Raw logs processed successfully'),
      data: {
        rematch,
        force,
        resetCount: totalReset,
        processedCount: totalProcessed,
        processedEmployees,
        skippedRecords,
      },
    })
  } catch (error) {
    console.error('Process logs error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
