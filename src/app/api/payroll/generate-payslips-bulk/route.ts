import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { PayslipGenerator } from '@/lib/services/payslip-generator';
import { PayrollCalculator } from '@/lib/services/payroll-calculator';

export const dynamic = 'force-dynamic';

interface GenerateBulkPayslipsRequest {
  payrollRunId: number;
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body: GenerateBulkPayslipsRequest = await request.json();
    const { payrollRunId } = body;

    if (!payrollRunId) {
      return NextResponse.json(
        { success: false, error: 'payrollRunId is required' },
        { status: 400 }
      );
    }

    const generator = new PayslipGenerator();
    const calculator = new PayrollCalculator();

    // Company info (should come from settings)
    const companyInfo = {
      name: 'Upasana Associate',
      address: 'Flat No. G+1/3, Vinayakpuram, In front of MME Ground, Jharsuguda, Odisha-768201',
      principalEmployer: 'Hindalco Industries Ltd., Lapanga, Sambalpur-768212',
    };

    // Get all payroll items for the run
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
        { success: false, error: 'No payroll items found for this run' },
        { status: 404 }
      );
    }

    // Generate payslip data for all employees
    const payslipsData = payrollItems.map(item =>
      calculator.generatePayslipData(
        {
          employeeId: item.employeeId,
          month: item.PayrollRun.month,
          year: item.PayrollRun.year,
          workingDays: item.workingDays || 26,
          presentDays: item.presentDays || 0,
          paidLeaveDays: item.paidLeaveDays || 0,
          lopDays: item.lopDays || 0,
          otHours: item.otHours || 0,
          basicSalary: Number(item.basicSalary) || 0,
          hra: Number(item.hra) || 0,
          conveyanceAllowance: Number(item.conveyanceAllowance) || 0,
          medicalAllowance: Number(item.medicalAllowance) || 0,
          specialAllowance: Number(item.specialAllowance) || 0,
          otAmount: Number(item.otAmount) || 0,
          grossEarnings: Number(item.grossEarning),
          pfDeduction: Number(item.pfDeduction) || 0,
          esiDeduction: Number(item.esiDeduction) || 0,
          ptDeduction: Number(item.ptDeduction) || 0,
          tdsDeduction: Number(item.tdsDeduction) || 0,
          lopDeduction: Number(item.lopDeduction) || 0,
          otherDeductions: Number(item.otherDeductions) || 0,
          totalDeductions: Number(item.totalDeduction),
          netSalary: Number(item.netPay),
          details: item.details || {},
        },
        item.Employee,
        companyInfo
      )
    );

    // Generate ZIP file with all payslips
    const zipBlob = await generator.generateBulkPayslips(payslipsData);
    const filename = generator.getBulkPayslipsFilename(
      payrollItems[0].PayrollRun.month,
      payrollItems[0].PayrollRun.year
    );

    // Update all payroll items to mark payslips as generated
    await db.payrollItem.updateMany({
      where: { payrollRunId },
      data: {
        payslipGenerated: true,
      },
    });

    // Convert blob to buffer for response
    const buffer = Buffer.from(await zipBlob.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating bulk payslips:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate bulk payslips' },
      { status: 500 }
    );
  }
}
