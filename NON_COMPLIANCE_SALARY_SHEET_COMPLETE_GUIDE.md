# Non-Compliance Salary Sheet - Complete Column Guide (A to BP)

## Overview

This document provides detailed information for each column in `excels/non_compliance_Salary_sheet_marked.xlsx` from column A to BP (68 columns total).

**User Provides:**
- **T**: PH DAYS (Public Holiday days)
- **V**: ACTUAL OT HRS (Actual overtime hours)
- **Y to AC**: BASIC WAGES/DAY, MONTHLY WORKING DAYS, OT. HRS, ATTENDANCE, PH (5 input values)

---

## 📋 Column-by-Column Details

### Section 1: Personal Details (A-P) - 16 Columns

| Column | Name | Source | Fetch From | Notes |
|--------|------|--------|------------|-------|
| **A** | SL NO. | Auto-generated | - | Row number (1, 2, 3...) |
| **B** | WORKMEN SL. NO. | Database | `Employee.workmenSlNo` | Can be null |
| **C** | TOKEN NO. | Database | `Employee.tokenNumber` | Unique identifier, can be null |
| **D** | NAME OF EMPLOYEE | Database | `Employee.firstName + ' ' + Employee.lastName` | Concatenate first and last name |
| **E** | FATHER'S NAME | Database | `Employee.fatherName` | Can be null |
| **F** | DOJ | Database | `Employee.dateOfJoining` | Date of Joining |
| **G** | DOB | Database | `Employee.dateOfBirth` | Date of Birth |
| **H** | BANK NAME | Database | `Employee.bankName` | Can be null |
| **I** | ACCOUNT NO. | Database | `Employee.bankAccount` | Can be null |
| **J** | IFSC CODE NO. | Database | `Employee.bankIfsc` | Can be null |
| **K** | - | Empty | - | Not used |
| **L** | UAN NO. | Database | `Employee.uanNumber` | Universal Account Number |
| **M** | ESIC IP NO | Database | `Employee.esicNumber` | ESIC Insurance Number |
| **N** | DESIGNATION | Database | `Employee.Designation.name` | From Designation relation |
| **O** | DEPARTMENT | Database | `Employee.Department.name` | From Department relation |
| **P** | NATURE OF DESIGNATION | Database | `Employee.natureOfDesignation` | Skilled/Unskilled/Semi-skilled |

---

### Section 2: Detailed Earnings (Q-X) - 8 Columns

**Purpose**: Detailed breakdown based on monthly gross salary and actual attendance

| Column | Name | Type | Source/Formula | Notes |
|--------|------|------|----------------|-------|
| **Q** | MONTHLY GROSS SALARY | Database | `Employee.monthlyGrossSalary` | Base monthly salary |
| **R** | ACTUAL ATTENDANCE | Input/Fetch | `COUNT(AttendanceLog WHERE status='present')` | Number of days present |
| **S** | EXTRA DAYS | Input/Fetch | `COUNT(AttendanceLog WHERE extraDay=true)` | Overtime/extra working days |
| **T** | PH DAYS | **USER INPUT** | Provided by user | Public holidays in month |
| **U** | ACTUAL EARN WAGES | Calculated | `=ROUND(Q/24*(R+T), 0)` | Earnings based on attendance + PH |
| **V** | ACTUAL OT HRS | **USER INPUT** | Provided by user | Actual overtime hours worked |
| **W** | ACTUAL OT AMOUNT | Calculated | `=ROUND((Q/Z/8)*(V+(S*8)), 0)` | OT payment based on hourly rate |
| **X** | GROSS EARN WAGES | Calculated | `=U+W` | Total gross earnings (U + W) |

**Formulas:**
```excel
U = ROUND(Q/24 * (R+T), 0)
W = ROUND((Q/Z/8) * (V+(S*8)), 0)
X = U + W
```

---

### Section 3: Payroll Calculation (Y-AN) - 16 Columns

**Purpose**: Final payroll with earnings, deductions, and net payable

#### Input Values (Y-AC) - 5 Columns

| Column | Name | Type | Source | Notes |
|--------|------|------|--------|-------|
| **Y** | BASIC WAGES/DAY | **USER INPUT** | Provided by user | Daily wage rate |
| **Z** | MONTHLY WORKING DAYS | **USER INPUT** | Provided by user | Standard working days (e.g., 24, 26) |
| **AA** | OT. HRS | **USER INPUT** | Provided by user | Overtime hours |
| **AB** | ATTENDANCE | **USER INPUT** | Provided by user | Days present |
| **AC** | PH | **USER INPUT** | Provided by user | Public holidays worked |

#### Earnings Calculations (AD-AI) - 6 Columns

| Column | Name | Formula | Example (Y=612, AB=20, AC=1, AA=17) |
|--------|------|---------|-------------------------------------|
| **AD** | WAGES/MONTH | `=Y*26` | 612 × 26 = 15,912 |
| **AE** | EARN WAGES | `=Y*AB` | 612 × 20 = 12,240 |
| **AF** | PH AMOUNT | `=Y*AC` | 612 × 1 = 612 |
| **AG** | TOTAL EARN WAGES | `=AE+AF` | 12,240 + 612 = 12,852 |
| **AH** | OT HRS PAYMENT | `=ROUND((Y/8)*AA*2, 0)` | ROUND((612/8) × 17 × 2, 0) = 2,601 |
| **AI** | TOTAL NETT PAYBLE | `=SUM(AG:AH)` or `=AG+AH` | 12,852 + 2,601 = 15,453 |

**Key Notes:**
- **AD** uses hardcoded 26 days (not Z)
- **AH** OT rate is 2x hourly rate (hourly = Y/8)

#### Deductions (AJ-AM) - 4 Columns

| Column | Name | Formula | Example | Notes |
|--------|------|---------|---------|-------|
| **AJ** | EPF | `=ROUNDUP(AG*0.12, 0)` | ROUNDUP(12,852 × 0.12, 0) = 1,543 | 12% of Total Earn Wages |
| **AK** | ESIC | `=ROUNDUP(AG*0.0075, 0)` | ROUNDUP(12,852 × 0.0075, 0) = 97 | 0.75% of Total Earn Wages |
| **AL** | PT | `=IF(AI>13300, 125, 0)` | IF(15,453 > 13,300, 125, 0) = 125 | Professional Tax (threshold ₹13,300) |
| **AM** | TOTAL DEDUCTION | `=SUM(AJ:AL)` or `=AJ+AK+AL` | 1,543 + 97 + 125 = 1,765 | Sum of all deductions |

**Key Constants:**
- EPF Rate: 12% (0.12)
- ESIC Rate: 0.75% (0.0075)
- PT Threshold: ₹13,300
- PT Amount: ₹125

#### Net Payable (AN) - 1 Column

| Column | Name | Formula | Example |
|--------|------|---------|---------|
| **AN** | NETT PAYBLE | `=AI-AM` | 15,453 - 1,765 = 13,688 |

---

### Section 4: Signature & Non-Compliance (AO-AV) - 8 Columns

| Column | Name | Type | Formula/Source | Notes |
|--------|------|------|----------------|-------|
| **AO** | EMPLOYEE SIGNATURE/THUMB IMPRESSION | Empty | - | For physical signature |
| **AP** | - | Empty | - | Not used |
| **AQ** | - | Empty | - | Not used |
| **AR** | TOTAL NON COMPLIANCE AMOUNT | Calculated | `=X-AM-AN` | Difference between gross (X) and compliance net (AN) |
| **AS** | ADVANCE | Database/Input | Fetch from `EmployeeRequest` (approved advance_payment) OR user input | Advance payment deduction |
| **AT** | ARREARS | **USER INPUT** | Provided by user | Arrears to be paid (previous month dues) |
| **AU** | NETT PAYBLE NON COMPLIANCE | Calculated | `=AR-AS+AT` | Non-compliance net after advance/arrears |
| **AV** | GRAND TOTAL NETT PAYBLE SALARY | Calculated | `=AN+AU` | Final total payable (compliance + non-compliance) |

**Formula Breakdown:**
```excel
AR = X - AM - AN
    = Gross Earn Wages - Total Deduction - Compliance Net Payable
    = Non-compliance earnings after deductions

AU = AR - AS + AT
    = Non-compliance amount - Advance + Arrears

AV = AN + AU
    = Compliance Net + Non-compliance Net
    = Grand Total
```

---

### Section 5: Leave & Bonus (AW-AY) - 3 Columns

| Column | Name | Type | Formula/Source | Notes |
|--------|------|------|----------------|-------|
| **AW** | - | Helper | `=MATCH(D2, Sheet1!$D$2:$D$83, 0)` | Lookup helper (not displayed) |
| **AX** | LEAVE | Calculated | `=ROUND((AB/20)*(AD/26), 0)` | Leave encashment calculation |
| **AY** | BONUS | Calculated | `=ROUND(AE*8.33%, 0)` or `=ROUND(AE*0.0833, 0)` | Bonus = 8.33% of Earn Wages |

**Formula Breakdown:**
```excel
AX = ROUND((AB/20) * (AD/26), 0)
    = Attendance ratio × Daily wage × Days
    = Leave encashment based on attendance

AY = ROUND(AE × 0.0833, 0)
    = 8.33% of Earn Wages
    = Statutory bonus
```

---

### Section 6: Empty Columns (AZ-BB) - 3 Columns

| Column | Name | Type | Notes |
|--------|------|------|-------|
| **AZ** | - | Empty | Not used |
| **BA** | - | Empty | Not used |
| **BB** | - | Empty | Not used |

---

### Section 7: Compliance Breakdown (BC-BL) - 10 Columns

**Purpose**: Detailed breakdown of compliance salary components

#### Earnings Components (BC-BF) - 4 Columns

| Column | Name | Formula | Notes |
|--------|------|---------|-------|
| **BC** | MONTHLY BASIC SALARY | `=AE` | Same as Earn Wages (Y × AB) |
| **BD** | PH AMOUNT | `=AF` | Same as PH Amount (Y × AC) |
| **BE** | OT AMOUNT | `=W` | Actual OT Amount from column W |
| **BF** | EARN SALARY | `=SUM(BC, BD, BE)` or `=BC+BD+BE` | Total earnings |

#### Allowances (BG-BK) - 5 Columns

All allowances are calculated as percentages of **(BL - BF)** where:
- **BL** = Total Salary (from column X)
- **BF** = Earn Salary (basic + PH + OT)
- **(BL - BF)** = Allowance pool

| Column | Name | Formula | Percentage | Notes |
|--------|------|---------|------------|-------|
| **BG** | MONTHLY House Rent Allow. | `=ROUND((BL-BF)*0.25, 0)` | 25% | HRA |
| **BH** | Monthly Site Allow. | `=ROUND((BL-BF)*0.24, 0)` | 24% | Site allowance |
| **BI** | Monthly Leave Travel Allow. | `=ROUND((BL-BF)*0.20, 0)` | 20% | LTA |
| **BJ** | Monthly Special Allow. | `=ROUND((BL-BF)*0.13, 0)` | 13% | Special allowance |
| **BK** | MonthlyAttendence Allow. | `=ROUND((BL-BF)*0.18, 0)` | 18% | Attendance allowance |

**Total Allowance Percentage**: 25% + 24% + 20% + 13% + 18% = **100%**

#### Total Salary (BL) - 1 Column

| Column | Name | Formula | Notes |
|--------|------|---------|-------|
| **BL** | TOTAL SALARY | `=X` | Same as Gross Earn Wages (column X) |

**Verification:**
```
BL = BF + BG + BH + BI + BJ + BK
   = Earn Salary + All Allowances
   = Should equal X (Gross Earn Wages)
```

---

### Section 8: Compliance Deductions (BM-BP) - 4 Columns

| Column | Name | Formula | Notes |
|--------|------|---------|-------|
| **BM** | EPF | `=AJ` | Same as EPF from column AJ |
| **BN** | ESIC | `=AK` | Same as ESIC from column AK |
| **BO** | TDS | `=AL` | Same as PT from column AL (labeled as TDS) |
| **BP** | ADVANCE | `=AS` | Same as Advance from column AS |

---

## 📊 Complete Data Flow Summary

### Step 1: Fetch Employee Personal Details (A-P)
```typescript
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    Department: true,
    Designation: true,
    Branch: true
  }
});

// Map to columns A-P
const personalDetails = {
  A: rowNumber,  // Auto-generated
  B: employee.workmenSlNo,
  C: employee.tokenNumber,
  D: `${employee.firstName} ${employee.lastName}`,
  E: employee.fatherName,
  F: employee.dateOfJoining,
  G: employee.dateOfBirth,
  H: employee.bankName,
  I: employee.bankAccount,
  J: employee.bankIfsc,
  K: null,  // Empty
  L: employee.uanNumber,
  M: employee.esicNumber,
  N: employee.Designation.name,
  O: employee.Department.name,
  P: employee.natureOfDesignation,
};
```

### Step 2: Fetch/Calculate Detailed Earnings (Q-X)
```typescript
// Q: From database
const Q = employee.monthlyGrossSalary;

// R: Fetch from AttendanceLog
const R = await prisma.attendanceLog.count({
  where: {
    employeeId: employeeId,
    logDate: { gte: monthStart, lte: monthEnd },
    status: 'present'
  }
});

// S: Fetch extra days (if tracked)
const S = await prisma.attendanceLog.count({
  where: {
    employeeId: employeeId,
    logDate: { gte: monthStart, lte: monthEnd },
    isExtraDay: true  // Assuming this field exists
  }
});

// T: USER INPUT (provided)
const T = userInput.phDays;

// U: Calculate
const U = Math.round(Q / 24 * (R + T));

// V: USER INPUT (provided)
const V = userInput.actualOtHrs;

// Z: USER INPUT (provided - needed for W calculation)
const Z = userInput.monthlyWorkingDays;

// W: Calculate
const W = Math.round((Q / Z / 8) * (V + (S * 8)));

// X: Calculate
const X = U + W;
```

### Step 3: Get User Inputs (Y-AC)
```typescript
const userInputs = {
  Y: userInput.basicWagesPerDay,      // e.g., 612
  Z: userInput.monthlyWorkingDays,    // e.g., 24
  AA: userInput.otHours,              // e.g., 17
  AB: userInput.attendance,           // e.g., 20
  AC: userInput.ph,                   // e.g., 1
};
```

### Step 4: Calculate Payroll (AD-AN)
```typescript
// Earnings
const AD = Y * 26;  // Hardcoded 26
const AE = Y * AB;
const AF = Y * AC;
const AG = AE + AF;
const AH = Math.round((Y / 8) * AA * 2);
const AI = AG + AH;

// Deductions
const AJ = Math.ceil(AG * 0.12);  // ROUNDUP
const AK = Math.ceil(AG * 0.0075);  // ROUNDUP
const AL = AI > 13300 ? 125 : 0;
const AM = AJ + AK + AL;

// Net Payable
const AN = AI - AM;
```

### Step 5: Calculate Non-Compliance (AR-AV)
```typescript
const AR = X - AM - AN;  // Non-compliance amount

// AS: Fetch approved advance payments from EmployeeRequest system
const AS = await fetchApprovedAdvance(employeeId, month, year);

// AT: User input for arrears
const AT = userInput.arrears || 0;

const AU = AR - AS + AT;  // Net non-compliance
const AV = AN + AU;  // Grand total
```

#### Fetching Approved Advance (AS)
```typescript
async function fetchApprovedAdvance(
  employeeId: number, 
  month: number, 
  year: number
): Promise<number> {
  // Get all approved advance_payment requests for this employee in this month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const approvedAdvances = await prisma.employeeRequest.findMany({
    where: {
      employeeId: employeeId,
      requestType: 'advance_payment',
      status: 'approved',
      approvedDate: {
        gte: monthStart,
        lte: monthEnd
      },
      isDeleted: false
    },
    select: {
      amount: true
    }
  });
  
  // Sum all approved advance amounts
  const totalAdvance = approvedAdvances.reduce(
    (sum, req) => sum + (req.amount ? parseFloat(req.amount.toString()) : 0), 
    0
  );
  
  return totalAdvance;
}
```

**Alternative: Manual Override**
If user wants to manually specify advance amount (e.g., for corrections):
```typescript
const AS = userInput.advance !== undefined 
  ? userInput.advance 
  : await fetchApprovedAdvance(employeeId, month, year);
```

### Step 6: Calculate Leave & Bonus (AX-AY)
```typescript
const AX = Math.round((AB / 20) * (AD / 26));  // Leave
const AY = Math.round(AE * 0.0833);  // Bonus (8.33%)
```

### Step 7: Calculate Compliance Breakdown (BC-BL)
```typescript
// Earnings
const BC = AE;  // Monthly Basic Salary
const BD = AF;  // PH Amount
const BE = W;   // OT Amount
const BF = BC + BD + BE;  // Earn Salary

// Total Salary
const BL = X;  // Gross Earn Wages

// Allowances (based on BL - BF)
const allowancePool = BL - BF;
const BG = Math.round(allowancePool * 0.25);  // HRA (25%)
const BH = Math.round(allowancePool * 0.24);  // Site (24%)
const BI = Math.round(allowancePool * 0.20);  // LTA (20%)
const BJ = Math.round(allowancePool * 0.13);  // Special (13%)
const BK = Math.round(allowancePool * 0.18);  // Attendance (18%)
```

### Step 8: Map Compliance Deductions (BM-BP)
```typescript
const BM = AJ;  // EPF
const BN = AK;  // ESIC
const BO = AL;  // TDS/PT
const BP = AS;  // Advance
```

---

## 🎯 Implementation Checklist

### Required User Inputs (7 values)
- [ ] **T**: PH DAYS (Public holidays)
- [ ] **V**: ACTUAL OT HRS (Actual overtime hours)
- [ ] **Y**: BASIC WAGES/DAY
- [ ] **Z**: MONTHLY WORKING DAYS
- [ ] **AA**: OT. HRS
- [ ] **AB**: ATTENDANCE
- [ ] **AC**: PH (Public holidays worked)

### Optional User Inputs (2 values)
- [ ] **AS**: ADVANCE (can fetch from EmployeeRequest system OR user input)
- [ ] **AT**: ARREARS (user input - previous month dues)

### Database Fetches
- [ ] Employee personal details (16 fields: A-P)
- [ ] Monthly gross salary (Q)
- [ ] Actual attendance count (R) - from AttendanceLog
- [ ] Extra days count (S) - from AttendanceLog

### Calculations
- [ ] Detailed earnings (U, W, X) - 3 columns
- [ ] Payroll earnings (AD-AI) - 6 columns
- [ ] Deductions (AJ-AM) - 4 columns
- [ ] Net payable (AN) - 1 column
- [ ] Non-compliance (AR, AU, AV) - 3 columns
- [ ] Leave & Bonus (AX, AY) - 2 columns
- [ ] Compliance breakdown (BC-BK) - 10 columns
- [ ] Compliance deductions (BM-BP) - 4 columns

### Total Columns: 68 (A to BP)
- **16** Personal details (fetch from DB)
- **7** User inputs (T, V, Y-AC)
- **2** Optional inputs (AS, AT)
- **43** Calculated columns

---

## 💡 Key Formulas Reference

### Earnings
```excel
AD = Y × 26                          // Wages/Month (hardcoded 26)
AE = Y × AB                          // Earn Wages
AF = Y × AC                          // PH Amount
AG = AE + AF                         // Total Earn Wages
AH = ROUND((Y/8) × AA × 2, 0)       // OT Payment (2x hourly rate)
AI = AG + AH                         // Total Nett Payable
```

### Deductions
```excel
AJ = ROUNDUP(AG × 0.12, 0)          // EPF (12%)
AK = ROUNDUP(AG × 0.0075, 0)        // ESIC (0.75%)
AL = IF(AI > 13300, 125, 0)         // PT (threshold ₹13,300)
AM = AJ + AK + AL                    // Total Deduction
```

### Net Payable
```excel
AN = AI - AM                         // Compliance Net Payable
```

### Detailed Earnings
```excel
U = ROUND(Q/24 × (R+T), 0)          // Actual Earn Wages
W = ROUND((Q/Z/8) × (V+(S×8)), 0)   // Actual OT Amount
X = U + W                            // Gross Earn Wages
```

### Non-Compliance
```excel
AR = X - AM - AN                     // Non-compliance Amount
AU = AR - AS + AT                    // Net Non-compliance
AV = AN + AU                         // Grand Total
```

### Leave & Bonus
```excel
AX = ROUND((AB/20) × (AD/26), 0)    // Leave
AY = ROUND(AE × 0.0833, 0)          // Bonus (8.33%)
```

### Allowances
```excel
BF = BC + BD + BE                    // Earn Salary
BG = ROUND((BL-BF) × 0.25, 0)       // HRA (25%)
BH = ROUND((BL-BF) × 0.24, 0)       // Site (24%)
BI = ROUND((BL-BF) × 0.20, 0)       // LTA (20%)
BJ = ROUND((BL-BF) × 0.13, 0)       // Special (13%)
BK = ROUND((BL-BF) × 0.18, 0)       // Attendance (18%)
BL = X                               // Total Salary
```

---

## 🔍 Constants Used

| Constant | Value | Used In |
|----------|-------|---------|
| Working Days (hardcoded) | 26 | AD (Wages/Month) |
| Hours per Day | 8 | AH, W (OT calculations) |
| OT Multiplier | 2 | AH (OT Payment) |
| EPF Rate | 12% (0.12) | AJ |
| ESIC Rate | 0.75% (0.0075) | AK |
| PT Threshold | ₹13,300 | AL |
| PT Amount | ₹125 | AL |
| Bonus Rate | 8.33% (0.0833) | AY |
| HRA % | 25% (0.25) | BG |
| Site Allow % | 24% (0.24) | BH |
| LTA % | 20% (0.20) | BI |
| Special Allow % | 13% (0.13) | BJ |
| Attendance Allow % | 18% (0.18) | BK |

---

## 📝 Notes

1. **Column Z (Monthly Working Days)** is provided as input but:
   - Used in **W** formula (Actual OT Amount)
   - **NOT used** in AD formula (uses hardcoded 26)

2. **Two Calculation Methods**:
   - **Q-X**: Detailed earnings based on monthly gross salary
   - **Y-AN**: Final payroll based on daily wages

3. **Allowances** (BG-BK) sum to 100% of the allowance pool (BL - BF)

4. **Rounding**:
   - EPF, ESIC: Use `ROUNDUP` (always round up)
   - OT, Leave, Bonus, Allowances: Use `ROUND` (round to nearest)

5. **Empty Columns**: K, AP, AQ, AZ, BA, BB are not used

6. **Helper Column**: AW contains a MATCH formula (not displayed in final sheet)

---

## 📚 Employee Request System Integration

### Overview

The **ADVANCE** column (AS) is linked to the Employee Request & Approval system in your application. This system allows employees to request advance payments which go through an approval workflow before being deducted from their salary.

### EmployeeRequest Model

```prisma
model EmployeeRequest {
  id            Int      @id @default(autoincrement())
  employeeId    Int
  requestType   String                        // "general" | "advance_payment"
  subject       String
  description   String
  amount        Decimal? @db.Decimal(15, 2)   // only for advance_payment
  status        String   @default("pending")  // pending | approved | rejected
  currentStep   Int      @default(1)          // which approval step we're waiting on
  approvedBy    Int?
  approvedDate  DateTime?
  rejectedBy    Int?
  rejectedDate  DateTime?
  rejectionNote String?
  isDeleted     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime

  Employee      Employee @relation(fields: [employeeId], references: [id])
}
```

### Request Types

1. **general**: General employee requests (not related to salary)
2. **advance_payment**: Advance salary payment requests (linked to column AS)

### Approval Workflow

The system supports multi-level approval chains:

1. **Level-1 Employees**: Requests go directly to admin for approval
2. **Level-2+ Employees**: Requests follow a defined approval chain based on their role
   - Each step requires approval from a specific role
   - After all steps are approved, the request is marked as "approved"
   - Admin approval is optional for Level-2+ employees (only their direct manager approval is required)

### Fetching Approved Advances for Salary Sheet

#### Method 1: Fetch All Approved Advances for the Month

```typescript
async function getEmployeeAdvanceForMonth(
  employeeId: number,
  month: number,
  year: number
): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const approvedAdvances = await prisma.employeeRequest.findMany({
    where: {
      employeeId: employeeId,
      requestType: 'advance_payment',
      status: 'approved',
      approvedDate: {
        gte: monthStart,
        lte: monthEnd
      },
      isDeleted: false
    },
    select: {
      id: true,
      subject: true,
      amount: true,
      approvedDate: true
    }
  });
  
  // Sum all approved advance amounts
  const totalAdvance = approvedAdvances.reduce(
    (sum, req) => sum + (req.amount ? parseFloat(req.amount.toString()) : 0), 
    0
  );
  
  return totalAdvance;
}
```

#### Method 2: Fetch with Manual Override Option

```typescript
async function getAdvanceAmount(
  employeeId: number,
  month: number,
  year: number,
  manualOverride?: number
): Promise<{ amount: number; source: 'manual' | 'system'; details?: any[] }> {
  // If manual override is provided, use it
  if (manualOverride !== undefined && manualOverride !== null) {
    return {
      amount: manualOverride,
      source: 'manual'
    };
  }
  
  // Otherwise, fetch from system
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const approvedAdvances = await prisma.employeeRequest.findMany({
    where: {
      employeeId: employeeId,
      requestType: 'advance_payment',
      status: 'approved',
      approvedDate: {
        gte: monthStart,
        lte: monthEnd
      },
      isDeleted: false
    },
    select: {
      id: true,
      subject: true,
      amount: true,
      approvedDate: true
    }
  });
  
  const totalAdvance = approvedAdvances.reduce(
    (sum, req) => sum + (req.amount ? parseFloat(req.amount.toString()) : 0), 
    0
  );
  
  return {
    amount: totalAdvance,
    source: 'system',
    details: approvedAdvances
  };
}
```

### Usage in Salary Sheet Generation

```typescript
// In your salary sheet generation API
async function generateSalarySheet(
  employeeIds: number[],
  month: number,
  year: number,
  userInputs: {
    [employeeId: number]: {
      // ... other inputs (Y, Z, AA, AB, AC, T, V)
      advanceOverride?: number;  // Optional manual override
      arrears?: number;          // User input for arrears
    }
  }
) {
  const salaryData = [];
  
  for (const employeeId of employeeIds) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { Department: true, Designation: true, Branch: true }
    });
    
    if (!employee) continue;
    
    const inputs = userInputs[employeeId] || {};
    
    // ... calculate columns A-AN (personal details, earnings, deductions)
    
    // Fetch or use manual advance amount
    const advanceData = await getAdvanceAmount(
      employeeId, 
      month, 
      year, 
      inputs.advanceOverride
    );
    
    const AS = advanceData.amount;  // ADVANCE
    const AT = inputs.arrears || 0;  // ARREARS (user input)
    
    // Calculate non-compliance columns
    const AR = X - AM - AN;  // TOTAL NON COMPLIANCE AMOUNT
    const AU = AR - AS + AT;  // NETT PAYBLE NON COMPLIANCE
    const AV = AN + AU;       // GRAND TOTAL NETT PAYBLE SALARY
    
    salaryData.push({
      // ... all columns A-BP
      AS: AS,
      AT: AT,
      AR: AR,
      AU: AU,
      AV: AV,
      advanceSource: advanceData.source,  // Track if manual or system
      advanceDetails: advanceData.details  // For audit trail
    });
  }
  
  return salaryData;
}
```

### API Endpoints

#### Get Approved Advances for Employee
```typescript
// GET /api/employee-requests?employeeId=123&requestType=advance_payment&status=approved
```

#### Create Advance Payment Request
```typescript
// POST /api/employee-requests
{
  "employeeId": 123,
  "requestType": "advance_payment",
  "subject": "Advance for Medical Emergency",
  "description": "Need advance payment for medical treatment",
  "amount": 5000
}
```

#### Approve/Reject Request
```typescript
// PATCH /api/employee-requests
{
  "id": 456,
  "action": "approve",  // or "reject"
  "approvedBy": 789,
  "rejectionNote": "Optional rejection reason"
}
```

### Best Practices

1. **Automatic Fetching**: By default, fetch approved advances from the system
2. **Manual Override**: Allow HR/Admin to manually override the advance amount if needed
3. **Audit Trail**: Log whether advance was fetched from system or manually entered
4. **Validation**: Ensure advance amount doesn't exceed employee's net payable
5. **Month Matching**: Only fetch advances approved in the salary month
6. **Arrears Tracking**: Maintain a separate system to track arrears (previous month dues)

### Example Workflow

1. **Employee submits advance request**:
   - Employee: "I need ₹5,000 advance for medical emergency"
   - System: Creates EmployeeRequest with `requestType: 'advance_payment'`, `amount: 5000`

2. **Approval chain processes request**:
   - Manager approves (if Level-2+ employee)
   - Admin approves (if Level-1 employee or final step)
   - Status changes to "approved"

3. **Salary sheet generation**:
   - System fetches all approved advances for the month
   - Calculates: `AS = SUM(approved advance amounts)`
   - Deducts from salary: `AU = AR - AS + AT`

4. **Employee receives salary**:
   - Net payable is reduced by advance amount
   - Payslip shows advance deduction

### Arrears (AT) - User Input

Unlike ADVANCE which can be fetched from the system, **ARREARS** is always a user input because:

1. **Previous Month Dues**: Arrears represent amounts owed from previous months
2. **Manual Tracking**: These are typically tracked manually or in a separate system
3. **Corrections**: May include salary corrections, bonuses, or other adjustments
4. **No Approval Workflow**: Arrears don't go through the request/approval system

**Arrears Input Example**:
```typescript
{
  employeeId: 123,
  arrears: 2500,  // ₹2,500 owed from previous month
  arrearsNote: "Bonus payment from last month"
}
```

---

## 🔗 System Integration Summary

| Column | Name | Data Source | Integration |
|--------|------|-------------|-------------|
| **AS** | ADVANCE | `EmployeeRequest` table | Fetch approved `advance_payment` requests OR manual override |
| **AT** | ARREARS | User Input | Manual entry by HR/Admin |

**Database Query for AS**:
```sql
SELECT SUM(amount) 
FROM EmployeeRequest 
WHERE employeeId = ? 
  AND requestType = 'advance_payment' 
  AND status = 'approved' 
  AND approvedDate BETWEEN ? AND ? 
  AND isDeleted = false
```

**User Input for AT**:
```typescript
// Provided by HR/Admin during salary sheet generation
const arrears = userInput.arrears || 0;
```

---

## ✅ Summary

**Total Columns**: 68 (A to BP)

**Data Sources**:
- **Database**: 17 columns (A-P, Q)
- **EmployeeRequest System**: 1 column (AS - Advance)
- **User Input**: 8 columns (T, V, Y-AC, AT)
- **Calculated**: 42 columns (U, W, X, AD-AN, AR, AU-AY, BC-BP)

**Key Sections**:
1. Personal Details (A-P)
2. Detailed Earnings (Q-X)
3. Payroll Calculation (Y-AN)
4. Non-Compliance (AR-AV) - **AS linked to EmployeeRequest system**
5. Leave & Bonus (AX-AY)
6. Compliance Breakdown (BC-BL)
7. Compliance Deductions (BM-BP)

**Important Integrations**:
- **AS (ADVANCE)**: Automatically fetched from approved `advance_payment` requests in EmployeeRequest table, with manual override option
- **AT (ARREARS)**: User input for previous month dues and corrections

**Related Documentation**:
- **[ADVANCE_ARREARS_INTEGRATION_GUIDE.md](./ADVANCE_ARREARS_INTEGRATION_GUIDE.md)** - Complete integration guide for Advance & Arrears columns

