import { getDbForRequest } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Detailed report of biometric processing
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    // Get all processed raw logs grouped by employee and date
    const processedLogs = await db.biometricRawLog.findMany({
      where: { processed: true },
      select: {
        empCode: true,
        name: true,
        punchDate: true,
        siteId: true,
      },
      orderBy: { punchDate: 'asc' },
    })

    // Group by employee and date
    const groupedByEmpAndDate = new Map<string, { empCode: string; name: string; date: string; punches: number }>()
    
    processedLogs.forEach(log => {
      const date = new Date(log.punchDate).toISOString().split('T')[0]
      const key = `${log.empCode}|${date}`
      
      if (groupedByEmpAndDate.has(key)) {
        groupedByEmpAndDate.get(key)!.punches++
      } else {
        groupedByEmpAndDate.set(key, {
          empCode: log.empCode,
          name: log.name,
          date,
          punches: 1,
        })
      }
    })

    // Get attendance records
    const attendanceRecords = await db.attendanceLog.findMany({
      where: { source: 'biometric' },
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

    // Map attendance by employee and date
    const attendanceMap = new Map<string, any>()
    attendanceRecords.forEach(record => {
      const date = new Date(record.logDate).toISOString().split('T')[0]
      const key = `${record.employee.employeeCode}|${date}`
      attendanceMap.set(key, record)
    })

    // Find processed logs without attendance
    const processedWithoutAttendance: any[] = []
    groupedByEmpAndDate.forEach((value, key) => {
      if (!attendanceMap.has(key)) {
        processedWithoutAttendance.push(value)
      }
    })

    // Get unique employees from processed logs
    const uniqueEmployees = new Map<string, { empCode: string; name: string; totalPunches: number; attendanceDays: number }>()
    
    processedLogs.forEach(log => {
      if (uniqueEmployees.has(log.empCode)) {
        uniqueEmployees.get(log.empCode)!.totalPunches++
      } else {
        uniqueEmployees.set(log.empCode, {
          empCode: log.empCode,
          name: log.name,
          totalPunches: 1,
          attendanceDays: 0,
        })
      }
    })

    // Count attendance days per employee
    attendanceRecords.forEach(record => {
      const empCode = record.employee.employeeCode
      if (uniqueEmployees.has(empCode)) {
        uniqueEmployees.get(empCode)!.attendanceDays++
      }
    })

    // Check for employees in raw logs but not in ERP
    const rawLogEmployees = Array.from(new Set(processedLogs.map(l => l.empCode)))
    const erpEmployees = await db.employee.findMany({
      where: {
        employeeCode: { in: rawLogEmployees },
      },
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
    })

    const erpCodesSet = new Set(erpEmployees.map(e => e.employeeCode))
    const missingFromERP = rawLogEmployees.filter(code => !erpCodesSet.has(code))

    // Get sample of missing employees with their names from raw logs
    const missingEmployeeDetails = missingFromERP.map(code => {
      const log = processedLogs.find(l => l.empCode === code)
      return {
        empCode: code,
        name: log?.name || 'Unknown',
        punchCount: processedLogs.filter(l => l.empCode === code).length,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRawLogs: processedLogs.length,
          uniqueEmployeeDays: groupedByEmpAndDate.size,
          attendanceRecordsCreated: attendanceRecords.length,
          processedWithoutAttendance: processedWithoutAttendance.length,
          uniqueEmployees: uniqueEmployees.size,
          missingFromERP: missingFromERP.length,
        },
        employeeStats: Array.from(uniqueEmployees.values()).sort((a, b) => b.totalPunches - a.totalPunches),
        processedWithoutAttendance: processedWithoutAttendance.slice(0, 20),
        missingEmployees: missingEmployeeDetails,
        explanation: {
          rawLogs: 'Individual punch events (IN/OUT)',
          uniqueEmployeeDays: 'Unique combinations of employee + date',
          attendanceRecords: 'Daily attendance summaries created',
          processedWithoutAttendance: 'Logs marked as processed but no attendance record created (likely employee not in ERP)',
        },
      },
    })
  } catch (error) {
    console.error('Processing report error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed',
      },
      { status: 500 }
    )
  }
}
