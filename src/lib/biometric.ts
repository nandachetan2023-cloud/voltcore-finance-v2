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

  // Fetch raw punch data with machine ID
  async fetchRawPunchDataWithMCID(empCode: string, fromDate: string, toDate: string): Promise<PunchData[]> {
    const data = await this.fetchFromAPI('/DownloadPunchDataMCID', {
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
        // Employee codes are stored as "UA00000005".
        // Biometric EmpcardNo is stored as enrolledId = "00000005".
        // Strip the "UA" prefix from employeeCode to get the numeric part,
        // then compare directly with enrolledId (both are 8-digit zero-padded strings).
        const enrolledId = logs[0]?.enrolledId || identifier

        const employee = await this.db.employee.findFirst({
          where: {
            employeeCode: `UA${enrolledId}`,
          },
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        })

        if (!employee) {
          const reason = `No employee found with code "UA${enrolledId}"`
          console.warn(`[Biometric] ${reason}. Ensure the employee exists with this ID.`)
          skippedRecords.push({ empCode: enrolledId, name: logs[0]?.name || 'Unknown', date: dateStr, reason })
          // Mark as processed with skip reason so they don't keep retrying
          await this.db.biometricRawLog.updateMany({
            where: { id: { in: logs.map(l => l.id) } },
            data: { processed: true, processedAt: new Date() },
          })
          continue
        }

        const employeeName = `${employee.firstName} ${employee.lastName}`

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
        const shiftAssignment = await getActiveShiftAssignment(employee.id, logDate, this.db)
        if (!shiftAssignment) {
          const reason = `No active shift assignment for ${employee.employeeCode} (${employeeName})`
          console.log(`[Biometric] Skipping: ${reason}`)
          skippedRecords.push({ empCode: employee.employeeCode, name: employeeName, date: dateStr, reason })
          // Mark logs as processed so they don't keep retrying
          await this.db.biometricRawLog.updateMany({
            where: { id: { in: logs.map(l => l.id) } },
            data: { processed: true, processedAt: new Date() },
          })
          continue
        }

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

        // Mark logs as processed
        await this.db.biometricRawLog.updateMany({
          where: {
            id: { in: logs.map(l => l.id) },
          },
          data: {
            processed: true,
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

  // Incremental sync (recommended for production)
  async syncIncremental(): Promise<{ 
    fetched: number; 
    processed: number;
    processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }>;
  }> {
    try {
      // Get last successful sync for this site
      const lastSync = await this.db.biometricSyncLog.findFirst({
        where: { 
          status: 'success',
          siteId: this.config.siteId,
        },
        orderBy: { createdAt: 'desc' },
      })

      // Calculate date range
      const now = new Date()
      const fromDate = lastSync?.createdAt 
        ? new Date(lastSync.createdAt) 
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Default: 7 days ago

      // Format dates for API (DD/MM/YYYY_HH:MM)
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${day}/${month}/${year}_${hours}:${minutes}`
      }

      const fromDateStr = formatDate(fromDate)
      const toDateStr = formatDate(now)

      console.log(`[${this.config.siteId}] Incremental sync from ${fromDateStr} to ${toDateStr}`)

      // Fetch data using date range
      const punchData = await this.fetchRawPunchDataWithMCID('ALL', fromDateStr, toDateStr)

      // Save raw logs
      const savedCount = await this.saveRawLogs(punchData)

      // Save sync log
      await this.db.biometricSyncLog.create({
        data: {
          siteId: this.config.siteId,
          lastRecord: toDateStr,
          syncType: 'incremental',
          recordsFetched: punchData.length,
          recordsProcessed: 0, // Will be updated after processing
          status: 'success',
        },
      })

      return { fetched: savedCount, processed: 0, processedEmployees: [] }
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

  // Full sync for specific date range
  async syncDateRange(fromDate: string, toDate: string): Promise<{ 
    fetched: number; 
    processed: number;
    processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }>;
  }> {
    try {
      const punchData = await this.fetchRawPunchDataWithMCID('ALL', fromDate, toDate)
      const savedCount = await this.saveRawLogs(punchData)
      const { processedCount, processedEmployees } = await this.processRawLogs()

      await this.db.biometricSyncLog.create({
        data: {
          siteId: this.config.siteId,
          lastRecord: '',
          syncType: 'full',
          recordsFetched: punchData.length,
          recordsProcessed: processedCount,
          status: 'success',
        },
      })

      return { fetched: savedCount, processed: processedCount, processedEmployees }
    } catch (error) {
      await this.db.biometricSyncLog.create({
        data: {
          siteId: this.config.siteId,
          lastRecord: '',
          syncType: 'full',
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
      // Use enrolledId as the primary key when available — it is globally unique.
      // Fall back to empCode only if enrolledId is missing (older records).
      const identifier = log.enrolledId || log.empCode
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
