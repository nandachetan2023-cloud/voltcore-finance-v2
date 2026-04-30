import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const body = await request.json();
    const { sessionData, duplicateActions, month, year } = body;

    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'No session data provided' }, { status: 400 });
    }

    const decodedData = JSON.parse(Buffer.from(sessionData, 'base64').toString());

    const actionMap = new Map<number, 'update' | 'keep'>();
    if (duplicateActions) {
      Object.entries(duplicateActions).forEach(([id, action]) => {
        actionMap.set(parseInt(id), action as 'update' | 'keep');
      });
    }

    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0, updated = 0, skipped = 0;

    // Find or create payroll run
    let payrollRun = await db.payrollRun.findFirst({
      where: { month, year, status: 'draft', payrollType: 'compliance' },
    });

    if (!payrollRun) {
      payrollRun = await db.payrollRun.create({
        data: {
          name: `Compliance Payroll - ${getMonthName(month)} ${year} (Imported)`,
          month, year, status: 'draft', payrollType: 'compliance',
          totalEmployees: 0, totalGross: 0, totalNet: 0, updatedAt: new Date(),
        },
      });
    }

    for (const item of decodedData) {
      const { rowNumber, employeeId, rowData } = item;

      try {
        const action = actionMap.get(employeeId);

        const existing = await db.payrollItem.findFirst({
          where: { employeeId, payrollRunId: payrollRun.id },
        });

        if (existing && action === 'keep') {
          skipped++;
          continue;
        }

        // Parse compliance row data
        // col 0=Sl.No., col 1=Employee ID, col 2=Name, col 3=Site, col 4=UAN, col 5=IP NO., col 6=Designation
        // col 7=Days Worked, col 8=OT Hours, col 9=Work Done, col 10=Daily Rate
        // col 11=Basic Wages, col 12=DA, col 13=Overtime, col 14=Other Cash
        // col 15=Total Wages ESI, col 16=EPF, col 17=ESI, col 18=House Rent
        // col 19=PT, col 20=Total Deduction, col 21=Net Amount
        const salaryData = {
          totalDaysWorked: Number(rowData[7]) || 0,
          otHours: Number(rowData[8]) || 0,
          dailyRate: Number(rowData[10]) || 0,
          basicWages: Number(rowData[11]) || 0,
          da: Number(rowData[12]) || 0,
          overtime: Number(rowData[13]) || 0,
          otherPayment: Number(rowData[14]) || 0,
          totalWagesForESI: Number(rowData[15]) || 0,
          epf: Number(rowData[16]) || 0,
          esi: Number(rowData[17]) || 0,
          houseRent: Number(rowData[18]) || 0,
          pt: Number(rowData[19]) || 0,
          totalDeduction: Number(rowData[20]) || 0,
          netAmount: Number(rowData[21]) || 0,
        };

        const workingDays = 26;
        const lopDays = workingDays - salaryData.totalDaysWorked;

        const payrollItemData = {
          workingDays,
          presentDays: salaryData.totalDaysWorked,
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
          ptDeduction: salaryData.pt,
          tdsDeduction: 0,
          lopDeduction: 0,
          otherDeductions: 0,
          totalDeduction: salaryData.totalDeduction,
          netPay: salaryData.netAmount,
          status: 'pending',
          details: {
            imported: true,
            importedAt: new Date().toISOString(),
            format: 'compliance',
            duplicateAction: action || 'new',
          },
        };

        if (existing) {
          await db.payrollItem.update({ where: { id: existing.id }, data: payrollItemData });
          updated++;
        } else {
          await db.payrollItem.create({
            data: { ...payrollItemData, payrollRunId: payrollRun.id, employeeId, payslipGenerated: false },
          });
          imported++;
        }
      } catch (err) {
        errors.push({ row: rowNumber, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    // Update payroll run totals
    const items = await db.payrollItem.findMany({ where: { payrollRunId: payrollRun.id } });
    const totalGross = items.reduce((s, i) => s + Number(i.grossEarning), 0);
    const totalNet = items.reduce((s, i) => s + Number(i.netPay), 0);

    await db.payrollRun.update({
      where: { id: payrollRun.id },
      data: { totalEmployees: items.length, totalGross, totalNet, status: 'completed', processedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { imported, updated, skipped, failed: errors.length, errors: errors.slice(0, 50), payrollRunId: payrollRun.id },
    });
  } catch (error) {
    console.error('Error importing compliance with duplicates:', error);
    return NextResponse.json({ success: false, error: 'Failed to import compliance salary data' }, { status: 500 });
  }
}

function getMonthName(month: number): string {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return months[month - 1] || 'Unknown';
}
