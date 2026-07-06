import { db as defaultDb } from '@/lib/db';
import { PrismaClient } from '@prisma/client';

type DbClient = PrismaClient

export interface AttendanceRuleResult {
  isLate: boolean;
  lateMinutes: number;
  isHalfDay: boolean;
  isAbsent: boolean;
  fineAmount: number;
  status: 'present' | 'late' | 'half_day' | 'absent';
  appliedRule?: {
    id: number;
    name: string;
    ruleType: string;
  };
}

// ── Get the active shift for an employee on a given date ──────────
// If multiple shifts are assigned, and a punchIn time is provided,
// picks the shift whose startTime is closest to the actual punch-in.
export async function getEmployeeShiftForDate(
  employeeId: number,
  date: Date,
  dbClient?: DbClient,
  punchIn?: Date | null
) {
  const db = dbClient ?? defaultDb
  const assignments = await db.shiftAssignment.findMany({
    where: {
      employeeId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    include: { Shift: true },
    orderBy: { effectiveFrom: 'desc' },
  })

  if (assignments.length === 0) return null
  if (assignments.length === 1) return assignments[0].Shift

  // Multiple shifts assigned — pick closest to punchIn
  if (punchIn) {
    return pickClosestShift(assignments.map(a => a.Shift), punchIn, date)
  }

  // No punchIn available — return the most recently assigned shift
  return assignments[0].Shift
}

// Helper: Given multiple shifts and a punch-in time, return the shift
// whose startTime is closest to the actual punch-in on that day.
function pickClosestShift(shifts: any[], punchIn: Date, logDate: Date): any {
  let bestShift = shifts[0]
  let bestDiff = Infinity

  for (const shift of shifts) {
    const [h, m] = shift.startTime.split(':').map(Number)
    const shiftStart = new Date(logDate)
    shiftStart.setHours(h, m, 0, 0)

    // For cross-midnight shifts, if punchIn is in the evening, the shift start
    // is today. If punchIn is early morning, the shift might have started yesterday.
    let diff = Math.abs(punchIn.getTime() - shiftStart.getTime())

    // Also check if the shift start should be considered as previous day (for night shifts)
    if (shift.crossesMidnight) {
      const shiftStartYesterday = new Date(shiftStart)
      shiftStartYesterday.setDate(shiftStartYesterday.getDate() - 1)
      const diffYesterday = Math.abs(punchIn.getTime() - shiftStartYesterday.getTime())
      diff = Math.min(diff, diffYesterday)
    }

    if (diff < bestDiff) {
      bestDiff = diff
      bestShift = shift
    }
  }

  return bestShift
}

export async function getApplicableRule(
  employeeId: number,
  ruleType: string = 'late',
  dbClient?: DbClient,
  resolvedShiftId?: number | null
): Promise<any | null> {
  const db = dbClient ?? defaultDb

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      departmentId: true,
      branchId: true,
    },
  });

  if (!employee) return null;

  // Use the already-resolved shift (picked as the closest match to the actual
  // punch-in when an employee has multiple concurrent assignments) instead of
  // re-querying by "most recently assigned" — that ignored punch-in entirely
  // and could select a different shift than the one attendance was scored
  // against, applying the wrong shift's fine/rule policy.
  let shiftId = resolvedShiftId
  if (shiftId === undefined) {
    const today = new Date()
    const shiftAssignment = await db.shiftAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      select: { shiftId: true },
      orderBy: { effectiveFrom: 'desc' },
    })
    shiftId = shiftAssignment?.shiftId ?? null
  }

  const departmentId = employee.departmentId;
  const branchId = employee.branchId;

  const rules = await db.attendanceRule.findMany({
    where: { ruleType, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  let bestRule: any = null;
  let bestScore = -1;

  for (const rule of rules) {
    let score = 0;
    let matches = true;

    if (rule.applyToShiftId) {
      if (rule.applyToShiftId === shiftId) score += 4;
      else matches = false;
    }
    if (rule.applyToDepartmentId) {
      if (rule.applyToDepartmentId === departmentId) score += 2;
      else matches = false;
    }
    if (rule.applyToBranchId) {
      if (rule.applyToBranchId === branchId) score += 1;
      else matches = false;
    }
    if (!rule.applyToShiftId && !rule.applyToDepartmentId && !rule.applyToBranchId) score = 0;

    if (matches && score > bestScore) {
      bestRule = rule;
      bestScore = score;
    }
  }

  return bestRule;
}

export async function applyAttendanceRules(
  employeeId: number,
  scheduledTime: Date,
  actualTime: Date,
  ruleType: string = 'late',
  dbClient?: DbClient,
  shiftGraceMinutes: number = 0,
  resolvedShiftId?: number | null,
): Promise<AttendanceRuleResult> {
  const rule = await getApplicableRule(employeeId, ruleType, dbClient, resolvedShiftId);

  // No scoped AttendanceRule → fall back to the SHIFT as the primary source.
  // The shift's grace period decides late status; the shift never fines (fine = 0).
  if (!rule) {
    const diffMs = actualTime.getTime() - scheduledTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const effectiveLateness = Math.max(0, diffMinutes - shiftGraceMinutes);
    return {
      isLate: effectiveLateness > 0,
      lateMinutes: effectiveLateness,
      isHalfDay: false,
      isAbsent: false,
      fineAmount: 0,
      status: effectiveLateness > 0 ? 'late' : 'present',
    };
  }

  const diffMs = actualTime.getTime() - scheduledTime.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const effectiveLateness = Math.max(0, diffMinutes - rule.gracePeriodMinutes);

  let status: 'present' | 'late' | 'half_day' | 'absent' = 'present';
  let isLate = false, isHalfDay = false, isAbsent = false;

  if (rule.absentAfterMinutes > 0 && effectiveLateness >= rule.absentAfterMinutes) {
    status = 'absent'; isAbsent = true;
  } else if (rule.halfDayAfterMinutes > 0 && effectiveLateness >= rule.halfDayAfterMinutes) {
    status = 'half_day'; isHalfDay = true;
  } else if (rule.lateMarkAfterMinutes > 0 && effectiveLateness >= rule.lateMarkAfterMinutes) {
    status = 'late'; isLate = true;
  }

  let fineAmount = 0;
  if (rule.fineType === 'fixed' && effectiveLateness > 0) {
    fineAmount = Number(rule.fineAmount);
  } else if (rule.fineType === 'per_minute' && effectiveLateness > 0) {
    fineAmount = effectiveLateness * Number(rule.finePerMinute);
    if (rule.maxFinePerDay > 0) fineAmount = Math.min(fineAmount, Number(rule.maxFinePerDay));
  }

  return {
    isLate,
    lateMinutes: effectiveLateness,
    isHalfDay,
    isAbsent,
    fineAmount,
    status,
    appliedRule: { id: rule.id, name: rule.name, ruleType: rule.ruleType },
  };
}

export async function calculateFinesForPeriod(
  employeeId: number,
  startDate: Date,
  endDate: Date,
  dbClient?: DbClient
): Promise<{ totalFine: number; details: any[] }> {
  const db = dbClient ?? defaultDb

  const logs = await db.attendanceLog.findMany({
    where: {
      employeeId,
      logDate: { gte: startDate, lte: endDate },
    },
    orderBy: { logDate: 'asc' },
  });

  let totalFine = 0;
  const details: any[] = [];

  for (const log of logs) {
    if (!log.punchIn) continue;
    
    // Get the shift closest to the punchIn time (handles multiple shifts)
    const shift = await getEmployeeShiftForDate(employeeId, log.logDate, db, log.punchIn);
    if (!shift) continue;

    const [hours, minutes] = shift.startTime.split(':').map(Number);
    const scheduledTime = new Date(log.logDate);
    scheduledTime.setHours(hours, minutes, 0, 0);

    const result = await applyAttendanceRules(employeeId, scheduledTime, log.punchIn, 'late', db, shift.graceMinutes ?? 0, shift.id);
    if (result.fineAmount > 0) {
      totalFine += result.fineAmount;
      details.push({
        date: log.logDate,
        lateMinutes: result.lateMinutes,
        fineAmount: result.fineAmount,
        status: result.status,
        appliedRule: result.appliedRule,
      });
    }
  }

  return { totalFine, details };
}

// ── Main classification function ──────────────────────────────────
// Given an employee, date, punchIn and optional punchOut,
// returns the rule-based status, lateMinutes, and fineAmount.
// This is the single source of truth used by both manual attendance
// creation and biometric log processing.
export async function classifyAttendance(
  employeeId: number,
  logDate: Date,
  punchIn: Date | null,
  punchOut: Date | null,
  dbClient?: DbClient
): Promise<{
  status: 'present' | 'late' | 'half_day' | 'absent';
  lateMinutes: number;
  fineAmount: number;
  appliedRule?: { id: number; name: string; ruleType: string };
}> {
  const db = dbClient ?? defaultDb

  // No punch-in → absent
  if (!punchIn) {
    return { status: 'absent', lateMinutes: 0, fineAmount: 0 }
  }

  // Get the employee's shift for this date (uses punchIn to pick closest shift if multiple assigned)
  const shift = await getEmployeeShiftForDate(employeeId, logDate, db, punchIn)

  if (!shift) {
    // No shift assigned — just mark present, no rule to apply
    return { status: 'present', lateMinutes: 0, fineAmount: 0 }
  }

  // Build scheduled punch-in time from shift start
  const [shiftHour, shiftMin] = shift.startTime.split(':').map(Number)
  const scheduledPunchIn = new Date(logDate)
  scheduledPunchIn.setHours(shiftHour, shiftMin, 0, 0)

  // Apply the rule. Pass the shift's grace period so that when NO scoped
  // AttendanceRule exists, the shift's own grace drives late status. Also pass
  // this shift's own id so rule-matching scopes to the SAME shift that was
  // picked as closest to the punch-in, not whichever assignment is newest.
  const result = await applyAttendanceRules(
    employeeId,
    scheduledPunchIn,
    punchIn,
    'late',
    db,
    shift.graceMinutes ?? 0,
    shift.id,
  )

  // If punchOut is provided, also check early departure / half-day by hours worked
  if (punchOut && !result.isAbsent) {
    const [endHour, endMin] = shift.endTime.split(':').map(Number)
    const scheduledPunchOut = new Date(logDate)
    scheduledPunchOut.setHours(endHour, endMin, 0, 0)
    if (shift.crossesMidnight) scheduledPunchOut.setDate(scheduledPunchOut.getDate() + 1)

    const totalShiftMinutes = (scheduledPunchOut.getTime() - scheduledPunchIn.getTime()) / 60000
    const workedMinutes = (punchOut.getTime() - punchIn.getTime()) / 60000
    const halfDayThreshold = totalShiftMinutes / 2

    // If worked less than half the shift and not already marked half_day/absent
    if (workedMinutes < halfDayThreshold && result.status === 'present') {
      return {
        status: 'half_day',
        lateMinutes: result.lateMinutes,
        fineAmount: result.fineAmount,
        appliedRule: result.appliedRule,
      }
    }
  }

  return {
    status: result.status,
    lateMinutes: result.lateMinutes,
    fineAmount: result.fineAmount,
    appliedRule: result.appliedRule,
  }
}

// ── Check if an employee has an active shift assignment ───────────
// Returns the first matching shift assignment if any exist, null if not.
// Used as a gate: employees without ANY shift are excluded from
// attendance, timesheet, and payroll processing.
// When multiple shifts are active, returns the most recently assigned one.
export async function getActiveShiftAssignment(
  employeeId: number,
  date: Date = new Date(),
  dbClient?: DbClient
) {
  const db = dbClient ?? defaultDb
  return db.shiftAssignment.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    include: { Shift: true },
    orderBy: { effectiveFrom: 'desc' },
  })
}
