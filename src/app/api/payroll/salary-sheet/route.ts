import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

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

    // Fetch payroll run to check type
    const payrollRun = await db.payrollRun.findUnique({
      where: { id: payrollRunId },
    });

    if (!payrollRun) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      );
    }

    // Fetch payroll items with ALL employee details
    const payrollItems = await db.payrollItem.findMany({
      where: { payrollRunId },
      include: {
        Employee: {
          include: {
            Department: true,
            Designation: true,
            Branch: true,
            Grade: true,
          },
        },
        PayrollRun: true,
      },
      orderBy: [
        { Employee: { employeeCode: 'asc' } },
      ],
    });

    if (payrollItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payroll items found' },
        { status: 404 }
      );
    }

    // Prepare data for salary NON-COMPLIANCE sheet
    const sheetData: any[] = [];

    // Header row — must match the UPLOAD template column order exactly
    // (generate-template): col 1 = SL NO., col 2 = EMPLOYEE ID, so a downloaded
    // sheet can be re-uploaded and parsed without the columns shifting.
    sheetData.push([
      'SL NO.',
      'EMPLOYEE ID',
      'WORKMEN SL. NO.',
      'TOKEN NO.',
      'NAME OF EMPLOYEE',
      "FATHER'S NAME",
      'DOJ',
      'DOB',
      'BANK NAME',
      'ACCOUNT NO.',
      'IFSC CODE NO.',
      'SITE', // Column 11 - SITE
      'UAN NO.',
      'ESIC IP NO',
      'DESIGNATION',
      'DEPARTMENT',
      'NATURE OF DESIGNATION',
      'MONTHLY GROSS SALARY',
      'ACTUAL ATTENDANCE',
      'LEAVE DAYS',
      'PH DAYS',
      'ACTUAL EARN WAGES',
      'ACTUAL OT HRS',
      'ACTUAL OT AMOUNT',
      'GROSS EARN WAGES',
      'BASIC WAGES/DAY',
      'MONTHLY WORKING DAYS',
      'OT. HRS',
      'ATTENDANCE',
      'PH',
      'WAGES/MONTH',
      'EARN WAGES',
      'PH AMOUNT',
      'TOTAL EARN WAGES',
      'OT HRS PAYMENT',
      'TOTAL NETT PAYBLE',
      'EPF',
      'ESIC',
      '', // PT — removed
      'TOTAL DEDUCTION',
      'NETT PAYBLE',
      'EMPLOYEE SIGNATURE/THUMB IMPRESSION ',
      '', // Column 42 - Empty
      '', // Column 43 - Empty
      'TOTAL NON COMPLIANCE AMOUNT',
      'ADVANCE',
      'AREEARS',
      'NETT PAYBLE NON COMPLIANCE',
      'GRAND TOTAL NETT PAYBLE SALARY',
      '', // Column 49 - Empty
      'LEAVE',
      'BONUS',
      '', // Column 52 - Empty
      '', // Column 53 - Empty
      '', // Column 54 - Empty
      'MONTHLY BASIC SALARY',
      'PH AMOUNT',
      'OT AMOUNT',
      'EARN SALARY',
      'MONTHLY House Rent Allow.',
      'Monthly Site Allow.',
      'Monthly Leave Travel Allow.',
      'Monthly Special Allow.',
      'MonthlyAttendence Allow.',
      'TOTAL SALARY',
      'EPF',
      'ESIC',
      '', // TDS — removed
      'ADVANCE',
    ]);

    // Data rows
    payrollItems.forEach((item, index) => {
      const employee = item.Employee;
      const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toUpperCase();

      const details = (item.details && typeof item.details === 'object'
        ? item.details as Record<string, unknown>
        : null);

      // FAST PATH — exact round-trip. If the import kept the full uploaded row
      // (details.rawRow), re-emit it verbatim so the download is byte-identical
      // to the upload for EVERY column (Leave, Bonus, Nature of Designation,
      // and anything not mapped to a DB field). We only normalise SL NO. by
      // position and EMPLOYEE ID from the master; everything else is preserved.
      const rawRow = details?.rawRow;
      if (Array.isArray(rawRow) && rawRow.length > 2) {
        const outRow = [...rawRow];
        outRow[0] = index + 1;                 // col 1: SL NO. (positional)
        outRow[1] = employee.employeeCode;     // col 2: EMPLOYEE ID (canonical)
        sheetData.push(outRow);
        return;
      }

      // FALLBACK (records imported before rawRow capture): reconstruct from the
      // parsed rawData / DB fields. The non-compliance import stores every value
      // it parsed in details.rawData; prefer that so PH DAYS / PH / PH AMOUNT and
      // the non-compliance totals aren't the old hardcoded 0 ("big fat zero").
      const raw = (details?.rawData ?? null) as Record<string, number> | null;
      const rv = (key: string, fallback: number): number => {
        const n = raw ? Number(raw[key]) : NaN;
        return Number.isFinite(n) ? n : fallback;
      };

      const basicSalary = Number(item.basicSalary) || 0;
      const basicWagesPerDay = Number(item.basicWagesPerDay) || 0;
      const hra = Number(item.hra) || 0;
      const conveyance = Number(item.conveyanceAllowance) || 0;
      const medical = Number(item.medicalAllowance) || 0;
      const special = Number(item.specialAllowance) || 0;
      const attendance = Number(item.presentDays) || 0;
      const workingDays = Number(item.workingDays) || 26;
      const otHours = Number(item.otHours) || 0;
      const otAmount = Number(item.otAmount) || 0;
      const grossEarnings = Number(item.grossEarning);
      const pfDeduction = Number(item.pfDeduction) || 0;
      const esiDeduction = Number(item.esiDeduction) || 0;
      const totalDeduction = Number(item.totalDeduction);
      const advance = Number(item.otherDeductions) || 0;

      // PH and the two attendance-side day counts come straight from the upload.
      // 'ph' (col 29) feeds PH AMOUNT; 'phDays' (col 20) feeds actual earn wages.
      const phDays = rv('phDays', 0);            // PH DAYS (col 21)
      const ph = rv('ph', 0);                    // PH (col 30)
      const leaveDays = rv('leaveDays', 0);      // LEAVE DAYS
      const attendanceAllow = Number(item.attendanceAllowance) || 0;

      // Use the per-day rate exactly as entered at import time — don't
      // recompute it from basicSalary/workingDays, which silently overwrites
      // the user's typed rate whenever it doesn't divide evenly.
      const basicPerDay = basicWagesPerDay || (basicSalary / workingDays);

      // Prefer the uploaded computed values; fall back to recomputing only when
      // a row predates rawData capture.
      const phAmount = rv('phAmount', Math.round(basicPerDay * ph));            // PH AMOUNT (Basic/day × PH)
      const earnWages = rv('earnWages', basicPerDay * attendance);             // EARN WAGES (Basic/day × attendance)
      const actualEarnWages = rv('actualEarnWages', earnWages);
      const totalEarnWages = rv('totalEarnWages', earnWages + phAmount);
      const grossEarnWages = rv('grossEarnWages', grossEarnings);
      const totalNettPayable = rv('totalNettPayable', totalEarnWages + otAmount);
      const nettPayable = rv('nettPayable', totalNettPayable - totalDeduction);
      const totalNonCompliance = rv('totalNonComplianceAmount', 0);
      const arrears = rv('arrears', 0);
      const actualOtHrs = rv('actualOtHrs', otHours);
      const actualOtAmount = rv('actualOtAmount', otAmount);
      const otHrsPayment = rv('otHrsPayment', otAmount);
      const wagesPerMonth = rv('wagesPerMonth', basicSalary);
      const monthlyBasicSalary = rv('monthlyBasicSalary', basicSalary);
      // Non-compliance nett + grand total mirror the imported layout.
      const nettPayableNonCompliance = totalNonCompliance - advance + arrears;
      const grandTotal = nettPayable + nettPayableNonCompliance;

      sheetData.push([
        index + 1, // SL NO. (col 1 — matches upload template)
        employee.employeeCode, // EMPLOYEE ID (col 2 — matches upload template)
        index + 1, // WORKMEN SL NO
        employee.employeeCode, // TOKEN NO
        fullName, // NAME
        employee.fatherName || '', // FATHER'S NAME
        employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN') : '',
        employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-IN') : '',
        employee.bankName || 'BANDHAN BANK',
        employee.bankAccount || '',
        employee.bankIfsc || 'BDBL0001747',
        employee.Branch?.name || '', // Column 11 - SITE
        employee.uanNumber || '',
        employee.esicNumber || '',
        employee.Designation?.name || '',
        employee.Department?.name || '',
        'High Skilled', // Default nature
        grossEarnings, // MONTHLY GROSS SALARY
        attendance, // ACTUAL ATTENDANCE
        leaveDays, // LEAVE DAYS
        phDays, // PH DAYS
        actualEarnWages, // ACTUAL EARN WAGES
        actualOtHrs, // ACTUAL OT HRS
        actualOtAmount, // ACTUAL OT AMOUNT
        grossEarnWages, // GROSS EARN WAGES
        Math.round(basicPerDay * 100) / 100, // BASIC WAGES/DAY
        workingDays, // MONTHLY WORKING DAYS
        otHours, // OT. HRS
        attendance, // ATTENDANCE
        ph, // PH
        wagesPerMonth, // WAGES/MONTH
        earnWages, // EARN WAGES
        phAmount, // PH AMOUNT
        totalEarnWages, // TOTAL EARN WAGES
        otHrsPayment, // OT HRS PAYMENT
        totalNettPayable, // TOTAL NETT PAYBLE
        pfDeduction, // EPF
        esiDeduction, // ESIC
        '', // PT — removed (blank)
        totalDeduction, // TOTAL DEDUCTION
        nettPayable, // NETT PAYBLE
        '', // SIGNATURE - Column 41
        '', // Column 42 - Empty
        '', // Column 43 - Empty
        totalNonCompliance, // TOTAL NON COMPLIANCE AMOUNT
        advance, // ADVANCE
        arrears, // ARREARS
        nettPayableNonCompliance, // NETT PAYBLE NON COMPLIANCE
        grandTotal, // GRAND TOTAL
        '', // Column 49 - Empty
        0, // LEAVE
        0, // BONUS
        '', // Column 52 - Empty
        '', // Column 53 - Empty
        '', // Column 54 - Empty
        monthlyBasicSalary, // MONTHLY BASIC SALARY
        phAmount, // PH AMOUNT
        actualOtAmount, // OT AMOUNT
        earnWages, // EARN SALARY
        hra, // House Rent Allow
        conveyance, // Site Allow
        medical, // Leave Travel Allow
        special, // Special Allow
        attendanceAllow, // Attendance allowance
        grossEarnings, // TOTAL SALARY
        pfDeduction, // EPF
        esiDeduction, // ESIC
        '', // TDS — removed (blank)
        advance, // ADVANCE
      ]);
    });

    // sheetData[0] is the header row; the rest are employee rows.
    const headerLabels = sheetData[0] as (string)[];
    const dataRows = sheetData.slice(1) as unknown[][];
    const colCount = headerLabels.length;

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const fullMonth = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

    // Build the styled workbook with ExcelJS (SheetJS community build drops all
    // cell styling on write, so we use ExcelJS to get colours/borders/fonts).
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NON-COMPLIANCE SALARY SHEET', {
      views: [{ state: 'frozen', xSplit: 5, ySplit: 3 }], // freeze title+header + first 5 id cols
    });

    // ---- Design palette -----------------------------------------------------
    const C = {
      titleBg: 'FF1F4E79',   // deep blue title band
      titleFg: 'FFFFFFFF',
      complBg: 'FF2E75B6',   // compliance / statutory header block (blue)
      nonComplBg: 'FF548235',// non-compliance header block (green)
      headerFg: 'FFFFFFFF',
      zebra: 'FFF2F6FC',     // light blue zebra stripe
      border: 'FFBFBFBF',
      totalBg: 'FFFFF2CC',   // amber tint for the grand-total column
    };
    const thin = { style: 'thin' as const, color: { argb: C.border } };
    const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

    // The upload template splits the sheet into a compliance block (cols 1..25)
    // and a non-compliance block (cols 26..end). Colour headers to match.
    const NONCOMPL_START = 26;

    // ---- Column widths (mirrors the previous SheetJS widths) ----------------
    const widths = [8, 14, 12, 12, 25, 20, 12, 12, 15, 18, 15, 15, 15, 20, 15, 15, 12, 12, 10, 10, 15, 12, 15, 15, 15, 15, 10, 12, 8, 15, 15, 12, 15, 15, 15, 12, 12, 10, 15, 15, 20, 15, 12, 12, 20, 20, 10, 10, 15, 12, 12, 15, 15, 15, 15, 15, 15, 15, 12, 12, 10, 12];
    worksheet.columns = Array.from({ length: colCount }, (_, i) => ({ width: widths[i] ?? 14 }));

    // ---- Row 1: title band --------------------------------------------------
    const titleText = `SALARY SHEET FOR THE MONTH OF ${fullMonth[month - 1]} ${year}`;
    const titleRow = worksheet.addRow([titleText]);
    worksheet.mergeCells(1, 1, 1, colCount);
    titleRow.height = 24;
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = titleText;
    titleCell.font = { bold: true, size: 13, color: { argb: C.titleFg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };

    // ---- Row 2: section band (COMPLIANCE / NON-COMPLIANCE) -------------------
    const sectionRow = worksheet.addRow([]);
    sectionRow.height = 18;
    worksheet.mergeCells(2, 1, 2, NONCOMPL_START - 1);
    worksheet.mergeCells(2, NONCOMPL_START, 2, colCount);
    const complCell = worksheet.getCell(2, 1);
    complCell.value = 'COMPLIANCE (STATUTORY)';
    complCell.font = { bold: true, size: 10, color: { argb: C.headerFg } };
    complCell.alignment = { horizontal: 'center', vertical: 'middle' };
    complCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.complBg } };
    const ncCell = worksheet.getCell(2, NONCOMPL_START);
    ncCell.value = 'NON-COMPLIANCE';
    ncCell.font = { bold: true, size: 10, color: { argb: C.headerFg } };
    ncCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ncCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.nonComplBg } };

    // ---- Row 3: column headers ----------------------------------------------
    const headerRow = worksheet.addRow(headerLabels);
    headerRow.height = 40;
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const isNonCompl = colNumber >= NONCOMPL_START;
      cell.font = { bold: true, size: 9, color: { argb: C.headerFg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isNonCompl ? C.nonComplBg : C.complBg } };
      cell.border = allBorders;
    });

    // ---- Data rows ----------------------------------------------------------
    // Columns holding rupee amounts get a number format + right alignment.
    const moneyCols = new Set([18, 22, 24, 25, 26, 32, 33, 34, 35, 36, 37, 38, 40, 41, 45, 46, 47, 48, 49, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 68]);
    const grandTotalCol = 49; // GRAND TOTAL NETT PAYBLE SALARY

    dataRows.forEach((rowValues, i) => {
      const row = worksheet.addRow(rowValues as ExcelJS.CellValue[]);
      row.height = 15;
      const zebra = i % 2 === 1;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { size: 8 };
        cell.border = allBorders;
        if (moneyCols.has(colNumber)) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { vertical: 'middle' };
        }
        if (colNumber === grandTotalCol) {
          cell.font = { size: 8, bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.totalBg } };
        } else if (zebra) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
        }
      });
    });

    // ---- Totals row ---------------------------------------------------------
    // Sum the key amount columns so the sheet foots at a glance.
    const sumCol = (colIdx: number) =>
      dataRows.reduce((s, r) => s + (typeof r[colIdx - 1] === 'number' ? (r[colIdx - 1] as number) : 0), 0);
    const totalCols = [18, 24, 25, 40, 41, 45, 46, 48, 49, 66];
    const totalsArr: ExcelJS.CellValue[] = Array.from({ length: colCount }, () => null);
    totalsArr[4] = 'TOTAL';
    totalCols.forEach((c) => { totalsArr[c - 1] = sumCol(c); });
    const totalsRow = worksheet.addRow(totalsArr);
    totalsRow.height = 18;
    totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { bold: true, size: 9, color: { argb: C.titleFg } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
      cell.border = allBorders;
      if (moneyCols.has(colNumber)) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Enable autofilter over the header row + data
    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + dataRows.length, column: colCount },
    };

    const excelBuffer = await workbook.xlsx.writeBuffer();

    const filename = `Salary_NonCompliance_Sheet_${monthNames[month - 1]}_${year}.xlsx`;

    return new NextResponse(Buffer.from(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating salary sheet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate salary sheet' },
      { status: 500 }
    );
  }
}
