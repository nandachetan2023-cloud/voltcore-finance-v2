import { getDbForRequest } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Check which employee codes from biometric exist in ERP
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    // Get unique employee codes from biometric logs
    const biometricLogs = await db.biometricRawLog.findMany({
      select: {
        empCode: true,
        name: true,
      },
      distinct: ['empCode'],
      orderBy: { empCode: 'asc' },
    })

    // Get all employees from ERP
    const erpEmployees = await db.employee.findMany({
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
    })

    const erpCodes = new Set(erpEmployees.map(e => e.employeeCode))
    
    const missing = biometricLogs.filter(log => !erpCodes.has(log.empCode))
    const matched = biometricLogs.filter(log => erpCodes.has(log.empCode))

    return NextResponse.json({
      success: true,
      data: {
        totalBiometricCodes: biometricLogs.length,
        totalErpEmployees: erpEmployees.length,
        matched: matched.length,
        missing: missing.length,
        missingEmployees: missing.slice(0, 50), // First 50
        matchedEmployees: matched.slice(0, 20), // First 20
      },
    })
  } catch (error) {
    console.error('Error checking employees:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check employees' },
      { status: 500 }
    )
  }
}
