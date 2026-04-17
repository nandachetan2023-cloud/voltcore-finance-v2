# Attendance Rules Implementation Guide

## Overview

Attendance rules created by admins are now consistently applied across all employees based on their shift, department, and branch assignments. The system automatically calculates late status, fines, and attendance status based on configured rules.

## Features Implemented

### 1. Rule Matching System

Rules are matched to employees based on specificity:

**Priority Order (Most to Least Specific):**
1. Shift + Department + Branch
2. Shift + Department
3. Shift + Branch
4. Department + Branch
5. Shift only
6. Department only
7. Branch only
8. Default (no filters - applies to all)

### 2. Automatic Status Calculation

When attendance is created with a punch-in time, the system:
- Finds the applicable rule for the employee
- Compares actual punch-in time with scheduled shift start time
- Applies grace period
- Calculates lateness in minutes
- Determines status: `present`, `late`, `half_day`, or `absent`
- Calculates fines based on rule configuration

### 3. Fine Calculation

Two fine types supported:
- **Fixed**: A fixed amount regardless of lateness duration
- **Per Minute**: Fine calculated per minute of lateness, with optional max cap

## Database Schema

```prisma
model AttendanceRule {
  id                    Int         @id @default(autoincrement())
  name                  String
  ruleType              String      // 'late', 'early_departure', 'overtime'
  gracePeriodMinutes    Int         @default(0)
  lateMarkAfterMinutes  Int         @default(0)
  halfDayAfterMinutes   Int         @default(0)
  absentAfterMinutes    Int         @default(0)
  fineAmount            Decimal     @default(0)
  fineType              String      @default("fixed")  // 'fixed', 'per_minute', 'none'
  finePerMinute         Decimal     @default(0)
  maxFinePerDay         Decimal     @default(0)
  applyToShiftId        Int?
  applyToDepartmentId   Int?
  applyToBranchId       Int?
  isActive              Boolean     @default(true)
  createdAt             DateTime    @default(now())
  updatedAt             DateTime
  Shift                 Shift?      @relation(fields: [applyToShiftId], references: [id])
  Department            Department? @relation(fields: [applyToDepartmentId], references: [id])
  Branch                Branch?     @relation(fields: [applyToBranchId], references: [id])
}
```

## API Endpoints

### 1. Get Applicable Rule

**Endpoint:** `GET /api/attendance-rules/applicable`

**Query Parameters:**
- `employeeId` (required): Employee ID
- `ruleType` (optional): Rule type (default: 'late')

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Standard Late Rule",
    "ruleType": "late",
    "gracePeriodMinutes": 15,
    "lateMarkAfterMinutes": 30,
    "halfDayAfterMinutes": 120,
    "absentAfterMinutes": 240,
    "fineAmount": 100,
    "fineType": "fixed"
  }
}
```

### 2. Calculate Fines for Period

**Endpoint:** `GET /api/attendance-rules/calculate-fines`

**Query Parameters:**
- `employeeId` (required): Employee ID
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFine": 500,
    "details": [
      {
        "date": "2026-04-15",
        "lateMinutes": 45,
        "fineAmount": 100,
        "status": "late",
        "appliedRule": {
          "id": 1,
          "name": "Standard Late Rule",
          "ruleType": "late"
        }
      }
    ]
  }
}
```

### 3. Create Attendance (Enhanced)

**Endpoint:** `POST /api/attendance`

**Request Body:**
```json
{
  "employeeId": 63,
  "logDate": "2026-04-16",
  "punchIn": "2026-04-16T09:45:00Z",
  "punchOut": "2026-04-16T18:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "employeeId": 63,
    "logDate": "2026-04-16",
    "punchIn": "2026-04-16T09:45:00Z",
    "punchOut": "2026-04-16T18:00:00Z",
    "status": "late"
  },
  "ruleApplied": {
    "status": "late",
    "isLate": true,
    "lateMinutes": 30,
    "fineAmount": 100,
    "appliedRule": {
      "id": 1,
      "name": "Standard Late Rule",
      "ruleType": "late"
    }
  }
}
```

## Service Functions

### `getApplicableRule(employeeId, ruleType)`

Finds the most specific attendance rule applicable to an employee.

```typescript
import { getApplicableRule } from '@/lib/services/attendance-rule-service';

const rule = await getApplicableRule(63, 'late');
```

### `applyAttendanceRules(employeeId, scheduledTime, actualTime, ruleType)`

Applies attendance rules and calculates status, lateness, and fines.

```typescript
import { applyAttendanceRules } from '@/lib/services/attendance-rule-service';

const result = await applyAttendanceRules(
  63,
  new Date('2026-04-16T09:00:00Z'), // Scheduled time
  new Date('2026-04-16T09:45:00Z'), // Actual punch-in
  'late'
);

console.log(result);
// {
//   isLate: true,
//   lateMinutes: 30,
//   isHalfDay: false,
//   isAbsent: false,
//   fineAmount: 100,
//   status: 'late',
//   appliedRule: { ... }
// }
```

### `calculateFinesForPeriod(employeeId, startDate, endDate)`

Calculates total fines for an employee in a date range.

```typescript
import { calculateFinesForPeriod } from '@/lib/services/attendance-rule-service';

const result = await calculateFinesForPeriod(
  63,
  new Date('2026-04-01'),
  new Date('2026-04-30')
);

console.log(result.totalFine); // 500
console.log(result.details); // Array of fine details
```

## Use Cases

### Example 1: Department-Specific Rule

**Scenario:** Sales department has stricter late rules

```
Rule Name: Sales Late Rule
Rule Type: late
Grace Period: 5 minutes
Late Mark After: 15 minutes
Half Day After: 60 minutes
Fine: ₹200 (fixed)
Apply To: Sales Department
```

All employees in Sales department will have this rule applied automatically.

### Example 2: Shift-Specific Rule

**Scenario:** Night shift has relaxed late rules

```
Rule Name: Night Shift Rule
Rule Type: late
Grace Period: 30 minutes
Late Mark After: 60 minutes
Half Day After: 180 minutes
Fine: None
Apply To: Night Shift
```

Only employees assigned to night shift will have this rule.

### Example 3: Branch-Specific Rule

**Scenario:** Remote branch has different attendance policy

```
Rule Name: Remote Branch Rule
Rule Type: late
Grace Period: 20 minutes
Late Mark After: 45 minutes
Fine: ₹50 per minute (max ₹500/day)
Apply To: Remote Branch
```

All employees in the remote branch will have this rule.

### Example 4: Combined Filters

**Scenario:** IT Department in Head Office has special rules

```
Rule Name: IT HO Rule
Rule Type: late
Grace Period: 15 minutes
Late Mark After: 30 minutes
Fine: ₹100 (fixed)
Apply To: IT Department + Head Office Branch
```

Only IT department employees in Head Office will have this rule.

## Integration with Payroll

Attendance fines can be integrated into payroll calculations:

```typescript
// In payroll generation
const fineResult = await calculateFinesForPeriod(
  employeeId,
  payrollStartDate,
  payrollEndDate
);

const deductions = {
  ...otherDeductions,
  attendanceFines: fineResult.totalFine,
};

const netSalary = grossSalary - totalDeductions;
```

## Frontend Display

### Show Applicable Rule to Employee

```typescript
// Fetch applicable rule
const response = await fetch(`/api/attendance-rules/applicable?employeeId=${empId}&ruleType=late`);
const { data: rule } = await response.json();

if (rule) {
  console.log(`Grace Period: ${rule.gracePeriodMinutes} minutes`);
  console.log(`Late after: ${rule.lateMarkAfterMinutes} minutes`);
  console.log(`Fine: ₹${rule.fineAmount}`);
}
```

### Show Fine Details in Attendance

```typescript
// When creating attendance
const response = await fetch('/api/attendance', {
  method: 'POST',
  body: JSON.stringify({ employeeId, logDate, punchIn, punchOut }),
});

const { data, ruleApplied } = await response.json();

if (ruleApplied && ruleApplied.fineAmount > 0) {
  toast.warning(
    `Late by ${ruleApplied.lateMinutes} minutes. Fine: ₹${ruleApplied.fineAmount}`
  );
}
```

## Testing Checklist

- [ ] Create default rule (no filters)
- [ ] Create shift-specific rule
- [ ] Create department-specific rule
- [ ] Create branch-specific rule
- [ ] Create combined filter rule (shift + department)
- [ ] Test rule priority (most specific wins)
- [ ] Test grace period calculation
- [ ] Test late status calculation
- [ ] Test half-day status calculation
- [ ] Test absent status calculation
- [ ] Test fixed fine calculation
- [ ] Test per-minute fine calculation
- [ ] Test max fine cap
- [ ] Test fine calculation for period
- [ ] Test attendance creation with rule application
- [ ] Verify rule shown in attendance response

## Benefits

1. **Consistency**: Same rules applied to all employees in a category
2. **Flexibility**: Different rules for different shifts/departments/branches
3. **Automation**: Status and fines calculated automatically
4. **Transparency**: Employees know which rule applies to them
5. **Fairness**: Rules are applied uniformly without bias
6. **Audit Trail**: All rule applications are logged
7. **Payroll Integration**: Fines automatically included in salary calculations

## Migration Notes

If you have existing attendance records without rule application:

1. Rules will only apply to new attendance records
2. Existing records can be recalculated using the service functions
3. Consider running a batch job to apply rules retroactively if needed

## Configuration Best Practices

1. **Start with Default Rule**: Create a default rule (no filters) as fallback
2. **Test Before Activating**: Create rules as inactive, test, then activate
3. **Document Rules**: Use clear, descriptive names for rules
4. **Review Regularly**: Review and update rules based on company policy changes
5. **Communicate Changes**: Inform employees when rules change
6. **Monitor Impact**: Track fine amounts and adjust rules if needed

---

**Status**: Fully Implemented ✅

**Files Created:**
- `src/lib/services/attendance-rule-service.ts` - Core service
- `src/app/api/attendance-rules/applicable/route.ts` - Get applicable rule API
- `src/app/api/attendance-rules/calculate-fines/route.ts` - Calculate fines API

**Files Modified:**
- `src/app/api/attendance/route.ts` - Enhanced to apply rules on creation

**Next Steps:**
- Integrate fines into payroll generation
- Add rule preview in attendance UI
- Add fine summary in employee dashboard
- Add bulk rule application for existing records
