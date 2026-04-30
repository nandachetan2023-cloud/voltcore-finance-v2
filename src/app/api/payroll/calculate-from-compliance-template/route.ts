import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// Compliance format column layout (1-based ExcelJS):
// 1=Sl.No., 2=Employee ID, 3=Name, 4=Site, 5=UAN, 6=IP NO., 7=Designation
// 8=Days Worked (user), 9=OT Hours (user), 10=Work Done (user)
// 11=Daily Rate (calc), 12=Basic Wages (calc), 13=DA (calc), 14=Overtime (calc)
// 15=Other Cash (user), 16=Total Wages ESI (calc), 17=EPF (calc), 18=ESI (calc)
// 19=House Rent (calc), 20=PT (calc), 21=Total Deduction (calc), 22=Net Amount (calc)
// 23=Time/Date (user), 24=Place (user), 25=Signature (user)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Find the compliance sheet
    const worksheet =
      workbook.getWorksheet('Compliance Salary Sheet') ||
      workbook.worksheets.find(ws =>
        ws.name.toLowerCase().includes('compliance') ||
        ws.name.toLowerCase().includes('salary')
      ) ||
      workbook.worksheets[0];

    if (!worksheet) {
      return NextResponse.json({ success: false, error: 'No valid sheet found in the uploaded file.' }, { status: 400 });
    }

    const errors: string[] = [];
    const calculatedData: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      try {
        const getVal = (col: number) => {
          const cell = row.getCell(col);
          return cell.value !== null && cell.value !== undefined && cell.value !== '' ? cell.value : null;
        };
        const getNum = (col: number): number => {
          const val = getVal(col);
          if (val === null) return 0;
          if (typeof val === 'number') return val;
          const parsed = parseFloat(val.toString());
          return isNaN(parsed) ? 0 : parsed;
        };
        const getStr = (col: number): string => String(getVal(col) || '').trim();

        const employeeId = getStr(2);
        if (!employeeId) return; // Skip empty rows

        // User inputs
        const daysWorked = getNum(8);  // col 8: Days Worked
        const otHours   = getNum(9);   // col 9: OT Hours
        const otherCash = getNum(15);  // col 15: Other Cash Payment

        // Read salary data from the note on Employee ID cell (stored during template generation)
        let basic = 0, hra = 0, da = 0, workingDays = 26;
        try {
          const empCell = row.getCell(2);
          if (empCell.note) {
            const noteText = typeof empCell.note === 'string'
              ? empCell.note
              : (empCell.note as any).texts?.map((t: any) => t.text).join('') || '';
            const parsed = JSON.parse(noteText);
            basic = parsed.basic || 0;
            hra = parsed.hra || 0;
            da = parsed.da || 0;
            workingDays = parsed.workingDays || 26;
          }
        } catch { /* use defaults */ }

        // If no salary data from note, try to derive from existing calculated values
        // or use a reasonable default
        if (basic === 0) {
          // Fallback: read from col 12 if already filled
          basic = getNum(12);
        }

        // ===== CALCULATIONS =====

        // Daily rate = basic / working days
        const dailyRate = workingDays > 0 ? Math.round((basic / workingDays) * 100) / 100 : 0;

        // Basic wages earned = daily rate × days worked
        const basicWages = Math.round(dailyRate * daysWorked * 100) / 100;

        // DA (dearness allowance) — proportional to days worked
        const daEarned = workingDays > 0 ? Math.round((da / workingDays) * daysWorked * 100) / 100 : 0;

        // Overtime = (basic / working days / 8) × OT hours × 2 (double rate)
        const otAmount = workingDays > 0 && basic > 0
          ? Math.round((basic / workingDays / 8) * otHours * 2 * 100) / 100
          : 0;

        // Total wages for ESI = basic wages + DA + OT + other cash
        const totalWagesESI = basicWages + daEarned + otAmount + otherCash;

        // EPF = 12% of basic wages
        const epf = Math.ceil(basicWages * 0.12);

        // ESI = 0.75% of total wages
        const esi = Math.ceil(totalWagesESI * 0.0075);

        // House rent = HRA proportional to days worked
        const houseRent = workingDays > 0 ? Math.round((hra / workingDays) * daysWorked * 100) / 100 : 0;

        // PT (Professional Tax) = 125 if total wages > 13300, else 0
        const pt = totalWagesESI > 13300 ? 125 : 0;

        // Total deduction
        const totalDeduction = epf + esi + pt;

        // Net amount
        const netAmount = Math.round((totalWagesESI - totalDeduction) * 100) / 100;

        // Write calculated values back
        row.getCell(11).value = dailyRate;
        row.getCell(12).value = basicWages;
        row.getCell(13).value = daEarned;
        row.getCell(14).value = otAmount;
        row.getCell(16).value = totalWagesESI;
        row.getCell(17).value = epf;
        row.getCell(18).value = esi;
        row.getCell(19).value = houseRent;
        row.getCell(20).value = pt;
        row.getCell(21).value = totalDeduction;
        row.getCell(22).value = netAmount;

        calculatedData.push({ rowNumber, employeeId, netAmount, totalWagesESI });
      } catch (err) {
        errors.push(`Row ${rowNumber}: ${err instanceof Error ? err.message : 'Calculation error'}`);
      }
    });

    if (errors.length > 0 && calculatedData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Calculation failed for all rows', details: errors },
        { status: 400 }
      );
    }

    const finalBuffer = await workbook.xlsx.writeBuffer();
    const timestamp = Date.now();

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Compliance_Calculated_${timestamp}.xlsx"`,
        'X-Calculated-Rows': calculatedData.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error calculating compliance payroll:', error);
    return NextResponse.json({ success: false, error: 'Failed to calculate compliance payroll' }, { status: 500 });
  }
}
