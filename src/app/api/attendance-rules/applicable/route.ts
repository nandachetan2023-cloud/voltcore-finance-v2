import { NextRequest, NextResponse } from 'next/server';
import { getApplicableRule } from '@/lib/services/attendance-rule-service';

export const dynamic = 'force-dynamic';

// GET - Get applicable attendance rule for an employee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const ruleType = searchParams.get('ruleType') || 'late';

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'employeeId is required' },
        { status: 400 }
      );
    }

    const rule = await getApplicableRule(parseInt(employeeId), ruleType);

    if (!rule) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No applicable rule found for this employee',
      });
    }

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error fetching applicable rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch applicable rule' },
      { status: 500 }
    );
  }
}
