import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { buildComplianceSheetBuffer } from '@/lib/services/compliance-sheet';

export const dynamic = 'force-dynamic';

interface SalarySheetRequest {
  payrollRunId: number;
  month: number;
  year: number;
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body: SalarySheetRequest = await request.json();
    const { payrollRunId, month, year } = body;

    if (!payrollRunId) {
      return NextResponse.json(
        { success: false, error: 'payrollRunId is required' },
        { status: 400 }
      );
    }

    // Fetch payroll items with employee details
    const payrollItems = await db.payrollItem.findMany({
      where: { payrollRunId },
      include: {
        Employee: {
          include: {
            Department: true,
            Designation: true,
            Branch: true,
          },
        },
        PayrollRun: true,
      },
      orderBy: { Employee: { employeeCode: 'asc' } },
    });

    if (payrollItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payroll items found' },
        { status: 404 }
      );
    }

    const excelBuffer = buildComplianceSheetBuffer(payrollItems, month, year);

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const filename = `Salary_Compliance_Sheet_${monthNames[month - 1]}_${year}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating compliance salary sheet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate compliance salary sheet' },
      { status: 500 }
    );
  }
}
