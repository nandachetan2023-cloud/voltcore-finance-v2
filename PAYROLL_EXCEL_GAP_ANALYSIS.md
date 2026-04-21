# Payroll Excel Generation — Data Gap Analysis

## Overview

This document maps every column in both payroll Excel formats (Compliance and Non-Compliance) to its data source in the database, and identifies what is currently working, what is hardcoded, and what is missing.

---

## Data Sources Reference

| Source | Where it comes from in the system |
|---|---|
| **Employee master** | Created via HRMS → Employees module (`Employee` table) |
| **Salary structure** | Assigned via HRMS → Employees → Salary tab (`SalaryStructureAssignment` → `SalaryStructureItem` → `SalaryComponent`) |
| **Attendance** | Recorded via HRMS → Attendance module or Biometric Sync (`AttendanceLog` table) |
| **Holidays** | Defined via Organization → Holidays module (`Holiday` table) |
| **Shift** | Assigned via HRMS → Shift Roster (`ShiftAssignment` → `Shift` table) |
| **Payroll run** | Generated via HRMS → Payroll → Generate (`PayrollItem` table) |
| **Leave** | Applied via HRMS → Leave Management (`LeaveRequest` table) |

---

## Compliance Format — Column-by-Column Analysis (24 columns)

| # | Column | Current Status | DB Source | Notes |
|---|---|---|---|---|
| 1 | Sl. No. | ✅ Working | Auto-incremented in code | — |
| 2 | Name of the workman | ✅ Working | `Employee.firstName + middleName + lastName` (Employee creation) | — |
| 3 | Site | ✅ Working | `Employee.Branch.name` (Employee creation → Branch assignment) | — |
| 4 | UAN | ✅ Working | `Employee.uanNumber` (Employee creation) | Empty if not filled |
| 5 | IP NO. (ESIC) | ✅ Working | `Employee.esicNumber` (Employee creation) | Empty if not filled |
| 6 | Designation | ✅ Working | `Employee.Designation.name` (Employee creation → Designation assignment) | — |
| 7 | Total days worked | ⚠️ Partial | `AttendanceLog` grouped by employeeId — counts `present` and `half-day` only | Does NOT count `late` status as present |
| 8 | OT hours | ❌ Hardcoded 0 | Should come from `AttendanceLog.punchIn/punchOut` vs `Shift.endTime` | Needs calculation |
| 9 | No. of work done | ❌ Empty | No source defined | Piece-rate work — not applicable for most |
| 10 | Daily rate of wages | ⚠️ Calculated | `basicSalary / totalDaysInMonth` | Uses total calendar days, not actual working days |
| 11 | Basic wages | ✅ Working | `SalaryStructureItem` where `SalaryComponent.name` contains "basic" (Salary structure assignment) | — |
| 12 | Dearness allowances | ⚠️ Calculated | Sum of HRA + conveyance + medical + special from `SalaryStructureItem` | DA is mapped as sum of all allowances — may not be accurate |
| 13 | Overtime amount | ❌ Hardcoded 0 | Should be `OT hours × daily rate / 8` | Needs OT hours first |
| 14 | Other cash payment | ❌ Hardcoded 0 | Could come from `PayrollItem.otherDeductions` if payroll was run | Not fetched |
| 15 | Total wages for ESI | ⚠️ Calculated | `basic + DA + OT + other` | Correct formula, but OT is 0 |
| 16 | EPF | ⚠️ Calculated | `basicSalary × 12%` hardcoded | Should respect EPF wage ceiling (₹15,000) |
| 17 | ESI | ⚠️ Calculated | `totalWages × 0.75%` hardcoded | Correct rate, but should check ESI wage ceiling (₹21,000) |
| 18 | House rent | ✅ Working | `SalaryStructureItem` where component name contains "hra" or "house" | — |
| 19 | Other deduction (PT) | ❌ Hardcoded ₹200 | Should come from state-based PT slab or `CompanySettings` | PT varies by state and salary slab |
| 20 | Total deduction | ⚠️ Calculated | `EPF + ESI + PT` | Correct but based on hardcoded values above |
| 21 | Net amount paid | ⚠️ Calculated | `totalWages - totalDeduction` | Correct formula |
| 22 | Time & date of payment | ❌ Empty | Not stored anywhere | Manual entry in physical register |
| 23 | Place of payment | ❌ Empty | Could use `Employee.Branch.name` | Not mapped |
| 24 | Signature | ❌ Empty | Physical signature — not applicable digitally | — |

---

## Non-Compliance Format — Column-by-Column Analysis (68 columns)

### Employee Information (Cols 1–16)

| # | Column | Status | DB Source | Notes |
|---|---|---|---|---|
| 1 | SL NO. | ✅ | Auto-incremented | — |
| 2 | WORKMEN SL. NO. | ✅ | Same as SL NO. | — |
| 3 | TOKEN NO. | ✅ | `Employee.employeeCode` (Employee creation) | — |
| 4 | NAME OF EMPLOYEE | ✅ | `Employee.firstName + middleName + lastName` | — |
| 5 | FATHER'S NAME | ✅ | `Employee.fatherName` (Employee creation) | Empty if not filled |
| 6 | DOJ | ✅ | `Employee.dateOfJoining` (Employee creation) | — |
| 7 | DOB | ✅ | `Employee.dateOfBirth` (Employee creation) | — |
| 8 | BANK NAME | ✅ | `Employee.bankName` (Employee creation → Bank details) | Falls back to "BANDHAN BANK" if empty |
| 9 | ACCOUNT NO. | ✅ | `Employee.bankAccount` (Employee creation) | — |
| 10 | IFSC CODE | ✅ | `Employee.bankIfsc` (Employee creation) | Falls back to hardcoded IFSC if empty |
| 11 | (blank) | — | Empty column spacer | — |
| 12 | UAN NO. | ✅ | `Employee.uanNumber` (Employee creation) | — |
| 13 | ESIC IP NO | ✅ | `Employee.esicNumber` (Employee creation) | — |
| 14 | DESIGNATION | ✅ | `Employee.Designation.name` | — |
| 15 | DEPARTMENT | ✅ | `Employee.Department.name` | — |
| 16 | NATURE OF DESIGNATION | ❌ Hardcoded "High Skilled" | Should come from `Employee.Grade.name` or a field on `Designation` | Grade is fetched but not used here |

### Attendance & Earnings (Cols 17–35)

| # | Column | Status | DB Source | Notes |
|---|---|---|---|---|
| 17 | MONTHLY GROSS SALARY | ✅ | Sum of all `SalaryStructureItem.fixedAmount` | — |
| 18 | ACTUAL ATTENDANCE | ⚠️ Partial | `AttendanceLog` count — misses `late` status | — |
| 19 | EXTRA DAYS | ❌ Hardcoded 0 | Holiday work days — needs `Holiday` table cross-reference | — |
| 20 | PH DAYS | ❌ Hardcoded 0 | Public holidays in month — needs `Holiday` table query | — |
| 21 | ACTUAL EARN WAGES | ⚠️ Calculated | `(presentDays / workingDays) × basicSalary` | Uses calendar days not actual working days |
| 22 | ACTUAL OT HRS | ❌ Hardcoded 0 | Needs `AttendanceLog.punchOut - Shift.endTime` calculation | — |
| 23 | ACTUAL OT AMOUNT | ❌ Hardcoded 0 | Needs OT hours × hourly rate | — |
| 24 | GROSS EARN WAGES | ⚠️ Calculated | Same as monthly gross — not prorated | Should be prorated by attendance |
| 25 | BASIC WAGES/DAY | ⚠️ Calculated | `basicSalary / totalCalendarDays` | Should use actual working days |
| 26 | MONTHLY WORKING DAYS | ❌ Hardcoded | Total calendar days in month | Should exclude weekends (`Shift.weekOffDays`) and holidays |
| 27 | OT HRS | ❌ Hardcoded 0 | Same as col 22 | — |
| 28 | ATTENDANCE | ⚠️ Partial | Same as col 18 | — |
| 29 | PH | ❌ Hardcoded 0 | Same as col 20 | — |
| 30 | WAGES/MONTH | ✅ | `basicSalary` from salary structure | — |
| 31 | EARN WAGES | ⚠️ Calculated | `(presentDays / workingDays) × basicSalary` | — |
| 32 | PH AMOUNT | ❌ Hardcoded 0 | `phDays × dailyRate` — needs PH days | — |
| 33 | TOTAL EARN WAGES | ⚠️ Calculated | `earnWages + phAmount` | PH amount is 0 | 
| 34 | OT HRS PAYMENT | ❌ Hardcoded 0 | Needs OT calculation | — |
| 35 | TOTAL NETT PAYBLE | ⚠️ Calculated | `totalEarnWages + otAmount` | OT is 0 |

### Deductions (Cols 36–41)

| # | Column | Status | DB Source | Notes |
|---|---|---|---|---|
| 36 | EPF | ⚠️ Calculated | `basicSalary × 12%` | Should cap at EPF wage ceiling |
| 37 | ESIC | ⚠️ Calculated | `grossEarnings × 0.75%` | Should check ESI ceiling |
| 38 | PT | ❌ Hardcoded ₹200 | Should come from state PT slab | — |
| 39 | TOTAL DEDUCTION | ⚠️ Calculated | `EPF + ESI + PT + TDS` | — |
| 40 | NETT PAYBLE | ⚠️ Calculated | `totalNettPayable - totalDeduction` | — |
| 41 | EMPLOYEE SIGNATURE | ❌ Empty | Physical — not applicable | — |

### Non-Compliance Section (Cols 42–49)

| # | Column | Status | DB Source | Notes |
|---|---|---|---|---|
| 42–43 | (blank spacers) | — | — | — |
| 44 | TOTAL NON COMPLIANCE AMOUNT | ❌ Hardcoded 0 | No model — could be from `PayrollItem.otherDeductions` | — |
| 45 | ADVANCE | ❌ Hardcoded 0 | No `Advance` model in DB | Needs new model or `PayrollItem` field |
| 46 | ARREARS | ❌ Hardcoded 0 | No `Arrears` model in DB | Needs new model or `PayrollItem` field |
| 47 | NETT PAYBLE NON COMPLIANCE | ⚠️ Calculated | Same as net pay | — |
| 48 | GRAND TOTAL NETT PAYBLE | ⚠️ Calculated | Same as net pay | — |
| 49 | (blank) | — | — | — |
| 50 | LEAVE | ❌ Hardcoded 0 | Could come from `LeaveRequest` approved days for month | Not fetched |
| 51 | BONUS | ❌ Hardcoded 0 | No `Bonus` model in DB | Needs new model |

### Detailed Allowances (Cols 52–68)

| # | Column | Status | DB Source | Notes |
|---|---|---|---|---|
| 52–54 | (blank spacers) | — | — | — |
| 55 | MONTHLY BASIC SALARY | ✅ | `SalaryStructureItem` — basic component | — |
| 56 | PH AMOUNT | ❌ Hardcoded 0 | Needs PH days × daily rate | — |
| 57 | OT AMOUNT | ❌ Hardcoded 0 | Needs OT calculation | — |
| 58 | EARN SALARY | ⚠️ Calculated | Prorated basic | — |
| 59 | MONTHLY House Rent Allow. | ✅ | `SalaryStructureItem` — HRA component | — |
| 60 | Monthly Site Allow. | ✅ | `SalaryStructureItem` — conveyance component | — |
| 61 | Monthly Leave Travel Allow. | ✅ | `SalaryStructureItem` — medical component | Mapped to medical — may need separate LTA component |
| 62 | Monthly Special Allow. | ✅ | `SalaryStructureItem` — special component | — |
| 63 | Monthly Attendance Allow. | ❌ Hardcoded 0 | No attendance allowance component mapped | Needs `SalaryComponent` with "attendance" in name |
| 64 | TOTAL SALARY | ✅ | Sum of all allowances | — |
| 65 | EPF | ⚠️ Calculated | `basicSalary × 12%` | — |
| 66 | ESIC | ⚠️ Calculated | `grossEarnings × 0.75%` | — |
| 67 | TDS | ❌ Hardcoded 0 | Could come from `PayrollItem.tdsDeduction` if payroll was run | — |
| 68 | ADVANCE | ❌ Hardcoded 0 | No advance model | — |

---

## Summary of Gaps

### ✅ Fully Working (from DB)
- All employee personal details (name, DOB, DOJ, father's name)
- Bank details (name, account, IFSC)
- Statutory numbers (UAN, ESIC, PAN)
- Designation, Department, Branch
- Basic salary, HRA, conveyance, medical, special allowances (from salary structure)

### ⚠️ Partially Working (calculated but with simplifications)
- Present days — counts `present` + `half-day` but misses `late` status
- Working days — uses total calendar days instead of actual working days (minus weekends + holidays)
- Daily rate — based on calendar days not working days
- EPF/ESI — correct rates but no wage ceiling enforcement
- Earned wages — correct formula but wrong working days denominator

### ❌ Missing / Hardcoded (needs fix)

| Gap | Fix Required | Where to get data |
|---|---|---|
| OT hours | Calculate from `AttendanceLog.punchOut - Shift.endTime` | `AttendanceLog` + `ShiftAssignment` |
| PH (Public Holiday) days | Query `Holiday` table for the month | `Holiday` table |
| Actual working days | Subtract `Shift.weekOffDays` + holidays from calendar days | `Shift` + `Holiday` |
| `late` status as present | Include `late` in attendance count | `AttendanceLog.status` |
| Nature of designation | Use `Employee.Grade.name` | `Grade` table (already fetched) |
| PT (Professional Tax) | State-based slab from `CompanySettings` | `CompanySettings` table |
| TDS | From `PayrollItem.tdsDeduction` if payroll run exists | `PayrollItem` table |
| Advance | No model — needs `PayrollItem.otherDeductions` or new model | New model needed |
| Arrears | No model | New model needed |
| Bonus | No model | New model needed |
| Leave days in month | Query `LeaveRequest` approved for month | `LeaveRequest` table |
| Attendance allowance | Map `SalaryComponent` with "attendance" in name | `SalaryStructureItem` |
| LTA (Leave Travel Allow.) | Separate from medical — needs own component | `SalaryStructureItem` |
| EPF wage ceiling | Cap at ₹15,000 for EPF calculation | Hardcoded constant |
| ESI wage ceiling | Skip ESI if gross > ₹21,000 | Hardcoded constant |

---

## Recommended Fix Priority

### Priority 1 — High Impact, Easy Fix
1. Include `late` status in present days count
2. Use `Grade.name` for nature of designation
3. Cap EPF at ₹15,000 wage ceiling
4. Skip ESI if gross > ₹21,000

### Priority 2 — Medium Impact, Needs Calculation
5. Calculate actual working days (calendar days − weekends − holidays)
6. Fetch PH days from `Holiday` table
7. Calculate OT hours from `AttendanceLog` vs shift end time
8. Fetch TDS from `PayrollItem` if payroll run exists

### Priority 3 — Needs New Data / Models
9. Advance deductions — add to `PayrollItem` or new model
10. Arrears — new model or manual entry
11. Bonus — new model or manual entry
12. PT slab — add to `CompanySettings` per state

---

## If PayrollItem Exists (Best Case)

When payroll has already been run for the month via HRMS → Payroll → Generate, the `PayrollItem` table already has:

| Field | Available |
|---|---|
| `presentDays` | ✅ |
| `paidLeaveDays` | ✅ |
| `lopDays` | ✅ |
| `otHours` | ✅ |
| `basicSalary`, `hra`, `conveyanceAllowance`, `medicalAllowance`, `specialAllowance` | ✅ |
| `otAmount` | ✅ |
| `grossEarning` | ✅ |
| `pfDeduction`, `esiDeduction`, `ptDeduction`, `tdsDeduction` | ✅ |
| `lopDeduction`, `otherDeductions` | ✅ |
| `totalDeduction`, `netPay` | ✅ |

**Recommendation:** The generate-excel route should first check if a `PayrollItem` exists for the employee + month. If yes, use those values directly. If no, fall back to on-the-fly calculation from salary structure + attendance.
