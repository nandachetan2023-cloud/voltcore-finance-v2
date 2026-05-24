import { NextRequest, NextResponse } from 'next/server'
import { createBiometricServiceFromDb } from '@/lib/biometric'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Process unprocessed raw logs to attendance
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  const tenantId = request.cookies.get('erp_tenant_id')?.value
  try {
    const biometricService = await createBiometricServiceFromDb(undefined, db, tenantId)
    const { processedCount, processedEmployees, skippedRecords } = await biometricService.processRawLogs()

    return NextResponse.json({
      success: true,
      message: 'Raw logs processed successfully',
      data: { processedCount, processedEmployees, skippedRecords },
    })
  } catch (error) {
    console.error('Process logs error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
