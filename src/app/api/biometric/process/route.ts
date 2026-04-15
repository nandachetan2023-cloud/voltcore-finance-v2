import { NextRequest, NextResponse } from 'next/server'
import { createBiometricService } from '@/lib/biometric'

export const dynamic = 'force-dynamic'

// POST: Process unprocessed raw logs to attendance
export async function POST(request: NextRequest) {
  try {
    const biometricService = createBiometricService()
    const { processedCount, processedEmployees } = await biometricService.processRawLogs()

    return NextResponse.json({
      success: true,
      message: 'Raw logs processed successfully',
      data: { 
        processedCount,
        processedEmployees,
      },
    })
  } catch (error) {
    console.error('Process logs error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      },
      { status: 500 }
    )
  }
}
