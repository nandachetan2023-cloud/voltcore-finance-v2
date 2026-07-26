import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

const ALL_MODULES = [
  'employees', 'inventory', 'sales', 'projects',
  'finance', 'equipment', 'attendance', 'payroll',
] as const
type SyncModule = (typeof ALL_MODULES)[number]

interface SyncResult {
  recordsSynced: number
  recordsUpdated: number
  errors: number
  conflicts: number
  logs: SyncLogEntry[]
  duration: number
}

interface SyncLogEntry {
  module: string
  action: string
  recordId: string
  status: string
  recordData?: string
  conflictReason?: string
  duration: number
  recordsSynced: number
}

interface ExternalRecord {
  id: string
  data: Record<string, unknown>
  updatedAt?: string
  hash?: string
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Simple hash for conflict detection */
async function computeHash(record: Record<string, unknown>): Promise<string> {
  const str = JSON.stringify(record, Object.keys(record).sort())
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Fetch with exponential backoff retry.
 * Retries up to 3 times: 1s, 2s, 4s
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { _attempt?: number } = {},
): Promise<Response> {
  const attempt = (options._attempt ?? 0) + 1
  const MAX_ATTEMPTS = 3
  const DELAYS = [1000, 2000, 4000]

  try {
    const res = await fetch(url, { ...options, _attempt: attempt })
    if (!res.ok && attempt < MAX_ATTEMPTS) {
      await delay(DELAYS[attempt - 1])
      return fetchWithRetry(url, { ...options, _attempt: attempt })
    }
    return res
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      await delay(DELAYS[attempt - 1])
      return fetchWithRetry(url, { ...options, _attempt: attempt })
    }
    throw err
  }
}

/**
 * Generic external ERP sync.
 * Fetches records from configured endpoint, upserts into local DB.
 */
async function syncFromExternalERP(
  batchId: string,
  module: SyncModule,
  config: { endpoint?: string | null; authKey?: string | null; lastSyncAt?: Date | null },
): Promise<SyncResult> {
  const startedAt = Date.now()
  const logs: SyncLogEntry[] = []
  let recordsSynced = 0
  let recordsUpdated = 0
  let errors = 0
  let conflicts = 0

  // If no endpoint configured, skip gracefully
  if (!config.endpoint) {
    logs.push({
      module,
      action: 'SYNC',
      recordId: '',
      status: 'Skipped',
      recordData: JSON.stringify({ reason: 'No endpoint configured' }),
      duration: 0,
      recordsSynced: 0,
    })
    return { recordsSynced, recordsUpdated, errors, conflicts, logs, duration: 0 }
  }

  // Build request headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  if (config.authKey) {
    headers['Authorization'] = `Bearer ${config.authKey}`
  }

  // Build URL with optional delta-sync param
  let url = config.endpoint
  if (config.lastSyncAt) {
    const separator = config.endpoint.includes('?') ? '&' : '?'
    url += `${separator}updatedAfter=${encodeURIComponent(config.lastSyncAt.toISOString())}`
  }

  try {
    const res = await fetchWithRetry(url, { method: 'GET', headers })

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText())
      logs.push({
        module,
        action: 'SYNC',
        recordId: '',
        status: 'Error',
        recordData: JSON.stringify({ status: res.status, body: errorText.slice(0, 200) }),
        duration: Date.now() - startedAt,
        recordsSynced: 0,
      })
      errors++
      return { recordsSynced, recordsUpdated, errors, conflicts, logs, duration: Date.now() - startedAt }
    }

    const json = await res.json()
    const records: ExternalRecord[] = Array.isArray(json) ? json : json.records ?? json.data ?? []

    for (const record of records) {
      try {
        const recordId = String(record.id ?? record._id ?? '')
        const recordHash = record.hash ?? await computeHash(record.data ?? record)
        const existingHash = await getLocalRecordHash(module, recordId)

        // Conflict: same record modified locally and remotely
        if (existingHash && existingHash !== recordHash) {
          conflicts++
          logs.push({
            module,
            action: 'CONFLICT_DETECT',
            recordId,
            status: 'Conflict',
            recordData: JSON.stringify({ localHash: existingHash, remoteHash: recordHash }),
            conflictReason: 'Record was modified both locally and in the external ERP since last sync',
            duration: 0,
            recordsSynced: 0,
          })
          continue
        }

        // Upsert: create or update based on module
        const dbResult = await upsertLocalRecord(module, record.id, record.data ?? record)
        if (dbResult.created) recordsSynced++
        else recordsUpdated++

        logs.push({
          module,
          action: dbResult.created ? 'CREATE' : 'UPDATE',
          recordId,
          status: 'Success',
          recordData: JSON.stringify({ id: recordId }),
          duration: 0,
          recordsSynced: dbResult.created ? 1 : 0,
        })
      } catch (err) {
        errors++
        const errMsg = err instanceof Error ? err.message : String(err)
        logs.push({
          module,
          action: 'SYNC_RECORD',
          recordId: String(record.id ?? 'unknown'),
          status: 'Error',
          recordData: JSON.stringify({ error: errMsg.slice(0, 100) }),
          duration: 0,
          recordsSynced: 0,
        })
      }
    }
  } catch (err) {
    errors++
    const errMsg = err instanceof Error ? err.message : String(err)
    logs.push({
      module,
      action: 'SYNC',
      recordId: '',
      status: 'Error',
      recordData: JSON.stringify({ error: errMsg }),
      duration: Date.now() - startedAt,
      recordsSynced: 0,
    })
  }

  const duration = Date.now() - startedAt
  logs.push({
    module,
    action: 'SYNC_COMPLETE',
    recordId: '',
    status: errors > 0 ? 'Completed with Errors' : 'Success',
    duration,
    recordsSynced: recordsSynced + recordsUpdated,
  })

  return { recordsSynced, recordsUpdated, errors, conflicts, logs, duration }
}

// ─────────────────────────────────────────────
// Local DB helpers — replace with actual model logic per module
// ─────────────────────────────────────────────

/** Get the hash of a previously synced record for conflict detection */
async function getLocalRecordHash(module: string, recordId: string): Promise<string | null> {
  // Read from SyncLog — the recordData contains a snapshot
  const log = await db.syncLog.findFirst({
    where: { module, recordId, status: { in: ['Success', 'Conflict'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (!log?.recordData) return null
  try {
    const parsed = JSON.parse(log.recordData)
    return parsed._hash ?? null
  } catch { return null }
}

/** Upsert a record into the appropriate module table */
async function upsertLocalRecord(
  module: string,
  externalId: string,
  data: Record<string, unknown>,
): Promise<{ created: boolean }> {
  // Delegate to module-specific upsert
  switch (module) {
    case 'employees': return upsertEmployee(externalId, data)
    case 'inventory': return upsertInventoryItem(externalId, data)
    case 'sales': return upsertSalesOrder(externalId, data)
    case 'projects': return upsertProject(externalId, data)
    case 'finance': return upsertFinanceRecord(externalId, data)
    case 'equipment': return upsertEquipment(externalId, data)
    case 'attendance': return upsertAttendance(externalId, data)
    case 'payroll': return upsertPayroll(externalId, data)
    default: throw new Error(`Unknown module: ${module}`)
  }
}

async function upsertEmployee(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  try {
    await db.employee.create({ data: { ...data } as Parameters<typeof db.employee.create>[0]['data'] })
    return { created: true }
  } catch {
    // Try update — use a unique field like empId or employeeCode
    const empId = (data.empId ?? data.employeeCode ?? externalId) as string
    await db.employee.updateMany({
      where: { employeeCode: empId } as Record<string, unknown>,
      data: data as Parameters<typeof db.employee.updateMany>[0]['data'],
    })
    return { created: false }
  }
}

async function upsertInventoryItem(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  try {
    await db.inventoryItem.create({ data: { ...data } as Parameters<typeof db.inventoryItem.create>[0]['data'] })
    return { created: true }
  } catch {
    const itemCode = (data.itemCode ?? externalId) as string
    await db.inventoryItem.updateMany({
      where: { itemCode } as Record<string, unknown>,
      data: data as Parameters<typeof db.inventoryItem.updateMany>[0]['data'],
    })
    return { created: false }
  }
}

async function upsertSalesOrder(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  try {
    await db.salesOrder.create({ data: { ...data } as Parameters<typeof db.salesOrder.create>[0]['data'] })
    return { created: true }
  } catch {
    const soNo = (data.soNo ?? externalId) as string
    await db.salesOrder.updateMany({
      where: { soNo } as Record<string, unknown>,
      data: data as Parameters<typeof db.salesOrder.updateMany>[0]['data'],
    })
    return { created: false }
  }
}

async function upsertProject(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  try {
    await db.project.create({ data: { ...data } as Parameters<typeof db.project.create>[0]['data'] })
    return { created: true }
  } catch {
    const code = (data.code ?? externalId) as string
    await db.project.updateMany({
      where: { code } as Record<string, unknown>,
      data: data as Parameters<typeof db.project.updateMany>[0]['data'],
    })
    return { created: false }
  }
}

async function upsertFinanceRecord(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  // Finance has many sub-tables; use invoice as primary
  try {
    await db.finInvoice.create({ data: { ...data } as Parameters<typeof db.finInvoice.create>[0]['data'] })
    return { created: true }
  } catch {
    const invNo = (data.invoiceNo ?? data.trackingNo ?? externalId) as string
    await db.finInvoice.updateMany({
      where: { invoiceNo: invNo } as Record<string, unknown>,
      data: data as Parameters<typeof db.finInvoice.updateMany>[0]['data'],
    })
    return { created: false }
  }
}

async function upsertEquipment(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  try {
    await db.equipment.create({ data: { ...data } as Parameters<typeof db.equipment.create>[0]['data'] })
    return { created: true }
  } catch {
    const eqId = (data.eqId ?? externalId) as string
    await db.equipment.updateMany({
      where: { eqId } as Record<string, unknown>,
      data: data as Parameters<typeof db.equipment.updateMany>[0]['data'],
    })
    return { created: false }
  }
}

async function upsertAttendance(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  try {
    await db.attendanceLog.create({ data: { ...data } as Parameters<typeof db.attendanceLog.create>[0]['data'] })
    return { created: true }
  } catch {
    return { created: false }
  }
}

async function upsertPayroll(externalId: string, data: Record<string, unknown>): Promise<{ created: boolean }> {
  try {
    await db.payroll.create({ data: { ...data } as Parameters<typeof db.payroll.create>[0]['data'] })
    return { created: true }
  } catch {
    return { created: false }
  }
}

// ─────────────────────────────────────────────
// GET: Sync status & logs
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const [configs, recentLogs] = await Promise.all([
      db.syncConfig.findMany({ orderBy: { module: 'asc' } }),
      db.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ])

    const totalSuccess = recentLogs.filter((l: { status: string }) => l.status === 'Success').length
    const totalConflicts = recentLogs.filter((l: { status: string }) => l.status === 'Conflict').length
    const totalErrors = recentLogs.filter((l: { status: string }) => l.status === 'Error').length
    const totalRecordsSynced = recentLogs.reduce((sum: number, l: { recordsSynced: number }) => sum + l.recordsSynced, 0)

    const moduleStatus = configs.map((c) => ({
      module: c.module,
      enabled: c.enabled,
      autoSync: c.autoSync,
      lastSyncAt: c.lastSyncAt,
      lastStatus: c.lastStatus,
      totalSynced: c.totalSynced,
      totalErrors: c.totalErrors,
      endpoint: c.endpoint,
      nextSyncAt: c.nextSyncAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        configs,
        moduleStatus,
        recentLogs,
        summary: {
          totalLogs: recentLogs.length,
          totalSuccess,
          totalConflicts,
          totalErrors,
          totalRecordsSynced,
          activeModules: configs.filter((c: { enabled: boolean }) => c.enabled).length,
          configuredModules: configs.length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sync status' },
      { status: 500 },
    )
  }
}

// ─────────────────────────────────────────────
// POST: Trigger sync / resolve conflict / toggle auto-sync
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, modules, logId, module: targetModule, enabled } = body

    // ── Action: status ──
    if (action === 'status') {
      const configs = await db.syncConfig.findMany({ orderBy: { module: 'asc' } })
      return NextResponse.json({
        success: true,
        data: {
          status: 'ready',
          configs: configs.map((c) => ({
            module: c.module,
            enabled: c.enabled,
            autoSync: c.autoSync,
            lastSyncAt: c.lastSyncAt,
            lastStatus: c.lastStatus,
            totalSynced: c.totalSynced,
            totalErrors: c.totalErrors,
            endpoint: c.endpoint,
            nextSyncAt: c.nextSyncAt,
          })),
          timestamp: new Date().toISOString(),
        },
      })
    }

    // ── Action: resolve conflict ──
    if (action === 'resolve') {
      if (!logId) {
        return NextResponse.json({ success: false, error: 'logId is required' }, { status: 400 })
      }
      const log = await db.syncLog.findUnique({ where: { id: Number(logId) } })
      if (!log) {
        return NextResponse.json({ success: false, error: 'Sync log not found' }, { status: 404 })
      }
      const { resolution, mergedData } = body

      // Apply resolution strategy
      if (resolution === 'keep_local') {
        // Mark as resolved, keep local data — nothing to do
      } else if (resolution === 'keep_remote' && mergedData) {
        // Overwrite local with remote data
        const recordId = log.recordId
        const mod = log.module as SyncModule
        await upsertLocalRecord(mod, recordId, mergedData)
      } else if (resolution === 'merge' && mergedData) {
        // Apply merged data
        const recordId = log.recordId
        const mod = log.module as SyncModule
        await upsertLocalRecord(mod, recordId, mergedData)
      }

      const updated = await db.syncLog.update({
        where: { id: Number(logId) },
        data: { resolved: true, status: 'Resolved' },
      })
      return NextResponse.json({ success: true, data: updated, message: `Conflict ${logId} resolved` })
    }

    // ── Action: toggle-auto sync for a module ──
    if (action === 'toggle-auto') {
      if (!targetModule) {
        return NextResponse.json({ success: false, error: 'module is required' }, { status: 400 })
      }
      const existing = await db.syncConfig.findUnique({ where: { module: targetModule } })
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 })
      }
      const newAutoSync = enabled ?? !existing.autoSync
      const updated = await db.syncConfig.update({
        where: { module: targetModule },
        data: { autoSync: newAutoSync },
      })
      return NextResponse.json({ success: true, data: { autoSync: updated.autoSync } })
    }

    // ── Action: trigger sync ──
    if (action === 'trigger') {
      const batchId = crypto.randomUUID()
      const syncModules: string[] = modules && modules.length > 0
        ? modules.filter((m: string) => ALL_MODULES.includes(m as SyncModule))
        : [...ALL_MODULES]

      if (syncModules.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid modules specified for sync' },
          { status: 400 },
        )
      }

      // Ensure SyncConfig entries exist
      for (const mod of syncModules) {
        try {
          await db.syncConfig.upsert({
            where: { module: mod },
            update: {},
            create: {
              module: mod,
              enabled: true,
              autoSync: false,
              syncInterval: 300,
              lastStatus: 'Syncing',
              endpoint: `https://erp.voltcore.in/api/${mod}`,
              authKey: `vk_${mod}_${Math.random().toString(36).substring(2, 15)}`,
            },
          })
        } catch { /* already exists */ }
      }

      // Fetch configs for modules being synced
      const configs = await db.syncConfig.findMany({
        where: { module: { in: syncModules } },
      })
      const configMap = new Map(configs.map((c) => [c.module, c]))

      // Sync each module sequentially (safer for rate-limited external APIs)
      const results: Record<string, { recordsSynced: number; errors: number; duration: number; status: string; logs: SyncLogEntry[] }> = {}
      let totalRecordsSynced = 0
      let totalErrors = 0

      for (const mod of syncModules) {
        const cfg = configMap.get(mod)
        if (!cfg || !cfg.enabled) continue

        await delay(200) // Small inter-module delay

        const result = await syncFromExternalERP(batchId, mod as SyncModule, {
          endpoint: cfg.endpoint,
          authKey: cfg.authKey,
          lastSyncAt: cfg.lastSyncAt ?? undefined,
        })

        const moduleStatus = result.errors > 0
          ? 'Completed with Errors'
          : result.conflicts > 0
            ? 'Completed with Conflicts'
            : 'Success'

        results[mod] = {
          recordsSynced: result.recordsSynced + result.recordsUpdated,
          errors: result.errors,
          duration: result.duration,
          status: moduleStatus,
          logs: result.logs,
        }

        totalRecordsSynced += result.recordsSynced + result.recordsUpdated
        totalErrors += result.errors

        // Persist sync logs
        for (const entry of result.logs) {
          try {
            await db.syncLog.create({
              data: {
                module: entry.module || mod,
                action: entry.action,
                recordId: entry.recordId || null,
                recordData: entry.recordData || null,
                status: entry.status,
                direction: 'Pull',
                conflictReason: entry.conflictReason || null,
                syncBatchId: batchId,
                duration: entry.duration,
                recordsSynced: entry.recordsSynced || 0,
                startedAt: new Date(),
                completedAt: new Date(),
              },
            })
          } catch { /* skip individual log errors */ }
        }

        // Update SyncConfig
        try {
          await db.syncConfig.update({
            where: { module: mod },
            data: {
              lastSyncAt: new Date(),
              lastStatus: moduleStatus,
              totalSynced: { increment: result.recordsSynced + result.recordsUpdated },
              totalErrors: { increment: result.errors },
              nextSyncAt: new Date(Date.now() + (cfg.syncInterval ?? 300) * 1000),
            },
          })
        } catch { /* skip config update errors */ }
      }

      return NextResponse.json({
        success: true,
        data: {
          batchId,
          triggeredAt: new Date().toISOString(),
          modules: syncModules,
          results,
          summary: {
            totalModules: syncModules.length,
            totalRecordsSynced,
            totalErrors,
            status: totalErrors > 0 ? 'Completed with Errors' : 'Success',
          },
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "trigger", "status", "resolve", or "toggle-auto".' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Error in sync POST:', error)
    return NextResponse.json(
      { success: false, error: 'Sync operation failed' },
      { status: 500 },
    )
  }
}