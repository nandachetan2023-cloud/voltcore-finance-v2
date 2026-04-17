import { getDbForRequest } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Diagnostic information about biometric data and attendance
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    // Count raw logs
    const totalRawLogs = await db.biometricRawLog.count()
    const processedRawLogs = await db.biometricRawLog.count({
      where: { processed: true },
    })
    const unprocessedRawLogs = await db.biometricRawLog.count({
      where: { processed: false },
    })

    // Count attendance logs
    const totalAttendance = await db.attendanceLog.count()
    const biometricAttendance = await db.attendanceLog.count({
      where: { source: 'biometric' },
    })

    // Get sample raw logs
    const sampleRawLogs = await db.biometricRawLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        empCode: true,
        name: true,
        punchDate: true,
        processed: true,
        siteId: true,
      },
    })

    // Get sample attendance logs
    const sampleAttendance = await db.attendanceLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
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

    // Check for employees
    const totalEmployees = await db.employee.count()
    const activeEmployees = await db.employee.count({
      where: { isActive: true, isDeleted: false },
    })

    // Get unique employee codes from raw logs
    const rawLogEmployees = await db.biometricRawLog.findMany({
      select: { empCode: true },
      distinct: ['empCode'],
    })

    // Check which employees exist in ERP
    const employeeCodes = rawLogEmployees.map(r => r.empCode)
    const existingEmployees = await db.employee.findMany({
      where: {
        employeeCode: { in: employeeCodes },
      },
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
    })

    const existingCodesSet = new Set(existingEmployees.map(e => e.employeeCode))
    const missingEmployees = employeeCodes.filter(code => !existingCodesSet.has(code))

    return NextResponse.json({
      success: true,
      data: {
        rawLogs: {
          total: totalRawLogs,
          processed: processedRawLogs,
          unprocessed: unprocessedRawLogs,
          uniqueEmployees: rawLogEmployees.length,
          sample: sampleRawLogs,
        },
        attendance: {
          total: totalAttendance,
          fromBiometric: biometricAttendance,
          sample: sampleAttendance,
        },
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          matchedWithBiometric: existingEmployees.length,
          missingFromERP: missingEmployees.length,
          missingCodes: missingEmployees.slice(0, 20),
        },
        matched: existingEmployees.slice(0, 10),
      },
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Diagnostic failed',
      },
      { status: 500 }
    )
  }
}
