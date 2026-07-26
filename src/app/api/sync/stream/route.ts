import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * SSE endpoint for real-time sync progress.
 * GET /api/sync/stream?batchId=xxx
 *
 * Events emitted:
 *   - progress: { module, progress, recordsSynced, status }
 *   - module_complete: { module, recordsSynced, errors, status }
 *   - sync_complete: { batchId, summary }
 *   - heartbeat: keeps connection alive
 *
 * Closes after 5 minutes of inactivity or when sync is done.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batchId')

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch { /* client disconnected */ }
      }

      // Emit heartbeat every 15s to keep connection alive
      intervalId = setInterval(() => send('heartbeat', { ts: Date.now() }), 15_000)

      // Safety: auto-close after 5 minutes
      timeoutId = setTimeout(() => {
        if (!closed) {
          closed = true
          clearInterval(intervalId!)
          try { controller.close() } catch { /* already closed */ }
        }
      }, 5 * 60 * 1000)

      // Immediately acknowledge connection
      send('connected', { batchId: batchId ?? null, ts: Date.now() })

      // Poll for progress updates every 800ms
      let lastLogCount = 0
      const poll = setInterval(async () => {
        if (closed) { clearInterval(poll); return }

        try {
          if (batchId) {
            // Fresh logs for this batch
            const logs = await db.syncLog.findMany({
              where: { syncBatchId: batchId },
              orderBy: { createdAt: 'asc' },
            })

            const completedModules = new Set(
              logs
                .filter((l) => l.action === 'SYNC_COMPLETE' || l.action === 'SYNC')
                .map((l) => l.module),
            )

            // Emit progress for each module that's done
            for (const mod of completedModules) {
              const modLogs = logs.filter((l) => l.module === mod)
              const totalRecords = modLogs.reduce((sum: number, l: { recordsSynced: number }) => sum + l.recordsSynced, 0)
              const hasErrors = modLogs.some((l) => l.status === 'Error')
              const hasConflicts = modLogs.some((l) => l.status === 'Conflict')
              const status = hasErrors ? 'Completed with Errors' : hasConflicts ? 'Completed with Conflicts' : 'Success'

              send('module_complete', {
                module: mod,
                recordsSynced: totalRecords,
                errors: modLogs.filter((l) => l.status === 'Error').length,
                conflicts: modLogs.filter((l) => l.status === 'Conflict').length,
                status,
              })
            }

            // Check if ALL modules for this batch are done
            const allModules = new Set(ALL_MODULES)
            const isComplete = [...completedModules].every((m) => allModules.has(m))
            if (isComplete || (logs.length > 0 && lastLogCount === logs.length && lastLogCount > 0)) {
              clearInterval(poll)
              const totalRecords = logs.reduce((sum: number, l: { recordsSynced: number }) => sum + l.recordsSynced, 0)
              const totalErrors = logs.filter((l: { status: string }) => l.status === 'Error').length
              send('sync_complete', {
                batchId,
                summary: { totalRecordsSynced: totalRecords, totalErrors },
              })
              closed = true
              clearInterval(intervalId!)
              clearTimeout(timeoutId!)
              try { controller.close() } catch { /* already closed */ }
              return
            }

            lastLogCount = logs.length
          } else {
            // No batchId — fetch latest sync statuses for all modules
            const configs = await db.syncConfig.findMany({ orderBy: { module: 'asc' } })
            for (const cfg of configs) {
              send('progress', {
                module: cfg.module,
                progress: cfg.lastStatus === 'Syncing' ? 50 : 100,
                recordsSynced: cfg.totalSynced,
                status: cfg.lastStatus,
                lastSyncAt: cfg.lastSyncAt,
              })
            }
          }
        } catch { /* DB error — skip this poll */ }
      }, 800)
    },

    cancel() {
      closed = true
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering if any
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

const ALL_MODULES = [
  'employees', 'inventory', 'sales', 'projects',
  'finance', 'equipment', 'attendance', 'payroll',
]