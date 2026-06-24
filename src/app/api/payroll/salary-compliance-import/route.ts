import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface SalaryComplianceRow {
  slNo: number;
  nameOfWorkman: string;
  site: string;
  uan: string;
  ipNo: string;
  designation: string;
  totalDaysWorked: number;
  otHours: number;
  workDone: string;
  dailyRate: number;
  basicWages: number;
  da: number;
  overtime: number;
  otherPayment: number;
  totalWagesForESI: number;
  epf: number;
  esi: number;
  houseRent: number;
  otherDeduction: number;
  totalDeduction: number;
  netAmount: number;
  timeDate: string;
  place: string;
  signature: string;
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

    // Use specified sheet or find compliance sheet
    let targetSheet = sheetName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('compliance') || 
        name.toLowerCase().includes('form') ||
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

    // Find the header row (compliance format may have title rows)
    let headerRowIndex = 0;
    let dataStartIndex = 1;
    
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const row = rawData[i];
      if (row && (
        String(row[0]).toLowerCase().includes('sl') ||
        String(row[1]).toLowerCase().includes('workman') ||
        String(row[1]).toLowerCase().includes('name')
      )) {
        headerRowIndex = i;
        dataStartIndex = i + 1;
        break;
      }
    }

    // Skip to data rows
    const dataRows = rawData.slice(dataStartIndex);

    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0;
    let failed = 0;
    let skipped = 0;

    // Get current month and year for payroll run
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Find or create payroll run for compliance
    let payrollRun = await db.payrollRun.findFirst({
      where: { 
        month, 
        year, 
        status: 'draft',
        payrollType: 'compliance',
      },
    });

    if (!payrollRun) {
      payrollRun = await db.payrollRun.create({
        data: {
          name: `Compliance Payroll - ${getMonthName(month)} ${year} (Imported)`,
          month,
          year,
          status: 'draft',
          payrollType: 'compliance',
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
      const rowNumber = dataStartIndex + i + 1;

      try {
        // Skip empty rows — col 0 = SL NO., col 1 = EMPLOYEE ID, col 2 = Name of workman
        if (!row || row.length === 0 || (!row[1] && !row[2])) continue;

        const employeeIdCol = String(row[1] || '').trim(); // col 1: Employee ID
        const nameOfWorkman = String(row[2] || '').trim(); // col 2: Name of workman
        if (!nameOfWorkman && !employeeIdCol) {
          errors.push({ row: rowNumber, error: 'Missing employee name and ID' });
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

        // Determine which employee to use — prefer Employee ID col, fall back to name
        let employee = null;
        
        if (manualMapping && manualMapping.action === 'map' && manualMapping.mappedEmployeeCode) {
          employee = await db.employee.findFirst({
            where: { employeeCode: manualMapping.mappedEmployeeCode },
          });
        } else if (employeeIdCol) {
          employee = await db.employee.findFirst({
            where: { employeeCode: employeeIdCol },
          });
        }

        // Fall back to name matching if ID lookup failed
        if (!employee && nameOfWorkman) {
          const allEmployees = await db.employee.findMany({
            select: { id: true, employeeCode: true, firstName: true, middleName: true, lastName: true },
          });
          employee = allEmployees.find(emp => {
            const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim().toLowerCase();
            return fullName === nameOfWorkman.toLowerCase();
          }) || allEmployees.find(emp => {
            const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim().toLowerCase();
            return fullName.includes(nameOfWorkman.toLowerCase()) || nameOfWorkman.toLowerCase().includes(fullName);
          });
        }

        if (!employee) {
          errors.push({ row: rowNumber, error: `Employee not found: ${employeeIdCol || nameOfWorkman}` });
          failed++;
          continue;
        }

        // Parse data — col 0 = SL NO., col 1 = EMPLOYEE ID, col 2 = Name, then compliance cols
        const salaryData: SalaryComplianceRow = {
          slNo: Number(row[0]) || 0,            // col 0: Sl. No.
          nameOfWorkman,                          // col 2: Name (already read)
          site: String(row[3] || ''),             // col 3: Site
          uan: String(row[4] || ''),              // col 4: UAN
          ipNo: String(row[5] || ''),             // col 5: IP NO.
          designation: String(row[6] || ''),      // col 6: Designation
          totalDaysWorked: Number(row[7]) || 0,   // col 7: Total days worked
          otHours: Number(row[8]) || 0,           // col 8: OT hours
          workDone: String(row[9] || ''),         // col 9: Work done
          dailyRate: Number(row[10]) || 0,        // col 10: Daily rate
          basicWages: Number(row[11]) || 0,       // col 11: Basic wages
          da: Number(row[12]) || 0,               // col 12: DA
          overtime: Number(row[13]) || 0,         // col 13: Overtime
          otherPayment: Number(row[14]) || 0,     // col 14: Other cash payment
          totalWagesForESI: Number(row[15]) || 0, // col 15: Total wages for ESI
          epf: Number(row[16]) || 0,              // col 16: EPF
          esi: Number(row[17]) || 0,              // col 17: ESI
          houseRent: Number(row[18]) || 0,        // col 18: House rent
          otherDeduction: Number(row[19]) || 0,   // col 19: PT
          totalDeduction: Number(row[20]) || 0,   // col 20: Total deduction
          netAmount: Number(row[21]) || 0,        // col 21: Net amount paid
          timeDate: String(row[22] || ''),        // col 22: Time & date
          place: String(row[23] || ''),           // col 23: Place
          signature: String(row[24] || ''),       // col 24: Signature
        };

        // Check if payroll item already exists
        const existing = await db.payrollItem.findFirst({
          where: {
            employeeId: employee.id,
            payrollRunId: payrollRun.id,
          },
        });

        // Calculate working days (default 26 if not specified)
        const workingDays = 26;
        const presentDays = salaryData.totalDaysWorked;
        const lopDays = workingDays - presentDays;

        if (existing) {
          // Update existing
          await db.payrollItem.update({
            where: { id: existing.id },
            data: {
              workingDays,
              presentDays,
              paidLeaveDays: 0,
              lopDays,
              otHours: salaryData.otHours,
              basicSalary: salaryData.basicWages,
              hra: salaryData.houseRent,
              conveyanceAllowance: 0,
              medicalAllowance: 0,
              specialAllowance: salaryData.otherPayment,
              otAmount: salaryData.overtime,
              grossEarning: salaryData.totalWagesForESI,
              pfDeduction: salaryData.epf,
              esiDeduction: salaryData.esi,
              ptDeduction: 0, // PT / Other deduction — not deducted by the company
              tdsDeduction: 0,
              lopDeduction: 0,
              otherDeductions: 0,
              totalDeduction: salaryData.totalDeduction,
              netPay: salaryData.netAmount,
              status: 'pending',
              details: { 
                imported: true, 
                importedAt: new Date().toISOString(), 
                rawData: salaryData,
                format: 'compliance',
                site: salaryData.site,
                uan: salaryData.uan,
                ipNo: salaryData.ipNo,
              },
            },
          });
        } else {
          // Create new
          await db.payrollItem.create({
            data: {
              payrollRunId: payrollRun.id,
              employeeId: employee.id,
              workingDays,
              presentDays,
              paidLeaveDays: 0,
              lopDays,
              otHours: salaryData.otHours,
              basicSalary: salaryData.basicWages,
              hra: salaryData.houseRent,
              conveyanceAllowance: 0,
              medicalAllowance: 0,
              specialAllowance: salaryData.otherPayment,
              otAmount: salaryData.overtime,
              grossEarning: salaryData.totalWagesForESI,
              pfDeduction: salaryData.epf,
              esiDeduction: salaryData.esi,
              ptDeduction: 0, // PT / Other deduction — not deducted by the company
              tdsDeduction: 0,
              lopDeduction: 0,
              otherDeductions: 0,
              totalDeduction: salaryData.totalDeduction,
              netPay: salaryData.netAmount,
              status: 'pending',
              payslipGenerated: false,
              details: { 
                imported: true, 
                importedAt: new Date().toISOString(), 
                rawData: salaryData,
                format: 'compliance',
                site: salaryData.site,
                uan: salaryData.uan,
                ipNo: salaryData.ipNo,
              },
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
