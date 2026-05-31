import { isHoliday } from './holiday-service'

/**
 * Shift configuration used to drive OT calculation.
 * The Shift is now the PRIMARY source for working hours + OT threshold.
 * Attendance Rules remain only for late-fine edge cases (handled elsewhere).
 */
export interface ShiftOTConfig {
  startTime: string          // "HH:mm"
  endTime: string            // "HH:mm"
  breakMinutes?: number | null
  crossesMidnight?: boolean | null
  otThresholdMin?: number | null  // minimum extra minutes before OT counts
}

const DEFAULT_STANDARD_HOURS = 8

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Net working hours for a shift = (end − start) − break, midnight-aware.
 * Falls back to the default standard hours when the shift is missing/invalid.
 */
export function getShiftNetHours(shift?: ShiftOTConfig | null): number {
  if (!shift?.startTime || !shift?.endTime) return DEFAULT_STANDARD_HOURS
  const start = timeToMinutes(shift.startTime)
  const end = timeToMinutes(shift.endTime)
  let durationMin = end - start
  if (shift.crossesMidnight || durationMin < 0) {
    durationMin = (24 * 60 - start) + end
  }
  const netMin = durationMin - (shift.breakMinutes ?? 0)
  if (netMin <= 0) return DEFAULT_STANDARD_HOURS
  return netMin / 60
}

/**
 * Calculate overtime hours for a single attendance record.
 *
 * Priority:
 *  1. Holiday work → ALL worked hours are OT.
 *  2. Regular day  → OT = worked − shift net hours, but only counted once the
 *     overage meets the shift's `otThresholdMin`. Below the threshold → 0 OT.
 *
 * When no shift is supplied, falls back to the legacy 8-hour standard with no
 * threshold (preserves previous behaviour for un-shifted data).
 */
export async function calculateOvertimeHours(
  punchIn: Date,
  punchOut: Date,
  logDate: Date | string,
  branchId?: number | null,
  shift?: ShiftOTConfig | null,
): Promise<number> {
  try {
    const totalHours = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)
    if (totalHours <= 0) return 0

    // Holiday → entire shift is overtime
    const holidayCheck = await isHoliday(logDate, branchId)
    if (holidayCheck.isHoliday) {
      return Math.round(Math.max(0, totalHours) * 100) / 100
    }

    const netHours = getShiftNetHours(shift)
    const overageHours = totalHours - netHours
    if (overageHours <= 0) return 0

    // Respect the shift's OT threshold (minutes). Below it → no OT.
    const thresholdMin = shift?.otThresholdMin ?? 0
    if (thresholdMin > 0 && overageHours * 60 < thresholdMin) return 0

    return Math.round(overageHours * 100) / 100
  } catch (error) {
    console.error('Error calculating overtime:', error)
    const totalHours = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)
    return Math.round(Math.max(0, totalHours - DEFAULT_STANDARD_HOURS) * 100) / 100
  }
}

/**
 * Calculate total overtime hours across multiple attendance records, all sharing
 * the same shift config (the employee's active shift for the period).
 */
export async function calculateTotalOvertimeHours(
  attendanceRecords: Array<{
    punchIn: Date | null
    punchOut: Date | null
    logDate: Date
  }>,
  branchId?: number | null,
  shift?: ShiftOTConfig | null,
): Promise<number> {
  let totalOT = 0
  for (const record of attendanceRecords) {
    if (record.punchIn && record.punchOut) {
      totalOT += await calculateOvertimeHours(
        record.punchIn,
        record.punchOut,
        record.logDate,
        branchId,
        shift,
      )
    }
  }
  return Math.round(totalOT * 100) / 100
}

/**
 * Check if attendance is on a holiday.
 */
export async function isHolidayWork(
  logDate: Date | string,
  branchId?: number | null,
): Promise<boolean> {
  const holidayCheck = await isHoliday(logDate, branchId)
  return holidayCheck.isHoliday
}
