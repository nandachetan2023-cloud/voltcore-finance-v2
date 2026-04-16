# Payroll System Specification

## Overview
Complete payroll management system with salary calculation, payslip generation, and bulk processing capabilities based on attendance data and employee salary structures.

## Data Sources
- **Employee Master Data**: From `employees` table
- **Attendance Data**: From `attendanceLog` table
- **Salary Structure**: Based on Excel template format (`excels/sample-employee(6)(1).xlsx`)
- **Leave Records**: From `leaveRequest` table

## Core Features

### 1. Payroll Generation

#### 1.1 Single Employee Payroll
- Select employee from dropdown
- Select month/year for payroll period
- Auto-fetch attendance data for the period
- Calculate salary components automatically
- Preview before saving
- Generate payslip immediately

#### 1.2 Bulk Payroll Generation
- Select month/year for payroll period
- Option to filter by:
  - Department
  - Designation
  - Branch/Site
  - Employment type
- Preview employee list with calculated amounts
- Bulk generate for all selected employees
- Progress indicator for bulk processing
- Error handling for individual failures

### 2. Salary Calculation Logic

#### 2.1 Earnings Components
```
Basic Salary: Base amount from employee record
HRA (House Rent Allowance): 40-50% of Basic (configurable)
Conveyance Allowance: Fixed amount or % of Basic
Medical Allowance: Fixed amount
Special Allowance: Variable amount
Other Allowances: Configurable

Overtime (OT):
- Calculate from attendance records
- OT Hours = Total Hours - Standard Hours (8h/day)
- OT Rate = (Basic / 26 / 8) * OT Multiplier (1.5x or 2x)
- OT Amount = OT Hours * OT Rate
```

#### 2.2 Deductions
```
Provident Fund (PF):
- Employee Contribution: 12% of Basic
- Employer Contribution: 12% of Basic (for records)
- Applicable if Basic <= ₹15,000 (or all employees if opted)

Employee State Insurance (ESI):
- Employee Contribution: 0.75% of Gross
- Employer Contribution: 3.25% of Gross (for records)
- Applicable if Gross <= ₹21,000

Professional Tax (PT):
- State-specific slab rates
- Maharashtra: ₹200/month (₹2,500/year)

Tax Deducted at Source (TDS):
- Based on annual salary and tax slabs
- Calculated monthly = Annual TDS / 12

Other Deductions:
- Loan repayment
- Advance salary recovery
- Late/Absent deductions
- Disciplinary deductions
```

#### 2.3 Attendance-Based Calculations
```
Working Days Calculation:
- Total Days in Month: Calendar days
- Paid Days = Present Days + Paid Leave Days
- LOP (Loss of Pay) Days = Total Days - Paid Days - Weekly Offs - Holidays

Salary Calculation:
- Per Day Salary = Gross Salary / 26 (or 30, configurable)
- Payable Salary = (Paid Days / 26) * Gross Salary
- LOP Deduction = (LOP Days / 26) * Gross Salary

Overtime Calculation:
- Fetch attendance logs for the month
- For each day: OT Hours = max(0, Total Hours - 8)
- Total OT Hours = Sum of all OT hours
- OT Amount = Total OT Hours * OT Rate
```

#### 2.4 Final Calculation
```
Gross Salary = Basic + HRA + Allowances + OT
Total Deductions = PF + ESI + PT + TDS + Other Deductions + LOP
Net Salary = Gross Salary - Total Deductions
```

### 3. Payslip Generation

#### 3.1 Payslip Format (PDF)
```
Header:
- Company Logo
- Company Name & Address
- Payslip Title
- Month & Year

Employee Details:
- Employee Code
- Employee Name
- Department
- Designation
- Date of Joining
- Bank Account Details
- PAN Number
- UAN Number

Salary Details Table:
┌─────────────────────────┬──────────────┬─────────────────────────┬──────────────┐
│ EARNINGS                │ AMOUNT (₹)   │ DEDUCTIONS              │ AMOUNT (₹)   │
├─────────────────────────┼──────────────┼─────────────────────────┼──────────────┤
│ Basic Salary            │ XX,XXX.XX    │ Provident Fund          │ X,XXX.XX     │
│ HRA                     │ XX,XXX.XX    │ ESI                     │ XXX.XX       │
│ Conveyance Allowance    │ X,XXX.XX     │ Professional Tax        │ XXX.XX       │
│ Medical Allowance       │ X,XXX.XX     │ TDS                     │ X,XXX.XX     │
│ Special Allowance       │ X,XXX.XX     │ LOP Deduction           │ X,XXX.XX     │
│ Overtime                │ X,XXX.XX     │ Other Deductions        │ XXX.XX       │
├─────────────────────────┼──────────────┼─────────────────────────┼──────────────┤
│ GROSS EARNINGS          │ XX,XXX.XX    │ TOTAL DEDUCTIONS        │ X,XXX.XX     │
└─────────────────────────┴──────────────┴─────────────────────────┴──────────────┘

NET SALARY: ₹ XX,XXX.XX (Rupees XXXXX Only)

Attendance Summary:
- Total Working Days: XX
- Present Days: XX
- Paid Leave: XX
- LOP Days: XX
- Overtime Hours: XX.X

Footer:
- Generated Date
- Authorized Signatory
- Note: "This is a computer-generated payslip and does not require a signature"
```

#### 3.2 Single Payslip Download
- Generate PDF for selected payroll record
- Filename format: `Payslip_[EmpCode]_[Month]_[Year].pdf`
- Download immediately

#### 3.3 Bulk Payslip Download
- Generate payslips for multiple employees
- Create ZIP file containing all PDFs
- Filename format: `Payslips_[Month]_[Year].zip`
- Progress indicator during generation
- Download ZIP file

### 4. Payroll History & Management

#### 4.1 Payroll Runs
```
PayrollRun Table:
- id: Unique identifier
- name: "Payroll - January 2026"
- month: 1-12
- year: 2026
- status: draft | processing | completed | failed
- totalEmployees: Count
- totalGross: Sum of all gross
- totalNet: Sum of all net
- createdAt: Timestamp
- processedAt: Timestamp
- createdBy: User ID
```

#### 4.2 Payroll Items
```
PayrollItem Table:
- id: Unique identifier
- payrollRunId: FK to PayrollRun
- employeeId: FK to Employee
- month: 1-12
- year: 2026
- workingDays: 26
- presentDays: 24
- paidLeaveDays: 1
- lopDays: 1
- otHours: 5.5
- basicSalary: Amount
- hra: Amount
- conveyanceAllowance: Amount
- medicalAllowance: Amount
- specialAllowance: Amount
- otAmount: Amount
- grossEarnings: Amount
- pfDeduction: Amount
- esiDeduction: Amount
- ptDeduction: Amount
- tdsDeduction: Amount
- lopDeduction: Amount
- otherDeductions: Amount
- totalDeductions: Amount
- netSalary: Amount
- payslipGenerated: boolean
- payslipPath: string (optional)
- status: pending | processed | paid
- remarks: string
- details: JSON (for additional data)
```

#### 4.3 Payroll History View
- List all payroll runs
- Filter by month/year, status
- View summary statistics
- Drill down to individual employee records
- Regenerate payslips if needed
- Export to Excel/CSV

### 5. User Interface Components

#### 5.1 Payroll Dashboard
```
Stats Cards:
- Total Payroll Amount (Current Month)
- Employees Processed
- Pending Approvals
- Total Deductions

Quick Actions:
- Generate Payroll (Single)
- Generate Payroll (Bulk)
- View History
- Download Reports
```

#### 5.2 Generate Payroll Dialog
```
Step 1: Select Period
- Month dropdown
- Year dropdown
- Mode: Single | Bulk

Step 2: Select Employees (if bulk)
- Filter options
- Employee list with checkboxes
- Select All / Deselect All

Step 3: Preview & Confirm
- Show calculated amounts
- Attendance summary
- Warnings/Errors
- Confirm button

Step 4: Processing
- Progress bar
- Status messages
- Success/Error summary
```

#### 5.3 Payroll History Table
```
Columns:
- Payroll Run Name
- Month/Year
- Employees Count
- Total Gross
- Total Net
- Status
- Actions (View, Download Payslips, Export)

Row Actions:
- View Details
- Download Single Payslip
- Download All Payslips (ZIP)
- Regenerate Payslip
- Edit (if draft)
- Delete (if draft)
```

### 6. API Endpoints

#### 6.1 Payroll Generation
```
POST /api/payroll/generate
Body: {
  mode: 'single' | 'bulk',
  month: number,
  year: number,
  employeeIds?: number[], // for bulk
  employeeId?: number,    // for single
  filters?: {
    departmentId?: number,
    designationId?: number,
    branchId?: number
  }
}
Response: {
  success: boolean,
  data: {
    payrollRunId: number,
    itemsCreated: number,
    errors: Array<{employeeId, error}>
  }
}
```

#### 6.2 Payslip Generation
```
POST /api/payroll/generate-payslips
Body: {
  payrollRunId?: number,  // for bulk
  payrollItemId?: number, // for single
  mode: 'single' | 'bulk'
}
Response: {
  success: boolean,
  data: {
    payslipsGenerated: number,
    downloadUrl?: string, // for single
    zipUrl?: string       // for bulk
  }
}
```

#### 6.3 Download Payslips
```
GET /api/payroll/download-payslip/:itemId
Response: PDF file

GET /api/payroll/download-payslips-bulk/:runId
Response: ZIP file
```

### 7. Technical Implementation

#### 7.1 Required Libraries
```json
{
  "jspdf": "^2.5.1",           // PDF generation
  "jspdf-autotable": "^3.8.0", // Tables in PDF
  "jszip": "^3.10.1",          // ZIP file creation
  "file-saver": "^2.0.5"       // File download
}
```

#### 7.2 Salary Calculation Service
```typescript
// src/lib/services/payroll-calculator.ts
export class PayrollCalculator {
  calculateSalary(employee, attendance, month, year): PayrollItem
  calculateOT(attendanceLogs): { hours, amount }
  calculateDeductions(gross, basic): Deductions
  calculateLOP(presentDays, totalDays): { lopDays, lopAmount }
  generatePayslipData(payrollItem): PayslipData
}
```

#### 7.3 Payslip Generator Service
```typescript
// src/lib/services/payslip-generator.ts
export class PayslipGenerator {
  generateSinglePayslip(payrollItem): Promise<Blob>
  generateBulkPayslips(payrollItems): Promise<Blob> // ZIP
  createPayslipPDF(data): jsPDF
}
```

### 8. Configuration

#### 8.1 Salary Components Configuration
```typescript
// Store in database or config file
interface SalaryConfig {
  hraPercentage: number;        // 40-50%
  pfRate: number;               // 12%
  esiEmployeeRate: number;      // 0.75%
  esiEmployerRate: number;      // 3.25%
  esiGrossLimit: number;        // 21000
  pfBasicLimit: number;         // 15000
  otMultiplier: number;         // 1.5 or 2
  workingDaysPerMonth: number;  // 26 or 30
  standardHoursPerDay: number;  // 8
  professionalTax: {
    state: string;
    amount: number;
  }[];
}
```

### 9. Validation & Error Handling

#### 9.1 Pre-Generation Validations
- Employee has valid salary structure
- Attendance data available for the period
- No duplicate payroll for same employee/month
- Employee is active
- Bank details present (for payment)

#### 9.2 Error Scenarios
- Missing attendance data → Use default working days
- Incomplete salary structure → Use basic only
- Calculation errors → Log and skip employee
- PDF generation failure → Retry or mark as failed

### 10. Security & Permissions

#### 10.1 Access Control
- Only HR/Payroll managers can generate payroll
- Employees can only view their own payslips
- Audit log for all payroll operations
- Sensitive data encryption (salary amounts)

#### 10.2 Audit Trail
```
PayrollAudit Table:
- action: generate | edit | delete | download
- userId: Who performed the action
- payrollRunId: Related payroll run
- timestamp: When
- details: JSON with additional info
```

### 11. Reports & Analytics

#### 11.1 Payroll Reports
- Monthly Payroll Summary
- Department-wise Payroll
- Deduction Summary (PF, ESI, TDS)
- Year-to-Date (YTD) Report
- Cost Center Analysis

#### 11.2 Export Formats
- Excel (XLSX)
- CSV
- PDF Summary Report

### 12. Future Enhancements

- Integration with payment gateways
- Direct bank transfer initiation
- Email payslips to employees
- Employee self-service portal
- Tax computation and Form 16 generation
- Salary revision workflow
- Bonus/Incentive calculation
- Arrears calculation
- Loan management integration

## Implementation Priority

### Phase 1 (MVP)
1. Basic payroll generation (single employee)
2. Simple salary calculation (Basic + HRA + Deductions)
3. Payslip PDF generation
4. Payroll history view

### Phase 2
1. Bulk payroll generation
2. Attendance-based calculations
3. OT calculation
4. Bulk payslip download (ZIP)

### Phase 3
1. Advanced deductions (TDS, PT)
2. Configurable salary components
3. Reports and analytics
4. Email integration

### Phase 4
1. Payment integration
2. Employee self-service
3. Tax computation
4. Advanced workflows

## Testing Checklist

- [ ] Single employee payroll generation
- [ ] Bulk payroll generation
- [ ] Salary calculation accuracy
- [ ] OT calculation from attendance
- [ ] LOP calculation
- [ ] PF/ESI calculation
- [ ] Single payslip PDF generation
- [ ] Bulk payslip ZIP generation
- [ ] Download functionality
- [ ] Error handling
- [ ] Performance with 100+ employees
- [ ] Concurrent payroll generation
- [ ] Data validation
- [ ] Security and permissions

## Database Migration Required

```sql
-- Add payslip path to PayrollItem
ALTER TABLE "PayrollItem" ADD COLUMN "payslipPath" TEXT;
ALTER TABLE "PayrollItem" ADD COLUMN "payslipGenerated" BOOLEAN DEFAULT false;
ALTER TABLE "PayrollItem" ADD COLUMN "remarks" TEXT;

-- Add more fields to PayrollItem for detailed breakdown
ALTER TABLE "PayrollItem" ADD COLUMN "workingDays" INTEGER DEFAULT 26;
ALTER TABLE "PayrollItem" ADD COLUMN "presentDays" INTEGER DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "paidLeaveDays" INTEGER DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "lopDays" INTEGER DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "otHours" DECIMAL(5,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "basicSalary" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "hra" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "otAmount" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "pfDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "esiDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "tdsDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "lopDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN "status" TEXT DEFAULT 'pending';

-- Add fields to PayrollRun
ALTER TABLE "PayrollRun" ADD COLUMN "totalEmployees" INTEGER DEFAULT 0;
ALTER TABLE "PayrollRun" ADD COLUMN "totalGross" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollRun" ADD COLUMN "totalNet" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollRun" ADD COLUMN "processedAt" TIMESTAMP;
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-16  
**Status**: Specification Complete - Ready for Implementation
