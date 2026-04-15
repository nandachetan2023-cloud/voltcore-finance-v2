# Excel Templates Integration Guide

This document explains how the three Excel templates from `excels/sample-employee(6)(1).xlsx` integrate with your VoltCore ERP system.

---

## Template 1: Employee Format (Master Data)

### Purpose
Core employee database - the foundation of your HRMS system.

### Where It's Used in VoltCore ERP

#### 1. **Employee Management Module** (`/erp/employees`)
- **Bulk Import Feature** ✅ IMPLEMENTED
  - Click "Bulk Import" button
  - Upload Excel file with employee format sheet
  - System validates and imports all employees
  - Automatic matching with biometric data by employee code

- **Individual Employee Creation**
  - Manual form entry uses same fields
  - Add Employee dialog maps to these columns

#### 2. **Biometric Integration** (`/erp/biometric`)
- **Employee Matching**
  - Biometric punch data matches by `employee_id` → `employeeCode`
  - After importing employees, biometric logs automatically process
  - Creates attendance records for matched employees

#### 3. **Attendance Module** (`/erp/attendance`)
- **Employee Selection**
  - Dropdown populated from employee master data
  - Filter attendance by employee
  - View punch in/out times

#### 4. **Leave Management** (`/erp/leave`)
- **Leave Applications**
  - Employee details pulled from master data
  - Leave balance tracking per employee
  - Approval workflow uses reporting manager from master data

#### 5. **Payroll Module** (`/erp/payroll`)
- **Salary Processing**
  - Employee list for payroll generation
  - Bank details from master data for salary transfer
  - Statutory IDs (UAN, ESIC, PAN) for compliance

#### 6. **Organization Hierarchy**
- **Reporting Structure**
  - `reports_to` field builds org chart
  - Manager-subordinate relationships
  - Approval routing based on hierarchy

#### 7. **Access Control**
- **User Authentication**
  - `username` and `password` for system login
  - `user_role_id` determines permissions
  - Employee self-service portal access

### Field Mapping

| Excel Column | ERP Database Field | Used In Modules |
|--------------|-------------------|-----------------|
| `employee_id` | `employeeCode` | All modules (primary identifier) |
| `full_name` | `firstName`, `middleName`, `lastName` | All modules |
| `work_email` | `email` | Login, Communications |
| `contact_no` | `phone` | Contact, Emergency |
| `date_of_birth` | `dateOfBirth` | HR, Compliance |
| `date_of_joining` | `dateOfJoining` | HR, Payroll, Leave |
| `department_id` | `departmentId` | Organization, Reports |
| `designation_id` | `designationId` | Organization, Payroll |
| `uan` | `uanNumber` | Payroll (PF calculation) |
| `esic` | `esicNumber` | Payroll (ESIC calculation) |
| `pan` | `panNumber` | Payroll (TDS calculation) |
| `uidia` | `aadharNumber` | Compliance, KYC |
| `bank_name`, `account_number`, `bank_code` | Bank details model | Payroll (salary transfer) |
| `reports_to` | `reportingManagerId` | Leave approval, Hierarchy |
| `status` | `employmentStatus` | Active/Inactive filtering |

---

## Template 2: Salary Comp. (Payroll Computation)

### Purpose
Monthly payroll calculation based on attendance, allowances, and deductions.

### Where It's Used in VoltCore ERP

#### 1. **Payroll Processing** (`/erp/payroll`)
- **Monthly Salary Calculation**
  - Fetch attendance data from biometric/manual logs
  - Calculate working days, actual attendance, OT hours
  - Apply salary structure (Basic, HRA, Allowances)
  - Compute deductions (EPF, ESIC, PT, TDS, Advances)
  - Generate net payable amount

- **Attendance Integration**
  - `Actual Attendance` from AttendanceLog table
  - `OT Hours` calculated from punch in/out times
  - `PH Days` from holiday calendar
  - `Monthly Working Days` from shift configuration

- **Salary Components**
  - Basic Salary from SalaryStructure
  - HRA, Site Allowance, LTA, Special Allowance
  - Attendance Allowance based on attendance %
  - OT Amount = (Basic/8) × OT Hours × 2

- **Statutory Deductions**
  - EPF = Basic × 12% (if Basic ≤ 15,000)
  - ESIC = Gross × 0.75% (if Gross ≤ 21,000)
  - PT = State-wise professional tax slab
  - TDS = As per income tax slabs

#### 2. **Payroll Reports** (`/erp/reports`)
- **Monthly Payroll Register**
  - Department-wise salary summary
  - Employee-wise earnings and deductions
  - Statutory compliance reports (EPF, ESIC, PT)

#### 3. **Finance Integration** (`/erp/finance`)
- **Salary Journal Entry**
  - Debit: Salary Expense accounts
  - Credit: Bank/Cash, EPF Payable, ESIC Payable, TDS Payable
  - Auto-posting to General Ledger

#### 4. **Advance Management**
- **Advance Recovery**
  - Track employee advances
  - Deduct from monthly salary
  - Update advance balance

### Implementation Status

**Current:** Basic payroll structure exists
**Needed:** 
- Salary structure assignment per employee
- Automatic attendance-based calculation
- Statutory deduction formulas
- Advance recovery tracking

---

## Template 3: Salary Sheet (Payslip)

### Purpose
Employee-facing payslip document with detailed earnings and deductions breakdown.

### Where It's Used in VoltCore ERP

#### 1. **Employee Self-Service Portal** (`/erp/employee-portal`)
- **Payslip Download**
  - Monthly payslip generation
  - PDF format with company letterhead
  - Download history of past payslips
  - Email delivery option

#### 2. **Payroll Module** (`/erp/payroll`)
- **Payslip Generation**
  - After payroll processing, generate payslips
  - Bulk generation for all employees
  - Preview before finalizing
  - Send via email to all employees

#### 3. **Payslip Template Structure**

```
┌─────────────────────────────────────────────────────────┐
│ COMPANY LOGO & NAME                                     │
│ Principal Employer: Hindalco Industries Ltd.            │
│ Vendor/Associate: Upasana Associate                     │
├─────────────────────────────────────────────────────────┤
│ Employee Pay Summary for the month of [Month-Year]     │
├─────────────────────────────────────────────────────────┤
│ Employee Details:                                       │
│ - Name: [Full Name]                                     │
│ - Code: [Employee Code]                                 │
│ - Designation: [Designation]                            │
│ - Department: [Department]                              │
│ - Bank: [Bank Name] - [Account No] - [IFSC]           │
│ - EPF: [EPF Number] | UAN: [UAN Number]               │
│ - ESIC: [ESIC Number]                                   │
├─────────────────────────────────────────────────────────┤
│ Attendance Summary:                                     │
│ - Total Working Days: [26]                              │
│ - Attended Days: [24]                                   │
│ - Leave Days: [2]                                       │
│ - OT Hours: [10]                                        │
├─────────────────────────────────────────────────────────┤
│ EARNINGS                          │ DEDUCTIONS          │
│ Basic Salary          ₹15,000     │ EPF        ₹1,800  │
│ HRA                   ₹3,750      │ ESIC       ₹112    │
│ Site Allowance        ₹3,600      │ PT         ₹125    │
│ Travel Allowance      ₹3,000      │ TDS        ₹0      │
│ Special Allowance     ₹1,950      │ Advance    ₹500    │
│ Attendance Allowance  ₹2,700      │                     │
│ OT Amount             ₹625        │                     │
│ PH Amount             ₹612        │                     │
│ ─────────────────────────────────────────────────────  │
│ GROSS EARNINGS        ₹31,237     │ TOTAL DED. ₹2,537  │
│                                                          │
│ NET PAYABLE: ₹28,700                                    │
└─────────────────────────────────────────────────────────┘
│ Employee Signature: _______________                     │
│ Date: [Date]                                            │
└─────────────────────────────────────────────────────────┘
```

#### 4. **Compliance & Audit**
- **Labor Law Compliance**
  - Mandatory wage slip as per Payment of Wages Act
  - Detailed breakdown for transparency
  - Audit trail for labor inspections

- **Dispute Resolution**
  - Clear itemization prevents salary disputes
  - Employee can verify calculations
  - Historical records for reference

### Implementation Status

**Current:** Basic structure exists
**Needed:**
- PDF generation library (e.g., `pdfkit`, `puppeteer`)
- Payslip template design
- Email delivery system
- Employee portal for self-service

---

## Integration Workflow

### Complete Flow: Employee → Attendance → Payroll → Payslip

```
1. EMPLOYEE ONBOARDING
   ↓
   Upload Employee Format Excel
   ↓
   Bulk Import validates and creates employees
   ↓
   Employee records created in database

2. BIOMETRIC INTEGRATION
   ↓
   Biometric devices capture punch data
   ↓
   Sync API fetches punch logs
   ↓
   Match by employee_id → employeeCode
   ↓
   Create AttendanceLog records

3. MONTHLY ATTENDANCE
   ↓
   Attendance logs accumulated for month
   ↓
   Calculate: Working days, Present days, Leaves, OT hours
   ↓
   Attendance summary ready for payroll

4. PAYROLL PROCESSING
   ↓
   Fetch employee salary structure
   ↓
   Apply Salary Comp. template logic:
   - Basic = Salary Structure
   - Allowances = % of Basic
   - Actual Earnings = (Basic/26) × Attended Days
   - OT Amount = (Basic/8) × OT Hours × 2
   - Deductions = EPF + ESIC + PT + TDS + Advance
   ↓
   Calculate Net Payable

5. PAYSLIP GENERATION
   ↓
   Use Salary Sheet template format
   ↓
   Generate PDF payslips
   ↓
   Email to employees
   ↓
   Available in Employee Portal

6. FINANCE POSTING
   ↓
   Create journal entry for salary
   ↓
   Post to General Ledger
   ↓
   Update bank/cash accounts
```

---

## Current Implementation Status

### ✅ Completed
1. **Employee Format Template**
   - Bulk import API endpoint
   - Excel parsing and validation
   - Employee creation with all fields
   - Biometric integration by employee code
   - UI component with validation preview

2. **Biometric Integration**
   - API connection to eTimeOffice
   - Punch data sync (799 records fetched)
   - Raw log storage
   - Employee matching logic

### 🚧 In Progress
1. **Salary Comp. Template**
   - Basic payroll structure exists
   - Need: Salary structure assignment
   - Need: Attendance-based calculation
   - Need: Statutory deduction formulas

2. **Salary Sheet Template**
   - Need: PDF generation
   - Need: Payslip template design
   - Need: Email delivery
   - Need: Employee portal

### 📋 Recommended Next Steps

1. **Immediate (This Week)**
   - Import employees using bulk import
   - Process biometric logs to create attendance
   - Verify attendance records

2. **Short Term (This Month)**
   - Create salary structures for employees
   - Implement attendance-based payroll calculation
   - Add statutory deduction formulas

3. **Medium Term (Next Month)**
   - Design and implement payslip PDF generation
   - Build employee self-service portal
   - Set up email delivery system

4. **Long Term (Next Quarter)**
   - Automated monthly payroll processing
   - Advance management system
   - Comprehensive payroll reports
   - Finance integration for auto-posting

---

## Usage Instructions

### How to Import Employees

1. **Prepare Excel File**
   - Use template: `excels/sample-employee(6)(1).xlsx`
   - Fill "employee format" sheet with employee data
   - Ensure required fields: employee_id, full_name, work_email, contact_no, dates, address

2. **Import via UI**
   - Navigate to `/erp/employees`
   - Click "Bulk Import" button
   - Select Excel file
   - Click "Validate" to check for errors
   - Review validation results
   - Click "Import" to create employees

3. **Post-Import**
   - Visit `/api/biometric/employee-check` to verify matching
   - Run biometric process: `/api/biometric/process`
   - Check attendance records created

### How to Process Payroll (When Implemented)

1. **Month End**
   - Ensure all attendance synced
   - Verify leave applications processed
   - Check advance records updated

2. **Run Payroll**
   - Navigate to `/erp/payroll`
   - Select month and year
   - Click "Process Payroll"
   - Review calculations
   - Approve and finalize

3. **Generate Payslips**
   - Click "Generate Payslips"
   - Preview sample payslips
   - Send to all employees via email
   - Post salary journal entry to finance

---

## Database Schema Alignment

### Employee Table
Maps directly to Employee Format template columns.

### AttendanceLog Table
Populated from biometric data, used in Salary Comp. calculations.

### SalaryStructure Table (To Be Enhanced)
Stores employee-wise salary components for Salary Comp. template.

### PayrollItem Table
Stores monthly payroll calculations from Salary Comp. template.

### Payslip Table (To Be Created)
Stores generated payslips based on Salary Sheet template.

---

## Benefits of This Integration

✅ **Single Source of Truth:** Employee master data drives all modules

✅ **Automated Workflows:** Biometric → Attendance → Payroll → Payslip

✅ **Compliance Ready:** Statutory IDs and calculations built-in

✅ **Audit Trail:** Complete history of all transactions

✅ **Employee Self-Service:** Reduces HR workload

✅ **Real-Time Reporting:** Live dashboards and analytics

✅ **Scalability:** Bulk operations for large workforce

✅ **Error Reduction:** Validation prevents data quality issues
