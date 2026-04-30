import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request);

  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const departmentId = searchParams.get('departmentId');
    const designationId = searchParams.get('designationId');
    const branchId = searchParams.get('branchId');
    const employeeId = searchParams.get('employeeId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Build employee filter
    const employeeWhere: any = { isDeleted: false };
    if (departmentId) employeeWhere.departmentId = parseInt(departmentId);
    if (designationId) employeeWhere.designationId = parseInt(designationId);
    if (branchId) employeeWhere.branchId = parseInt(branchId);
    if (employeeId) employeeWhere.id = parseInt(employeeId);
    if (!includeInactive) employeeWhere.employmentStatus = 'active';

    const employees = await db.employee.findMany({
      where: employeeWhere,
      include: { Department: true, Designation: true, Branch: true },
      orderBy: [{ Department: { name: 'asc' } }, { employeeCode: 'asc' }],
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees found matching the filters' },
        { status: 404 }
      );
    }

    // Fetch attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceData = await db.attendanceLog.groupBy({
      by: ['employeeId', 'status'],
      where: {
        employeeId: { in: employees.map(e => e.id) },
        logDate: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    const attendanceMap = new Map<number, number>();
    attendanceData.forEach(a => {
      if (a.status === 'present' || a.status === 'half-day') {
        attendanceMap.set(a.employeeId, (attendanceMap.get(a.employeeId) || 0) + (a._count?.id || 0));
      }
    });

    // Fetch salary structures
    const salaryAssignments = await db.salaryStructureAssignment.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        effectiveFrom: { lte: new Date(year, month - 1, 1) },
      },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        SalaryStructure: {
          include: {
            SalaryStructureItem: { include: { SalaryComponent: true } },
          },
        },
      },
    });

    // Build salary map (latest assignment per employee)
    const salaryMap = new Map<number, { basic: number; hra: number; da: number }>();
    const seenEmployees = new Set<number>();
    for (const sa of salaryAssignments) {
      if (seenEmployees.has(sa.employeeId)) continue;
      seenEmployees.add(sa.employeeId);
      let basic = 0, hra = 0, da = 0;
      for (const item of sa.SalaryStructure.SalaryStructureItem) {
        const name = item.SalaryComponent.name.toLowerCase();
        const amt = Number(item.fixedAmount) || 0;
        if (name.includes('basic')) basic = amt;
        else if (name.includes('hra') || name.includes('house rent')) hra = amt;
        else if (name.includes('da') || name.includes('dearness')) da = amt;
      }
      salaryMap.set(sa.employeeId, { basic, hra, da });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Compliance Salary Sheet');

    // Column headers — 26 cols: Sl. No., Employee ID, Name, Site, UAN, IP NO., Designation,
    // Days Worked (user input), OT Hours (user input), Work Done,
    // Daily Rate, Basic Wages, DA, Overtime, Other Cash, Total Wages ESI,
    // EPF, ESI, House Rent, PT, Total Deduction, Net Amount, Time/Date, Place, Signature
    const headers = [
      'Sl. No.', 'Employee ID', 'Name of the workman', 'Site', 'UAN', 'IP NO.', 'Designation',
      'TOTAL NO OF DAYS WORKED', 'O.T Hours', 'no.of work done',
      'daily rate of wages', 'Basic wages in Rs', 'Dearness allowances in Rs',
      'Overtime in Rs', 'Other cash payment in Rs', 'TOTAL WAGES FOR ESI DEDUCTION(TNP)',
      'E.P.F in Rs', 'E.S.I in Rs', 'House rent in Rs', 'Other deduction in Rs(PT)',
      'Total deduction in Rs', 'Net amount paid in Rs',
      'Time & date of payment', 'Place of payment', 'Signature or thumb Impression',
    ];

    worksheet.addRow(headers);

    // Styles
    // Blue  = auto-filled by system, fully editable — user can override any value
    // Yellow = user input required — must be filled before upload
    // White  = calculated by system after upload — leave blank
    const autoFilledStyle = {
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9E1F2' } },
      font: { color: { argb: 'FF1F4E78' }, bold: false },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } },
    };
    const userInputStyle = {
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF2CC' } },
      font: { color: { argb: 'FF7F6000' }, bold: true },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } },
    };
    const calculatedStyle = {
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } },
    };

    const workingDays = new Date(year, month, 0).getDate();

    employees.forEach((emp, index) => {
      const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim().toUpperCase();
      const presentDays = attendanceMap.get(emp.id) || 0;
      const salary = salaryMap.get(emp.id) || { basic: 0, hra: 0, da: 0 };

      const row = worksheet.addRow([
        index + 1,                          // col 1: Sl. No.
        emp.employeeCode,                   // col 2: Employee ID
        fullName,                           // col 3: Name
        emp.Branch?.name || '',             // col 4: Site
        emp.uanNumber || '',                // col 5: UAN
        emp.esicNumber || '',               // col 6: IP NO.
        emp.Designation?.name || '',        // col 7: Designation
        presentDays,                        // col 8: Days Worked (pre-filled from attendance, user can edit)
        '',                                 // col 9: OT Hours (USER INPUT)
        '',                                 // col 10: Work Done (USER INPUT)
        '',                                 // col 11: Daily Rate (CALCULATED)
        '',                                 // col 12: Basic Wages (CALCULATED)
        '',                                 // col 13: DA (CALCULATED)
        '',                                 // col 14: Overtime (CALCULATED)
        '',                                 // col 15: Other Cash (USER INPUT)
        '',                                 // col 16: Total Wages ESI (CALCULATED)
        '',                                 // col 17: EPF (CALCULATED)
        '',                                 // col 18: ESI (CALCULATED)
        '',                                 // col 19: House Rent (CALCULATED)
        '',                                 // col 20: PT (CALCULATED)
        '',                                 // col 21: Total Deduction (CALCULATED)
        '',                                 // col 22: Net Amount (CALCULATED)
        '',                                 // col 23: Time/Date (USER INPUT)
        '',                                 // col 24: Place (USER INPUT)
        '',                                 // col 25: Signature (USER INPUT)
      ]);

      // Store salary data in hidden columns for calculation reference
      // We'll embed basic/hra/da as notes on the employee ID cell
      const empCell = row.getCell(2);
      empCell.note = JSON.stringify({ basic: salary.basic, hra: salary.hra, da: salary.da, workingDays });

      // Apply styles
      // cols 1-7: auto-filled (blue, editable — user can override)
      for (let c = 1; c <= 7; c++) {
        row.getCell(c).style = autoFilledStyle;
        row.getCell(c).note = 'Auto-filled by system. You can edit this value if needed.';
      }

      // col 8 (Days Worked): pre-filled from attendance, editable (yellow)
      row.getCell(8).style = userInputStyle;
      row.getCell(8).note = 'Pre-filled from attendance. You can edit this value.';

      // cols 9, 10, 15, 23, 24, 25: user input (yellow)
      [9, 10, 15, 23, 24, 25].forEach(c => {
        row.getCell(c).style = userInputStyle;
        row.getCell(c).note = 'USER INPUT REQUIRED';
      });

      // cols 11-14, 16-22: calculated (white)
      [11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22].forEach(c => {
        row.getCell(c).style = calculatedStyle;
      });
    });

    // Column widths
    worksheet.columns = [
      { width: 8 },  // Sl. No.
      { width: 14 }, // Employee ID
      { width: 25 }, // Name
      { width: 15 }, // Site
      { width: 15 }, // UAN
      { width: 15 }, // IP NO.
      { width: 20 }, // Designation
      { width: 14 }, // Days Worked
      { width: 12 }, // OT Hours
      { width: 14 }, // Work Done
      { width: 14 }, // Daily Rate
      { width: 14 }, // Basic Wages
      { width: 16 }, // DA
      { width: 14 }, // Overtime
      { width: 16 }, // Other Cash
      { width: 20 }, // Total Wages ESI
      { width: 12 }, // EPF
      { width: 12 }, // ESI
      { width: 14 }, // House Rent
      { width: 16 }, // PT
      { width: 16 }, // Total Deduction
      { width: 16 }, // Net Amount
      { width: 16 }, // Time/Date
      { width: 14 }, // Place
      { width: 20 }, // Signature
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell(cell => {
      cell.style = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } },
        font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
      };
    });

    // Add colour legend as a note on the first header cell
    worksheet.getRow(1).getCell(1).note = [
      'COLOUR LEGEND:',
      '🔵 Blue  = Auto-filled by system. You CAN edit these values.',
      '🟡 Yellow = USER INPUT REQUIRED — must be filled before uploading.',
      '⬜ White  = Calculated automatically after upload — leave blank.',
    ].join('\n');

    const buffer = await workbook.xlsx.writeBuffer();
    const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const filename = `Compliance_Template_${monthNames[month - 1]}_${year}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating compliance template:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate compliance template' }, { status: 500 });
  }
}
