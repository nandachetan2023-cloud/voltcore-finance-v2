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
      orderBy: { employeeId: 'asc' },
    });

    if (payrollItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payroll items found' },
        { status: 404 }
      );
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const sheetData: any[] = [];

    // Header rows - COMPLIANCE FORMAT (FORM XVII/XIII)
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    sheetData.push(['FORM NUMBER.XVII/XIII']);
    sheetData.push(['[See Rule78(1)(a)(1) of the C.L(R&A)(CENTRAL RULES 1971]']);
    sheetData.push(['  [See Rule72(2)(a) of the C.L(R&A)(ORISSA RULES 1975]']);
    sheetData.push(['REGISTER OF WAGES']);
    sheetData.push([`FOR THE MONTH OF:- ${monthNames[month - 1]}-${year}`]);
    sheetData.push(['Name & Address of the contractor:-']);
    sheetData.push(['Name & Address of the contractor:-']);
    sheetData.push(['AT HOUSE NO-G1/3 BINAYAKPURAM OPPOSITE OF MANMOHAN M.E. SCHOOL JHARSUGUDA']);
    sheetData.push(['Nature & location of work:- MECHANICAL JOB, GAP']);
    
    // Column headers (Row 10)
    sheetData.push([
      'Employee ID',
      'Sl. No.',
      'Name of the workman',
      'Site',
      'UAN',
      'IP NO.',
      'Designation',
      'TOTAL NO OF DAYS WORKED',
      'O.Thours',
      'no.of work done',
      'daily rate of wages/piece rate/monthly',
      'Basic wages in Rs',
      'Dearness allowances   in Rs',
      'Overtime  in Rs',
      'Othercash payment   in Rs',
      'TOTAL WAGES FOR ESI DEDUCTION(TNP)',
      'E.P.F in Rs',
      'E.S.I in Rs',
      'House rent in Rs',
      'Other deduction in Rs(PT)',
      'Total deduction in Rs',
      'Net amount paid in Rs',
      'Time&date of payment',
      'Place of payment',
      'Signature or thumb Impression of  workmen',
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
      const otAmount = Number(item.otAmount) || 0;
      const otHours = Number(item.otHours) || 0;
      const presentDays = Number(item.presentDays) || 0;
      const workingDays = Number(item.workingDays) || 26;
      
      const grossEarnings = Number(item.grossEarning);
      const pfDeduction = Number(item.pfDeduction) || 0;
      const esiDeduction = Number(item.esiDeduction) || 0;
      const ptDeduction = Number(item.ptDeduction) || 0;
      const totalDeduction = Number(item.totalDeduction);
      const netPay = Number(item.netPay);
      
      // Calculate daily rate
      const dailyRate = basicSalary / workingDays;
      
      // Dearness allowance (HRA + other allowances)
      const dearnessAllowance = hra + conveyance + medical + special;
      
      // Other cash payment (if any)
      const otherCashPayment = 0;
      
      // Total wages for ESI deduction
      const totalWagesForESI = basicSalary + dearnessAllowance + otAmount + otherCashPayment;

      sheetData.push([
        employee.employeeCode, // Employee ID
        index + 1, // Sl. No.
        fullName, // Name
        employee.Branch?.name || 'N/A', // Site
        employee.uanNumber || '', // UAN
        employee.esicNumber || '', // IP NO
        employee.Designation?.name || '', // Designation
        presentDays, // Total days worked
        otHours, // OT hours
        '', // no. of work done (empty)
        Math.round(dailyRate * 100) / 100, // daily rate
        basicSalary, // Basic wages
        dearnessAllowance, // Dearness allowances
        otAmount, // Overtime
        otherCashPayment, // Other cash payment
        totalWagesForESI, // Total wages for ESI
        pfDeduction, // EPF
        esiDeduction, // ESI
        hra, // House rent
        ptDeduction, // PT
        totalDeduction, // Total deduction
        netPay, // Net amount paid
        '', // Time & date of payment
        '', // Place of payment
        '', // Signature
      ]);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 14 }, // Employee ID  ← NEW
      { wch: 8 },  // Sl. No.
      { wch: 25 }, // Name
      { wch: 15 }, // Site
      { wch: 15 }, // UAN
      { wch: 15 }, // IP NO
      { wch: 20 }, // Designation
      { wch: 12 }, // Days worked
      { wch: 10 }, // OT hours
      { wch: 12 }, // Work done
      { wch: 15 }, // Daily rate
      { wch: 15 }, // Basic wages
      { wch: 15 }, // Dearness
      { wch: 12 }, // Overtime
      { wch: 15 }, // Other cash
      { wch: 18 }, // Total wages ESI
      { wch: 12 }, // EPF
      { wch: 12 }, // ESI
      { wch: 12 }, // House rent
      { wch: 12 }, // PT
      { wch: 15 }, // Total deduction
      { wch: 15 }, // Net amount
      { wch: 15 }, // Time & date
      { wch: 15 }, // Place
      { wch: 20 }, // Signature
    ];
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    const sheetName = 'REGISTER OF WAGES';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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
