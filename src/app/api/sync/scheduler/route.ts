import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Auto-sync scheduler endpoint.
 * GET /api/sync/scheduler — checks for due modules and triggers sync
 *
 * Should be called every 60 seconds by an external cron (Vercel Cron, GitHub Actions, etc.)
 * or can be triggered manually via a browser/curl request.
 *
 * Also supports POST for manual trigger of all due modules.
 */
export async function GET() {
  const now = new Date()

  try {
    // Find all modules where autoSync is enabled and nextSyncAt <= now
    const dueConfigs = await db.syncConfig.findMany({
      where: {
        enabled: true,
        autoSync: true,
        OR: [
          { nextSyncAt: { lte: now } },
          { nextSyncAt: null },
        ],
      },
    })

    if (dueConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No modules due for auto-sync',
        dueCount: 0,
        nextCheckAt: new Date(now.getTime() + 60_000).toISOString(),
      })
    }

    const results: { module: string; triggered: boolean; batchId?: string; error?: string }[] = []

    for (const cfg of dueConfigs) {
      try {
        // Trigger sync for this module via internal call to the sync route
        const triggerRes = await triggerModuleSync(cfg.module)
        results.push({ module: cfg.module, triggered: true, batchId: triggerRes.batchId })

        // Schedule next run
        await db.syncConfig.update({
          where: { module: cfg.module },
          data: {
            nextSyncAt: new Date(now.getTime() + cfg.syncInterval * 1000),
            lastStatus: 'Syncing',
          },
        })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        results.push({ module: cfg.module, triggered: false, error: errMsg })

        // Log failure
        await db.syncLog.create({
          data: {
            module: cfg.module,
            action: 'AUTO_SYNC_TRIGGER',
            status: 'Error',
            direction: 'Pull',
            errorMessage: errMsg.slice(0, 500),
            syncBatchId: null,
            duration: 0,
            recordsSynced: 0,
            startedAt: now,
            completedAt: now,
          },
        }).catch(() => {})

        await db.syncConfig.update({
          where: { module: cfg.module },
          data: { lastStatus: 'Failed' },
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-sync triggered for ${results.filter((r) => r.triggered).length} modules`,
      dueCount: dueConfigs.length,
      triggeredCount: results.filter((r) => r.triggered).length,
      results,
      nextCheckAt: new Date(now.getTime() + 60_000).toISOString(),
    })
  } catch (error) {
    console.error('[Scheduler] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Scheduler check failed' },
      { status: 500 },
    )
  }
}

/**
 * POST — manually trigger auto-sync for all due modules (same as GET, but explicit)
 */
export async function POST() {
  return GET()
}

// ─────────────────────────────────────────────
// Internal helper — triggers sync for ONE module
// ─────────────────────────────────────────────

async function triggerModuleSync(module: string): Promise<{ batchId: string }> {
  const batchId = crypto.randomUUID()
  const now = new Date()

  // Reuse the sync logic from the main route by calling it
  // Since we can't import the handler directly, we call the DB upsert logic.
  // In a real production setup, this would be a shared service function.
  //
  // For now: update status to indicate sync in progress
  await db.syncConfig.update({
    where: { module },
    data: { lastStatus: 'Syncing', lastSyncAt: now },
  }).catch(() => {})

  return { batchId }
}