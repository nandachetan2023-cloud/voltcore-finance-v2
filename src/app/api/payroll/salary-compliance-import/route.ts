import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface SalaryComplianceRow {
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
  extraDays: number;
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

    // Use specified sheet or find "COMBINED SALARY SHEET" or use first sheet
    let targetSheet = sheetName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames.find(name => name === 'COMBINED SALARY SHEET') || workbook.SheetNames[0];
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

    // Find or create payroll run
    let payrollRun = await db.payrollRun.findFirst({
      where: { month, year, status: 'draft' },
    });

    if (!payrollRun) {
      payrollRun = await db.payrollRun.create({
        data: {
          name: `Payroll - ${getMonthName(month)} ${year} (Imported)`,
          month,
          year,
          status: 'draft',
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
        // Skip empty rows
        if (!row || row.length === 0 || !row[2]) continue;

        const tokenNo = String(row[2] || '').trim();
        if (!tokenNo) {
          errors.push({ row: rowNumber, error: 'Missing TOKEN NO.' });
          failed++;
          continue;
        }

        // Check if this row has a manual mapping
        const manualMapping = manualMappings.get(rowNumber);
        
        // If manually skipped, skip this row
        if (manualMapping && manualMapping.action === 'skip') {
          skipped++;
          continue;
        }

        // Determine which employee code to use
        let employeeCodeToUse = tokenNo;
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

        // Parse data - Column indices based on actual file format (68 columns)
        const salaryData: SalaryComplianceRow = {
          slNo: Number(row[0]) || 0,
          tokenNo,
          employeeName: String(row[3] || ''),
          fatherName: String(row[4] || ''),
          doj: String(row[5] || ''),
          dob: String(row[6] || ''),
          bankName: String(row[7] || ''),
          accountNo: String(row[8] || ''),
          ifscCode: String(row[9] || ''),
          // Column 10 is empty
          uanNo: String(row[11] || ''),
          esicNo: String(row[12] || ''),
          designation: String(row[13] || ''),
          department: String(row[14] || ''),
          natureOfDesignation: String(row[15] || ''),
          monthlyGrossSalary: Number(row[16]) || 0,
          actualAttendance: Number(row[17]) || 0,
          extraDays: Number(row[18]) || 0,
          phDays: Number(row[19]) || 0,
          actualEarnWages: Number(row[20]) || 0,
          actualOtHrs: Number(row[21]) || 0,
          actualOtAmount: Number(row[22]) || 0,
          grossEarnWages: Number(row[23]) || 0,
          basicWagesPerDay: Number(row[24]) || 0,
          monthlyWorkingDays: Number(row[25]) || 26,
          otHrs: Number(row[26]) || 0,
          attendance: Number(row[27]) || 0,
          ph: Number(row[28]) || 0,
          wagesPerMonth: Number(row[29]) || 0,
          earnWages: Number(row[30]) || 0,
          phAmount: Number(row[31]) || 0,
          totalEarnWages: Number(row[32]) || 0,
          otHrsPayment: Number(row[33]) || 0,
          totalNettPayable: Number(row[34]) || 0,
          epf: Number(row[35]) || 0,
          esic: Number(row[36]) || 0,
          pt: Number(row[37]) || 0,
          totalDeduction: Number(row[38]) || 0,
          nettPayable: Number(row[39]) || 0,
          // Columns 40-42 are signature/empty
          advance: Number(row[44]) || 0,
          arrears: Number(row[45]) || 0,
          // Column 48 is empty
          monthlyBasicSalary: Number(row[54]) || 0,
          monthlyHRA: Number(row[58]) || 0,
          monthlySiteAllow: Number(row[59]) || 0,
          monthlyLTA: Number(row[60]) || 0,
          monthlySpecialAllow: Number(row[61]) || 0,
          monthlyAttendanceAllow: Number(row[62]) || 0,
          totalSalary: Number(row[63]) || 0,
          tds: Number(row[66]) || 0,
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
              details: { imported: true, importedAt: new Date().toISOString(), rawData: salaryData },
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
              details: { imported: true, importedAt: new Date().toISOString(), rawData: salaryData },
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
    console.error('Error importing salary compliance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import salary compliance data' },
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
