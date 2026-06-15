// Biometric Integration Service for eTimeOffice API
import { db as defaultDb } from './db'
import { superadminDb } from './superadmin-db'
import { PrismaClient } from '@prisma/client'
import { classifyAttendance } from './services/attendance-rule-service'
import { getActiveShiftAssignment } from './services/attendance-rule-service'

type DbClient = PrismaClient

export interface BiometricConfig {
  baseUrl: string
  corporateId: string
  username: string
  password: string
  siteId: string
  siteName: string
}

export interface BiometricSite {
  id: string
  name: string
  config: BiometricConfig
}

export interface PunchData {
  Name: string
  Empcode: string
  PunchDate: string
  M_Flag: string | null
  mcid?: string
  EmpcardNo?: string  // EnrolledId — unique 8-digit biometric enrollment number
  ID?: number
  Table?: string
}

export interface InOutPunchData {
  Empcode: string
  INTime: string
  OUTTime: string
  WorkTime: string
  OverTime: string
  Status: string
  DateString: string
  Late_In: string
  Name: string
}

export interface BiometricAPIResponse {
  PunchData?: PunchData[]
  InOutPunchData?: InOutPunchData[]
  MaxRecord?: string
}

// Load sites from the superadmin DB for a specific tenant
// Falls back to .env only if tenantId is not provided
export async function loadBiometricSitesFromDb(dbClient?: DbClient, tenantId?: string): Promise<BiometricSite[]> {
  // If we have a tenantId, load from superadmin DB
  if (tenantId) {
    try {
      const configs = await superadminDb.biometricSiteConfig.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      if (configs.length > 0) {
        return configs.map(c => ({
          id: c.siteId,
          name: c.siteName,
          config: {
            baseUrl: c.baseUrl,
            corporateId: c.corporateId,
            username: c.username,
            password: c.password,
            siteId: c.siteId,
            siteName: c.siteName,
          },
        }))
      }
    } catch (error) {
      console.error('[Biometric] Failed to load sites from superadmin DB:', error)
    }
    return [] // No config in superadmin DB — don't fall back to .env
  }

  // No tenantId — legacy path, try .env
  return loadBiometricSitesFromEnv()
}

// Load sites from .env — only used by the legacy /api/biometric/sites and /test routes
// NOT used for sync operations anymore
export function loadBiometricSites(): BiometricSite[] {
  return loadBiometricSitesFromEnv()
}

function loadBiometricSitesFromEnv(): BiometricSite[] {
  const sites: BiometricSite[] = []
  const baseUrl = process.env.BIOMETRIC_API_URL || 'https://api.etimeoffice.com/api'

  if (process.env.BIOMETRIC_SITE1_CORPORATE_ID) {
    sites.push({
      id: 'site1',
      name: process.env.BIOMETRIC_SITE1_NAME || 'Site 1',
      config: {
        baseUrl,
        corporateId: process.env.BIOMETRIC_SITE1_CORPORATE_ID,
        username: process.env.BIOMETRIC_SITE1_USERNAME || '',
        password: process.env.BIOMETRIC_SITE1_PASSWORD || '',
        siteId: 'site1',
        siteName: process.env.BIOMETRIC_SITE1_NAME || 'Site 1',
      },
    })
  }

  if (process.env.BIOMETRIC_SITE2_CORPORATE_ID) {
    sites.push({
      id: 'site2',
      name: process.env.BIOMETRIC_SITE2_NAME || 'Site 2',
      config: {
        baseUrl,
        corporateId: process.env.BIOMETRIC_SITE2_CORPORATE_ID,
        username: process.env.BIOMETRIC_SITE2_USERNAME || '',
        password: process.env.BIOMETRIC_SITE2_PASSWORD || '',
        siteId: 'site2',
        siteName: process.env.BIOMETRIC_SITE2_NAME || 'Site 2',
      },
    })
  }

  return sites
}

export class BiometricService {
  private config: BiometricConfig
  private authToken: string
  private db: DbClient

  constructor(config: BiometricConfig, dbClient?: DbClient) {
    this.config = config
    this.authToken = this.generateAuthToken()
    this.db = dbClient ?? defaultDb
  }

  private generateAuthToken(): string {
    const authString = `${this.config.corporateId}:${this.config.username}:${this.config.password}:true`
    return Buffer.from(authString).toString('base64')
  }

  private async fetchFromAPI(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    console.log(`[Biometric API] Calling: ${url.toString()}`)
    console.log(`[Biometric API] Site: ${this.config.siteName}`)
    console.log(`[Biometric API] Auth: ${this.config.corporateId}:${this.config.username}:***:true`)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      })

      console.log(`[Biometric API] Response status: ${response.status}`)

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
          console.error(`[Biometric API] Error body:`, errorText)
        } catch (e) {
          errorText = 'Unable to read error response'
        }
        throw new Error(`API returned ${response.status}: ${errorText || response.statusText}`)
      }

      const data = await response.json()
      console.log(`[Biometric API] Success - Records: ${data.PunchData?.length || data.InOutPunchData?.length || 0}`)
      return data
    } catch (error) {
      if (error instanceof Error && error.message.includes('API returned')) {
        throw error
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Fetch raw punch data
  async fetchRawPunchData(empCode: string, fromDate: string, toDate: string): Promise<PunchData[]> {
    const data = await this.fetchFromAPI('/DownloadPunchData', {
      Empcode: empCode,
      FromDate: fromDate,
      ToDate: toDate,
    })
    return data.PunchData || []
  }

  // Fetch IN/OUT processed data (recommended for HRMS)
  async fetchInOutPunchData(empCode: string, fromDate: string, toDate: string): Promise<InOutPunchData[]> {
    const data = await this.fetchFromAPI('/DownloadInOutPunchData', {
      Empcode: empCode,
      FromDate: fromDate,
      ToDate: toDate,
    })
    return data.InOutPunchData || []
  }

  // Fetch incremental data (BEST PRACTICE for production)
  async fetchLastPunchData(lastRecord: string = ''): Promise<BiometricAPIResponse> {
    const data = await this.fetchFromAPI('/DownloadLastPunchData', {
      Empcode: 'ALL',
      LastRecord: lastRecord,
    })
    return data
  }

  // Save raw logs to database
  async saveRawLogs(punchData: PunchData[]): Promise<number> {
    let savedCount = 0

    for (const punch of punchData) {
      try {
        // Check if log already exists
        const existing = await this.db.biometricRawLog.findFirst({
          where: {
            empCode: punch.Empcode,
            punchDate: new Date(this.parsePunchDate(punch.PunchDate)),
            siteId: this.config.siteId,
          },
        })

        if (!existing) {
          await this.db.biometricRawLog.create({
            data: {
              empCode: punch.Empcode,
              enrolledId: punch.EmpcardNo || null,
              name: punch.Name,
              punchDate: new Date(this.parsePunchDate(punch.PunchDate)),
              deviceId: punch.mcid || null,
              mFlag: punch.M_Flag,
              siteId: this.config.siteId,
              rawJson: punch as any,
              processed: false,
            },
          })
          savedCount++
        }
      } catch (error) {
        console.error(`Error saving raw log for ${punch.Empcode}:`, error)
      }
    }

    return savedCount
  }

  // Process raw logs to attendance
  async processRawLogs(): Promise<{ 
    processedCount: number; 
    processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }>;
    skippedRecords: Array<{ empCode: string; name: string; date: string; reason: string }>;
  }> {
    const unprocessedLogs = await this.db.biometricRawLog.findMany({
      where: { 
        processed: false,
        siteId: this.config.siteId,
      },
      orderBy: { punchDate: 'asc' },
    })

    let processedCount = 0
    const processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }> = []
    const skippedRecords: Array<{ empCode: string; name: string; date: string; reason: string }> = []
    const employeeRecordCount = new Map<string, { name: string; count: number }>()

    // Group by employee and date
    const groupedLogs = this.groupLogsByEmployeeAndDate(unprocessedLogs)

    for (const [key, logs] of Object.entries(groupedLogs)) {
      try {
        const [identifier, dateStr] = key.split('|')

        // ── Employee matching ─────────────────────────────────────────────────
        // We match on enrolledId (EmpcardNo from the device) formatted as "UA" + last 4 digits.
        // enrolledId arrives 8-digit zero-padded (e.g. "00000005") → code "UA0005".
        // We try both the full 8-digit format and the last-4-digit format for compatibility.
        const enrolledId = logs[0]?.enrolledId || null

        if (!enrolledId) {
          const reason = `Punch has no Enrolled ID (EmpcardNo). Re-sync via the incremental endpoint which returns it.`
          console.warn(`[Biometric] ${reason} (empCode=${logs[0]?.empCode})`)
          skippedRecords.push({ empCode: logs[0]?.empCode || identifier, name: logs[0]?.name || 'Unknown', date: dateStr, reason })
          await this.db.biometricRawLog.updateMany({
            where: { id: { in: logs.map(l => l.id) } },
            data: { processed: true, matched: false, skipReason: reason, processedAt: new Date() },
          })
          continue
        }

        // Try to match using the last 4 digits of enrolledId (UA + last 4 digits)
        const last4Digits = enrolledId.slice(-4)
        const employeeCodeLast4 = `UA${last4Digits}`
        
        // Also try the full 8-digit format for backward compatibility
        const employeeCodeFull8 = `UA${enrolledId}`

        const employee = await this.db.employee.findFirst({
          where: {
            OR: [
              { employeeCode: employeeCodeLast4 },   // Try last 4 digits (e.g., UA0005)
              { employeeCode: employeeCodeFull8 },   // Try full 8 digits (e.g., UA00000005)
            ],
          },
          select: { id: true, employeeCode: true, firstName: true, lastName: true, branchId: true, Branch: { select: { name: true } } },
        })

        if (!employee) {
          const reason = `No employee found with code "${employeeCodeLast4}" or "${employeeCodeFull8}"`
          console.warn(`[Biometric] ${reason}. Ensure the employee exists with enrolled ID ${enrolledId} (last 4: ${last4Digits}).`)
          skippedRecords.push({ empCode: enrolledId, name: logs[0]?.name || 'Unknown', date: dateStr, reason })
          // Mark as processed with skip reason so they don't keep retrying
          await this.db.biometricRawLog.updateMany({
            where: { id: { in: logs.map(l => l.id) } },
            data: { processed: true, matched: false, skipReason: reason, processedAt: new Date() },
          })
          continue
        }

        // ── Site/Branch filter: only process employees assigned to THIS site ──
        // If multiple biometric sites have the same API credentials (same device data),
        // each site should only create attendance for employees assigned to its branch.
        // Match by comparing the employee's Branch name with this site's siteName.
        const employeeBranchName = employee.Branch?.name || ''
        const currentSiteName = this.config.siteName || ''
        
        if (currentSiteName && employeeBranchName) {
          const branchMatch = employeeBranchName.toLowerCase().trim() === currentSiteName.toLowerCase().trim()
          if (!branchMatch) {
            // This employee belongs to a different site — skip silently (don't mark as error,
            // the correct site will process them).
            // Don't mark processed — let the other site's processRawLogs pick it up.
            // However, since raw logs are filtered by siteId, and both sites store the same
            // punch data under their own siteId, each site has its own copy. Mark as processed.
            const reason = `Employee ${employee.employeeCode} is assigned to branch "${employeeBranchName}", not this site "${currentSiteName}". Skipped.`
            console.log(`[Biometric] ${reason}`)
            await this.db.biometricRawLog.updateMany({
              where: { id: { in: logs.map(l => l.id) } },
              data: { processed: true, matched: false, skipReason: reason, processedAt: new Date() },
            })
            continue
          }
        }

        const employeeName = `${employee.firstName} ${employee.lastName}`

        console.log(`[Biometric] Matched enrolledId=${enrolledId} → ${employee.employeeCode} (${employeeName})`)

        // Sort logs by time
        const sortedLogs = logs.sort((a, b) => 
          new Date(a.punchDate).getTime() - new Date(b.punchDate).getTime()
        )

        const firstPunch = sortedLogs[0]
        const lastPunch = sortedLogs[sortedLogs.length - 1]

        // Parse dateStr correctly - create UTC date at midnight for the given date
        // This ensures the date is stored correctly in the database
        const [year, month, day] = dateStr.split('-').map(Number)
        const logDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

        console.log(`[Biometric] Processing enrolledId=${enrolledId} (${employee.employeeCode}) for ${dateStr}:`)
        console.log(`  - First punch: ${firstPunch.punchDate}`)
        console.log(`  - Calculated logDate: ${logDate.toISOString()} (${logDate.toLocaleDateString()})`)

        // Check if attendance already exists
        const existingAttendance = await this.db.attendanceLog.findFirst({
          where: {
            employeeId: employee.id,
            logDate: logDate,
          },
        })

        const punchIn = new Date(firstPunch.punchDate)
        const punchOut = sortedLogs.length > 1 ? new Date(lastPunch.punchDate) : null

        // ── Shift guard: skip employees without an active shift ──
        // First, let's check what shift assignments exist for this employee
        const allShiftAssignments = await this.db.shiftAssignment.findMany({
          where: { employeeId: employee.id },
          include: { Shift: true },
          orderBy: { effectiveFrom: 'desc' },
        })
        
        console.log(`[Biometric] Employee ${employee.employeeCode} (${employeeName}) - Checking shift for ${dateStr}`)
        console.log(`[Biometric] - logDate: ${logDate.toISOString()} (UTC: ${logDate.toUTCString()})`)
        console.log(`[Biometric] - Total shift assignments: ${allShiftAssignments.length}`)
        
        if (allShiftAssignments.length > 0) {
          console.log(`[Biometric] - Shift assignments:`)
          allShiftAssignments.forEach((sa, idx) => {
            console.log(`[Biometric]   ${idx + 1}. Shift: ${sa.Shift.name}, From: ${sa.effectiveFrom.toISOString()}, To: ${sa.effectiveTo ? sa.effectiveTo.toISOString() : 'null (ongoing)'}`)
            console.log(`[Biometric]      Check: effectiveFrom <= logDate? ${sa.effectiveFrom <= logDate} (${sa.effectiveFrom} <= ${logDate})`)
            if (sa.effectiveTo) {
              console.log(`[Biometric]      Check: effectiveTo >= logDate? ${sa.effectiveTo >= logDate} (${sa.effectiveTo} >= ${logDate})`)
            }
          })
        }
        
        const shiftAssignment = await getActiveShiftAssignment(employee.id, logDate, this.db)
        
        if (!shiftAssignment) {
          const reason = allShiftAssignments.length === 0 
            ? `No shift assignments found for ${employee.employeeCode} (${employeeName})`
            : `No ACTIVE shift assignment for ${employee.employeeCode} (${employeeName}) on ${dateStr}. ${allShiftAssignments.length} assignment(s) exist but none are active for this date. Check effectiveFrom/To dates.`
          console.log(`[Biometric] ❌ Skipping: ${reason}`)
          skippedRecords.push({ empCode: employee.employeeCode, name: employeeName, date: dateStr, reason })
          // Mark logs as processed so they don't keep retrying
          await this.db.biometricRawLog.updateMany({
            where: { id: { in: logs.map(l => l.id) } },
            data: { processed: true, matched: false, skipReason: reason, processedAt: new Date() },
          })
          continue
        }
        
        console.log(`[Biometric] ✅ Found active shift: ${shiftAssignment.Shift.name} (${shiftAssignment.Shift.startTime}-${shiftAssignment.Shift.endTime})`)

        // Apply attendance rules to classify the record
        const classification = await classifyAttendance(
          employee.id,
          logDate,
          punchIn,
          punchOut,
          this.db
        )

        if (existingAttendance) {
          // Update existing
          await this.db.attendanceLog.update({
            where: { id: existingAttendance.id },
            data: {
              punchIn,
              punchOut,
              biometricDeviceId: firstPunch.deviceId,
              source: 'biometric',
              status: classification.status,
              lateMinutes: classification.lateMinutes,
              fineAmount: classification.fineAmount,
              updatedAt: new Date(),
            },
          })
        } else {
          // Create new
          await this.db.attendanceLog.create({
            data: {
              employeeId: employee.id,
              logDate,
              punchIn,
              punchOut,
              biometricDeviceId: firstPunch.deviceId,
              source: 'biometric',
              status: classification.status,
              lateMinutes: classification.lateMinutes,
              fineAmount: classification.fineAmount,
              updatedAt: new Date(),
            },
          })
        }

        // Mark logs as processed AND matched (attendance created/updated)
        await this.db.biometricRawLog.updateMany({
          where: {
            id: { in: logs.map(l => l.id) },
          },
          data: {
            processed: true,
            matched: true,
            skipReason: null,
            processedAt: new Date(),
          },
        })

        processedCount += logs.length
        
        // Track employee record count
        const existing = employeeRecordCount.get(enrolledId)
        if (existing) {
          existing.count += logs.length
        } else {
          employeeRecordCount.set(enrolledId, { name: employeeName, count: logs.length })
        }
      } catch (error) {
        console.error(`Error processing logs for ${key}:`, error)
      }
    }

    // Convert map to array
    employeeRecordCount.forEach((value, empCode) => {
      processedEmployees.push({
        empCode,
        name: value.name,
        recordsCount: value.count,
      })
    })

    return { processedCount, processedEmployees, skippedRecords }
  }

  // Re-match previously skipped/unmatched logs.
  // Resets logs that were processed-but-NOT-matched back to unprocessed, then
  // re-runs processing. Because matching re-evaluates the shift's effective date
  // for each punch's date (getActiveShiftAssignment), this lets you assign a shift
  // (or create the employee) AFTER fetching, then go back and match historical logs.
  async rematchUnmatched(): Promise<{
    reset: number;
    processedCount: number;
    processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }>;
    skippedRecords: Array<{ empCode: string; name: string; date: string; reason: string }>;
  }> {
    // Reset unmatched logs for THIS site so processRawLogs picks them up again.
    const resetResult = await this.db.biometricRawLog.updateMany({
      where: {
        siteId: this.config.siteId,
        processed: true,
        matched: false,
      },
      data: { processed: false, skipReason: null, processedAt: null },
    })

    const { processedCount, processedEmployees, skippedRecords } = await this.processRawLogs()
    return { reset: resetResult.count, processedCount, processedEmployees, skippedRecords }
  }


  // Uses DownloadLastPunchData — the ONLY endpoint that returns EmpcardNo (enrolled ID),
  // which is the unique, editable identifier we match employees on.
  //
  // IMPORTANT: An empty LastRecord returns 0 records — it only streams brand-new
  // punches. The data is stored in monthly tables and the cursor is "MMyyyy$ID".
  // So to fetch existing/historical data we must SEED the cursor with a month anchor
  // ("MMyyyy$0") and page forward, walking month-by-month up to the current month.
  async syncIncremental(): Promise<{ 
    fetched: number; 
    processed: number;
    processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }>;
  }> {
    try {
      // Get last successful sync for this site to retrieve the stored cursor (MaxRecord)
      const lastSync = await this.db.biometricSyncLog.findFirst({
        where: { 
          status: 'success',
          siteId: this.config.siteId,
        },
        orderBy: { createdAt: 'desc' },
      })

      const storedCursor = lastSync?.lastRecord && lastSync.lastRecord.includes('$')
        ? lastSync.lastRecord
        : ''

      // First-ever sync starts from May 1st of the current year, then every
      // subsequent sync resumes from the stored cursor (continues where it left off).
      // Override the anchor month/year via env if needed.
      const anchorMonth = parseInt(process.env.BIOMETRIC_BACKFILL_START_MONTH || '5')  // May
      const anchorYear = parseInt(process.env.BIOMETRIC_BACKFILL_START_YEAR || String(new Date().getFullYear()))

      const now = new Date()
      // Determine the first (month, year) to start walking from.
      let startMonth: number, startYear: number
      let firstMonthCursor: string
      if (storedCursor) {
        // Resume from the month encoded in the stored cursor.
        startMonth = parseInt(storedCursor.slice(0, 2))
        startYear = parseInt(storedCursor.slice(2, 6))
        firstMonthCursor = storedCursor // resume mid-month from exact position
      } else {
        startMonth = anchorMonth
        startYear = anchorYear
        firstMonthCursor = `${String(startMonth).padStart(2, '0')}${startYear}$0`
      }

      console.log(`[${this.config.siteId}] Incremental sync (DownloadLastPunchData) — start ${String(startMonth).padStart(2, '0')}/${startYear}, cursor "${firstMonthCursor}"`)

      const MAX_PAGES_PER_MONTH = 500
      let totalSaved = 0
      let latestCursor = storedCursor

      // Walk each month from the start month up to (and including) the current month.
      let y = startYear, m = startMonth
      let isFirstMonth = true
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
        let cursor = isFirstMonth ? firstMonthCursor : `${String(m).padStart(2, '0')}${y}$0`
        let pages = 0
        while (pages < MAX_PAGES_PER_MONTH) {
          const response = await this.fetchLastPunchData(cursor)
          const punchData = response.PunchData || []
          if (punchData.length === 0) break

          totalSaved += await this.saveRawLogs(punchData)

          const next = response.MaxRecord
          if (!next || next === cursor) break // no progress → stop paging this month
          cursor = next
          latestCursor = next
          pages++
        }

        // advance to next month
        isFirstMonth = false
        m++
        if (m > 12) { m = 1; y++ }
      }

      // Persist the latest cursor for the next run (keep prior cursor if nothing new came in)
      await this.db.biometricSyncLog.create({
        data: {
          siteId: this.config.siteId,
          lastRecord: latestCursor || storedCursor || `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}$0`,
          syncType: 'incremental',
          recordsFetched: totalSaved,
          recordsProcessed: 0, // Will be updated after processing
          status: 'success',
        },
      })

      return { fetched: totalSaved, processed: 0, processedEmployees: [] }
    } catch (error) {
      // Log failed sync
      await this.db.biometricSyncLog.create({
        data: {
          siteId: this.config.siteId,
          lastRecord: '',
          syncType: 'incremental',
          recordsFetched: 0,
          recordsProcessed: 0,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      throw error
    }
  }

  // Helper: Parse punch date from API format
  private parsePunchDate(dateStr: string): string {
    // Format: "02/01/2020 15:58:00" -> ISO format
    const [datePart, timePart] = dateStr.split(' ')
    const [day, month, year] = datePart.split('/')
    return `${year}-${month}-${day}T${timePart}`
  }

  // Helper: Group logs by employee and date
  private groupLogsByEmployeeAndDate(logs: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {}

    for (const log of logs) {
      const date = new Date(log.punchDate)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      // Group strictly by enrolledId (EmpcardNo) — the unique identifier we match on.
      // Logs without an enrolledId are grouped by empCode so they can be reported
      // as skipped (they cannot be reliably matched to an employee).
      const identifier = log.enrolledId || `noenroll:${log.empCode}`
      const key = `${identifier}|${dateKey}`

      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(log)
    }

    return grouped
  }
}

// Sync all sites (loads config from superadmin DB)
export async function syncAllSites(dbClient?: DbClient, tenantId?: string): Promise<{ site: string; result: { fetched: number; processed: number } }[]> {
  const db = dbClient ?? defaultDb
  const sites = await loadBiometricSitesFromDb(db, tenantId)

  if (sites.length === 0) {
    throw new Error('No biometric sites configured for this tenant. Please add site credentials in the Superadmin panel.')
  }

  const results = []
  for (const site of sites) {
    try {
      const service = new BiometricService(site.config, db)
      const result = await service.syncIncremental()
      results.push({ site: site.name, result })
    } catch (error) {
      console.error(`Error syncing ${site.name}:`, error)
      results.push({ site: site.name, result: { fetched: 0, processed: 0 } })
    }
  }

  return results
}

// Factory: create service for a specific site (loads config from superadmin DB)
export async function createBiometricServiceFromDb(siteId?: string, dbClient?: DbClient, tenantId?: string): Promise<BiometricService> {
  const db = dbClient ?? defaultDb
  const sites = await loadBiometricSitesFromDb(db, tenantId)

  if (sites.length === 0) {
    throw new Error('No biometric sites configured for this tenant. Please add site credentials in the Superadmin panel.')
  }

  if (siteId) {
    const site = sites.find(s => s.id === siteId)
    if (!site) throw new Error(`Site "${siteId}" not found. Please check your biometric configuration in the Superadmin panel.`)
    return new BiometricService(site.config, db)
  }

  return new BiometricService(sites[0].config, db)
}

// Legacy sync factory (uses .env, kept for backward compat)
export function createBiometricService(siteId?: string, dbClient?: DbClient): BiometricService {
  const sites = loadBiometricSites()

  if (siteId) {
    const site = sites.find(s => s.id === siteId)
    if (!site) throw new Error(`Site not found: ${siteId}`)
    return new BiometricService(site.config, dbClient)
  }

  if (sites.length === 0) throw new Error('No biometric sites configured')
  return new BiometricService(sites[0].config, dbClient)
}
