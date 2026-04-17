import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { PayslipGenerator } from '@/lib/services/payslip-generator';
import { PayrollCalculator } from '@/lib/services/payroll-calculator';

export const dynamic = 'force-dynamic';

interface GeneratePayslipsRequest {
  payrollItemId: number;
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    console.log('[Payslip API] Starting payslip generation...');
    const body: GeneratePayslipsRequest = await request.json();
    const { payrollItemId } = body;
    console.log('[Payslip API] Payroll item ID:', payrollItemId);

    if (!payrollItemId) {
      return NextResponse.json(
        { success: false, error: 'payrollItemId is required' },
        { status: 400 }
      );
    }

    const generator = new PayslipGenerator();
    const calculator = new PayrollCalculator();
    console.log('[Payslip API] Generator and calculator initialized');

    // Company info (should come from settings)
    const companyInfo = {
      name: 'Upasana Associate',
      address: 'Flat No. G+1/3, Vinayakpuram, In front of MME Ground, Jharsuguda, Odisha-768201',
      principalEmployer: 'Hindalco Industries Ltd., Lapanga, Sambalpur-768212',
    };

    // Generate single payslip
    console.log('[Payslip API] Fetching payroll item from database...');
    const payrollItem = await db.payrollItem.findUnique({
      where: { id: payrollItemId },
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
    });

    if (!payrollItem) {
      console.log('[Payslip API] Payroll item not found');
      return NextResponse.json(
        { success: false, error: 'Payroll item not found' },
        { status: 404 }
      );
    }

    console.log('[Payslip API] Payroll item found:', payrollItem.Employee.employeeCode);
    console.log('[Payslip API] Generating payslip data...');
    const payslipData = calculator.generatePayslipData(
      {
        employeeId: payrollItem.employeeId,
        month: payrollItem.PayrollRun.month,
        year: payrollItem.PayrollRun.year,
        workingDays: payrollItem.workingDays || 26,
        presentDays: payrollItem.presentDays || 0,
        paidLeaveDays: payrollItem.paidLeaveDays || 0,
        lopDays: payrollItem.lopDays || 0,
        otHours: payrollItem.otHours || 0,
        basicSalary: Number(payrollItem.basicSalary) || 0,
        hra: Number(payrollItem.hra) || 0,
        conveyanceAllowance: Number(payrollItem.conveyanceAllowance) || 0,
        medicalAllowance: Number(payrollItem.medicalAllowance) || 0,
        specialAllowance: Number(payrollItem.specialAllowance) || 0,
        otAmount: Number(payrollItem.otAmount) || 0,
        grossEarnings: Number(payrollItem.grossEarning),
        pfDeduction: Number(payrollItem.pfDeduction) || 0,
        esiDeduction: Number(payrollItem.esiDeduction) || 0,
        ptDeduction: Number(payrollItem.ptDeduction) || 0,
        tdsDeduction: Number(payrollItem.tdsDeduction) || 0,
        lopDeduction: Number(payrollItem.lopDeduction) || 0,
        otherDeductions: Number(payrollItem.otherDeductions) || 0,
        totalDeductions: Number(payrollItem.totalDeduction),
        netSalary: Number(payrollItem.netPay),
        details: payrollItem.details || {},
      },
      payrollItem.Employee,
      companyInfo
    );

    console.log('[Payslip API] Generating PDF blob...');
    const pdfBlob = await generator.generateSinglePayslip(payslipData);
    console.log('[Payslip API] PDF blob generated, size:', pdfBlob.size);
    
    const filename = generator.getPayslipFilename(
      payrollItem.Employee.employeeCode,
      payrollItem.PayrollRun.month,
      payrollItem.PayrollRun.year
    );

    // Update payroll item
    await db.payrollItem.update({
      where: { id: payrollItemId },
      data: {
        payslipGenerated: true,
        payslipPath: `/payslips/${filename}`,
      },
    });

    // Convert blob to buffer for response
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());
    console.log('[Payslip API] Buffer created, size:', buffer.length);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Payslip API] Error generating payslips:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payslips', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
