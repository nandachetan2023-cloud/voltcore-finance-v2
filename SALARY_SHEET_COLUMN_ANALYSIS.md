# Salary Sheet vs Employee Template - Column Analysis

## Executive Summary

Comparing `excels/non_compliance_Salary_sheet_marked.xlsx` with `excels/employees.xlsx` (employee import template).

---

## 📋 Personal Detail Columns Comparison

### ✅ Columns PRESENT in Employee Template

| Salary Sheet Column | Employee Template Column | Can Fetch? | Notes |
|---------------------|-------------------------|------------|-------|
| A - SL NO. | - | ✅ Auto-generated | Row number (not stored in DB) |
| B - WORKMEN SL. NO. | D - Workmen Sl. No. | ✅ YES | 🆕 NEW field added |
| C - TOKEN NO. | C - Token Number | ✅ YES | 🆕 NEW field added (unique) |
| D - NAME OF EMPLOYEE | G - Name of Employee | ✅ YES | Concatenate firstName + lastName |
| E - FATHER'S NAME | I - Father's Name | ✅ YES | Direct mapping |
| F - DOJ | AB - Date of Joining | ✅ YES | Direct mapping |
| G - DOB | N - Date of Birth | ✅ YES | Direct mapping |
| H - BANK NAME | AE - Bank Name | ✅ YES | Direct mapping |
| I - ACCOUNT NO. | AG - Bank A/C No. | ✅ YES | Direct mapping |
| J - IFSC CODE NO. | AH - IFSC Code | ✅ YES | Direct mapping |
| L - UAN NO. | AJ - UAN | ✅ YES | Direct mapping |
| M - ESIC IP NO | AI - ESIC | ✅ YES | Direct mapping |
| N - DESIGNATION | W - Designation | ✅ YES | From Designation relation |
| O - DEPARTMENT | V - Department | ✅ YES | From Department relation |
| P - NATURE OF DESIGNATION | F - Nature of Designation | ✅ YES | 🆕 NEW field added |
| Q - MONTHLY GROSS SALARY | E - Monthly Gross Salary | ✅ YES | 🆕 NEW field added |

### ❌ Columns NO LONGER MISSING

All personal detail columns are now present in the employee template after adding the 4 new fields!

---

## 🧮 Salary Columns - Calculation Analysis

### Input Columns (Provided - Y, Z, AA, AB, AC)

| Column | Name | Source | Note |
|--------|------|--------|------|
| Y | BASIC WAGES/DAY | 📥 **PROVIDED** (input from user) | Used in calculations |
| Z | MONTHLY WORKING DAYS | 📥 **PROVIDED** (input from user) | ⚠️ NOT used in formulas |
| AA | OT. HRS | 📥 **PROVIDED** (input from user) | Used in OT calculation |
| AB | ATTENDANCE | 📥 **PROVIDED** (input from user) | Used in earn wages |
| AC | PH | 📥 **PROVIDED** (input from user) | Used in PH amount |

### Columns That Can Be CALCULATED from 5 Inputs (11 columns)

#### Earnings Calculations (6 columns)

| Column | Name | Exact Formula | Example (Y=612, AB=20, AC=1, AA=17) |
|--------|------|---------------|-------------------------------------|
| AD | WAGES/MONTH | `Y × 26` | 612 × 26 = 15,912 |
| AE | EARN WAGES | `Y × AB` | 612 × 20 = 12,240 |
| AF | PH AMOUNT | `Y × AC` | 612 × 1 = 612 |
| AG | TOTAL EARN WAGES | `AE + AF` | 12,240 + 612 = 12,852 |
| AH | OT HRS PAYMENT | `ROUND((Y/8) × AA × 2, 0)` | ROUND((612/8) × 17 × 2, 0) = 2,601 |
| AI | TOTAL NETT PAYBLE | `AG + AH` | 12,852 + 2,601 = 15,453 |

#### Deduction Calculations (4 columns)

| Column | Name | Exact Formula | Example |
|--------|------|---------------|---------|
| AJ | EPF | `ROUNDUP(AG × 0.12, 0)` | ROUNDUP(12,852 × 0.12, 0) = 1,543 |
| AK | ESIC | `ROUNDUP(AG × 0.0075, 0)` | ROUNDUP(12,852 × 0.0075, 0) = 97 |
| AL | PT | `IF(AI > 13300, 125, 0)` | IF(15,453 > 13,300, 125, 0) = 125 |
| AM | TOTAL DEDUCTION | `AJ + AK + AL` | 1,543 + 97 + 125 = 1,765 |

#### Final Net Payable (1 column)

| Column | Name | Exact Formula | Example |
|--------|------|---------------|---------|
| AN | NETT PAYBLE | `AI - AM` | 15,453 - 1,765 = 13,688 |

### ⚠️ Important Formula Notes

1. **WAGES/MONTH (AD)** uses a **fixed value of 26**, NOT the input Z (Monthly Working Days)
   - Formula: `Y × 26` (hardcoded)

2. **OT Rate** is **2x the hourly rate**
   - Hourly rate = Daily wage ÷ 8 hours
   - OT payment = `(Y/8) × AA × 2`

3. **EPF** is **12%** of Total Earn Wages (AG)
   - Uses `ROUNDUP` (always round up)

4. **ESIC** is **0.75%** of Total Earn Wages (AG)
   - Uses `ROUNDUP` (always round up)

5. **PT (Professional Tax)** has a threshold of **₹13,300**
   - If Total Nett Payable > ₹13,300, PT = ₹125
   - Otherwise, PT = ₹0

### Columns NOT Calculated (Need Additional Data)

These columns exist in the salary sheet but cannot be calculated from just the 5 inputs (Y, Z, AA, AB, AC):

#### Input/Fetch Columns (Q-T, V)

| Column | Name | Source | Notes |
|--------|------|--------|-------|
| Q | MONTHLY GROSS SALARY | ✅ Fetch from Employee.monthlyGrossSalary | NEW field added to Employee table |
| R | ACTUAL ATTENDANCE | 📥 Input or fetch from AttendanceLog | Count of present days in month |
| S | EXTRA DAYS | 📥 Input or fetch from AttendanceLog | Overtime/extra working days |
| T | PH DAYS | 📥 Input or fetch from Holiday table | Public holidays in month |
| V | ACTUAL OT HRS | 📥 Input or fetch from AttendanceLog | Total OT hours worked |

#### Calculated from Q-V (Columns U, W, X)

| Column | Name | Formula | Depends On |
|--------|------|---------|------------|
| U | ACTUAL EARN WAGES | `ROUND(Q/24 × (R+T), 0)` | Q, R, T |
| W | ACTUAL OT AMOUNT | `ROUND((Q/Z/8) × (V+(S×8)), 0)` | Q, Z, V, S |
| X | GROSS EARN WAGES | `U + W` | U, W |

### 📊 Complete Column Classification

| Column Range | Type | Count | Description |
|--------------|------|-------|-------------|
| A-P | Personal Details | 16 | ✅ All available from Employee table |
| Q | Monthly Gross Salary | 1 | ✅ Available from Employee.monthlyGrossSalary |
| R-T, V | Attendance Data | 4 | 📥 Need input or fetch from AttendanceLog/Holiday |
| U, W, X | Calculated from Q-V | 3 | 🧮 Can calculate if Q-V are provided |
| Y-AC | Input Values | 5 | 📥 User provides these |
| AD-AN | Calculated from Y-AC | 11 | 🧮 Direct calculation from 5 inputs |

### ⚠️ Two Calculation Approaches

#### Approach 1: Using Columns Y-AC (Simplified)
**Input**: Y, Z, AA, AB, AC (5 values)
**Calculate**: AD-AN (11 columns)
**Skip**: Q-X (not used in this approach)

#### Approach 2: Using Columns Q-V (Detailed)
**Input/Fetch**: Q, R, S, T, V (5 values)
**Calculate**: U, W, X (3 columns)
**Note**: This approach uses actual attendance data and monthly gross salary

**Key Difference:**
- Approach 1 uses BASIC WAGES/DAY (Y) and simple attendance count (AB)
- Approach 2 uses MONTHLY GROSS SALARY (Q) and detailed attendance data (R, S, T, V)

---

## 📊 Summary Tables

### Personal Details Status

| Status | Count | Columns |
|--------|-------|---------|
| ✅ Present in Employee Template | 16 | All personal details now available |
| 🆕 Newly Added Fields | 4 | Token Number, Workmen Sl. No., Monthly Gross Salary, Nature of Designation |
| 🔢 Auto-generated | 1 | SL NO. (row number) |
| ❌ Missing | 0 | None - all fields now available! |

### Salary Columns Status

| Status | Count | Description |
|--------|-------|-------------|
| 📥 Input Required (Y-AC) | 5 | Y, Z, AA, AB, AC (provided by user) |
| 🧮 Directly Calculable (AD-AN) | 11 | Earnings, deductions, net payable |
| ✅ Available from DB (Q) | 1 | Monthly Gross Salary (NEW field) |
| 📥 Need Input/Fetch (R-T, V) | 4 | Attendance data (can fetch from AttendanceLog) |
| 🧮 Calculable from Q-V (U, W, X) | 3 | If Q-V are provided |
| ℹ️ Unused Input | 1 | Z (Monthly Working Days - not used in AD-AN formulas) |

### 💡 Two Salary Calculation Methods

#### Method 1: Simplified (Using Y-AC)
```
Input: Y, Z, AA, AB, AC (5 values)
  ↓
Calculate: AD-AN (11 columns)
  ↓
Result: Basic salary sheet with earnings and deductions
```

#### Method 2: Detailed (Using Q-V)
```
Fetch: Q (Monthly Gross Salary from DB)
Input/Fetch: R, S, T, V (Attendance data)
  ↓
Calculate: U, W, X (3 columns)
  ↓
Result: Detailed earnings based on actual attendance
```

**Note**: Both methods can coexist in the same salary sheet. Columns Q-X provide detailed breakdown, while columns Y-AN provide the final payroll calculation.

---

## 🎯 Recommendations

### 1. ✅ Employee Template - COMPLETE

All required fields are now present in the employee template:

**Updated Template**: `excels/employees_updated.xlsx` (42 columns)

**New Fields Added (Columns C, D, E, F):**
```
C: Token Number          - Unique token for salary sheet
D: Workmen Sl. No.       - Workmen serial number
E: Monthly Gross Salary  - Monthly gross salary amount
F: Nature of Designation - Skilled/Unskilled/Semi-skilled
```

**Database Migration**: ✅ Completed for both tenants (erp, erp_demo)

### 2. Simplified Salary Calculation Flow

```
Step 1: Fetch Employee Personal Details (16 fields)
  ├─ A: Sl.No. (auto-generated as row number)
  ├─ B: Workmen Sl. No. (from DB)
  ├─ C: Token Number (from DB)
  ├─ D: Name (firstName + lastName)
  ├─ E: Father's Name (from DB)
  ├─ F: DOJ (from DB)
  ├─ G: DOB (from DB)
  ├─ H: Bank Name (from DB)
  ├─ I: Account No. (from DB)
  ├─ J: IFSC Code (from DB)
  ├─ L: UAN (from DB)
  ├─ M: ESIC (from DB)
  ├─ N: Designation (from relation)
  ├─ O: Department (from relation)
  ├─ P: Nature of Designation (from DB)
  └─ Q: Monthly Gross Salary (from DB)
  
Step 2: Get 5 Input Values (Y, Z, AA, AB, AC)
  ├─ Y: BASIC WAGES/DAY
  ├─ Z: MONTHLY WORKING DAYS (not used in formulas)
  ├─ AA: OT. HRS
  ├─ AB: ATTENDANCE
  └─ AC: PH
  
Step 3: Calculate 11 Salary Columns (AD-AN)
  ├─ Earnings (AD, AE, AF, AG, AH, AI)
  ├─ Deductions (AJ, AK, AL, AM)
  └─ Net Payable (AN)
```

### 3. Calculation Constants

These constants are hardcoded in the formulas:

| Constant | Value | Used In |
|----------|-------|---------|
| Working Days | 26 | WAGES/MONTH (AD) |
| Hours per Day | 8 | OT calculation (AH) |
| OT Multiplier | 2 | OT calculation (AH) |
| EPF Rate | 12% (0.12) | EPF (AJ) |
| ESIC Rate | 0.75% (0.0075) | ESIC (AK) |
| PT Threshold | ₹13,300 | PT (AL) |
| PT Amount | ₹125 | PT (AL) |

### 4. Database Schema Updates

**New Fields Added to Employee Table:**

```prisma
model Employee {
  // ... existing fields
  tokenNumber          String?  @unique  // NEW - Unique token for salary sheet
  workmenSlNo          String?           // NEW - Workmen serial number
  monthlyGrossSalary   Decimal? @db.Decimal(15, 2)  // NEW - Monthly gross salary
  natureOfDesignation  String?           // NEW - Skilled/Unskilled/Semi-skilled
  // ... other fields
}
```

**Migration Status:**
- ✅ Main Tenant (erp) - Migrated
- ✅ Demo Tenant (erp_demo) - Migrated
- ✅ Prisma Client - Regenerated

---

## 💡 Implementation Notes

1. **Direct Calculations**: **11 salary columns** (AD-AN) can be calculated directly from just 5 input values (Y, AA, AB, AC)
   - Column Z (Monthly Working Days) is provided but NOT used in any formula

2. **Database lookups**: All employee personal details can now be fetched from the Employee table:
   - ✅ Name, Father's Name, DOJ, DOB
   - ✅ Bank details, UAN, ESIC
   - ✅ Department, Designation
   - ✅ Token Number, Workmen Sl. No. (NEW)
   - ✅ Monthly Gross Salary, Nature of Designation (NEW)

3. **No missing fields**: All 16 personal detail columns for the salary sheet are now available in the employee template

4. **Auto-generated fields**: 
   - Sl.No. (Column A) is auto-generated as row number during salary sheet generation
   - Not stored in database, calculated on-the-fly

5. **Unique constraints**:
   - Employee ID (employeeCode) - Must be unique
   - Token Number (tokenNumber) - Must be unique if provided
   - Workmen Sl. No. - Can be duplicate (not unique)

6. **OT Rate**: Already defined in formula as **2x the hourly rate**
   - Hourly rate = Daily wage ÷ 8 hours
   - Formula: `ROUND((Y/8) × AA × 2, 0)`

7. **PT Logic**: Already defined with threshold
   - If Total Nett Payable > ₹13,300, PT = ₹125
   - Otherwise, PT = ₹0
   - Formula: `IF(AI > 13300, 125, 0)`

8. **Rounding Rules**:
   - EPF and ESIC: Use `ROUNDUP` (always round up to next whole number)
   - OT Payment: Use `ROUND` (round to nearest whole number)

## 📝 Quick Reference: What You Need

### To Generate Salary Sheet, You Need:

**From Employee Table (16 fields) - ALL AVAILABLE:**
1. ✅ Sl.No. (auto-generated)
2. ✅ Workmen Sl. No. (NEW)
3. ✅ Token Number (NEW)
4. ✅ Name of Employee
5. ✅ Father's Name
6. ✅ Date of Joining (DOJ)
7. ✅ Date of Birth (DOB)
8. ✅ Bank Name
9. ✅ Bank Account No.
10. ✅ IFSC Code
11. ✅ UAN Number
12. ✅ ESIC Number
13. ✅ Department
14. ✅ Designation
15. ✅ Nature of Designation (NEW)
16. ✅ Monthly Gross Salary (NEW) - Column Q

**From User Input (5 values for AD-AN calculation):**
1. Y - BASIC WAGES/DAY
2. Z - MONTHLY WORKING DAYS (used in W formula, not in AD-AN)
3. AA - OT. HRS
4. AB - ATTENDANCE
5. AC - PH (Public Holidays)

**Optional: For Q-X Detailed Calculation (if needed):**
1. R - ACTUAL ATTENDANCE (can fetch from AttendanceLog)
2. S - EXTRA DAYS (can fetch from AttendanceLog)
3. T - PH DAYS (can fetch from Holiday table)
4. V - ACTUAL OT HRS (can fetch from AttendanceLog)

**Auto-Calculated:**
- U, W, X (if Q-V are provided)
- AD through AN (from Y-AC inputs)

**Total Data Points:** 
- Minimum: 16 (employee) + 5 (input) = 21 → Generate 11 calculated columns (AD-AN)
- With Q-X: 16 (employee) + 5 (Y-AC) + 4 (R,S,T,V) = 25 → Generate 14 calculated columns (U,W,X,AD-AN)

## 🔄 Understanding the Two Calculation Sections

### Section 1: Columns Q-X (Detailed Earnings Breakdown)

**Purpose**: Show detailed breakdown based on actual attendance and monthly gross salary

| Column | Type | Description |
|--------|------|-------------|
| Q | Input/DB | Monthly Gross Salary (from Employee table) |
| R | Input/Fetch | Actual Attendance days |
| S | Input/Fetch | Extra working days |
| T | Input/Fetch | Public Holiday days |
| U | Calculated | Actual Earn Wages = `ROUND(Q/24 × (R+T), 0)` |
| V | Input/Fetch | Actual OT Hours |
| W | Calculated | Actual OT Amount = `ROUND((Q/Z/8) × (V+(S×8)), 0)` |
| X | Calculated | Gross Earn Wages = `U + W` |

**Use Case**: When you want to show detailed earnings based on actual monthly gross salary and attendance records.

### Section 2: Columns Y-AN (Payroll Calculation)

**Purpose**: Calculate final payroll with earnings, deductions, and net payable

| Column | Type | Description |
|--------|------|-------------|
| Y | Input | Basic Wages/Day |
| Z | Input | Monthly Working Days |
| AA | Input | OT Hours |
| AB | Input | Attendance |
| AC | Input | PH days |
| AD-AH | Calculated | Earnings (Wages, Earn Wages, PH Amount, Total, OT Payment) |
| AI | Calculated | Total Nett Payable |
| AJ-AL | Calculated | Deductions (EPF, ESIC, PT) |
| AM | Calculated | Total Deduction |
| AN | Calculated | Net Payable (Final) |

**Use Case**: Final payroll calculation with statutory deductions (EPF, ESIC, PT) and net payable amount.

### 🔗 How They Relate

```
┌─────────────────────────────────────────────────────────────┐
│  SECTION 1: Q-X (Optional Detailed Breakdown)              │
│  Shows: How gross earnings are calculated from monthly     │
│         gross salary and actual attendance                  │
├─────────────────────────────────────────────────────────────┤
│  Q: Monthly Gross Salary (₹57,540)                         │
│  R: Actual Attendance (20 days)                            │
│  S: Extra Days (4 days)                                    │
│  T: PH Days (0 days)                                       │
│  ↓                                                          │
│  U: Actual Earn Wages = ₹47,950                           │
│  V: Actual OT Hrs (0 hrs)                                  │
│  W: Actual OT Amount = ₹0                                  │
│  X: Gross Earn Wages = ₹47,950                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SECTION 2: Y-AN (Required Payroll Calculation)            │
│  Shows: Final payroll with deductions and net payable      │
├─────────────────────────────────────────────────────────────┤
│  Y: Basic Wages/Day (₹612)                                 │
│  Z: Monthly Working Days (24)                              │
│  AA: OT Hrs (17)                                           │
│  AB: Attendance (20)                                       │
│  AC: PH (1)                                                │
│  ↓                                                          │
│  AD-AH: Earnings Calculation                               │
│  AI: Total Nett Payable = ₹15,453                         │
│  ↓                                                          │
│  AJ-AL: Deductions (EPF, ESIC, PT)                        │
│  AM: Total Deduction = ₹1,765                             │
│  ↓                                                          │
│  AN: Net Payable = ₹13,688 ✅ FINAL AMOUNT                │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
1. **Q-X is optional** - Shows detailed breakdown for transparency
2. **Y-AN is required** - Contains the final payroll calculation
3. **Both sections can coexist** - Q-X shows "how", Y-AN shows "final result"
4. **Different base values**: Q uses monthly gross salary, Y uses daily wages

## 🎉 Summary

✅ **All personal detail fields are now available** in the employee template
✅ **4 new fields added**: Token Number, Workmen Sl. No., Monthly Gross Salary, Nature of Designation
✅ **Database migrated** for both tenants
✅ **New template created**: `excels/employees_updated.xlsx`
✅ **No missing fields** - ready for salary sheet generation
✅ **Sl.No. auto-generated** - not stored in database

---

## 📚 Related Documentation

For complete column-by-column details from A to BP with formulas, data sources, and implementation guide, see:
- **[NON_COMPLIANCE_SALARY_SHEET_COMPLETE_GUIDE.md](./NON_COMPLIANCE_SALARY_SHEET_COMPLETE_GUIDE.md)** - Comprehensive guide for all 68 columns
