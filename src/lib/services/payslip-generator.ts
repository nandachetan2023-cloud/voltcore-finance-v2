// Payslip PDF Generator Service
// Generates professional payslips in PDF format using jsPDF
// Matching Upasana Associate format

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

interface PayslipData {
  company: {
    name: string;
    address: string;
    principalEmployer: string;
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

// Color palette
const BLUE = '#1A56C4';
const BLACK = '#000000';
const ORANGE = '#E86500';

export class PayslipGenerator {
  /**
   * Format currency in Indian format with rupee symbol
   */
  private formatCurrency(amount: number): string {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '₹ 0.00';
    }
    return `₹ ${amount.toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  /**
   * Create a single payslip PDF
   */
  private createPayslipPDF(data: PayslipData): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 11; // ~0.43 inches
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 10;

    // Company Header
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text(data.company.name, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(data.company.address, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Name & Address of the Principal Employer : ${data.company.principalEmployer}`, margin, yPos);
    
    yPos += 6;

    // Month / Date-of-Payment Row
    autoTable(doc, {
      startY: yPos,
      head: [[
        { content: `Employee pay summery for the month of ${data.period.monthName}`, styles: { fontStyle: 'bold' } },
        { content: 'Date of Payment', styles: { fontStyle: 'bold' } },
        data.period.dateOfPayment
      ]],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: BLACK, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.52 },
        1: { cellWidth: contentWidth * 0.28 },
        2: { cellWidth: contentWidth * 0.20 }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY;

    // Employee Info + Bank Details
    autoTable(doc, {
      startY: yPos,
      body: [
        [
          { content: 'Employee Name', styles: { textColor: BLUE } },
          data.employee.name,
          { content: 'Monthly Working Day', styles: { textColor: BLUE } },
          { content: String(data.attendance.workingDays), styles: { halign: 'right' } }
        ],
        [
          { content: 'Employee Code', styles: { textColor: BLUE } },
          data.employee.code,
          { content: 'No. of Working Day Attended', styles: { textColor: BLUE } },
          { content: String(data.attendance.presentDays), styles: { halign: 'right' } }
        ],
        [
          { content: 'Designation', styles: { textColor: BLUE } },
          data.employee.designation,
          { content: 'Bank Details', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } }
        ],
        [
          { content: 'EPF Number', styles: { textColor: BLUE } },
          data.employee.epfNumber || '0',
          { content: 'Bank Name', styles: { textColor: BLUE } },
          data.employee.bankName
        ],
        [
          { content: 'UAN Number', styles: { textColor: BLUE } },
          data.employee.uanNumber || '0',
          { content: 'Bank Account No.', styles: { textColor: BLUE } },
          data.employee.bankAccount
        ],
        [
          { content: 'ESIC Number', styles: { textColor: BLUE } },
          data.employee.esicNumber || '0',
          { content: 'Bank IFSC Code', styles: { textColor: BLUE } },
          data.employee.ifscCode
        ]
      ],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: BLACK, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.21 },
        1: { cellWidth: contentWidth * 0.24 },
        2: { cellWidth: contentWidth * 0.31 },
        3: { cellWidth: contentWidth * 0.24 }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY;

    // Earnings / Deductions
    autoTable(doc, {
      startY: yPos,
      body: [
        [
          { content: 'EARNING SALARY', styles: { fontStyle: 'bold' } },
          { content: 'AMOUNT', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: 'DEDUCTIONS', styles: { fontStyle: 'bold' } },
          { content: 'AMOUNT', styles: { fontStyle: 'bold', halign: 'right' } }
        ],
        [
          { content: 'Basic Salary', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.basicSalary), styles: { halign: 'right', fontSize: 7.5 } },
          { content: 'EPF', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.deductions.pf), styles: { halign: 'right', fontSize: 7.5 } }
        ],
        [
          { content: 'House Rent Allowances', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.hra), styles: { halign: 'right', fontSize: 7.5 } },
          { content: 'ESIC', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.deductions.esi), styles: { halign: 'right', fontSize: 7.5 } }
        ],
        [
          { content: 'Site Allowances', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.siteAllowance), styles: { halign: 'right', fontSize: 7.5 } },
          { content: 'PT', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.deductions.pt), styles: { halign: 'right', fontSize: 7.5 } }
        ],
        [
          { content: 'Travel Allowances', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.travelAllowance), styles: { halign: 'right', fontSize: 7.5 } },
          { content: 'Advance', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.deductions.advance), styles: { halign: 'right', fontSize: 7.5 } }
        ],
        [
          { content: 'Special Allowances', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.specialAllowance), styles: { halign: 'right', fontSize: 7.5 } },
          { content: 'Other Deduction', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.deductions.other), styles: { halign: 'right', fontSize: 7.5 } }
        ],
        [
          { content: 'Attendance Allowances', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.attendanceAllowance), styles: { halign: 'right', fontSize: 7.5 } },
          '',
          ''
        ],
        [
          { content: 'OT Amount', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.overtime), styles: { halign: 'right', fontSize: 7.5 } },
          '',
          ''
        ],
        [
          { content: 'PH Amount', styles: { textColor: BLUE } },
          { content: this.formatCurrency(data.earnings.phAmount), styles: { halign: 'right', fontSize: 7.5 } },
          '',
          ''
        ],
        [
          { content: 'Gross Earnings', styles: { fontStyle: 'bold' } },
          { content: this.formatCurrency(data.earnings.total), styles: { fontStyle: 'bold', halign: 'right', fontSize: 7.5 } },
          { content: 'Total Deductions', styles: { fontStyle: 'bold' } },
          { content: this.formatCurrency(data.deductions.total), styles: { fontStyle: 'bold', halign: 'right', fontSize: 7.5 } }
        ],
        [
          { content: 'Net Payable===>', colSpan: 3, styles: { fontStyle: 'bold' } },
          { content: this.formatCurrency(data.netSalary), styles: { fontStyle: 'bold', halign: 'right', fontSize: 7.5 } }
        ]
      ],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: BLACK, lineWidth: 0.1, overflow: 'hidden' },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.35 },
        1: { cellWidth: contentWidth * 0.15, overflow: 'hidden' },
        2: { cellWidth: contentWidth * 0.35 },
        3: { cellWidth: contentWidth * 0.15, overflow: 'hidden' }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY;

    // Computer Generated Notice
    autoTable(doc, {
      startY: yPos,
      body: [[
        '',
        { content: 'This is a computer generated slip, hence Sign.not required', styles: { textColor: ORANGE, halign: 'center' } }
      ]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, lineColor: BLACK, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.35 },
        1: { cellWidth: contentWidth * 0.65 }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY;

    // Signatures
    autoTable(doc, {
      startY: yPos,
      body: [[
        { content: 'Employee Signature', styles: { fontStyle: 'bold', halign: 'center', minCellHeight: 18 } },
        { content: 'Employer Signature', styles: { fontStyle: 'bold', halign: 'center', minCellHeight: 18 } }
      ]],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: BLACK, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.50 },
        1: { cellWidth: contentWidth * 0.50 }
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
      console.log('[PayslipGenerator] Creating PDF with jsPDF...');
      const doc = this.createPayslipPDF(data);
      
      console.log('[PayslipGenerator] Converting to blob...');
      const blob = doc.output('blob');
      
      console.log('[PayslipGenerator] PDF generated successfully, size:', blob.size);
      return blob;
    } catch (error) {
      console.error('[PayslipGenerator] Error generating payslip:', error);
      throw new Error(`Payslip generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple payslips and return as ZIP
   */
  async generateBulkPayslips(payslipsData: PayslipData[]): Promise<Blob> {
    try {
      console.log(`[PayslipGenerator] Generating ${payslipsData.length} payslips...`);
      const zip = new JSZip();

      for (let i = 0; i < payslipsData.length; i++) {
        const data = payslipsData[i];
        console.log(`[PayslipGenerator] Processing ${i + 1}/${payslipsData.length}: ${data.employee.code}`);
        
        const pdfBlob = await this.generateSinglePayslip(data);
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        const fileName = `Payslip_${data.employee.code}_${data.period.monthName}.pdf`;
        zip.file(fileName, pdfArrayBuffer);
      }

      console.log('[PayslipGenerator] Creating ZIP archive...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      console.log('[PayslipGenerator] ZIP created successfully, size:', zipBlob.size);
      
      return zipBlob;
    } catch (error) {
      console.error('[PayslipGenerator] Error generating bulk payslips:', error);
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
