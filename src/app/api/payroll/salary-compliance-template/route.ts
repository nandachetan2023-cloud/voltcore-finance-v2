import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Define headers matching the EXACT salary compliance sheet format from jan_non_compliance_salary_sheet.xlsx
    const headers = [
      'SL NO.',
      'WORKMEN SL. NO.',
      'TOKEN NO.',
      'NAME OF EMPLOYEE',
      "FATHER'S NAME",
      'DOJ',
      'DOB',
      'BANK NAME',
      'ACCOUNT NO.',
      'IFSC CODE NO.',
      '', // Empty column 11
      'UAN NO.',
      'ESIC IP NO',
      'DESIGNATION',
      'DEPARTMENT',
      'NATURE OF DESIGNATION',
      'MONTHLY GROSS SALARY',
      'ACTUAL ATTENDANCE',
      'EXTRA DAYS',
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
      'PT',
      'TOTAL DEDUCTION',
      'NETT PAYBLE',
      'EMPLOYEE SIGNATURE/THUMB IMPRESSION ',
      '', // Empty column 42
      '', // Empty column 43
      'TOTAL NON COMPLIANCE AMOUNT',
      'ADVANCE',
      'AREEARS',
      'NETT PAYBLE NON COMPLIANCE',
      'GRAND TOTAL NETT PAYBLE SALARY',
      '', // Empty column 49
      'LEAVE',
      'BONUS',
      '', // Empty column 52
      '', // Empty column 53
      '', // Empty column 54
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
      'TDS',
      'ADVANCE',
    ];

    // Create worksheet with only headers (no sample data)
    const sheetData = [headers];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    const colWidths = headers.map((h, i) => {
      if (h === '') return { wch: 5 }; // Empty columns
      if (i <= 2) return { wch: 10 }; // SL NO, WORKMEN SL NO, TOKEN NO
      if (i === 3 || i === 4) return { wch: 25 }; // NAME, FATHER'S NAME
      if (i === 7) return { wch: 20 }; // BANK NAME
      if (i === 8) return { wch: 18 }; // ACCOUNT NO
      return { wch: 15 }; // Default
    });
    worksheet['!cols'] = colWidths;

    // Add instructions sheet
    const instructionsData = [
      ['Salary Compliance Sheet - Import Template'],
      [''],
      ['Instructions:'],
      ['1. Fill in employee salary data in the "COMBINED SALARY SHEET" sheet'],
      ['2. Do NOT modify the header row (first row)'],
      ['3. TOKEN NO. must match existing employee codes in the system'],
      ['4. Dates should be in DD/MM/YYYY format or Excel date format'],
      ['5. All numeric fields should contain numbers only (no currency symbols)'],
      ['6. Empty columns should remain empty'],
      ['7. Save the file and upload it through the Bulk Import feature'],
      [''],
      ['Required Fields:'],
      ['- SL NO. (Serial number starting from 1)'],
      ['- WORKMEN SL. NO. (Worker serial number)'],
      ['- TOKEN NO. (Employee Code - MUST match system employee codes)'],
      ['- NAME OF EMPLOYEE (Full name in UPPERCASE)'],
      ['- MONTHLY GROSS SALARY (Total gross salary)'],
      ['- ACTUAL ATTENDANCE (Number of days attended)'],
      ['- MONTHLY WORKING DAYS (Usually 26)'],
      [''],
      ['Important Notes:'],
      ['- TOKEN NO. is the key field that links to your employee records'],
      ['- System will validate all employee codes before import'],
      ['- If validation fails, you will see suggestions for correct codes'],
      ['- All calculations should be done before import'],
      ['- This format matches the exact structure of jan_non_compliance_salary_sheet.xlsx'],
      [''],
      ['Column Guide:'],
      ['- Columns 1-10: Basic employee information'],
      ['- Column 11: Empty (leave blank)'],
      ['- Columns 12-40: Salary calculations and deductions'],
      ['- Columns 41-43: Signature and empty columns'],
      ['- Columns 44-48: Non-compliance amounts'],
      ['- Column 49: Empty (leave blank)'],
      ['- Columns 50-51: Leave and bonus'],
      ['- Columns 52-54: Empty (leave blank)'],
      ['- Columns 55-68: Detailed salary breakdown'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 80 }];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'COMBINED SALARY SHEET');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Salary_Compliance_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
