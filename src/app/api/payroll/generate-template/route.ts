import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '1');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const departmentId = searchParams.get('departmentId');
    const branchId = searchParams.get('branchId');
    const employeeId = searchParams.get('employeeId');

    // Build where clause for employee filtering
    const employeeWhere: any = { isDeleted: false };
    if (departmentId) employeeWhere.departmentId = parseInt(departmentId);
    if (branchId) employeeWhere.branchId = parseInt(branchId);
    if (employeeId) employeeWhere.id = parseInt(employeeId);
    employeeWhere.employmentStatus = 'active';

    // Fetch employees
    const employees = await db.employee.findMany({
      where: employeeWhere,
      include: {
        Department: true,
        Designation: true,
        Branch: true,
        Grade: true,
      },
      orderBy: [
        { Department: { name: 'asc' } },
        { employeeCode: 'asc' },
      ],
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees found matching the filters' },
        { status: 404 }
      );
    }

    // Get attendance data for the month
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

    // Fetch approved tour requests (count as present)
    const tourData = await db.tourRequest.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        status: 'approved',
        fromDate: { lte: endDate },
        toDate: { gte: startDate },
        isDeleted: false,
      },
      select: { employeeId: true, days: true },
    });

    // Fetch approved paid leave requests for leave days
    const leaveData = await db.leaveRequest.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        status: 'approved',
        fromDate: { lte: endDate },
        toDate: { gte: startDate },
        isDeleted: false,
      },
      select: { employeeId: true, days: true },
    });

    // Create attendance map
    const attendanceMap = new Map<number, { present: number; leaveDays: number }>();
    attendanceData.forEach(a => {
      if (!attendanceMap.has(a.employeeId)) {
        attendanceMap.set(a.employeeId, { present: 0, leaveDays: 0 });
      }
      const data = attendanceMap.get(a.employeeId)!;
      if (a.status === 'present' || a.status === 'half-day') {
        data.present += a._count?.id || 0;
      }
    });
    tourData.forEach(t => {
      if (!attendanceMap.has(t.employeeId)) {
        attendanceMap.set(t.employeeId, { present: 0, leaveDays: 0 });
      }
      attendanceMap.get(t.employeeId)!.present += Number(t.days);
    });
    leaveData.forEach(l => {
      if (!attendanceMap.has(l.employeeId)) {
        attendanceMap.set(l.employeeId, { present: 0, leaveDays: 0 });
      }
      attendanceMap.get(l.employeeId)!.leaveDays += Number(l.days);
    });

    // Fetch shift assignments for working days calculation
    const shiftAssignments = await db.shiftAssignment.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        effectiveFrom: { lte: endDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: startDate } }],
      },
      include: { Shift: { select: { weekOffDays: true } } },
      orderBy: { effectiveFrom: 'desc' },
    });

    const shiftWeekOffDaysMap = new Map<number, number[]>();
    for (const sa of shiftAssignments) {
      if (!shiftWeekOffDaysMap.has(sa.employeeId) && sa.Shift?.weekOffDays) {
        shiftWeekOffDaysMap.set(sa.employeeId, sa.Shift.weekOffDays);
      }
    }

    function computeMonthlyWorkingDays(month: number, year: number, weekOffDays: number[]): number {
      const totalDays = new Date(year, month, 0).getDate();
      let count = 0;
      for (let d = 1; d <= totalDays; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        if (!weekOffDays.includes(dow)) count++;
      }
      return count;
    }

    // Fetch approved advances for the month
    // Use approvedAmount if set (approver may have reduced the amount), otherwise fall back to amount
    const advanceData = await db.employeeRequest.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        requestType: 'advance_payment',
        status: 'approved',
        approvedDate: {
          gte: startDate,
          lte: endDate,
        },
        isDeleted: false,
      },
      select: {
        employeeId: true,
        amount: true,
        approvedAmount: true,
      },
    });

    // Sum per employee: use approvedAmount if set, else amount
    const advanceMap = new Map<number, number>();
    advanceData.forEach(a => {
      const effectiveAmount = a.approvedAmount !== null
        ? parseFloat(a.approvedAmount.toString())
        : (a.amount ? parseFloat(a.amount.toString()) : 0);
      advanceMap.set(a.employeeId, (advanceMap.get(a.employeeId) || 0) + effectiveAmount);
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NON-COMPLIANCE SALARY SHEET');

    // Define column headers (69 columns - SL NO. first, then EMPLOYEE ID, then original 67 columns)
    const headers = [
      'SL NO.', 'EMPLOYEE ID', 'WORKMEN SL. NO.', 'TOKEN NO.', 'NAME OF EMPLOYEE', "FATHER'S NAME",
      'DOJ', 'DOB', 'BANK NAME', 'ACCOUNT NO.', 'IFSC CODE NO.', '',
      'UAN NO.', 'ESIC IP NO', 'DESIGNATION', 'DEPARTMENT', 'NATURE OF DESIGNATION',
      'MONTHLY GROSS SALARY', 'ACTUAL ATTENDANCE', 'LEAVE DAYS', 'PH DAYS',
      'ACTUAL EARN WAGES', 'ACTUAL OT HRS', 'ACTUAL OT AMOUNT', 'GROSS EARN WAGES',
      'BASIC WAGES/DAY', 'MONTHLY WORKING DAYS', 'OT. HRS', 'ATTENDANCE', 'PH',
      'WAGES/MONTH', 'EARN WAGES', 'PH AMOUNT', 'TOTAL EARN WAGES', 'OT HRS PAYMENT',
      'TOTAL NETT PAYBLE', 'EPF', 'ESIC', 'PT', 'TOTAL DEDUCTION', 'NETT PAYBLE',
      'EMPLOYEE SIGNATURE/THUMB IMPRESSION', '', '', 'TOTAL NON COMPLIANCE AMOUNT',
      'ADVANCE', 'AREEARS', 'NETT PAYBLE NON COMPLIANCE', 'GRAND TOTAL NETT PAYBLE SALARY',
      '', 'LEAVE', 'BONUS', '', '', '',
      'MONTHLY BASIC SALARY', 'PH AMOUNT', 'OT AMOUNT', 'EARN SALARY',
      'MONTHLY House Rent Allow.', 'Monthly Site Allow.', 'Monthly Leave Travel Allow.',
      'Monthly Special Allow.', 'MonthlyAttendence Allow.', 'TOTAL SALARY',
      'EPF', 'ESIC', 'TDS', 'ADVANCE'
    ];

    // Add header row
    worksheet.addRow(headers);

    // Style definitions
    // Blue  = auto-filled by system, but fully editable — user can override any value
    // Yellow = user input required — must be filled before upload
    // White  = calculated by system after upload — leave blank
    const autoFilledStyle = {
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9E1F2' } },
      font: { color: { argb: 'FF1F4E78' }, bold: false },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      }
    };

    const editableAutoFillStyle = {
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE2EFDA' } },
      font: { color: { argb: 'FF375623' }, bold: true },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      }
    };

    const userInputStyle = {
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF2CC' } },
      font: { color: { argb: 'FF7F6000' }, bold: true },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      }
    };

    const calculatedStyle = {
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      }
    };

    // Add data rows
    employees.forEach((employee, index) => {
      const rowNumber = index + 2; // +2 because row 1 is header
      const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toUpperCase();
      const attendance = attendanceMap.get(employee.id) || { present: 0, leaveDays: 0 };
      const advance = advanceMap.get(employee.id) || 0;
      const weekOffDays = shiftWeekOffDaysMap.get(employee.id) || null;
      const computedWorkingDays = weekOffDays
        ? computeMonthlyWorkingDays(month, year, weekOffDays)
        : 26;

      const row = worksheet.addRow([
        index + 1,               // col 0: SL NO.
        employee.employeeCode,   // col 1: EMPLOYEE ID
        employee.workmenSlNo || '', // col 2: WORKMEN SL NO
        employee.tokenNumber || '', // col 3: TOKEN NO
        fullName, // col 4: NAME
        employee.fatherName || '', // E: FATHER'S NAME
        employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN') : '', // F: DOJ
        employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-IN') : '', // G: DOB
        employee.bankName || '', // H: BANK NAME
        employee.bankAccount || '', // I: ACCOUNT NO
        employee.bankIfsc || '', // J: IFSC CODE
        '', // K: Empty
        employee.uanNumber || '', // L: UAN
        employee.esicNumber || '', // M: ESIC
        employee.Designation?.name || '', // N: DESIGNATION
        employee.Department?.name || '', // O: DEPARTMENT
        employee.natureOfDesignation || '', // P: NATURE OF DESIGNATION / GRADE
        employee.monthlyGrossSalary ? parseFloat(employee.monthlyGrossSalary.toString()) : '', // Q: MONTHLY GROSS SALARY
        attendance.present, // R: ACTUAL ATTENDANCE
        attendance.leaveDays, // S: LEAVE DAYS (auto-filled from approved leave requests)
        '', // T: PH DAYS (USER INPUT)
        '', // U: ACTUAL EARN WAGES (CALCULATED)
        '', // V: ACTUAL OT HRS (USER INPUT)
        '', // W: ACTUAL OT AMOUNT (CALCULATED)
        '', // X: GROSS EARN WAGES (CALCULATED)
        '', // Y: BASIC WAGES/DAY (USER INPUT)
        computedWorkingDays, // Z: MONTHLY WORKING DAYS (auto-filled from shift)
        '', // AA: OT HRS (USER INPUT)
        '', // AB: ATTENDANCE (USER INPUT)
        '', // AC: PH (USER INPUT)
        '', // AD-AN: CALCULATED
        '', '', '', '', '', '', '', '', '', '', '', '',
        '',      // col 45: TOTAL NON COMPLIANCE AMOUNT (CALCULATED)
        advance, // col 46: ADVANCE (EDITABLE AUTO-FILL)
        '',      // col 47: ARREARS (USER INPUT)
        '', // AU-BP: CALCULATED
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]);

      // Apply styles to data cells
      // Blue  = auto-filled by system, fully editable — user can override any value
      // Yellow = user input required
      // White  = calculated after upload — leave blank

      // cols 1-20: auto-filled (blue, editable)
      for (let col = 1; col <= 20; col++) {
        if (col !== 12) { // Skip col 12 (empty column K shifted)
          const cell = row.getCell(col);
          cell.style = autoFilledStyle;
          cell.note = 'Auto-filled by system. You can edit this value if needed.';
        }
      }

      // col 46 (ADVANCE): Editable auto-filled (Light Green — fetched from advance requests)
      const asCell = row.getCell(46);
      asCell.style = editableAutoFillStyle;
      asCell.note = 'Auto-filled from approved advance payment requests. You can edit this value if needed.';

      // User input columns (Yellow):
      // col 21=T(PH DAYS), col 23=V(OT HRS), col 26=Y(BASIC WAGES/DAY),
      // col 27=Z(MONTHLY WORKING DAYS), col 28=AA(OT HRS), col 29=AB(ATTENDANCE),
      // col 30=AC(PH), col 47=AT(ARREARS)
      const userInputColumns = [21, 23, 26, 27, 28, 29, 30, 47];
      userInputColumns.forEach(col => {
        const cell = row.getCell(col);
        cell.style = userInputStyle;
        cell.note = 'USER INPUT REQUIRED - Please fill this column';
      });

      // Calculated columns (White) — col 45 = TOTAL NON COMPLIANCE AMOUNT is calculated
      const calculatedColumns = [22, 24, 25, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69];
      calculatedColumns.forEach(col => {
        row.getCell(col).style = calculatedStyle;
      });
    });

    // Set column widths
    worksheet.columns = [
      { width: 8 },  // col 0: SL NO
      { width: 14 }, // col 1: EMPLOYEE ID
      { width: 12 }, // col 2: WORKMEN SL NO
      { width: 12 }, // col 3: TOKEN NO
      { width: 25 }, // col 4: NAME
      { width: 20 }, // E: FATHER'S NAME
      { width: 12 }, // F: DOJ
      { width: 12 }, // G: DOB
      { width: 15 }, // H: BANK NAME
      { width: 18 }, // I: ACCOUNT NO
      { width: 15 }, // J: IFSC
      { width: 5 },  // K: Empty
      { width: 15 }, // L: UAN
      { width: 15 }, // M: ESIC
      { width: 20 }, // N: DESIGNATION
      { width: 20 }, // O: DEPARTMENT
      { width: 20 }, // P: NATURE OF DESIGNATION
      { width: 15 }, // Q: MONTHLY GROSS SALARY
      { width: 12 }, // R: ACTUAL ATTENDANCE
      { width: 12 }, // S: LEAVE DAYS
      { width: 12 }, // T: PH DAYS
    ];
    
    // Add remaining column widths (48 more columns)
    for (let i = 20; i < 68; i++) {
      worksheet.getColumn(i + 1).width = 12;
    }

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.style = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
    });

    // Add a legend row at the top (row 0 — insert before data)
    // We'll add it as a note on cell A1 instead to avoid shifting rows
    const legendNote = [
      'COLOUR LEGEND:',
      '🔵 Blue  = Auto-filled by system. You CAN edit these values.',
      '🟢 Green = Auto-filled (Advance). You CAN edit this value.',
      '🟡 Yellow = USER INPUT REQUIRED — must be filled before uploading.',
      '⬜ White  = Calculated automatically after upload — leave blank.',
    ].join('\n');
    worksheet.getRow(1).getCell(1).note = legendNote;

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const filename = `Payroll_Template_${monthNames[month - 1]}_${year}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating payroll template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll template' },
      { status: 500 }
    );
  }
}
