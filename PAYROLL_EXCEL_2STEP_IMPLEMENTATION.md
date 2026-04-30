# Payroll Excel 2-Step Process - Implementation Guide

## Overview

This document outlines the implementation of a new 2-step process for generating non-compliance payroll Excel sheets.

---

## 🔄 Complete Workflow

### **Step 1A: Download Template**
User clicks "Generate Payroll Excel" → Downloads template with:
- ✅ Auto-filled columns (A-P, Q, R, S, AS)
- 📝 Highlighted user input columns (T, V, Y-AC, AT)
- ⚪ Empty calculation columns (U, W, X, AD-AN, AR-AY, BC-BP)

### **Step 1B: Upload & Calculate**
User uploads filled template → System:
- Validates user inputs
- Calculates all formulas
- Returns final sheet with all 68 columns populated
- **No duplicate checking** (happens in Step 2)

### **Step 2: Import to Database (with Duplicate Handling)**
User uploads final sheet to "Non-Compliance Bulk Import" → System:
- Checks for existing PayrollItem records (same employee+month+year)
- If duplicates found:
  - Shows dialog: "Employee X already has salary data for Month/Year"
  - Options: Update / Keep Existing / Update All / Keep All
- Saves to PayrollRun/PayrollItem tables

---

## 📊 Column Classification

### Auto-filled (Read-only) - Light Blue
| Column | Name | Source |
|--------|------|--------|
| A | SL NO. | Row number |
| B | WORKMEN SL. NO. | Employee.workmenSlNo |
| C | TOKEN NO. | Employee.tokenNumber |
| D | NAME OF EMPLOYEE | Employee.firstName + lastName |
| E | FATHER'S NAME | Employee.fatherName |
| F | DOJ | Employee.dateOfJoining |
| G | DOB | Employee.dateOfBirth |
| H | BANK NAME | Employee.bankName |
| I | ACCOUNT NO. | Employee.bankAccount |
| J | IFSC CODE NO. | Employee.bankIfsc |
| K | - | Empty |
| L | UAN NO. | Employee.uanNumber |
| M | ESIC IP NO | Employee.esicNumber |
| N | DESIGNATION | Employee.Designation.name |
| O | DEPARTMENT | Employee.Department.name |
| P | NATURE OF DESIGNATION | Employee.natureOfDesignation |
| Q | MONTHLY GROSS SALARY | Employee.monthlyGrossSalary |
| R | ACTUAL ATTENDANCE | COUNT(AttendanceLog) |
| S | EXTRA DAYS | COUNT(AttendanceLog extraDay) |

### Auto-filled (Editable) - Light Green
| Column | Name | Source | Note |
|--------|------|--------|------|
| AS | ADVANCE | SUM(EmployeeRequest advance_payment) | User can override |

### User Input (Required) - Yellow
| Column | Name | Description |
|--------|------|-------------|
| T | PH DAYS | Public holidays in month |
| V | ACTUAL OT HRS | Actual overtime hours |
| Y | BASIC WAGES/DAY | Daily wage rate |
| Z | MONTHLY WORKING DAYS | Working days in month |
| AA | OT. HRS | Overtime hours |
| AB | ATTENDANCE | Days present |
| AC | PH | Public holidays worked |
| AT | ARREARS | Previous month dues |

### Calculated (Empty) - White
All other columns (U, W, X, AD-AN, AR, AU-AY, BC-BP) will be calculated after upload.

---

## 🎨 Excel Template Styling

### Cell Styles
```javascript
// Read-only auto-filled (Light Blue)
{
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
  font: { color: { argb: 'FF1F4E78' } },
  protection: { locked: true }
}

// Editable auto-filled (Light Green)
{
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } },
  font: { color: { argb: 'FF375623' } },
  protection: { locked: false }
}

// User input required (Yellow)
{
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } },
  font: { color: { argb: 'FF7F6000', bold: true } },
  protection: { locked: false }
}

// Calculated (White)
{
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
  protection: { locked: true }
}
```

### Cell Comments
```javascript
// AS (Advance) - Green cell
comment: "Auto-filled from approved advance payment requests. You can edit this value if needed."

// User Input columns (Yellow cells)
comment: "USER INPUT REQUIRED - Please fill this column"
```

---

## 🔧 API Endpoints

### 1. Download Template
**Endpoint**: `GET /api/payroll/generate-template`

**Query Parameters**:
- `month` (required): 1-12
- `year` (required): e.g., 2024
- `departmentId` (optional): Filter by department
- `branchId` (optional): Filter by branch
- `employeeId` (optional): Single employee

**Response**: Excel file download

**Logic**:
1. Fetch employees based on filters
2. Fetch attendance data (R, S)
3. Fetch approved advances (AS)
4. Generate Excel with:
   - Auto-filled columns (A-P, Q, R, S, AS)
   - Styled cells (colors, comments)
   - Empty calculation columns
5. Return Excel file

---

### 2. Upload & Calculate
**Endpoint**: `POST /api/payroll/calculate-from-template`

**Body**: FormData with Excel file

**Response**: Excel file download (final calculated sheet)

**Logic**:
1. Parse uploaded Excel
2. Validate user inputs (T, V, Y-AC, AS, AT)
3. Calculate all formulas (U, W, X, AD-AN, AR-AY, BC-BP)
4. Generate final Excel with all 68 columns populated
5. Return Excel file for download

**Note**: No duplicate checking here - that happens in Step 2 (Non-Compliance Bulk Import)

---

### 3. Import to Database (Non-Compliance Bulk Import - Enhanced)
**Endpoint**: `POST /api/payroll/import-non-compliance` (existing endpoint, enhanced)

**Body**: FormData with final calculated Excel file

**Response**: 
```json
{
  "success": true,
  "duplicates": [
    {
      "employeeId": 123,
      "employeeCode": "EMP001",
      "employeeName": "John Doe",
      "month": 1,
      "year": 2024,
      "existingData": {
        "netPay": 15000,
        "advance": 2000,
        "createdAt": "2024-01-15"
      },
      "newData": {
        "netPay": 16500,
        "advance": 2500
      }
    }
  ],
  "sessionId": "abc123"
}
```

**Logic**:
1. Parse uploaded Excel
2. Check for existing PayrollItem records (same employee+month+year)
3. If duplicates found:
   - Return duplicate list with existing vs new data
   - Store uploaded data in temp session
   - Wait for user decision
4. If no duplicates:
   - Create PayrollRun and PayrollItem records
   - Return success

---

### 4. Handle Duplicates & Import
**Endpoint**: `POST /api/payroll/import-with-duplicates`

**Body**:
```json
{
  "sessionId": "abc123",
  "duplicateAction": "update_all" | "keep_all" | "custom",
  "customActions": {
    "123": "update",
    "456": "keep"
  }
}
```

**Response**: 
```json
{
  "success": true,
  "imported": 45,
  "updated": 3,
  "skipped": 2
}
```

**Logic**:
1. Retrieve uploaded data from session
2. Apply duplicate actions:
   - "update": Update existing PayrollItem
   - "keep": Skip this employee
3. Create/update PayrollRun and PayrollItem records
4. Return summary

---

## 📐 Calculation Formulas

### Detailed Earnings (Q-X)
```javascript
// U: ACTUAL EARN WAGES
U = Math.round(Q / 24 * (R + T));

// W: ACTUAL OT AMOUNT
W = Math.round((Q / Z / 8) * (V + (S * 8)));

// X: GROSS EARN WAGES
X = U + W;
```

### Payroll Calculation (Y-AN)
```javascript
// AD: WAGES/MONTH (hardcoded 26)
AD = Y * 26;

// AE: EARN WAGES
AE = Y * AB;

// AF: PH AMOUNT
AF = Y * AC;

// AG: TOTAL EARN WAGES
AG = AE + AF;

// AH: OT HRS PAYMENT (2x hourly rate)
AH = Math.round((Y / 8) * AA * 2);

// AI: TOTAL NETT PAYBLE
AI = AG + AH;

// AJ: EPF (12%)
AJ = Math.ceil(AG * 0.12);

// AK: ESIC (0.75%)
AK = Math.ceil(AG * 0.0075);

// AL: PT (threshold ₹13,300)
AL = AI > 13300 ? 125 : 0;

// AM: TOTAL DEDUCTION
AM = AJ + AK + AL;

// AN: NETT PAYBLE
AN = AI - AM;
```

### Non-Compliance (AR-AV)
```javascript
// AR: TOTAL NON COMPLIANCE AMOUNT
AR = X - AM - AN;

// AS: ADVANCE (from user input/auto-filled)
// AT: ARREARS (from user input)

// AU: NETT PAYBLE NON COMPLIANCE
AU = AR - AS + AT;

// AV: GRAND TOTAL NETT PAYBLE SALARY
AV = AN + AU;
```

### Leave & Bonus (AX-AY)
```javascript
// AX: LEAVE
AX = Math.round((AB / 20) * (AD / 26));

// AY: BONUS (8.33%)
AY = Math.round(AE * 0.0833);
```

### Compliance Breakdown (BC-BL)
```javascript
// BC: MONTHLY BASIC SALARY
BC = AE;

// BD: PH AMOUNT
BD = AF;

// BE: OT AMOUNT
BE = W;

// BF: EARN SALARY
BF = BC + BD + BE;

// BL: TOTAL SALARY
BL = X;

// Allowance pool
const allowancePool = BL - BF;

// BG: HRA (25%)
BG = Math.round(allowancePool * 0.25);

// BH: Site Allow (24%)
BH = Math.round(allowancePool * 0.24);

// BI: LTA (20%)
BI = Math.round(allowancePool * 0.20);

// BJ: Special Allow (13%)
BJ = Math.round(allowancePool * 0.13);

// BK: Attendance Allow (18%)
BK = Math.round(allowancePool * 0.18);
```

### Compliance Deductions (BM-BP)
```javascript
// BM: EPF
BM = AJ;

// BN: ESIC
BN = AK;

// BO: TDS/PT
BO = AL;

// BP: ADVANCE
BP = AS;
```

---

## 🔄 Duplicate Handling Flow (in Non-Compliance Bulk Import)

### Detection
When user uploads final calculated Excel to "Non-Compliance Bulk Import":
1. System parses Excel
2. Extracts employee IDs, month, year
3. Queries database for existing PayrollItem records
4. If found, shows duplicate dialog

### UI Dialog
```
┌─────────────────────────────────────────────────────────┐
│  Duplicate Records Found                                │
├─────────────────────────────────────────────────────────┤
│  The following employees already have salary data for   │
│  January 2024:                                          │
│                                                         │
│  ☑ EMP001 - John Doe                                   │
│     Existing: ₹15,000 | New: ₹16,500                   │
│                                                         │
│  ☑ EMP002 - Jane Smith                                 │
│     Existing: ₹18,000 | New: ₹18,500                   │
│                                                         │
│  ☑ EMP003 - Bob Johnson                                │
│     Existing: ₹12,000 | New: ₹12,500                   │
│                                                         │
│  What would you like to do?                            │
│                                                         │
│  [Update All]  [Keep All]  [Choose Individually]       │
└─────────────────────────────────────────────────────────┘
```

### Individual Choice Dialog
```
┌─────────────────────────────────────────────────────────┐
│  Employee: EMP001 - John Doe                           │
│  Month/Year: January 2024                              │
├─────────────────────────────────────────────────────────┤
│  Existing Data:                                         │
│  - Net Pay: ₹15,000                                    │
│  - Advance: ₹2,000                                     │
│  - Arrears: ₹0                                         │
│  - Created: 2024-01-15 10:30 AM                        │
│                                                         │
│  New Data:                                             │
│  - Net Pay: ₹16,500                                    │
│  - Advance: ₹2,500                                     │
│  - Arrears: ₹500                                       │
│                                                         │
│  [Update]  [Keep Existing]  [Apply to All Remaining]  │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Temporary Session Storage
```prisma
model PayrollUploadSession {
  id          String   @id @default(cuid())
  data        Json     // Uploaded Excel data
  month       Int
  year        Int
  duplicates  Json     // List of duplicate employee IDs
  createdAt   DateTime @default(now())
  expiresAt   DateTime // Auto-delete after 1 hour
}
```

---

## 📝 Implementation Checklist

### Backend
- [ ] Create `/api/payroll/generate-template` endpoint
- [ ] Implement auto-fill logic (A-P, Q, R, S, AS)
- [ ] Add Excel styling (colors, comments, protection)
- [ ] Create `/api/payroll/calculate-from-template` endpoint
- [ ] Implement Excel parsing and validation
- [ ] Add duplicate detection logic
- [ ] Implement all calculation formulas
- [ ] Create `/api/payroll/calculate-with-duplicates` endpoint
- [ ] Add session management for temp data storage
- [ ] Implement advance fetching from EmployeeRequest

### Frontend
- [ ] Add "Download Template" button in Payroll module
- [ ] Add "Upload & Calculate" button
- [ ] Create duplicate handling dialog
- [ ] Add individual choice dialog
- [ ] Implement file upload with progress
- [ ] Add validation error display
- [ ] Show calculation success message
- [ ] Auto-download final Excel

### Testing
- [ ] Test template generation with various filters
- [ ] Test auto-fill accuracy (attendance, advance)
- [ ] Test user input validation
- [ ] Test all calculation formulas
- [ ] Test duplicate detection
- [ ] Test update/keep actions
- [ ] Test final Excel format
- [ ] Test import to database

---

## 🎯 Success Criteria

1. ✅ Template downloads with correct auto-filled data
2. ✅ User input columns are clearly marked (yellow)
3. ✅ Advance is auto-filled but editable (green)
4. ✅ Upload validates all required inputs
5. ✅ All formulas calculate correctly
6. ✅ Duplicate detection works accurately
7. ✅ User can choose update/keep for each duplicate
8. ✅ Final Excel matches non-compliance format exactly
9. ✅ Final Excel imports successfully to database

---

## 📚 Related Documentation

- [NON_COMPLIANCE_SALARY_SHEET_COMPLETE_GUIDE.md](./NON_COMPLIANCE_SALARY_SHEET_COMPLETE_GUIDE.md)
- [ADVANCE_ARREARS_INTEGRATION_GUIDE.md](./ADVANCE_ARREARS_INTEGRATION_GUIDE.md)
- [SALARY_SHEET_COLUMN_ANALYSIS.md](./SALARY_SHEET_COLUMN_ANALYSIS.md)

