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

export async function getApplicableRule(
  employeeId: number,
  ruleType: string = 'late',
  dbClient?: DbClient
): Promise<any | null> {
  const db = dbClient ?? defaultDb

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      departmentId: true,
      branchId: true,
      ShiftAssignment: {
        where: { isActive: true },
        select: { shiftId: true },
        take: 1,
      },
    },
  });

  if (!employee) return null;

  const shiftId = employee.ShiftAssignment[0]?.shiftId;
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
  dbClient?: DbClient
): Promise<AttendanceRuleResult> {
  const rule = await getApplicableRule(employeeId, ruleType, dbClient);

  if (!rule) {
    const diffMs = actualTime.getTime() - scheduledTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    return {
      isLate: diffMinutes > 0,
      lateMinutes: Math.max(0, diffMinutes),
      isHalfDay: false,
      isAbsent: false,
      fineAmount: 0,
      status: diffMinutes > 0 ? 'late' : 'present',
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
    include: {
      Employee: {
        include: {
          ShiftAssignment: {
            where: { isActive: true },
            include: { Shift: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { logDate: 'asc' },
  });

  let totalFine = 0;
  const details: any[] = [];

  for (const log of logs) {
    if (!log.punchIn) continue;
    const shift = log.Employee.ShiftAssignment[0]?.Shift;
    if (!shift) continue;

    const [hours, minutes] = shift.startTime.split(':').map(Number);
    const scheduledTime = new Date(log.logDate);
    scheduledTime.setHours(hours, minutes, 0, 0);

    const result = await applyAttendanceRules(employeeId, scheduledTime, log.punchIn, 'late', db);
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
