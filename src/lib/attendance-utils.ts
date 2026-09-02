/**
 * Attendance Status Calculation Utilities
 * 
 * Rules:
 * 1. Future dates: Status should be empty/pending
 * 2. Current/Past dates with shift timing:
 *    - If punch in within grace period (shift start + 10 min): Present
 *    - If punch in after grace period: Late
 *    - If no punch in after shift end time: Absent
 * 3. Without shift timing: Manual status only
 */

export interface ShiftTiming {
  startTime: string; // HH:mm format
  endTime: string;
  graceMinutes: number;
  crossesMidnight: boolean;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  punchIn: string | null; // ISO datetime or null
  punchOut: string | null;
  status: string;
  shiftTiming?: ShiftTiming;
}

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current date and time in IST
 */
function getCurrentIST(): { date: string; time: string; datetime: Date } {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  return {
    date: istTime.toISOString().split('T')[0],
    time: istTime.toISOString().split('T')[1].substring(0, 5), // HH:mm
    datetime: istTime,
  };
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(dateStr: string): boolean {
  const current = getCurrentIST();
  return dateStr > current.date;
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  const current = getCurrentIST();
  return dateStr === current.date;
}

/**
 * Calculate attendance status based on shift timing and punch data
 */
export function calculateAttendanceStatus(record: AttendanceRecord): {
  status: string;
  reason: string;
  shouldShow: boolean;
} {
  const { date, punchIn, punchOut, shiftTiming } = record;
  
  // Rule 1: Future dates should not show any status
  if (isFutureDate(date)) {
    return {
      status: 'pending',
      reason: 'Future date - status not applicable',
      shouldShow: false,
    };
  }

  // If employee punched in, they are at least present (or late)
  if (punchIn) {
    // If no shift timing, just mark as present
    if (!shiftTiming) {
      return {
        status: 'present',
        reason: 'Punched in (no shift timing)',
        shouldShow: true,
      };
    }

    // Calculate if late based on shift timing
    const punchInTime = new Date(punchIn);
    const punchInMinutes = punchInTime.getHours() * 60 + punchInTime.getMinutes();
    const shiftStartMinutes = timeToMinutes(shiftTiming.startTime);
    const graceMinutes = shiftTiming.graceMinutes || 10; // Default 10 min grace
    const lateThreshold = shiftStartMinutes + graceMinutes;

    if (punchInMinutes <= lateThreshold) {
      return {
        status: 'present',
        reason: `Punched in at ${punchInTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} (within grace period)`,
        shouldShow: true,
      };
    } else {
      const lateByMinutes = punchInMinutes - lateThreshold;
      return {
        status: 'late',
        reason: `Late by ${lateByMinutes} minutes`,
        shouldShow: true,
      };
    }
  }

  // No punch in - check if we should mark absent
  if (!shiftTiming) {
    // No shift timing and no punch in
    // For today: pending (they might still come)
    // For past: absent
    if (isToday(date)) {
      return {
        status: 'pending',
        reason: 'No punch in yet (no shift timing)',
        shouldShow: false,
      };
    } else {
      return {
        status: 'absent',
        reason: 'No punch in recorded',
        shouldShow: true,
      };
    }
  }

  // Has shift timing but no punch in
  const current = getCurrentIST();
  const shiftEndMinutes = timeToMinutes(shiftTiming.endTime);
  const currentMinutes = timeToMinutes(current.time);

  // For today: Check if shift time has passed
  if (isToday(date)) {
    if (currentMinutes > shiftEndMinutes) {
      // Shift has ended, mark absent
      return {
        status: 'absent',
        reason: `No punch in after shift end time (${shiftTiming.endTime})`,
        shouldShow: true,
      };
    } else {
      // Shift hasn't ended yet, status pending
      return {
        status: 'pending',
        reason: 'Shift in progress - waiting for punch in',
        shouldShow: false,
      };
    }
  }

  // Past date with no punch in - absent
  return {
    status: 'absent',
    reason: `No punch in recorded (shift: ${shiftTiming.startTime} - ${shiftTiming.endTime})`,
    shouldShow: true,
  };
}

/**
 * Calculate OT hours based on shift timing
 */
export function calculateOTHours(
  punchIn: string | null,
  punchOut: string | null,
  shiftTiming?: ShiftTiming
): number {
  if (!punchIn || !punchOut) return 0;

  const inTime = new Date(punchIn);
  const outTime = new Date(punchOut);
  
  // Total hours worked
  const hoursWorked = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
  
  if (!shiftTiming) {
    // Default: OT is anything beyond 8 hours
    return Math.max(0, hoursWorked - 8);
  }

  // Calculate shift duration
  const shiftStart = timeToMinutes(shiftTiming.startTime);
  const shiftEnd = timeToMinutes(shiftTiming.endTime);
  let shiftDuration = shiftEnd - shiftStart;
  
  if (shiftTiming.crossesMidnight) {
    shiftDuration = (24 * 60 - shiftStart) + shiftEnd;
  }
  
  // Subtract break time
  const breakHours = (shiftTiming.breakMinutes || 60) / 60;
  const netShiftHours = shiftDuration / 60 - breakHours;
  
  // OT is hours worked beyond net shift hours
  return Math.max(0, hoursWorked - netShiftHours);
}

/**
 * Get display status for UI
 */
export function getDisplayStatus(record: AttendanceRecord): {
  status: string;
  color: string;
  label: string;
} {
  const calculated = calculateAttendanceStatus(record);
  
  if (!calculated.shouldShow) {
    return {
      status: 'pending',
      color: 'bg-[#5a6878]/15 text-[#5a6878]',
      label: '—',
    };
  }

  const statusMap: Record<string, { color: string; label: string }> = {
    present: {
      color: 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30',
      label: 'Present',
    },
    late: {
      color: 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30',
      label: 'Late',
    },
    absent: {
      color: 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30',
      label: 'Absent',
    },
    on_leave: {
      color: 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30',
      label: 'On Leave',
    },
    half_day: {
      color: 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30',
      label: 'Half Day',
    },
    pending: {
      color: 'bg-[#5a6878]/15 text-[#5a6878]',
      label: '—',
    },
  };

  return {
    status: calculated.status,
    color: statusMap[calculated.status]?.color || statusMap.pending.color,
    label: statusMap[calculated.status]?.label || '—',
  };
}

/**
 * Batch calculate status for multiple records
 */
export function calculateBatchStatus(
  records: AttendanceRecord[]
): Map<string, { status: string; shouldShow: boolean }> {
  const results = new Map();
  
  records.forEach(record => {
    const calculated = calculateAttendanceStatus(record);
    results.set(record.date, {
      status: calculated.status,
      shouldShow: calculated.shouldShow,
    });
  });
  
  return results;
}
