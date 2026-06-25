import * as XLSX from 'xlsx';

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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
  { wch: 14 }, // Employee ID
  { wch: 8 },  // Sl. No.
  { wch: 25 }, // Name
  { wch: 15 }, // Site
  { wch: 15 }, // UAN
  { wch: 15 }, // IP NO
  { wch: 20 }, // Designation
  { wch: 12 }, // Days worked
  { wch: 10 }, // OT hours
  { wch: 12 }, // Work done
  { wch: 15 }, // Daily rate
  { wch: 15 }, // Basic wages
  { wch: 15 }, // Dearness
  { wch: 12 }, // Overtime
  { wch: 15 }, // Other cash
  { wch: 18 }, // Total wages ESI
  { wch: 12 }, // EPF
  { wch: 12 }, // ESI
  { wch: 12 }, // House rent
  { wch: 12 }, // Other deduction (PT — removed)
  { wch: 15 }, // Total deduction
  { wch: 15 }, // Net amount
  { wch: 15 }, // Time & date
  { wch: 15 }, // Place
  { wch: 20 }, // Signature
];

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

    const dailyRate = basicSalary / workingDays;
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
      Math.round(dailyRate * 100) / 100,
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

/** Build a complete compliance "Register of Wages" workbook as an xlsx Buffer. */
export function buildComplianceSheetBuffer(items: ComplianceSheetItem[], month: number, year: number): Buffer {
  const sheetData = buildComplianceSheetData(items, month, year);
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = COL_WIDTHS;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'REGISTER OF WAGES');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
