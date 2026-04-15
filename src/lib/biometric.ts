// Biometric Integration Service for eTimeOffice API
import { db } from './db'

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

// Load all configured sites from environment
export function loadBiometricSites(): BiometricSite[] {
  const sites: BiometricSite[] = []
  const baseUrl = process.env.BIOMETRIC_API_URL || 'https://api.etimeoffice.com/api'

  // Site 1
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

  // Site 2
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

  constructor(config: BiometricConfig) {
    this.config = config
    this.authToken = this.generateAuthToken()
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
        const existing = await db.biometricRawLog.findFirst({
          where: {
            empCode: punch.Empcode,
            punchDate: new Date(this.parsePunchDate(punch.PunchDate)),
            siteId: this.config.siteId,
          },
        })

        if (!existing) {
          await db.biometricRawLog.create({
            data: {
              empCode: punch.Empcode,
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
    processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }> 
  }> {
    const unprocessedLogs = await db.biometricRawLog.findMany({
      where: { 
        processed: false,
        siteId: this.config.siteId,
      },
      orderBy: { punchDate: 'asc' },
    })

    let processedCount = 0
    const processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }> = []
    const employeeRecordCount = new Map<string, { name: string; count: number }>()

    // Group by employee and date
    const groupedLogs = this.groupLogsByEmployeeAndDate(unprocessedLogs)

    for (const [key, logs] of Object.entries(groupedLogs)) {
      try {
        const [empCode, dateStr] = key.split('|')
        
        // Find employee by employeeCode - try with EMP prefix first, then without
        let employee = await db.employee.findUnique({
          where: { employeeCode: `EMP${empCode}` },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        })

        // If not found with EMP prefix, try without
        if (!employee) {
          employee = await db.employee.findUnique({
            where: { employeeCode: empCode },
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          })
        }

        if (!employee) {
          console.warn(`Employee not found: ${empCode} (tried EMP${empCode} and ${empCode})`)
          continue
        }

        const employeeName = `${employee.firstName} ${employee.lastName}`

        // Sort logs by time
        const sortedLogs = logs.sort((a, b) => 
          new Date(a.punchDate).getTime() - new Date(b.punchDate).getTime()
        )

        const firstPunch = sortedLogs[0]
        const lastPunch = sortedLogs[sortedLogs.length - 1]

        const logDate = new Date(dateStr)
        logDate.setHours(0, 0, 0, 0)

        // Check if attendance already exists
        const existingAttendance = await db.attendanceLog.findFirst({
          where: {
            employeeId: employee.id,
            logDate: logDate,
          },
        })

        if (existingAttendance) {
          // Update existing
          await db.attendanceLog.update({
            where: { id: existingAttendance.id },
            data: {
              punchIn: new Date(firstPunch.punchDate),
              punchOut: sortedLogs.length > 1 ? new Date(lastPunch.punchDate) : null,
              biometricDeviceId: firstPunch.deviceId,
              source: 'biometric',
              status: 'present',
            },
          })
        } else {
          // Create new
          await db.attendanceLog.create({
            data: {
              employeeId: employee.id,
              logDate: logDate,
              punchIn: new Date(firstPunch.punchDate),
              punchOut: sortedLogs.length > 1 ? new Date(lastPunch.punchDate) : null,
              biometricDeviceId: firstPunch.deviceId,
              source: 'biometric',
              status: 'present',
            },
          })
        }

        // Mark logs as processed
        await db.biometricRawLog.updateMany({
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
        const existing = employeeRecordCount.get(empCode)
        if (existing) {
          existing.count += logs.length
        } else {
          employeeRecordCount.set(empCode, { name: employeeName, count: logs.length })
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

    return { processedCount, processedEmployees }
  }

  // Incremental sync (recommended for production)
  async syncIncremental(): Promise<{ 
    fetched: number; 
    processed: number;
    processedEmployees: Array<{ empCode: string; name: string; recordsCount: number }>;
  }> {
    try {
      // Get last sync record for this site
      const lastSync = await db.biometricSyncLog.findFirst({
        where: { 
          status: 'success',
          siteId: this.config.siteId,
        },
        orderBy: { createdAt: 'desc' },
      })

      const lastRecord = lastSync?.lastRecord || ''

      // Fetch new data
      const response = await this.fetchLastPunchData(lastRecord)
      const punchData = response.PunchData || []

      // Save raw logs
      const savedCount = await this.saveRawLogs(punchData)

      // Process logs
      const { processedCount, processedEmployees } = await this.processRawLogs()

      // Save sync log
      await db.biometricSyncLog.create({
        data: {
          siteId: this.config.siteId,
          lastRecord: response.MaxRecord || lastRecord,
          syncType: 'incremental',
          recordsFetched: punchData.length,
          recordsProcessed: processedCount,
          status: 'success',
        },
      })

      return { fetched: savedCount, processed: processedCount, processedEmployees }
    } catch (error) {
      // Log failed sync
      await db.biometricSyncLog.create({
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

      await db.biometricSyncLog.create({
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
      await db.biometricSyncLog.create({
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
      const dateKey = date.toISOString().split('T')[0]
      const key = `${log.empCode}|${dateKey}`

      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(log)
    }

    return grouped
  }
}

// Sync all sites
export async function syncAllSites(): Promise<{ site: string; result: { fetched: number; processed: number } }[]> {
  const sites = loadBiometricSites()
  const results = []

  for (const site of sites) {
    try {
      const service = new BiometricService(site.config)
      const result = await service.syncIncremental()
      results.push({ site: site.name, result })
    } catch (error) {
      console.error(`Error syncing ${site.name}:`, error)
      results.push({ 
        site: site.name, 
        result: { fetched: 0, processed: 0 } 
      })
    }
  }

  return results
}

// Factory function to create service instance for specific site
export function createBiometricService(siteId?: string): BiometricService {
  const sites = loadBiometricSites()
  
  if (siteId) {
    const site = sites.find(s => s.id === siteId)
    if (!site) {
      throw new Error(`Site not found: ${siteId}`)
    }
    return new BiometricService(site.config)
  }
  
  // Default to first site if no siteId specified
  if (sites.length === 0) {
    throw new Error('No biometric sites configured')
  }
  
  return new BiometricService(sites[0].config)
}
