import { NextRequest, NextResponse } from 'next/server';
import { calculateFinesForPeriod } from '@/lib/services/attendance-rule-service';

export const dynamic = 'force-dynamic';

// GET - Calculate fines for an employee in a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'employeeId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    const result = await calculateFinesForPeriod(
      parseInt(employeeId),
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error calculating fines:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate fines' },
      { status: 500 }
    );
  }
}
