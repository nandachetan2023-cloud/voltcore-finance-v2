// Payslip PDF Generator Service
// Generates professional payslips in PDF format using jsPDF
// Matching exactly with UA_Slip_format.xlsx

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

export interface PayslipData {
  company: {
    name: string;
    address: string;
    principalEmployer: string;
    logo?: string | null; // base64 data URL of the tenant logo (optional)
  };
  employee: {
    code: string;
    name: string;
    department: string;
    designation: string;
    dateOfJoining: string;
    bankAccount: string;
    bankName: string;
    ifscCode: string;
    panNumber: string;
    uanNumber: string;
    epfNumber: string;
    esicNumber: string;
  };
  period: {
    month: number;
    year: number;
    monthName: string;
    dateOfPayment: string;
  };
  earnings: {
    basicSalary: number;
    hra: number;
    siteAllowance: number;
    travelAllowance: number;
    specialAllowance: number;
    attendanceAllowance: number;
    overtime: number;
    phAmount: number;
    total: number;
  };
  deductions: {
    pf: number;
    esi: number;
    pt: number;
    advance: number;
    other: number;
    total: number;
  };
  attendance: {
    workingDays: number;
    presentDays: number;
  };
  netSalary: number;
}

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

export class PayslipGenerator {
  /**
   * Format currency to match Excel format (Whole numbers, no symbol)
   */
  private formatCurrency(amount: number): string {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '0';
    }
    return Math.round(amount).toString();
  }

  /**
   * Create a single payslip PDF matching UA_Slip_format.xlsx
   */
  private createPayslipPDF(data: PayslipData): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 11;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 15;

    // Company logo (top-left), if the tenant has one uploaded
    if (data.company.logo) {
      try {
        const props = doc.getImageProperties(data.company.logo);
        const maxW = 24;
        const maxH = 16;
        let w = maxW;
        let h = (props.height / props.width) * w;
        if (h > maxH) {
          h = maxH;
          w = (props.width / props.height) * h;
        }
        doc.addImage(data.company.logo, props.fileType || 'PNG', margin, 8, w, h);
      } catch {
        /* invalid/unsupported logo — skip silently */
      }
    }

    // Company Header Title (Row 1)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.company.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    // Generate Single Unified Table
    autoTable(doc, {
      startY: yPos,
      body: [
        // Row 2: Company Address
        [{ content: data.company.address, colSpan: 6, styles: { fontStyle: 'bold', halign: 'center', fontSize: 9 } }],
        // Row 3: Principal Employer
        [{ content: `Name & Address of the Principal Employer : ${data.company.principalEmployer}`, colSpan: 6, styles: { fontStyle: 'bold', halign: 'left', fontSize: 9 } }],
        // Row 4: Period & Date
        [
          { content: `Employee pay summery for the month of ${data.period.monthName}-${String(data.period.year).slice(-2)}`, colSpan: 3, styles: { fontStyle: 'bold', fontSize: 9 } },
          { content: 'Date of Payment', styles: { fontStyle: 'bold' } },
          { content: data.period.dateOfPayment || '', colSpan: 2, styles: { halign: 'center' } }
        ],
        // Row 5
        [
          { content: 'Employee Name' },
          { content: data.employee.name, colSpan: 2 },
          { content: 'Monthly Working Day', colSpan: 2 },
          { content: String(data.attendance.workingDays), styles: { halign: 'left' } }
        ],
        // Row 6
        [
          { content: 'Employee Code' },
          { content: data.employee.code, colSpan: 2 },
          { content: 'No. of Working Day Attended', colSpan: 2 },
          { content: String(data.attendance.presentDays), styles: { halign: 'left' } }
        ],
        // Row 7
        [
          { content: 'Designation' },
          { content: data.employee.designation, colSpan: 2 },
          { content: 'Bank Details', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center' } }
        ],
        // Row 8
        [
          { content: 'EPF Number' },
          { content: data.employee.epfNumber || '0', colSpan: 2 },
          { content: 'Bank Name' },
          { content: data.employee.bankName, colSpan: 2 }
        ],
        // Row 9
        [
          { content: 'UAN Number' },
          { content: data.employee.uanNumber || '0', colSpan: 2 },
          { content: 'Bank Account No.' },
          { content: data.employee.bankAccount, colSpan: 2 }
        ],
        // Row 10
        [
          { content: 'ESIC Number' },
          { content: data.employee.esicNumber || '0', colSpan: 2 },
          { content: 'Bank IFSC Code' },
          { content: data.employee.ifscCode, colSpan: 2 }
        ],
        // Row 11: Earnings & Deductions Header
        [
          { content: 'EARNING SALARY', styles: { fontStyle: 'bold' } },
          { content: 'AMOUNT', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left' } },
          { content: 'DEDUCTIONS', styles: { fontStyle: 'bold' } },
          { content: 'AMOUNT', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left' } }
        ],
        // Row 12
        [
          { content: 'Basic Salary' },
          { content: this.formatCurrency(data.earnings.basicSalary), colSpan: 2 },
          { content: 'EPF' },
          { content: this.formatCurrency(data.deductions.pf), colSpan: 2 }
        ],
        // Row 13
        [
          { content: 'House Rent Allowances' },
          { content: this.formatCurrency(data.earnings.hra), colSpan: 2 },
          { content: 'ESIC' },
          { content: this.formatCurrency(data.deductions.esi), colSpan: 2 }
        ],
        // Row 14
        [
          { content: 'Site Allowances' },
          { content: this.formatCurrency(data.earnings.siteAllowance), colSpan: 2 },
          { content: '' },
          { content: '', colSpan: 2 }
        ],
        // Row 15
        [
          { content: 'Travel Allowances' },
          { content: this.formatCurrency(data.earnings.travelAllowance), colSpan: 2 },
          { content: 'Advance' },
          { content: this.formatCurrency(data.deductions.advance), colSpan: 2 }
        ],
        // Row 16
        [
          { content: 'Special Allowances' },
          { content: this.formatCurrency(data.earnings.specialAllowance), colSpan: 2 },
          { content: 'Other Deduction' },
          { content: this.formatCurrency(data.deductions.other), colSpan: 2 }
        ],
        // Row 17
        [
          { content: 'Attendance Allowances' },
          { content: this.formatCurrency(data.earnings.attendanceAllowance), colSpan: 2 },
          { content: '' },
          { content: '', colSpan: 2 }
        ],
        // Row 18
        [
          { content: 'OT Amount' },
          { content: this.formatCurrency(data.earnings.overtime), colSpan: 2 },
          { content: '' },
          { content: '', colSpan: 2 }
        ],
        // Row 19
        [
          { content: 'PH Amount' },
          { content: this.formatCurrency(data.earnings.phAmount), colSpan: 2 },
          { content: '' },
          { content: '', colSpan: 2 }
        ],
        // Row 20: Totals
        [
          { content: 'Gross Earnings', styles: { fontStyle: 'bold' } },
          { content: this.formatCurrency(data.earnings.total), colSpan: 2, styles: { fontStyle: 'bold' } },
          { content: 'Total Deductions', styles: { fontStyle: 'bold' } },
          { content: this.formatCurrency(data.deductions.total), colSpan: 2, styles: { fontStyle: 'bold' } }
        ],
        // Row 21: Net Payable
        [
          { content: 'Net Payable==>', colSpan: 3, styles: { fontStyle: 'bold' } },
          { content: this.formatCurrency(data.netSalary), colSpan: 3, styles: { fontStyle: 'bold' } }
        ],
        // Row 22: Notice
        [
          { content: '', colSpan: 3, styles: { minCellHeight: 12 } },
          { content: 'This is a computer generated slip, hence Sign.not required', colSpan: 3, styles: { halign: 'left', valign: 'top' } }
        ],
        // Row 23: Signatures
        [
          { content: 'Employee Signature', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center', minCellHeight: 15, valign: 'bottom' } },
          { content: 'Employer Signature', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center', minCellHeight: 15, valign: 'bottom' } }
        ]
      ],
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2,
        lineColor: '#000000',
        lineWidth: 0.1,
        textColor: '#000000',
        font: 'helvetica'
      },
      // Maps to the 6 virtual columns underlying the Excel File (Total = 100%)
      columnStyles: {
        0: { cellWidth: contentWidth * 0.25 },
        1: { cellWidth: contentWidth * 0.125 },
        2: { cellWidth: contentWidth * 0.125 },
        3: { cellWidth: contentWidth * 0.25 },
        4: { cellWidth: contentWidth * 0.125 },
        5: { cellWidth: contentWidth * 0.125 }
      },
      margin: { left: margin, right: margin }
    });

    return doc;
  }

  /**
   * Generate a single payslip and return as Blob
   */
  async generateSinglePayslip(data: PayslipData): Promise<Blob> {
    try {
      const doc = this.createPayslipPDF(data);
      return doc.output('blob');
    } catch (error) {
      throw new Error(`Payslip generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple payslips and return as ZIP
   */
  async generateBulkPayslips(payslipsData: PayslipData[]): Promise<Blob> {
    try {
      const zip = new JSZip();
      for (let i = 0; i < payslipsData.length; i++) {
        const data = payslipsData[i];
        const pdfBlob = await this.generateSinglePayslip(data);
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        const fileName = `Payslip_${data.employee.code}_${data.period.monthName}.pdf`;
        zip.file(fileName, pdfArrayBuffer);
      }
      return await zip.generateAsync({ type: 'blob' });
    } catch (error) {
      throw new Error(`Bulk payslip generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get filename for single payslip
   */
  getPayslipFilename(employeeCode: string, month: number, year: number): string {
    const monthName = MONTHS[month - 1];
    return `Payslip_${employeeCode}_${monthName}_${year}.pdf`;
  }

  /**
   * Get filename for bulk payslips ZIP
   */
  getBulkPayslipsFilename(month: number, year: number): string {
    const monthName = MONTHS[month - 1];
    return `Payslips_${monthName}_${year}.zip`;
  }
}
