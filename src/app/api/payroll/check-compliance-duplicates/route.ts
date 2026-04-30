import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetName = formData.get('sheetName') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    let targetSheet = sheetName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('compliance') || name.toLowerCase().includes('salary')
      ) || workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[targetSheet];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length < 2) {
      return NextResponse.json({ success: false, error: 'File is empty or has no data rows' }, { status: 400 });
    }

    // Find header row (compliance format may have title rows)
    let dataStartIndex = 1;
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const row = rawData[i];
      if (row && (String(row[0]).toLowerCase().includes('sl') || String(row[2]).toLowerCase().includes('workman') || String(row[2]).toLowerCase().includes('name'))) {
        dataStartIndex = i + 1;
        break;
      }
    }

    const dataRows = rawData.slice(dataStartIndex);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const duplicates: any[] = [];
    const sessionData: any[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = dataStartIndex + i + 1;

      try {
        // col 0=Sl.No., col 1=Employee ID, col 2=Name
        if (!row || row.length === 0 || (!row[1] && !row[2])) continue;

        const employeeIdCol = String(row[1] || '').trim();
        const nameOfWorkman = String(row[2] || '').trim();
        if (!employeeIdCol && !nameOfWorkman) continue;

        let employee = null;
        if (employeeIdCol) {
          employee = await db.employee.findFirst({
            where: { employeeCode: employeeIdCol },
            select: { id: true, employeeCode: true, firstName: true, middleName: true, lastName: true },
          });
        }
        if (!employee && nameOfWorkman) {
          const all = await db.employee.findMany({ select: { id: true, employeeCode: true, firstName: true, middleName: true, lastName: true } });
          employee = all.find(e => {
            const fn = `${e.firstName} ${e.middleName || ''} ${e.lastName}`.trim().toLowerCase();
            return fn === nameOfWorkman.toLowerCase();
          }) || null;
        }

        if (!employee) continue;

        sessionData.push({ rowNumber, employeeId: employee.id, employeeCode: employee.employeeCode, rowData: row });

        const existingItem = await db.payrollItem.findFirst({
          where: { employeeId: employee.id, PayrollRun: { month, year } },
          include: { PayrollRun: true },
        });

        if (existingItem) {
          // col 21 = Net amount, col 15 = Total wages ESI (gross)
          const newNetPay = Number(row[21]) || 0;
          const newGross = Number(row[15]) || 0;

          duplicates.push({
            row: rowNumber,
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
            employeeName: `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim(),
            month,
            year,
            existingData: {
              payrollItemId: existingItem.id,
              netPay: Number(existingItem.netPay),
              grossEarning: Number(existingItem.grossEarning),
              createdAt: existingItem.createdAt.toISOString(),
              updatedAt: existingItem.updatedAt.toISOString(),
            },
            newData: { netPay: newNetPay, grossEarning: newGross },
          });
        }
      } catch (err) {
        console.error(`Error checking row ${rowNumber}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hasDuplicates: duplicates.length > 0,
        duplicateCount: duplicates.length,
        totalRows: sessionData.length,
        duplicates,
        sessionId: `compliance_${Date.now()}`,
        month,
        year,
        sessionData: Buffer.from(JSON.stringify(sessionData)).toString('base64'),
      },
    });
  } catch (error) {
    console.error('Error checking compliance duplicates:', error);
    return NextResponse.json({ success: false, error: 'Failed to check for duplicates' }, { status: 500 });
  }
}
