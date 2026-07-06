import { getDbForRequest } from '@/lib/db';
import { syncComplianceRunFromNonCompliance } from '@/lib/services/compliance-run';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface DuplicateAction {
  employeeId: number;
  action: 'update' | 'keep';
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const body = await request.json();
    const { sessionData, duplicateActions, month, year, file } = body;

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'No session data provided' },
        { status: 400 }
      );
    }

    // Decode session data
    const decodedData = JSON.parse(Buffer.from(sessionData, 'base64').toString());

    // Parse duplicate actions
    const actionMap = new Map<number, 'update' | 'keep'>();
    if (duplicateActions) {
      Object.entries(duplicateActions).forEach(([employeeId, action]) => {
        actionMap.set(parseInt(employeeId), action as 'update' | 'keep');
      });
    }

    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // Find or create payroll run
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
    for (const item of decodedData) {
      const { rowNumber, employeeId, rowData } = item;

      try {
        // Check if this employee has a duplicate action
        const action = actionMap.get(employeeId);

        // Check if payroll item exists
        const existing = await db.payrollItem.findFirst({
          where: {
            employeeId,
            payrollRunId: payrollRun.id,
          },
        });

        if (existing) {
          if (action === 'keep') {
            skipped++;
            continue;
          }
          // action === 'update' or no action specified (default to update)
        }

        // Parse salary data from row
        const salaryData = {
          monthlyGrossSalary: Number(rowData[17]) || 0,
          actualAttendance: Number(rowData[18]) || 0,
          monthlyWorkingDays: Number(rowData[26]) || 26,
          actualOtHrs: Number(rowData[22]) || 0,
          actualOtAmount: Number(rowData[23]) || 0,
          grossEarnWages: Number(rowData[24]) || 0,
          monthlyBasicSalary: Number(rowData[55]) || 0,
          basicWagesPerDay: Number(rowData[25]) || 0,
          monthlyHRA: Number(rowData[59]) || 0,
          monthlySiteAllow: Number(rowData[60]) || 0,
          monthlyLTA: Number(rowData[61]) || 0,
          monthlySpecialAllow: Number(rowData[62]) || 0,
          monthlyAttendanceAllow: Number(rowData[63]) || 0,
          phAmount: Number(rowData[32]) || 0,
          epf: Number(rowData[36]) || 0,
          esic: Number(rowData[37]) || 0,
          pt: Number(rowData[38]) || 0,
          tds: Number(rowData[67]) || 0,
          totalDeduction: Number(rowData[39]) || 0,
          nettPayable: Number(rowData[40]) || 0,
          totalNonComplianceAmount: Number(rowData[44]) || 0,
          advance: Number(rowData[45]) || 0,
          bankName: String(rowData[8] || ''),
          accountNo: String(rowData[9] || ''),
          ifscCode: String(rowData[10] || ''),
          fatherName: String(rowData[5] || ''),
        };

        const payrollItemData = {
          workingDays: salaryData.monthlyWorkingDays,
          presentDays: salaryData.actualAttendance,
          paidLeaveDays: 0,
          lopDays: salaryData.monthlyWorkingDays - salaryData.actualAttendance,
          otHours: salaryData.actualOtHrs,
          basicSalary: salaryData.monthlyBasicSalary,
          basicWagesPerDay: salaryData.basicWagesPerDay,
          hra: salaryData.monthlyHRA,
          conveyanceAllowance: salaryData.monthlySiteAllow,
          medicalAllowance: salaryData.monthlyLTA,
          specialAllowance: salaryData.monthlySpecialAllow,
          attendanceAllowance: salaryData.monthlyAttendanceAllow,
          phAmount: salaryData.phAmount,
          otAmount: salaryData.actualOtAmount,
          grossEarning: salaryData.monthlyGrossSalary,
          grossEarnWages: salaryData.grossEarnWages,
          totalNonComplianceAmount: salaryData.totalNonComplianceAmount,
          pfDeduction: salaryData.epf,
          esiDeduction: salaryData.esic,
          ptDeduction: 0, // PT — not deducted by the company
          tdsDeduction: 0, // TDS — not deducted by the company
          lopDeduction: 0,
          otherDeductions: salaryData.advance,
          totalDeduction: salaryData.totalDeduction,
          netPay: salaryData.nettPayable,
          status: 'pending',
          details: { 
            imported: true, 
            importedAt: new Date().toISOString(), 
            format: 'non-compliance',
            duplicateAction: action || 'new',
          },
        };

        if (existing) {
          // Update existing
          await db.payrollItem.update({
            where: { id: existing.id },
            data: payrollItemData,
          });
          updated++;
        } else {
          // Create new
          await db.payrollItem.create({
            data: {
              ...payrollItemData,
              payrollRunId: payrollRun.id,
              employeeId,
              payslipGenerated: false,
            },
          });
          imported++;
        }

        // Update employee bank details if provided
        if (salaryData.bankName || salaryData.accountNo || salaryData.ifscCode) {
          const employee = await db.employee.findUnique({ where: { id: employeeId } });
          if (employee) {
            await db.employee.update({
              where: { id: employeeId },
              data: {
                bankName: salaryData.bankName || employee.bankName,
                bankAccount: salaryData.accountNo || employee.bankAccount,
                bankIfsc: salaryData.ifscCode || employee.bankIfsc,
                fatherName: salaryData.fatherName || employee.fatherName,
              },
            });
          }
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
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

    // Auto-generate the matching compliance run so it appears in the Compliance view
    try {
      await syncComplianceRunFromNonCompliance(db, payrollRun.id, month, year);
    } catch (e) {
      console.error('Failed to auto-generate compliance run:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        imported,
        updated,
        skipped,
        failed: errors.length,
        errors: errors.slice(0, 50),
        payrollRunId: payrollRun.id,
      },
    });
  } catch (error) {
    console.error('Error importing with duplicates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import salary data' },
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
