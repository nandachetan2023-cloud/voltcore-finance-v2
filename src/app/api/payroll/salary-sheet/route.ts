import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

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

    // Fetch payroll run to check type
    const payrollRun = await db.payrollRun.findUnique({
      where: { id: payrollRunId },
    });

    if (!payrollRun) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      );
    }

    // Fetch payroll items with ALL employee details
    const payrollItems = await db.payrollItem.findMany({
      where: { payrollRunId },
      include: {
        Employee: {
          include: {
            Department: true,
            Designation: true,
            Branch: true,
            Grade: true,
          },
        },
        PayrollRun: true,
      },
      orderBy: [
        { Employee: { employeeCode: 'asc' } },
      ],
    });

    if (payrollItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payroll items found' },
        { status: 404 }
      );
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for salary NON-COMPLIANCE sheet
    const sheetData: any[] = [];

    // Header row - EXACT format from jan_non_compliance_salary_sheet.xlsx (68 columns)
    sheetData.push([
      'EMPLOYEE ID',
      'SL NO.',
      'WORKMEN SL. NO.',
      'TOKEN NO.',
      'NAME OF EMPLOYEE',
      "FATHER'S NAME",
      'DOJ',
      'DOB',
      'BANK NAME',
      'ACCOUNT NO.',
      'IFSC CODE NO.',
      'SITE', // Column 11 - SITE
      'UAN NO.',
      'ESIC IP NO',
      'DESIGNATION',
      'DEPARTMENT',
      'NATURE OF DESIGNATION',
      'MONTHLY GROSS SALARY',
      'ACTUAL ATTENDANCE',
      'LEAVE DAYS',
      'PH DAYS',
      'ACTUAL EARN WAGES',
      'ACTUAL OT HRS',
      'ACTUAL OT AMOUNT',
      'GROSS EARN WAGES',
      'BASIC WAGES/DAY',
      'MONTHLY WORKING DAYS',
      'OT. HRS',
      'ATTENDANCE',
      'PH',
      'WAGES/MONTH',
      'EARN WAGES',
      'PH AMOUNT',
      'TOTAL EARN WAGES',
      'OT HRS PAYMENT',
      'TOTAL NETT PAYBLE',
      'EPF',
      'ESIC',
      '', // PT — removed
      'TOTAL DEDUCTION',
      'NETT PAYBLE',
      'EMPLOYEE SIGNATURE/THUMB IMPRESSION ',
      '', // Column 42 - Empty
      '', // Column 43 - Empty
      'TOTAL NON COMPLIANCE AMOUNT',
      'ADVANCE',
      'AREEARS',
      'NETT PAYBLE NON COMPLIANCE',
      'GRAND TOTAL NETT PAYBLE SALARY',
      '', // Column 49 - Empty
      'LEAVE',
      'BONUS',
      '', // Column 52 - Empty
      '', // Column 53 - Empty
      '', // Column 54 - Empty
      'MONTHLY BASIC SALARY',
      'PH AMOUNT',
      'OT AMOUNT',
      'EARN SALARY',
      'MONTHLY House Rent Allow.',
      'Monthly Site Allow.',
      'Monthly Leave Travel Allow.',
      'Monthly Special Allow.',
      'MonthlyAttendence Allow.',
      'TOTAL SALARY',
      'EPF',
      'ESIC',
      '', // TDS — removed
      'ADVANCE',
    ]);

    // Data rows
    payrollItems.forEach((item, index) => {
      const employee = item.Employee;
      const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toUpperCase();
      
      const basicSalary = Number(item.basicSalary) || 0;
      const hra = Number(item.hra) || 0;
      const conveyance = Number(item.conveyanceAllowance) || 0;
      const medical = Number(item.medicalAllowance) || 0;
      const special = Number(item.specialAllowance) || 0;
      const attendance = Number(item.presentDays) || 0;
      const workingDays = Number(item.workingDays) || 26;
      const otHours = Number(item.otHours) || 0;
      const otAmount = Number(item.otAmount) || 0;
      const phAmount = 0; // Public Holiday amount
      const phDays = 0; // Public Holiday days
      const grossEarnings = Number(item.grossEarning);
      const pfDeduction = Number(item.pfDeduction) || 0;
      const esiDeduction = Number(item.esiDeduction) || 0;
      const totalDeduction = Number(item.totalDeduction);
      const netPay = Number(item.netPay);
      const advance = Number(item.otherDeductions) || 0;

      const basicPerDay = basicSalary / workingDays;
      const earnWages = (attendance / workingDays) * basicSalary;
      const totalEarnWages = earnWages + phAmount;
      const totalNettPayable = totalEarnWages + otAmount;
      const nettPayableAfterDeduction = totalNettPayable - totalDeduction;

      sheetData.push([
        employee.employeeCode, // EMPLOYEE ID  ← NEW
        index + 1, // SL NO
        index + 1, // WORKMEN SL NO
        employee.employeeCode, // TOKEN NO
        fullName, // NAME
        employee.fatherName || '', // FATHER'S NAME
        employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN') : '',
        employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-IN') : '',
        employee.bankName || 'BANDHAN BANK',
        employee.bankAccount || '',
        employee.bankIfsc || 'BDBL0001747',
        employee.Branch?.name || '', // Column 11 - SITE
        employee.uanNumber || '',
        employee.esicNumber || '',
        employee.Designation?.name || '',
        employee.Department?.name || '',
        'High Skilled', // Default nature
        grossEarnings, // MONTHLY GROSS SALARY
        attendance, // ACTUAL ATTENDANCE
        0, // LEAVE DAYS
        phDays, // PH DAYS
        earnWages, // ACTUAL EARN WAGES
        otHours, // ACTUAL OT HRS
        otAmount, // ACTUAL OT AMOUNT
        grossEarnings, // GROSS EARN WAGES
        Math.round(basicPerDay * 100) / 100, // BASIC WAGES/DAY
        workingDays, // MONTHLY WORKING DAYS
        otHours, // OT. HRS
        attendance, // ATTENDANCE
        phDays, // PH
        basicSalary, // WAGES/MONTH
        earnWages, // EARN WAGES
        phAmount, // PH AMOUNT
        totalEarnWages, // TOTAL EARN WAGES
        otAmount, // OT HRS PAYMENT
        totalNettPayable, // TOTAL NETT PAYBLE
        pfDeduction, // EPF
        esiDeduction, // ESIC
        '', // PT — removed (blank)
        totalDeduction, // TOTAL DEDUCTION
        nettPayableAfterDeduction, // NETT PAYBLE
        '', // SIGNATURE - Column 41
        '', // Column 42 - Empty
        '', // Column 43 - Empty
        0, // TOTAL NON COMPLIANCE AMOUNT
        advance, // ADVANCE
        0, // ARREARS
        nettPayableAfterDeduction, // NETT PAYBLE NON COMPLIANCE
        nettPayableAfterDeduction, // GRAND TOTAL
        '', // Column 49 - Empty
        0, // LEAVE
        0, // BONUS
        '', // Column 52 - Empty
        '', // Column 53 - Empty
        '', // Column 54 - Empty
        basicSalary, // MONTHLY BASIC SALARY
        phAmount, // PH AMOUNT
        otAmount, // OT AMOUNT
        earnWages, // EARN SALARY
        hra, // House Rent Allow
        conveyance, // Site Allow
        medical, // Leave Travel Allow
        special, // Special Allow
        0, // Attendance allowance
        grossEarnings, // TOTAL SALARY
        pfDeduction, // EPF
        esiDeduction, // ESIC
        '', // TDS — removed (blank)
        advance, // ADVANCE
      ]);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 14 }, // EMPLOYEE ID  ← NEW
      { wch: 8 },  // SL NO
      { wch: 12 }, // WORKMEN SL NO
      { wch: 12 }, // TOKEN NO
      { wch: 25 }, // NAME
      { wch: 20 }, // FATHER'S NAME
      { wch: 12 }, // DOJ
      { wch: 12 }, // DOB
      { wch: 15 }, // BANK NAME
      { wch: 18 }, // ACCOUNT NO
      { wch: 15 }, // IFSC
      { wch: 15 }, // UAN
      { wch: 15 }, // ESIC
      { wch: 20 }, // DESIGNATION
      { wch: 15 }, // DEPARTMENT
      { wch: 15 }, // NATURE
      { wch: 12 }, // MONTHLY GROSS
      { wch: 12 }, // ACTUAL ATTENDANCE
      { wch: 10 }, // LEAVE DAYS
      { wch: 10 }, // PH DAYS
      { wch: 15 }, // ACTUAL EARN WAGES
      { wch: 12 }, // ACTUAL OT HRS
      { wch: 15 }, // ACTUAL OT AMOUNT
      { wch: 15 }, // GROSS EARN WAGES
      { wch: 15 }, // BASIC WAGES/DAY
      { wch: 15 }, // MONTHLY WORKING DAYS
      { wch: 10 }, // OT HRS
      { wch: 12 }, // ATTENDANCE
      { wch: 8 },  // PH
      { wch: 15 }, // WAGES/MONTH
      { wch: 15 }, // EARN WAGES
      { wch: 12 }, // PH AMOUNT
      { wch: 15 }, // TOTAL EARN WAGES
      { wch: 15 }, // OT HRS PAYMENT
      { wch: 15 }, // TOTAL NETT PAYBLE
      { wch: 12 }, // EPF
      { wch: 12 }, // ESIC
      { wch: 10 }, // PT
      { wch: 15 }, // TOTAL DEDUCTION
      { wch: 15 }, // NETT PAYBLE
      { wch: 20 }, // SIGNATURE
      { wch: 15 }, // NON COMPLIANCE
      { wch: 12 }, // ADVANCE
      { wch: 12 }, // ARREARS
      { wch: 20 }, // NETT PAYBLE NON COMPLIANCE
      { wch: 20 }, // GRAND TOTAL
      { wch: 10 }, // LEAVE
      { wch: 10 }, // BONUS
      { wch: 15 }, // MONTHLY BASIC
      { wch: 12 }, // PH AMOUNT
      { wch: 12 }, // OT AMOUNT
      { wch: 15 }, // EARN SALARY
      { wch: 15 }, // HRA
      { wch: 15 }, // SITE ALLOW
      { wch: 15 }, // LTA
      { wch: 15 }, // SPECIAL ALLOW
      { wch: 15 }, // ATTENDANCE ALLOW
      { wch: 15 }, // TOTAL SALARY
      { wch: 12 }, // EPF
      { wch: 12 }, // ESIC
      { wch: 10 }, // TDS
      { wch: 12 }, // ADVANCE
    ];
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const sheetName = 'NON-COMPLIANCE SALARY SHEET';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Salary_NonCompliance_Sheet_${monthNames[month - 1]}_${year}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating salary sheet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate salary sheet' },
      { status: 500 }
    );
  }
}
