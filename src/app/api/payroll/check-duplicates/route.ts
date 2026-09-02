import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface DuplicateRecord {
  row: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  month: number;
  year: number;
  existingData: {
    payrollItemId: number;
    netPay: number;
    grossEarning: number;
    advance: number;
    arrears: number;
    createdAt: string;
    updatedAt: string;
  };
  newData: {
    netPay: number;
    grossEarning: number;
    advance: number;
    arrears: number;
  };
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetName = formData.get('sheetName') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Use specified sheet or find default
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
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length < 2) {
      return NextResponse.json(
        { success: false, error: 'File is empty or has no data rows' },
        { status: 400 }
      );
    }

    // Skip header row
    const dataRows = rawData.slice(1);

    // Month/year of the data being imported. Use the period the user selected in
    // the import dialog; fall back to the current month only if none was sent.
    const monthRaw = formData.get('month');
    const yearRaw = formData.get('year');
    const now = new Date();
    const month = monthRaw ? parseInt(String(monthRaw)) : now.getMonth() + 1;
    const year = yearRaw ? parseInt(String(yearRaw)) : now.getFullYear();

    const duplicates: DuplicateRecord[] = [];
    const sessionData: any[] = [];

    // Process each row to check for duplicates
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;

      try {
        // Skip empty rows — col 0 = SL NO., col 1 = EMPLOYEE ID, col 3 = TOKEN NO
        if (!row || row.length === 0 || (!row[1] && !row[3])) continue;

        const employeeIdCol = String(row[1] || '').trim(); // EMPLOYEE ID (col 1)
        const tokenNo = String(row[3] || '').trim();
        if (!tokenNo && !employeeIdCol) continue;

        const employeeCodeToUse = employeeIdCol || tokenNo;

        // Find employee
        const employee = await db.employee.findFirst({
          where: { employeeCode: employeeCodeToUse },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        });

        if (!employee) continue;

        // Store row data for later import
        sessionData.push({
          rowNumber,
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          rowData: row,
        });

        // Check for existing payroll item
        const existingItem = await db.payrollItem.findFirst({
          where: {
            employeeId: employee.id,
            PayrollRun: {
              month,
              year,
            },
          },
          include: {
            PayrollRun: true,
          },
        });

        if (existingItem) {
          // Parse new data from Excel
          const newNetPay = Number(row[40]) || 0;
          const newGrossEarning = Number(row[17]) || 0;
          const newAdvance = Number(row[45]) || 0;
          const newArrears = Number(row[46]) || 0;

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
              advance: Number(existingItem.otherDeductions),
              arrears: 0, // Not stored separately in current schema
              createdAt: existingItem.createdAt.toISOString(),
              updatedAt: existingItem.updatedAt.toISOString(),
            },
            newData: {
              netPay: newNetPay,
              grossEarning: newGrossEarning,
              advance: newAdvance,
              arrears: newArrears,
            },
          });
        }
      } catch (error) {
        console.error(`Error checking row ${rowNumber}:`, error);
      }
    }

    // Generate session ID
    const sessionId = `payroll_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store session data in memory (in production, use Redis or database)
    // For now, we'll return it and expect the client to send it back
    return NextResponse.json({
      success: true,
      data: {
        hasDuplicates: duplicates.length > 0,
        duplicateCount: duplicates.length,
        totalRows: sessionData.length,
        duplicates,
        sessionId,
        month,
        year,
        // Include session data in response for client to send back
        sessionData: Buffer.from(JSON.stringify(sessionData)).toString('base64'),
      },
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
