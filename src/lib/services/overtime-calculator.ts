import { isHoliday } from './holiday-service'

/**
 * Calculate overtime hours for an attendance record
 * @param punchIn - Punch in time
 * @param punchOut - Punch out time
 * @param logDate - Date of attendance
 * @param branchId - Employee's branch ID
 * @param standardHours - Standard working hours per day (default: 8)
 * @returns Overtime hours
 */
export async function calculateOvertimeHours(
  punchIn: Date,
  punchOut: Date,
  logDate: Date | string,
  branchId?: number | null,
  standardHours: number = 8
): Promise<number> {
  try {
    // Calculate total hours worked
    const totalHours = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)
    
    // Check if the date is a holiday
    const holidayCheck = await isHoliday(logDate, branchId)
    
    if (holidayCheck.isHoliday) {
      // All hours on a holiday are overtime
      return Math.max(0, totalHours)
    }
    
    // Regular day: OT is hours beyond standard hours
    return Math.max(0, totalHours - standardHours)
  } catch (error) {
    console.error('Error calculating overtime:', error)
    // Fallback to simple calculation
    const totalHours = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)
    return Math.max(0, totalHours - standardHours)
  }
}

/**
 * Calculate overtime hours for multiple attendance records
 * @param attendanceRecords - Array of attendance records
 * @param branchId - Employee's branch ID
 * @param standardHours - Standard working hours per day (default: 8)
 * @returns Total overtime hours
 */
export async function calculateTotalOvertimeHours(
  attendanceRecords: Array<{
    punchIn: Date | null
    punchOut: Date | null
    logDate: Date
  }>,
  branchId?: number | null,
  standardHours: number = 8
): Promise<number> {
  let totalOT = 0
  
  for (const record of attendanceRecords) {
    if (record.punchIn && record.punchOut) {
      const ot = await calculateOvertimeHours(
        record.punchIn,
        record.punchOut,
        record.logDate,
        branchId,
        standardHours
      )
      totalOT += ot
    }
  }
  
  return totalOT
}

/**
 * Check if attendance is on a holiday
 * @param logDate - Date of attendance
 * @param branchId - Employee's branch ID
 * @returns Boolean indicating if it's holiday work
 */
export async function isHolidayWork(
  logDate: Date | string,
  branchId?: number | null
): Promise<boolean> {
  const holidayCheck = await isHoliday(logDate, branchId)
  return holidayCheck.isHoliday
}
