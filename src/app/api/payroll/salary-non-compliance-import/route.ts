import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface SalaryNonComplianceRow {
  slNo: number;
  tokenNo: string;
  employeeName: string;
  fatherName: string;
  doj: string;
  dob: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  uanNo: string;
  esicNo: string;
  designation: string;
  department: string;
  natureOfDesignation: string;
  monthlyGrossSalary: number;
  actualAttendance: number;
  leaveDays: number;
  phDays: number;
  actualEarnWages: number;
  actualOtHrs: number;
  actualOtAmount: number;
  grossEarnWages: number;
  basicWagesPerDay: number;
  monthlyWorkingDays: number;
  otHrs: number;
  attendance: number;
  ph: number;
  wagesPerMonth: number;
  earnWages: number;
  phAmount: number;
  totalEarnWages: number;
  otHrsPayment: number;
  totalNettPayable: number;
  epf: number;
  esic: number;
  pt: number;
  totalDeduction: number;
  nettPayable: number;
  advance: number;
  arrears: number;
  monthlyBasicSalary: number;
  monthlyHRA: number;
  monthlySiteAllow: number;
  monthlyLTA: number;
  monthlySpecialAllow: number;
  monthlyAttendanceAllow: number;
  totalSalary: number;
  tds: number;
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const manualMappingsJson = formData.get('manualMappings') as string;
    const sheetName = formData.get('sheetName') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Parse manual mappings if provided
    let manualMappings: Map<number, { tokenNo: string; mappedEmployeeCode: string | null; action: 'map' | 'skip' }> = new Map();
    if (manualMappingsJson) {
      try {
        const mappingsArray = JSON.parse(manualMappingsJson);
        mappingsArray.forEach((m: any) => {
          manualMappings.set(m.row, {
            tokenNo: m.tokenNo,
            mappedEmployeeCode: m.mappedEmployeeCode,
            action: m.action,
          });
        });
      } catch (error) {
        console.error('Failed to parse manual mappings:', error);
      }
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Use specified sheet or find "NON-COMPLIANCE SALARY SHEET" or use first sheet
    let targetSheet = sheetName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames.find(name =>
        name === 'NON-COMPLIANCE SALARY SHEET' ||
        name === 'COMBINED SALARY SHEET' ||
        name.toLowerCase().includes('non-compliance') ||
        name.toLowerCase().includes('salary')
      ) || workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[targetSheet];

    // Convert to JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length < 2) {
      return NextResponse.json(
        { success: false, error: 'File is empty or has no data rows' },
        { status: 400 }
      );
    }

    // Skip header row
    const dataRows = rawData.slice(1);

    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0;
    let failed = 0;
    let skipped = 0;

    // Get current month and year for payroll run
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Find or create payroll run for non-compliance
    let payrollRun = await db.payrollRun.findFirst({
      where: { 
        month, 
        year, 
        status: 'draft',
        payrollType: 'non-compliance',
      },
    });

    if (!payrollRun) {
      payrollRun = await db.payrollRun.create({
        data: {
          name: `Non-Compliance Payroll - ${getMonthName(month)} ${year} (Imported)`,
          month,
          year,
          status: 'draft',
          payrollType: 'non-compliance',
          totalEmployees: 0,
          totalGross: 0,
          totalNet: 0,
          updatedAt: new Date(),
        },
      });
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because of header and 0-index

      try {
        // Skip empty rows — col 0 = SL NO., col 1 = EMPLOYEE ID, col 3 = TOKEN NO (employee code), col 4 = NAME
        if (!row || row.length === 0 || (!row[1] && !row[3])) continue;

        const employeeIdCol = String(row[1] || '').trim(); // EMPLOYEE ID (col 1)
        const tokenNo = String(row[3] || '').trim();       // TOKEN NO (col 3)
        if (!tokenNo && !employeeIdCol) {
          errors.push({ row: rowNumber, error: 'Missing TOKEN NO. and Employee ID' });
          failed++;
          continue;
        }

        // Check if this row has a manual mapping
        const manualMapping = manualMappings.get(rowNumber);
        
        if (manualMapping && manualMapping.action === 'skip') {
          skipped++;
          continue;
        }

        // Prefer Employee ID col, then TOKEN NO, then manual mapping
        let employeeCodeToUse = employeeIdCol || tokenNo;
        if (manualMapping && manualMapping.action === 'map' && manualMapping.mappedEmployeeCode) {
          employeeCodeToUse = manualMapping.mappedEmployeeCode;
        }

        // Find employee by employee code
        const employee = await db.employee.findFirst({
          where: { employeeCode: employeeCodeToUse },
        });

        if (!employee) {
          errors.push({ row: rowNumber, error: `Employee not found: ${employeeCodeToUse}` });
          failed++;
          continue;
        }

        // Parse data — col 0 = SL NO., col 1 = EMPLOYEE ID, then original 67-col format starts at col 2
        const salaryData: SalaryNonComplianceRow = {
          slNo: Number(row[0]) || 0,                     // col 0: SL NO.
          tokenNo,                                        // col 3: TOKEN NO. (already read)
          employeeName: String(row[4] || ''),            // col 4: NAME OF EMPLOYEE
          fatherName: String(row[5] || ''),              // col 5: FATHER'S NAME
          doj: String(row[6] || ''),                     // col 6: DOJ
          dob: String(row[7] || ''),                     // col 7: DOB
          bankName: String(row[8] || ''),                // col 8: BANK NAME
          accountNo: String(row[9] || ''),               // col 9: ACCOUNT NO.
          ifscCode: String(row[10] || ''),               // col 10: IFSC CODE NO.
          // col 11 is empty
          uanNo: String(row[12] || ''),                  // col 12: UAN NO.
          esicNo: String(row[13] || ''),                 // col 13: ESIC IP NO
          designation: String(row[14] || ''),            // col 14: DESIGNATION
          department: String(row[15] || ''),             // col 15: DEPARTMENT
          natureOfDesignation: String(row[16] || ''),    // col 16: NATURE OF DESIGNATION
          monthlyGrossSalary: Number(row[17]) || 0,      // col 17: MONTHLY GROSS SALARY
          actualAttendance: Number(row[18]) || 0,        // col 18: ACTUAL ATTENDANCE
          leaveDays: Number(row[19]) || 0,               // col 19: LEAVE DAYS
          phDays: Number(row[20]) || 0,                  // col 20: PH DAYS
          actualEarnWages: Number(row[21]) || 0,         // col 21: ACTUAL EARN WAGES
          actualOtHrs: Number(row[22]) || 0,             // col 22: ACTUAL OT HRS
          actualOtAmount: Number(row[23]) || 0,          // col 23: ACTUAL OT AMOUNT
          grossEarnWages: Number(row[24]) || 0,          // col 24: GROSS EARN WAGES
          basicWagesPerDay: Number(row[25]) || 0,        // col 25: BASIC WAGES/DAY
          monthlyWorkingDays: Number(row[26]) || 26,     // col 26: MONTHLY WORKING DAYS
          otHrs: Number(row[27]) || 0,                   // col 27: OT. HRS
          attendance: Number(row[28]) || 0,              // col 28: ATTENDANCE
          ph: Number(row[29]) || 0,                      // col 29: PH
          wagesPerMonth: Number(row[30]) || 0,           // col 30: WAGES/MONTH
          earnWages: Number(row[31]) || 0,               // col 31: EARN WAGES
          phAmount: Number(row[32]) || 0,                // col 32: PH AMOUNT
          totalEarnWages: Number(row[33]) || 0,          // col 33: TOTAL EARN WAGES
          otHrsPayment: Number(row[34]) || 0,            // col 34: OT HRS PAYMENT
          totalNettPayable: Number(row[35]) || 0,        // col 35: TOTAL NETT PAYBLE
          epf: Number(row[36]) || 0,                     // col 36: EPF
          esic: Number(row[37]) || 0,                    // col 37: ESIC
          pt: Number(row[38]) || 0,                      // col 38: PT
          totalDeduction: Number(row[39]) || 0,          // col 39: TOTAL DEDUCTION
          nettPayable: Number(row[40]) || 0,             // col 40: NETT PAYBLE
          // cols 41-43 = signature/empty
          advance: Number(row[45]) || 0,                 // col 45: ADVANCE
          arrears: Number(row[46]) || 0,                 // col 46: ARREARS
          // col 49 empty, col 50 LEAVE, col 51 BONUS, cols 52-54 empty
          monthlyBasicSalary: Number(row[55]) || 0,      // col 55: MONTHLY BASIC SALARY
          monthlyHRA: Number(row[59]) || 0,              // col 59: MONTHLY House Rent Allow.
          monthlySiteAllow: Number(row[60]) || 0,        // col 60: Monthly Site Allow.
          monthlyLTA: Number(row[61]) || 0,              // col 61: Monthly Leave Travel Allow.
          monthlySpecialAllow: Number(row[62]) || 0,     // col 62: Monthly Special Allow.
          monthlyAttendanceAllow: Number(row[63]) || 0,  // col 63: MonthlyAttendence Allow.
          totalSalary: Number(row[64]) || 0,             // col 64: TOTAL SALARY
          tds: Number(row[67]) || 0,                     // col 67: TDS
        };

        // Check if payroll item already exists
        const existing = await db.payrollItem.findFirst({
          where: {
            employeeId: employee.id,
            payrollRunId: payrollRun.id,
          },
        });

        if (existing) {
          // Update existing
          await db.payrollItem.update({
            where: { id: existing.id },
            data: {
              workingDays: salaryData.monthlyWorkingDays,
              presentDays: salaryData.actualAttendance,
              paidLeaveDays: 0,
              lopDays: salaryData.monthlyWorkingDays - salaryData.actualAttendance,
              otHours: salaryData.actualOtHrs,
              basicSalary: salaryData.monthlyBasicSalary,
              hra: salaryData.monthlyHRA,
              conveyanceAllowance: salaryData.monthlySiteAllow,
              medicalAllowance: salaryData.monthlyLTA,
              specialAllowance: salaryData.monthlySpecialAllow,
              otAmount: salaryData.actualOtAmount,
              grossEarning: salaryData.monthlyGrossSalary,
              pfDeduction: salaryData.epf,
              esiDeduction: salaryData.esic,
              ptDeduction: salaryData.pt,
              tdsDeduction: salaryData.tds,
              lopDeduction: 0,
              otherDeductions: salaryData.advance,
              totalDeduction: salaryData.totalDeduction,
              netPay: salaryData.nettPayable,
              status: 'pending',
              details: { 
                imported: true, 
                importedAt: new Date().toISOString(), 
                rawData: salaryData,
                format: 'non-compliance',
              },
            },
          });
        } else {
          // Create new
          await db.payrollItem.create({
            data: {
              payrollRunId: payrollRun.id,
              employeeId: employee.id,
              workingDays: salaryData.monthlyWorkingDays,
              presentDays: salaryData.actualAttendance,
              paidLeaveDays: 0,
              lopDays: salaryData.monthlyWorkingDays - salaryData.actualAttendance,
              otHours: salaryData.actualOtHrs,
              basicSalary: salaryData.monthlyBasicSalary,
              hra: salaryData.monthlyHRA,
              conveyanceAllowance: salaryData.monthlySiteAllow,
              medicalAllowance: salaryData.monthlyLTA,
              specialAllowance: salaryData.monthlySpecialAllow,
              otAmount: salaryData.actualOtAmount,
              grossEarning: salaryData.monthlyGrossSalary,
              pfDeduction: salaryData.epf,
              esiDeduction: salaryData.esic,
              ptDeduction: salaryData.pt,
              tdsDeduction: salaryData.tds,
              lopDeduction: 0,
              otherDeductions: salaryData.advance,
              totalDeduction: salaryData.totalDeduction,
              netPay: salaryData.nettPayable,
              status: 'pending',
              payslipGenerated: false,
              details: { 
                imported: true, 
                importedAt: new Date().toISOString(), 
                rawData: salaryData,
                format: 'non-compliance',
              },
            },
          });
        }

        // Update employee bank details if provided
        if (salaryData.bankName || salaryData.accountNo || salaryData.ifscCode) {
          await db.employee.update({
            where: { id: employee.id },
            data: {
              bankName: salaryData.bankName || employee.bankName,
              bankAccount: salaryData.accountNo || employee.bankAccount,
              bankIfsc: salaryData.ifscCode || employee.bankIfsc,
              fatherName: salaryData.fatherName || employee.fatherName,
            },
          });
        }

        imported++;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    // Update payroll run totals
    const items = await db.payrollItem.findMany({
      where: { payrollRunId: payrollRun.id },
    });

    const totalGross = items.reduce((sum, item) => sum + Number(item.grossEarning), 0);
    const totalNet = items.reduce((sum, item) => sum + Number(item.netPay), 0);

    await db.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalEmployees: items.length,
        totalGross,
        totalNet,
        status: 'completed',
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        imported,
        failed,
        skipped,
        errors: errors.slice(0, 50), // Limit errors to first 50
        payrollRunId: payrollRun.id,
      },
    });
  } catch (error) {
    console.error('Error importing salary non-compliance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import salary non-compliance data' },
      { status: 500 }
    );
  }
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
