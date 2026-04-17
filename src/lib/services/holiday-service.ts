import { db as defaultDb } from '@/lib/db'
import { PrismaClient } from '@prisma/client'

type DbClient = PrismaClient

/**
 * Holiday Service
 * Centralized logic for holiday checks across attendance, leave, and timesheet modules
 */

export interface HolidayCheckResult {
  isHoliday: boolean
  holiday?: {
    id: number
    name: string
    date: Date
    type: string
    description?: string | null
  }
}

export async function isHoliday(
  date: Date | string,
  branchId?: number | null,
  dbClient?: DbClient
): Promise<HolidayCheckResult> {
  const db = dbClient ?? defaultDb
  try {
    const checkDate = typeof date === 'string' ? new Date(date) : date
    checkDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(checkDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const whereClause: any = {
      isActive: true,
      date: { gte: checkDate, lt: nextDay },
    }

    if (branchId) {
      whereClause.OR = [{ branchId: null }, { branchId: branchId }]
    } else {
      whereClause.branchId = null
    }

    const holiday = await db.holiday.findFirst({
      where: whereClause,
      select: { id: true, name: true, date: true, type: true, description: true },
    })

    return { isHoliday: !!holiday, holiday: holiday || undefined }
  } catch (error) {
    console.error('Error checking holiday:', error)
    return { isHoliday: false }
  }
}

export async function getHolidaysInRange(
  startDate: Date | string,
  endDate: Date | string,
  branchId?: number | null,
  dbClient?: DbClient
) {
  const db = dbClient ?? defaultDb
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const whereClause: any = {
      isActive: true,
      date: { gte: start, lte: end },
    }

    if (branchId) {
      whereClause.OR = [{ branchId: null }, { branchId: branchId }]
    } else {
      whereClause.branchId = null
    }

    return await db.holiday.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      select: { id: true, name: true, date: true, type: true, description: true },
    })
  } catch (error) {
    console.error('Error fetching holidays in range:', error)
    return []
  }
}

export async function calculateWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
  branchId?: number | null,
  employeeId?: number | null,
  excludeWeekends: boolean = true,
  dbClient?: DbClient
): Promise<number> {
  const db = dbClient ?? defaultDb
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate)
    const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate)

    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const holidays = await getHolidaysInRange(start, end, branchId, db)
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]))

    let shiftOffDays: Set<number> = new Set()
    if (employeeId) {
      const shiftAssignment = await db.shiftAssignment.findFirst({
        where: {
          employeeId,
          effectiveFrom: { lte: end },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
        },
        include: { Shift: { select: { weekOffDays: true } } },
        orderBy: { effectiveFrom: 'desc' },
      })
      if (shiftAssignment?.Shift?.weekOffDays) {
        shiftOffDays = new Set(shiftAssignment.Shift.weekOffDays)
      }
    }

    let workingDays = 0
    const current = new Date(start)

    while (current <= end) {
      const dayOfWeek = current.getDay()
      const dateStr = current.toISOString().split('T')[0]
      const isHolidayDate = holidayDates.has(dateStr)
      let isOffDay = false
      if (shiftOffDays.size > 0) {
        isOffDay = shiftOffDays.has(dayOfWeek)
      } else if (excludeWeekends) {
        isOffDay = dayOfWeek === 0 || dayOfWeek === 6
      }
      if (!isOffDay && !isHolidayDate) workingDays++
      current.setDate(current.getDate() + 1)
    }

    return workingDays
  } catch (error) {
    console.error('Error calculating working days:', error)
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  }
}

export async function getHolidayDates(
  startDate: Date | string,
  endDate: Date | string,
  branchId?: number | null,
  dbClient?: DbClient
): Promise<string[]> {
  const holidays = await getHolidaysInRange(startDate, endDate, branchId, dbClient)
  return holidays.map(h => h.date.toISOString().split('T')[0])
}
