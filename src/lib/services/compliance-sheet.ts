import ExcelJS from 'exceljs';

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Number of letterhead/title lines before the column-header row in the sheet.
// (FORM number, rules, REGISTER OF WAGES, month, contractor block, nature/location.)
const TITLE_ROWS = 9;
const HEADER_ROW = TITLE_ROWS + 1; // 1-based row index of the column headers

// Minimal shape needed to render a row of the compliance "Register of Wages".
// Accepts Prisma Decimals or plain numbers — everything is coerced with Number().
export interface ComplianceSheetItem {
  Employee: {
    employeeCode: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    uanNumber?: string | null;
    esicNumber?: string | null;
    Designation?: { name: string } | null;
    Branch?: { name: string } | null;
  };
  basicSalary: number | { toString(): string };
  hra: number | { toString(): string };
  conveyanceAllowance: number | { toString(): string };
  medicalAllowance: number | { toString(): string };
  specialAllowance: number | { toString(): string };
  otAmount: number | { toString(): string };
  otHours: number | { toString(): string };
  presentDays: number | { toString(): string };
  workingDays: number | { toString(): string };
  grossEarning: number | { toString(): string };
  pfDeduction: number | { toString(): string };
  esiDeduction: number | { toString(): string };
  totalDeduction: number | { toString(): string };
  netPay: number | { toString(): string };
}

const COL_WIDTHS = [
  14, // Employee ID
  8,  // Sl. No.
  25, // Name
  15, // Site
  15, // UAN
  15, // IP NO
  20, // Designation
  12, // Days worked
  10, // OT hours
  12, // Work done
  15, // Daily rate
  15, // Basic wages
  15, // Dearness
  12, // Overtime
  15, // Other cash
  18, // Total wages ESI
  12, // EPF
  12, // ESI
  12, // House rent
  12, // Other deduction (PT — removed)
  15, // Total deduction
  15, // Net amount
  15, // Time & date
  15, // Place
  20, // Signature
];

// 1-based column indices that hold rupee amounts (money format + right-aligned).
const MONEY_COLS = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);

/**
 * Build the full "Register of Wages" (compliance) sheet rows (FORM XVII/XIII)
 * from payroll items. Shared by the compliance salary-sheet endpoint and the
 * non-compliance Upload & Calculate ZIP so both outputs are always identical.
 */
export function buildComplianceSheetData(items: ComplianceSheetItem[], month: number, year: number): any[][] {
  const num = (v: number | { toString(): string }) => Number(v) || 0;
  const sheetData: any[][] = [];

  sheetData.push(['FORM NUMBER.XVII/XIII']);
  sheetData.push(['[See Rule78(1)(a)(1) of the C.L(R&A)(CENTRAL RULES 1971]']);
  sheetData.push(['  [See Rule72(2)(a) of the C.L(R&A)(ORISSA RULES 1975]']);
  sheetData.push(['REGISTER OF WAGES']);
  sheetData.push([`FOR THE MONTH OF:- ${MONTH_ABBR[month - 1]}-${year}`]);
  sheetData.push(['Name & Address of the contractor:-']);
  sheetData.push(['Name & Address of the contractor:-']);
  sheetData.push(['AT HOUSE NO-G1/3 BINAYAKPURAM OPPOSITE OF MANMOHAN M.E. SCHOOL JHARSUGUDA']);
  sheetData.push(['Nature & location of work:- MECHANICAL JOB, GAP']);

  sheetData.push([
    'Employee ID',
    'Sl. No.',
    'Name of the workman',
    'Site',
    'UAN',
    'IP NO.',
    'Designation',
    'TOTAL NO OF DAYS WORKED',
    'O.Thours',
    'no.of work done',
    'daily rate of wages/piece rate/monthly',
    'Basic wages in Rs',
    'Dearness allowances   in Rs',
    'Overtime  in Rs',
    'Othercash payment   in Rs',
    'TOTAL WAGES FOR ESI DEDUCTION(TNP)',
    'E.P.F in Rs',
    'E.S.I in Rs',
    'House rent in Rs',
    'Other deduction in Rs',
    'Total deduction in Rs',
    'Net amount paid in Rs',
    'Time&date of payment',
    'Place of payment',
    'Signature or thumb Impression of  workmen',
  ]);

  items.forEach((item, index) => {
    const employee = item.Employee;
    const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toUpperCase();

    const basicSalary = num(item.basicSalary);
    const hra = num(item.hra);
    const conveyance = num(item.conveyanceAllowance);
    const medical = num(item.medicalAllowance);
    const special = num(item.specialAllowance);
    const otAmount = num(item.otAmount);
    const otHours = num(item.otHours);
    const presentDays = num(item.presentDays);
    const workingDays = num(item.workingDays) || 26;
    const pfDeduction = num(item.pfDeduction);
    const esiDeduction = num(item.esiDeduction);
    const totalDeduction = num(item.totalDeduction);
    const netPay = num(item.netPay);

    // The reference "Register of Wages" carries whole-rupee figures (no paise),
    // so round the derived daily rate to an integer to match it exactly.
    const dailyRate = Math.round(basicSalary / workingDays);
    const dearnessAllowance = hra + conveyance + medical + special;
    const otherCashPayment = 0;
    const totalWagesForESI = basicSalary + dearnessAllowance + otAmount + otherCashPayment;

    sheetData.push([
      employee.employeeCode,
      index + 1,
      fullName,
      employee.Branch?.name || 'N/A',
      employee.uanNumber || '',
      employee.esicNumber || '',
      employee.Designation?.name || '',
      presentDays,
      otHours,
      '',
      dailyRate,
      basicSalary,
      dearnessAllowance,
      otAmount,
      otherCashPayment,
      totalWagesForESI,
      pfDeduction,
      esiDeduction,
      hra,
      '', // Other deduction (PT) — removed
      totalDeduction,
      netPay,
      '',
      '',
      '',
    ]);
  });

  return sheetData;
}

/**
 * Build a complete, STYLED compliance "Register of Wages" workbook as an xlsx
 * Buffer. Uses ExcelJS (the SheetJS community build silently drops all cell
 * styling on write) so the compliance sheet gets the same professional look as
 * the non-compliance sheet: title band, coloured header, borders, zebra stripes,
 * money formatting and a footing totals row.
 */
export async function buildComplianceSheetBuffer(
  items: ComplianceSheetItem[],
  month: number,
  year: number,
): Promise<Buffer> {
  const sheetData = buildComplianceSheetData(items, month, year);
  const headerLabels = sheetData[HEADER_ROW - 1] as string[];
  const colCount = headerLabels.length;
  const dataRows = sheetData.slice(HEADER_ROW) as unknown[][];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('REGISTER OF WAGES', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: HEADER_ROW }],
  });

  // ---- Design palette (matches the non-compliance sheet) ------------------
  const C = {
    titleBg: 'FF1F4E79', titleFg: 'FFFFFFFF',
    headBg: 'FF2E75B6', headFg: 'FFFFFFFF',
    border: 'FFBFBFBF', zebra: 'FFF2F6FC', netBg: 'FFFFF2CC',
  };
  const thin = { style: 'thin' as const, color: { argb: C.border } };
  const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

  ws.columns = COL_WIDTHS.slice(0, colCount).map((w) => ({ width: w }));

  // ---- Title / letterhead block (rows 1..TITLE_ROWS) ----------------------
  for (let r = 1; r <= TITLE_ROWS; r++) {
    const text = (sheetData[r - 1] && sheetData[r - 1][0]) ? String(sheetData[r - 1][0]) : '';
    ws.mergeCells(r, 1, r, colCount);
    const cell = ws.getCell(r, 1);
    cell.value = text;
    // "REGISTER OF WAGES" (row 4) is the emphasised banner; rest is metadata.
    const isBanner = r === 4;
    cell.font = {
      bold: r <= 5,
      size: isBanner ? 14 : (r <= 5 ? 10 : 9),
      color: { argb: isBanner ? C.titleFg : 'FF1F4E79' },
    };
    cell.alignment = { horizontal: isBanner ? 'center' : 'left', vertical: 'middle' };
    if (isBanner) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
      ws.getRow(r).height = 22;
    }
  }

  // ---- Header row ---------------------------------------------------------
  const headerRow = ws.getRow(HEADER_ROW);
  headerLabels.forEach((v, i) => { headerRow.getCell(i + 1).value = v; });
  headerRow.height = 46;
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, size: 8, color: { argb: C.headFg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headBg } };
    cell.border = allBorders;
  }

  // ---- Data rows ----------------------------------------------------------
  const NET_COL = 22; // "Net amount paid in Rs"
  dataRows.forEach((rowValues, i) => {
    const row = ws.getRow(HEADER_ROW + 1 + i);
    (rowValues as ExcelJS.CellValue[]).forEach((v, ci) => { row.getCell(ci + 1).value = v; });
    row.height = 15;
    const zebra = i % 2 === 1;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.border = allBorders;
      if (MONEY_COLS.has(c)) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.font = { size: 8 };
        cell.alignment = { vertical: 'middle' };
      }
      if (!cell.font) cell.font = { size: 8 };
      if (c === NET_COL) {
        cell.font = { size: 8, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.netBg } };
      } else if (zebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
      }
    }
  });

  // ---- Totals row ---------------------------------------------------------
  const sumCol = (colIdx: number) =>
    dataRows.reduce((s, r) => s + (typeof r[colIdx - 1] === 'number' ? (r[colIdx - 1] as number) : 0), 0);
  const totalCols = [12, 13, 14, 16, 17, 18, 19, 21, 22];
  const totalsRow = ws.getRow(HEADER_ROW + 1 + dataRows.length);
  totalsRow.getCell(3).value = 'TOTAL';
  totalCols.forEach((c) => { totalsRow.getCell(c).value = sumCol(c); });
  totalsRow.height = 18;
  for (let c = 1; c <= colCount; c++) {
    const cell = totalsRow.getCell(c);
    cell.font = { bold: true, size: 9, color: { argb: C.titleFg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
    cell.border = allBorders;
    if (MONEY_COLS.has(c)) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  // Autofilter over the header + data rows.
  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW + dataRows.length, column: colCount },
  };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
