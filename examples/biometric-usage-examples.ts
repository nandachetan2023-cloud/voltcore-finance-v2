/**
 * Biometric Integration Usage Examples
 * 
 * This file demonstrates how to use biometric data across different HRMS modules
 */

import { db } from '@/lib/db'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, differenceInHours } from 'date-fns'

// ============================================
// 1. ATTENDANCE MODULE
// ============================================

/**
 * Get today's attendance with biometric source
 */
export async function getTodayAttendance() {
  const today = new Date()
  
  return await db.attendanceLog.findMany({
    where: {
      logDate: {
        gte: startOfDay(today),
        lte: endOfDay(today),
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      },
    },
    orderBy: { punchIn: 'asc' },
  })
}

/**
 * Get employees currently in office (punched in, not out)
 */
export async function getCurrentlyInOffice() {
  return await db.attendanceLog.findMany({
    where: {
      logDate: startOfDay(new Date()),
      punchIn: { not: null },
      punchOut: null,
      source: 'biometric',
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      },
    },
  })
}

/**
 * Get attendance summary for today
 */
export async function getTodayAttendanceSummary() {
  const today = startOfDay(new Date())
  
  const [present, absent, late, onTime] = await Promise.all([
    // Present count
    db.attendanceLog.count({
      where: {
        logDate: today,
        status: 'present',
      },
    }),
    
    // Absent count (employees without attendance)
    db.employee.count({
      where: {
        isActive: true,
        attendanceLogs: {
          none: {
            logDate: today,
          },
        },
      },
    }),
    
    // Late arrivals (after 9:30 AM)
    db.attendanceLog.count({
      where: {
        logDate: today,
        punchIn: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        },
      },
    }),
    
    // On time
    db.attendanceLog.count({
      where: {
        logDate: today,
        punchIn: {
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        },
      },
    }),
  ])
  
  return { present, absent, late, onTime }
}

// ============================================
// 2. PAYROLL MODULE
// ============================================

/**
 * Calculate working hours for an employee for a specific month
 */
export async function calculateMonthlyWorkingHours(employeeId: number, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)
  
  const attendance = await db.attendanceLog.findMany({
    where: {
      employeeId,
      logDate: {
        gte: startDate,
        lte: endDate,
      },
      punchIn: { not: null },
      punchOut: { not: null },
    },
  })
  
  let totalHours = 0
  let totalDays = 0
  let overtimeHours = 0
  
  for (const record of attendance) {
    if (record.punchIn && record.punchOut) {
      const hours = differenceInHours(record.punchOut, record.punchIn)
      totalHours += hours
      totalDays++
      
      // Calculate overtime (assuming 8 hours standard)
      if (hours > 8) {
        overtimeHours += hours - 8
      }
    }
  }
  
  return {
    totalDays,
    totalHours: Math.round(totalHours * 100) / 100,
    averageHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  }
}

/**
 * Calculate late arrival penalties for payroll
 */
export async function calculateLateArrivalPenalties(employeeId: number, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)
  
  const lateArrivals = await db.attendanceLog.findMany({
    where: {
      employeeId,
      logDate: {
        gte: startDate,
        lte: endDate,
      },
      punchIn: {
        // After 9:30 AM is considered late
        gte: new Date(year, month - 1, 1, 9, 30),
      },
    },
  })
  
  const penaltyPerLateArrival = 100 // Example: ₹100 per late arrival
  const totalPenalty = lateArrivals.length * penaltyPerLateArrival
  
  return {
    lateArrivalCount: lateArrivals.length,
    penaltyAmount: totalPenalty,
    lateArrivals: lateArrivals.map(a => ({
      date: a.logDate,
      punchIn: a.punchIn,
    })),
  }
}

/**
 * Get payroll attendance data for all employees
 */
export async function getPayrollAttendanceData(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)
  
  const employees = await db.employee.findMany({
    where: { isActive: true },
    include: {
      attendanceLogs: {
        where: {
          logDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    },
  })
  
  return employees.map(emp => {
    const presentDays = emp.attendanceLogs.filter(a => a.status === 'present').length
    const totalHours = emp.attendanceLogs.reduce((sum, a) => {
      if (a.punchIn && a.punchOut) {
        return sum + differenceInHours(a.punchOut, a.punchIn)
      }
      return sum
    }, 0)
    
    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      presentDays,
      totalHours: Math.round(totalHours * 100) / 100,
      absentDays: 30 - presentDays, // Assuming 30 days month
    }
  })
}

// ============================================
// 3. LEAVE MANAGEMENT
// ============================================

/**
 * Verify if employee was actually present on a leave day
 */
export async function verifyLeaveAgainstBiometric(employeeId: number, leaveDate: Date) {
  const attendance = await db.attendanceLog.findFirst({
    where: {
      employeeId,
      logDate: startOfDay(leaveDate),
      source: 'biometric',
    },
  })
  
  return {
    leaveDate,
    wasPresent: !!attendance,
    punchIn: attendance?.punchIn,
    punchOut: attendance?.punchOut,
    status: attendance ? 'INVALID_LEAVE' : 'VALID_LEAVE',
    message: attendance 
      ? 'Employee was present according to biometric records. Leave should be rejected.'
      : 'Employee was absent. Leave is valid.',
  }
}

/**
 * Get leave discrepancies (leave applied but biometric shows presence)
 */
export async function getLeaveDiscrepancies(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)
  
  // This would require a Leave model - example logic:
  // Find all approved leaves where biometric attendance exists
  const discrepancies = await db.attendanceLog.findMany({
    where: {
      logDate: {
        gte: startDate,
        lte: endDate,
      },
      source: 'biometric',
      status: 'present',
      // In real implementation, join with Leave table
      // employee: { leaves: { some: { date: logDate, status: 'approved' } } }
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })
  
  return discrepancies
}

// ============================================
// 4. REPORTS & ANALYTICS
// ============================================

/**
 * Generate late arrival report
 */
export async function generateLateArrivalReport(startDate: Date, endDate: Date) {
  const lateArrivals = await db.attendanceLog.findMany({
    where: {
      logDate: {
        gte: startDate,
        lte: endDate,
      },
      punchIn: {
        // After 9:30 AM
        gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 9, 30),
      },
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      },
    },
    orderBy: { logDate: 'desc' },
  })
  
  return lateArrivals.map(a => ({
    date: a.logDate,
    employeeCode: a.employee.employeeCode,
    employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
    department: a.employee.department.name,
    punchIn: a.punchIn,
    minutesLate: a.punchIn ? Math.floor((a.punchIn.getHours() * 60 + a.punchIn.getMinutes() - (9 * 60 + 30))) : 0,
  }))
}

/**
 * Generate overtime report
 */
export async function generateOvertimeReport(startDate: Date, endDate: Date) {
  const attendance = await db.attendanceLog.findMany({
    where: {
      logDate: {
        gte: startDate,
        lte: endDate,
      },
      punchIn: { not: null },
      punchOut: { not: null },
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      },
    },
  })
  
  const overtimeRecords = attendance
    .map(a => {
      if (!a.punchIn || !a.punchOut) return null
      
      const hours = differenceInHours(a.punchOut, a.punchIn)
      const overtimeHours = hours > 8 ? hours - 8 : 0
      
      if (overtimeHours === 0) return null
      
      return {
        date: a.logDate,
        employeeCode: a.employee.employeeCode,
        employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
        department: a.employee.department.name,
        punchIn: a.punchIn,
        punchOut: a.punchOut,
        totalHours: Math.round(hours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
      }
    })
    .filter(Boolean)
  
  return overtimeRecords
}

/**
 * Generate attendance percentage report by department
 */
export async function generateDepartmentAttendanceReport(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)
  const workingDays = 26 // Assuming 26 working days
  
  const departments = await db.department.findMany({
    include: {
      employees: {
        where: { isActive: true },
        include: {
          attendanceLogs: {
            where: {
              logDate: {
                gte: startDate,
                lte: endDate,
              },
              status: 'present',
            },
          },
        },
      },
    },
  })
  
  return departments.map(dept => {
    const totalEmployees = dept.employees.length
    const totalPossibleDays = totalEmployees * workingDays
    const totalPresentDays = dept.employees.reduce(
      (sum, emp) => sum + emp.attendanceLogs.length,
      0
    )
    const attendancePercentage = totalPossibleDays > 0 
      ? Math.round((totalPresentDays / totalPossibleDays) * 100 * 100) / 100
      : 0
    
    return {
      departmentName: dept.name,
      totalEmployees,
      totalPresentDays,
      totalPossibleDays,
      attendancePercentage,
    }
  })
}

/**
 * Generate punctuality report (on-time vs late)
 */
export async function generatePunctualityReport(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)
  
  const employees = await db.employee.findMany({
    where: { isActive: true },
    include: {
      attendanceLogs: {
        where: {
          logDate: {
            gte: startDate,
            lte: endDate,
          },
          punchIn: { not: null },
        },
      },
    },
  })
  
  return employees.map(emp => {
    const totalDays = emp.attendanceLogs.length
    const onTimeDays = emp.attendanceLogs.filter(a => {
      if (!a.punchIn) return false
      const punchInTime = a.punchIn.getHours() * 60 + a.punchIn.getMinutes()
      return punchInTime <= 9 * 60 + 30 // Before 9:30 AM
    }).length
    const lateDays = totalDays - onTimeDays
    const punctualityPercentage = totalDays > 0 
      ? Math.round((onTimeDays / totalDays) * 100 * 100) / 100
      : 0
    
    return {
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      totalDays,
      onTimeDays,
      lateDays,
      punctualityPercentage,
    }
  })
}

// ============================================
// 5. DASHBOARD WIDGETS
// ============================================

/**
 * Get real-time dashboard statistics
 */
export async function getDashboardStats() {
  const today = startOfDay(new Date())
  
  const [
    totalEmployees,
    presentToday,
    currentlyInOffice,
    lateToday,
    absentToday,
  ] = await Promise.all([
    db.employee.count({ where: { isActive: true } }),
    
    db.attendanceLog.count({
      where: {
        logDate: today,
        status: 'present',
      },
    }),
    
    db.attendanceLog.count({
      where: {
        logDate: today,
        punchIn: { not: null },
        punchOut: null,
      },
    }),
    
    db.attendanceLog.count({
      where: {
        logDate: today,
        punchIn: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        },
      },
    }),
    
    db.employee.count({
      where: {
        isActive: true,
        attendanceLogs: {
          none: {
            logDate: today,
          },
        },
      },
    }),
  ])
  
  return {
    totalEmployees,
    presentToday,
    currentlyInOffice,
    lateToday,
    absentToday,
    attendancePercentage: totalEmployees > 0 
      ? Math.round((presentToday / totalEmployees) * 100 * 100) / 100
      : 0,
  }
}

/**
 * Get recent punch activity (last 10 punches)
 */
export async function getRecentPunchActivity() {
  return await db.attendanceLog.findMany({
    where: {
      logDate: startOfDay(new Date()),
      source: 'biometric',
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { punchIn: 'desc' },
    take: 10,
  })
}

// ============================================
// 6. AUDIT & COMPLIANCE
// ============================================

/**
 * Get audit trail for specific employee
 */
export async function getEmployeeAuditTrail(employeeCode: string, startDate: Date, endDate: Date) {
  const rawLogs = await db.biometricRawLog.findMany({
    where: {
      empCode: employeeCode,
      punchDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { punchDate: 'asc' },
  })
  
  const processedAttendance = await db.attendanceLog.findMany({
    where: {
      employee: {
        employeeCode,
      },
      logDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { logDate: 'asc' },
  })
  
  return {
    rawLogs,
    processedAttendance,
    summary: {
      totalRawPunches: rawLogs.length,
      totalAttendanceDays: processedAttendance.length,
      processedPercentage: rawLogs.length > 0 
        ? Math.round((processedAttendance.length / rawLogs.length) * 100)
        : 0,
    },
  }
}

/**
 * Detect attendance anomalies
 */
export async function detectAttendanceAnomalies(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)
  
  const anomalies = []
  
  // 1. Multiple punches on same day (more than 2)
  const multiplePunches = await db.biometricRawLog.groupBy({
    by: ['empCode', 'punchDate'],
    where: {
      punchDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
    having: {
      empCode: {
        _count: {
          gt: 4, // More than 4 punches in a day
        },
      },
    },
  })
  
  // 2. Very short working hours (less than 2 hours)
  const shortHours = await db.attendanceLog.findMany({
    where: {
      logDate: {
        gte: startDate,
        lte: endDate,
      },
      punchIn: { not: null },
      punchOut: { not: null },
    },
    include: {
      employee: true,
    },
  })
  
  const shortHoursFiltered = shortHours.filter(a => {
    if (!a.punchIn || !a.punchOut) return false
    const hours = differenceInHours(a.punchOut, a.punchIn)
    return hours < 2
  })
  
  return {
    multiplePunches,
    shortWorkingHours: shortHoursFiltered,
  }
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export const BiometricUsageExamples = {
  // Attendance
  getTodayAttendance,
  getCurrentlyInOffice,
  getTodayAttendanceSummary,
  
  // Payroll
  calculateMonthlyWorkingHours,
  calculateLateArrivalPenalties,
  getPayrollAttendanceData,
  
  // Leave
  verifyLeaveAgainstBiometric,
  getLeaveDiscrepancies,
  
  // Reports
  generateLateArrivalReport,
  generateOvertimeReport,
  generateDepartmentAttendanceReport,
  generatePunctualityReport,
  
  // Dashboard
  getDashboardStats,
  getRecentPunchActivity,
  
  // Audit
  getEmployeeAuditTrail,
  detectAttendanceAnomalies,
}
