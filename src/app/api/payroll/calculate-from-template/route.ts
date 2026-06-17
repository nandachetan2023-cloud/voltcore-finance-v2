import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

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
        if (!Y || !Z || !AB) {
          errors.push(`Row ${rowNumber}: Missing required inputs (BASIC WAGES/DAY, MONTHLY WORKING DAYS, or ATTENDANCE)`);
          return;
        }

        // ===== CALCULATIONS =====

        // Detailed Earnings (U, W, X)
        const actualWorkingDays = (Z + (T || 0)) > 0 ? (Z + (T || 0)) : 26;
        const U = Math.round(Q / actualWorkingDays * (R + (T || 0))); // ACTUAL EARN WAGES
        const W = Math.round((Q / actualWorkingDays / 8) * (V || 0)); // ACTUAL OT AMOUNT (excludes leave days)
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
        const AL = AI > 13300 ? 125 : 0; // PT (threshold ₹13,300)
        const AM = AJ + AK + AL; // TOTAL DEDUCTION

        // Net Payable (AN)
        const AN = AI - AM; // NETT PAYBLE

        // Non-Compliance (AR, AU, AV)
        const AR = Math.max(0, X - AI); // TOTAL NON COMPLIANCE AMOUNT
        const AU = AR - AS + AT; // NETT PAYBLE NON COMPLIANCE
        const AV = AN + AU; // GRAND TOTAL NETT PAYBLE SALARY

        // Leave & Bonus (AX, AY)
        const AX = Math.round((AB / 20) * (AD / 26)); // LEAVE
        const AY = Math.round(AE * 0.0833); // BONUS (8.33%)

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
        const BO = AL; // TDS/PT
        const BP = AS; // ADVANCE

        // Write calculated values back into the row
        row.getCell(22).value = U;  // col 22: U - ACTUAL EARN WAGES
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
        row.getCell(39).value = AL; // col 39: AL - PT
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
        row.getCell(68).value = BO; // col 68: BO - TDS/PT
        row.getCell(69).value = BP; // col 69: BP - ADVANCE

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

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation errors found', 
          details: errors 
        },
        { status: 400 }
      );
    }

    // Generate final Excel
    const finalBuffer = await workbook.xlsx.writeBuffer();

    const timestamp = Date.now();
    const filename = `Payroll_Calculated_${timestamp}.xlsx`;

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Calculated-Rows': calculatedData.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate payroll from template' },
      { status: 500 }
    );
  }
}
