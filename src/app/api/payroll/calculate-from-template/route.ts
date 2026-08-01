import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { buildComplianceSheetBuffer } from '@/lib/services/compliance-sheet';
import type { ComplianceSheetItem } from '@/lib/services/compliance-sheet';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Period for the auto-generated compliance register (falls back to current month)
    const month = parseInt((formData.get('month') as string) || '') || (new Date().getMonth() + 1);
    const year = parseInt((formData.get('year') as string) || '') || new Date().getFullYear();

    // Read uploaded Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet('NON-COMPLIANCE SALARY SHEET') ||
                      workbook.getWorksheet('COMBINED SALARY SHEET') ||
                      workbook.worksheets.find(ws => ws.name.toLowerCase().includes('salary')) ||
                      workbook.worksheets[0];

    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: 'Invalid Excel format. Sheet "NON-COMPLIANCE SALARY SHEET" not found.' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const calculatedData: any[] = [];
    // Compliance "Register of Wages" rows derived from the same computed values,
    // sourced from the exact variables the bulk-import later stores to the DB —
    // so the ZIP's compliance file matches the auto-created compliance run.
    const complianceItems: ComplianceSheetItem[] = [];

    // Pre-fetch every employee (with branch working days) keyed by code, so the
    // synchronous row loop can derive the Fixed/Non-Fixed + OT behaviour from the
    // master instead of a per-sheet "OT Types" column.
    //   Fixed (employmentType === 'fixed'): earn = gross / branch.monthlyWorkingDays
    //     * attendance, and no non-compliance OT.
    //   Non-fixed: earn = gross / 26 * attendance; OT paid at otType× hourly.
    const allEmployees = await db.employee.findMany({
      select: { employeeCode: true, employmentType: true, otType: true, dailyWage: true,
                Branch: { select: { monthlyWorkingDays: true, otType1Divisor: true, otType2Divisor: true } } },
    });
    const empByCode = new Map(allEmployees.map(e => [e.employeeCode, e]));

    // Process each row (skip header row 1)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      try {
        // Extract values from columns
        const getVal = (col: number) => {
          const cell = row.getCell(col);
          return cell.value !== null && cell.value !== undefined && cell.value !== '' 
            ? cell.value 
            : null;
        };

        const getNum = (col: number): number => {
          const val = getVal(col);
          if (val === null) return 0;
          if (typeof val === 'number') return val;
          const parsed = parseFloat(val.toString());
          return isNaN(parsed) ? 0 : parsed;
        };

        // Auto-filled columns — new 69-col layout (1-based ExcelJS):
        // col 1=SL NO., col 2=EMPLOYEE ID, col 3=WORKMEN SL NO., col 4=TOKEN NO., col 5=NAME, ...
        const slNo = getNum(1); // col 1: SL NO.
        const employeeCode = getVal(2)?.toString() || getVal(4)?.toString() || ''; // col 2: EMPLOYEE ID (fallback col 4: TOKEN NO.)

        // User input columns (all shifted +1 vs old 68-col template)
        const T = getNum(21); // col 21: PH DAYS
        const U_input = getNum(22); // col 22: ACTUAL EARN WAGES — user-entered, not recalculated
        const V = getNum(23); // col 23: ACTUAL OT HRS
        const Y = getNum(26); // col 26: BASIC WAGES/DAY
        const Z = getNum(27); // col 27: MONTHLY WORKING DAYS
        const AA = getNum(28); // col 28: OT HRS
        const AB = getNum(29); // col 29: ATTENDANCE
        const AC = getNum(30); // col 30: PH
        const AS = getNum(46); // col 46: ADVANCE (editable auto-fill)
        const AT = getNum(47); // col 47: ARREARS (user input)

        // Auto-filled values needed for calculation
        const Q = getNum(18); // col 18: MONTHLY GROSS SALARY
        const R = getNum(19); // col 19: ACTUAL ATTENDANCE
        const S = getNum(20); // col 20: LEAVE DAYS

        // Validate required user inputs
        // Use getVal(...) === null to distinguish "cell is blank" from "cell contains 0"
        // (0 is a valid value for ATTENDANCE — an absent-all-month employee)
        const missingFields: string[] = [];
        if (!Y) missingFields.push('BASIC WAGES/DAY');
        if (!Z) missingFields.push('MONTHLY WORKING DAYS');
        if (getVal(29) === null) missingFields.push('ATTENDANCE');
        if (missingFields.length > 0) {
          errors.push(`Row ${rowNumber}: Missing required field(s): ${missingFields.join(', ')}`);
          return;
        }

        // ===== CALCULATIONS =====

        // Fixed / Non-Fixed + OT behaviour, derived from the employee master (not
        // from a sheet column). Fixed → divide by the branch's working days and no
        // OT; Non-Fixed → divide by 26 and pay OT at the otType multiplier.
        //   verified against JUNE reference: earn 19/19, OT amount 19/19.
        const emp = empByCode.get(employeeCode);
        // All divisors come from the employee's SITE (Global OT Settings), by type:
        //   Fixed        → site.monthlyWorkingDays, no OT.
        //   Non-Fixed OT1 → site.otType1Divisor, OT at 1× hourly.
        //   Non-Fixed OT2 → site.otType2Divisor, OT at 2× hourly.
        // Each defaults to 26 (and to the sheet's MONTHLY WORKING DAYS if unset).
        const isFixed = (emp?.employmentType || '').toLowerCase() === 'fixed';
        const otMultiplier = isFixed ? 0 : (emp?.otType === 2 ? 2 : 1);
        const otDivisor = emp?.otType === 2
          ? (emp?.Branch?.otType2Divisor || Z || 26)
          : (emp?.Branch?.otType1Divisor || Z || 26);
        const earnDivisor = isFixed
          ? (emp?.Branch?.monthlyWorkingDays || Z || 26)
          : otDivisor;

        // Detailed Earnings (U, W, X)
        // ACTUAL EARN WAGES (U) is the user's typed value — not recalculated.
        // Fall back to the formula only if the cell was left blank. Payable days =
        // attendance + PH (T); divisor depends on Fixed / OT type.
        const U = U_input || Math.round(Q / earnDivisor * (R + T)); // ACTUAL EARN WAGES
        // ACTUAL OT AMOUNT: hourly rate = gross / otDivisor / 8, at the OT multiplier.
        // Fixed employees earn no non-compliance OT (multiplier 0).
        const W = Math.round((Q / otDivisor / 8) * otMultiplier * V); // ACTUAL OT AMOUNT
        const X = U + W; // GROSS EARN WAGES

        // Payroll Calculation (AD-AN)
        const AD = Y * 26; // WAGES/MONTH (hardcoded 26)
        const AE = Y * AB; // EARN WAGES
        const AF = Y * AC; // PH AMOUNT
        const AG = AE + AF; // TOTAL EARN WAGES
        const AH = Math.round((Y / 8) * AA * 2); // OT HRS PAYMENT (2x hourly rate)
        const AI = AG + AH; // TOTAL NETT PAYBLE

        // Deductions (AJ-AM)
        const AJ = Math.ceil(AG * 0.12); // EPF (12%)
        const AK = Math.ceil(AG * 0.0075); // ESIC (0.75%)
        const AL = 0; // PT — not deducted by the company
        const AM = AJ + AK + AL; // TOTAL DEDUCTION

        // Net Payable (AN)
        const AN = AI - AM; // NETT PAYBLE

        // Non-Compliance (AR, AU, AV)
        const AR = X - AM - AN; // TOTAL NON COMPLIANCE AMOUNT
        const AU = AR - AS + AT; // NETT PAYBLE NON COMPLIANCE
        const AV = AN + AU; // GRAND TOTAL NETT PAYBLE SALARY

        // Leave & Bonus (AX, AY)
        const AX = Math.round((AB / 20) * (AD / 26)); // LEAVE
        const AY = Math.round(AE * 0.0833); // BONUS (8.33%)

        // LEAVE AMOUNT (col 70) — matches the JUNE reference formula:
        //   Leave Amount = ROUND((MONTHLY GROSS / 26) * LEAVE DAYS, 0)
        // Kept as a separate column; it is NOT folded into GROSS EARN WAGES.
        const leaveAmount = Math.round((Q / 26) * S);

        // Compliance Breakdown (BC-BL)
        const BC = AE; // MONTHLY BASIC SALARY
        const BD = AF; // PH AMOUNT
        const BE = W; // OT AMOUNT
        const BF = BC + BD + BE; // EARN SALARY
        const BL = X; // TOTAL SALARY

        // Allowances (BG-BK)
        const allowancePool = BL - BF;
        const BG = Math.round(allowancePool * 0.25); // HRA (25%)
        const BH = Math.round(allowancePool * 0.24); // Site Allow (24%)
        const BI = Math.round(allowancePool * 0.20); // LTA (20%)
        const BJ = Math.round(allowancePool * 0.13); // Special Allow (13%)
        const BK = Math.round(allowancePool * 0.18); // Attendance Allow (18%)

        // Compliance Deductions (BM-BP)
        const BM = AJ; // EPF
        const BN = AK; // ESIC
        const BP = AS; // ADVANCE

        // Write calculated values back into the row
        // col 22 (ACTUAL EARN WAGES) is user input — not overwritten. Only fill
        // it in when the user left it blank, so the fallback formula is visible.
        if (!U_input) row.getCell(22).value = U;
        row.getCell(24).value = W;  // col 24: W - ACTUAL OT AMOUNT
        row.getCell(25).value = X;  // col 25: X - GROSS EARN WAGES
        row.getCell(31).value = AD; // col 31: AD - WAGES/MONTH
        row.getCell(32).value = AE; // col 32: AE - EARN WAGES
        row.getCell(33).value = AF; // col 33: AF - PH AMOUNT
        row.getCell(34).value = AG; // col 34: AG - TOTAL EARN WAGES
        row.getCell(35).value = AH; // col 35: AH - OT HRS PAYMENT
        row.getCell(36).value = AI; // col 36: AI - TOTAL NETT PAYBLE
        row.getCell(37).value = AJ; // col 37: AJ - EPF
        row.getCell(38).value = AK; // col 38: AK - ESIC
        row.getCell(39).value = ''; // col 39: PT — removed (blank)
        row.getCell(40).value = AM; // col 40: AM - TOTAL DEDUCTION
        row.getCell(41).value = AN; // col 41: AN - NETT PAYBLE
        row.getCell(45).value = AR; // col 45: AR - TOTAL NON COMPLIANCE AMOUNT
        // col 46 = AS (ADVANCE) — user-editable, not overwritten
        // col 47 = AT (ARREARS) — user input, not overwritten
        row.getCell(48).value = AU; // col 48: AU - NETT PAYBLE NON COMPLIANCE
        row.getCell(49).value = AV; // col 49: AV - GRAND TOTAL NETT PAYBLE SALARY
        // col 50 = empty
        row.getCell(51).value = AX; // col 51: AX - LEAVE
        row.getCell(52).value = AY; // col 52: AY - BONUS
        row.getCell(56).value = BC; // col 56: BC - MONTHLY BASIC SALARY
        row.getCell(57).value = BD; // col 57: BD - PH AMOUNT
        row.getCell(58).value = BE; // col 58: BE - OT AMOUNT
        row.getCell(59).value = BF; // col 59: BF - EARN SALARY
        row.getCell(60).value = BG; // col 60: BG - HRA
        row.getCell(61).value = BH; // col 61: BH - Site Allow
        row.getCell(62).value = BI; // col 62: BI - LTA
        row.getCell(63).value = BJ; // col 63: BJ - Special Allow
        row.getCell(64).value = BK; // col 64: BK - Attendance Allow
        row.getCell(65).value = BL; // col 65: BL - TOTAL SALARY
        row.getCell(66).value = BM; // col 66: BM - EPF
        row.getCell(67).value = BN; // col 67: BN - ESIC
        row.getCell(68).value = ''; // col 68: TDS — removed (blank)
        row.getCell(69).value = BP; // col 69: BP - ADVANCE
        row.getCell(70).value = leaveAmount; // col 70: LEAVE AMOUNT

        complianceItems.push({
          Employee: {
            employeeCode,
            firstName: getVal(5)?.toString() || '', // full NAME (helper joins name parts)
            middleName: '',
            lastName: '',
            uanNumber: getVal(13)?.toString() || '',
            esicNumber: getVal(14)?.toString() || '',
            // Fixed compliance daily rate from the employee master (col K).
            dailyWage: emp?.dailyWage ?? null,
            Designation: { name: getVal(15)?.toString() || '' },
            Branch: { name: getVal(12)?.toString() || '' }, // col 12: SITE
          },
          basicSalary: BC,           // monthly basic salary
          hra: BG,                   // house rent allowance
          conveyanceAllowance: BH,   // site allowance
          medicalAllowance: BI,      // leave travel allowance
          specialAllowance: BJ,      // special allowance
          otAmount: W,               // overtime amount
          otHours: V,                // actual OT hours
          presentDays: R,            // actual attendance / days worked
          workingDays: Z,            // monthly working days
          grossEarning: Q,           // monthly gross salary
          pfDeduction: AJ,           // EPF
          esiDeduction: AK,          // ESIC
          totalDeduction: AM,        // total deduction
          netPay: AN,                // net payable
        });

        calculatedData.push({
          rowNumber,
          employeeCode,
          netPay: AN,
          grandTotal: AV
        });
      } catch (error) {
        errors.push(`Row ${rowNumber}: Calculation error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    if (calculatedData.length === 0 && errors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employee rows found in the template. Make sure the sheet has data rows below the header.' },
        { status: 400 }
      );
    }

    if (calculatedData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `All ${errors.length} row(s) failed validation — no rows could be calculated.`,
          details: errors
        },
        { status: 400 }
      );
    }

    // Generate final non-compliance Excel (calculated rows; failed rows left blank)
    const nonComplianceBuffer = Buffer.from(await workbook.xlsx.writeBuffer());

    // Build the matching compliance "Register of Wages" sheet from the same data
    const complianceBuffer = await buildComplianceSheetBuffer(complianceItems, month, year);

    const monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][month - 1];
    const stamp = `${monthAbbr}_${year}`;

    // Bundle both sheets into a single ZIP download
    const zip = new JSZip();
    zip.file(`Payroll_NonCompliance_${stamp}.xlsx`, nonComplianceBuffer);
    zip.file(`Payroll_Compliance_${stamp}.xlsx`, complianceBuffer);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const headers: Record<string, string> = {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Payroll_Calculated_${stamp}.zip"`,
      'X-Calculated-Rows': calculatedData.length.toString(),
    };
    if (errors.length > 0) {
      headers['X-Calculation-Errors'] = errors.length.toString();
      headers['X-Calculation-Error-Details'] = JSON.stringify(errors.slice(0, 20));
    }

    return new NextResponse(zipBuffer, { headers });
  } catch (error) {
    console.error('Error calculating payroll:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to calculate payroll: ${message}` },
      { status: 500 }
    );
  }
}
