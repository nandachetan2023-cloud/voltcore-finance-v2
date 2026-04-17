import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Define headers matching the EXACT compliance format from compliance_example.xlsx (FORM XVII/XIII - 24 columns)
    const headers = [
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
      'Other deduction in Rs(PT)',
      'Total deduction in Rs',
      'Net amount paid in Rs',
      'Time&date of payment',
      'Place of payment',
      'Signature or thumb Impression of  workmen',
    ];

    // Create worksheet with only headers (no sample data)
    const sheetData = [headers];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths for compliance format
    const colWidths = headers.map((h, i) => {
      if (i === 0) return { wch: 8 }; // Sl. No.
      if (i === 1) return { wch: 25 }; // Name of the workman
      if (i === 2) return { wch: 15 }; // Site
      if (i === 3 || i === 4) return { wch: 15 }; // UAN, IP NO
      if (i === 5) return { wch: 20 }; // Designation
      return { wch: 12 }; // Default for numeric columns
    });
    worksheet['!cols'] = colWidths;

    // Add instructions sheet
    const instructionsData = [
      ['Salary Compliance Sheet - Import Template (FORM XVII/XIII)'],
      [''],
      ['Instructions:'],
      ['1. Fill in employee salary data in the "Compliance Salary Sheet" sheet'],
      ['2. Do NOT modify the header row (first row)'],
      ['3. "Name of the workman" must match existing employee names or codes in the system'],
      ['4. All numeric fields should contain numbers only (no currency symbols)'],
      ['5. Save the file and upload it through the Bulk Import feature'],
      [''],
      ['Required Fields:'],
      ['- Sl. No. (Serial number starting from 1)'],
      ['- Name of the workman (Employee name - system will try to match)'],
      ['- TOTAL NO OF DAYS WORKED (Number of days attended)'],
      ['- Basic wages in Rs (Basic salary amount)'],
      ['- Net amount paid in Rs (Final net pay)'],
      [''],
      ['Important Notes:'],
      ['- Employee name is the key field that links to your employee records'],
      ['- System will validate all employee names before import'],
      ['- If validation fails, you will see suggestions for correct names'],
      ['- This format matches FORM XVII/XIII compliance requirements'],
      ['- Format has 24 columns as per statutory compliance'],
      [''],
      ['Column Guide:'],
      ['- Columns 1-6: Employee identification (Sl. No., Name, Site, UAN, IP NO., Designation)'],
      ['- Columns 7-9: Attendance details (Days worked, OT hours, Work done)'],
      ['- Columns 10-15: Earnings (Daily rate, Basic, DA, OT, Other payments, Total wages)'],
      ['- Columns 16-20: Deductions (EPF, ESI, House rent, PT, Total deductions)'],
      ['- Column 21: Net amount paid'],
      ['- Columns 22-24: Payment details (Time/date, Place, Signature)'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 80 }];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Compliance Salary Sheet');

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
