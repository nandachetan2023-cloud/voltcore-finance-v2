# Administrative Setup Implementation Guide

## Overview
The Administrative Setup module provides centralized configuration for the ERP system's operational rules. These settings are typically configured once at the start of the year and dictate how the rest of the system behaves.

## Features Implemented

### 1. Holiday Calendar
**Purpose**: Centralized list of public and company-specific holidays to ensure attendance and payroll calculations don't mark employees as absent on holidays.

**Database Table**: `Holiday`
```sql
- id: Primary key
- name: Holiday name (e.g., "Republic Day", "Diwali")
- date: Holiday date
- type: 'public' | 'company' | 'optional'
- description: Additional details
- isRecurring: Whether holiday repeats annually
- applicableTo: 'all' | 'specific'
- branchId: Optional - for branch-specific holidays
- isActive: Soft delete flag
```

**Features**:
- Add public holidays (Republic Day, Independence Day, etc.)
- Add company-specific holidays
- Branch-specific holidays (optional)
- Recurring holidays (automatically apply next year)
- Filter by year and branch

**API Endpoints**:
- `GET /api/holidays?year=2024&branchId=1`
- `POST /api/holidays` - Create holiday
- `PUT /api/holidays` - Update holiday
- `DELETE /api/holidays` - Soft delete holiday

---

### 2. Leave Policies
**Purpose**: Define leave entitlements, carry-forward rules, and encashment policies.

**Database Table**: `LeavePolicy`
```sql
- id: Primary key
- name: Policy name (e.g., "Paid Leave", "Sick Leave")
- code: Unique code (e.g., "PL", "SL", "CL")
- leaveType: Type of leave
- annualQuota: Days per year (e.g., 12.0)
- carryForward: Can unused leaves carry forward?
- maxCarryForward: Maximum days to carry forward
- encashable: Can leaves be encashed?
- maxEncashment: Maximum days for encashment
- minDaysNotice: Minimum notice period required
- maxConsecutiveDays: Maximum consecutive days allowed
- applicableAfterMonths: Applicable after X months of joining
- applicableGender: 'all' | 'male' | 'female'
- requiresDocument: Requires medical certificate/document
- isActive: Soft delete flag
```

**Features**:
- Define annual leave quotas
- Configure carry-forward rules
- Set encashment policies
- Gender-specific policies (e.g., maternity leave)
- Probation period rules
- Document requirements

**API Endpoints**:
- `GET /api/leave-policies?leaveType=paid&isActive=true`
- `POST /api/leave-policies` - Create policy
- `PUT /api/leave-policies` - Update policy
- `DELETE /api/leave-policies` - Soft delete policy

**Example Policies**:
```javascript
// Paid Leave
{
  name: "Paid Leave",
  code: "PL",
  leaveType: "paid",
  annualQuota: 12,
  carryForward: true,
  maxCarryForward: 5,
  encashable: true,
  maxEncashment: 10,
  minDaysNotice: 2,
  maxConsecutiveDays: 10,
  applicableAfterMonths: 3,
  applicableGender: "all",
  requiresDocument: false
}

// Sick Leave
{
  name: "Sick Leave",
  code: "SL",
  leaveType: "sick",
  annualQuota: 7,
  carryForward: false,
  encashable: false,
  minDaysNotice: 0,
  maxConsecutiveDays: 5,
  applicableAfterMonths: 0,
  requiresDocument: true // if > 2 days
}

// Maternity Leave
{
  name: "Maternity Leave",
  code: "ML",
  leaveType: "maternity",
  annualQuota: 180,
  carryForward: false,
  encashable: false,
  applicableGender: "female",
  requiresDocument: true
}
```

---

### 3. Attendance Rules (Late Mark & Fine Rules)
**Purpose**: Automate attendance marking and deductions for late arrivals.

**Database Table**: `AttendanceRule`
```sql
- id: Primary key
- name: Rule name
- ruleType: 'late_mark' | 'fine' | 'half_day' | 'absent'
- gracePeriodMinutes: Grace period (e.g., 10 minutes)
- lateMarkAfterMinutes: Mark late after X minutes
- halfDayAfterMinutes: Mark half-day after X minutes
- absentAfterMinutes: Mark absent after X minutes
- fineAmount: Fixed fine amount
- fineType: 'fixed' | 'per_minute' | 'progressive'
- finePerMinute: Fine per minute (if per_minute type)
- maxFinePerDay: Maximum fine per day
- applyToShiftId: Optional - specific shift
- applyToDepartmentId: Optional - specific department
- applyToBranchId: Optional - specific branch
- isActive: Soft delete flag
```

**Features**:
- Grace period configuration
- Progressive fine structure
- Shift-specific rules
- Department-specific rules
- Branch-specific rules
- Half-day and absent marking

**API Endpoints**:
- `GET /api/attendance-rules`
- `POST /api/attendance-rules` - Create rule
- `PUT /api/attendance-rules` - Update rule
- `DELETE /api/attendance-rules` - Soft delete rule

**Example Rules**:
```javascript
// Standard Late Mark Rule
{
  name: "Standard Late Mark Rule",
  ruleType: "late_mark",
  gracePeriodMinutes: 10,
  lateMarkAfterMinutes: 10,
  halfDayAfterMinutes: 240, // 4 hours
  absentAfterMinutes: 480, // 8 hours
  fineAmount: 0,
  fineType: "fixed",
  applyToShiftId: null, // All shifts
  applyToDepartmentId: null, // All departments
  applyToBranchId: null // All branches
}

// Fine Rule with Progressive Structure
{
  name: "Late Fine - Progressive",
  ruleType: "fine",
  gracePeriodMinutes: 10,
  lateMarkAfterMinutes: 10,
  fineAmount: 50, // Base fine
  fineType: "per_minute",
  finePerMinute: 5, // ₹5 per minute after grace
  maxFinePerDay: 500,
  applyToShiftId: 1 // Morning shift only
}

// Department-Specific Rule
{
  name: "Production Dept - Strict",
  ruleType: "late_mark",
  gracePeriodMinutes: 5,
  lateMarkAfterMinutes: 5,
  halfDayAfterMinutes: 180,
  fineAmount: 100,
  fineType: "fixed",
  applyToDepartmentId: 3 // Production department
}
```

---

### 4. Grades (Salary Bands)
**Purpose**: Define salary bands/grades for organizational hierarchy and compensation structure.

**Database Table**: `Grade`
```sql
- id: Primary key
- name: Grade name (e.g., "L1 - Junior", "L5 - Manager")
- code: Unique code (e.g., "L1", "L5", "M1")
- level: Numeric level (1, 2, 3, etc.)
- minSalary: Minimum salary for this grade
- maxSalary: Maximum salary for this grade
- description: Grade description
- benefits: Benefits associated with this grade
- isActive: Soft delete flag
```

**Features**:
- Define salary ranges per grade
- Hierarchical levels
- Benefits documentation
- Employee count per grade
- Validation against grade limits

**API Endpoints**:
- `GET /api/grades`
- `POST /api/grades` - Create grade
- `PUT /api/grades` - Update grade
- `DELETE /api/grades` - Soft delete grade (only if no employees assigned)

**Example Grades**:
```javascript
// Junior Level
{
  name: "L1 - Junior Engineer",
  code: "L1",
  level: 1,
  minSalary: 25000,
  maxSalary: 40000,
  description: "Entry-level engineers with 0-2 years experience",
  benefits: "Basic health insurance, PF, ESI"
}

// Mid Level
{
  name: "L3 - Senior Engineer",
  code: "L3",
  level: 3,
  minSalary: 50000,
  maxSalary: 80000,
  description: "Experienced engineers with 4-7 years experience",
  benefits: "Health insurance (family), PF, ESI, Performance bonus"
}

// Manager Level
{
  name: "M1 - Manager",
  code: "M1",
  level: 5,
  minSalary: 100000,
  maxSalary: 150000,
  description: "Team managers with 8+ years experience",
  benefits: "Premium health insurance, PF, ESI, Performance bonus, Stock options"
}
```

---

## Database Integration

### Schema Updates
The new tables are properly integrated with existing schema:

1. **Holiday** → **Branch** (optional foreign key)
2. **AttendanceRule** → **Shift** (optional foreign key)
3. **AttendanceRule** → **Department** (optional foreign key)
4. **AttendanceRule** → **Branch** (optional foreign key)
5. **Employee** → **Grade** (new gradeId field)

### Migration
Run the migration to create new tables:
```bash
npx prisma migrate dev --name add_admin_setup
npx prisma generate
```

---

## UI Implementation

### Organization Module Tabs
The organization module now has 6 tabs:
1. **Departments** - Existing functionality
2. **Designations** - Existing functionality
3. **Holidays** - NEW: Holiday calendar management
4. **Leave Policies** - NEW: Leave policy configuration
5. **Attendance Rules** - NEW: Late mark and fine rules
6. **Grades** - NEW: Salary band management

### Features
- Tab-based navigation
- CRUD operations for each entity
- Search and filter capabilities
- Responsive design
- Form validation
- Soft delete (isActive flag)

---

## Integration with Other Modules

### Attendance Module
- Checks Holiday table before marking absent
- Applies AttendanceRule for late marks and fines
- Calculates fines based on configured rules

### Leave Module
- Uses LeavePolicy for validation
- Checks annual quota
- Enforces carry-forward rules
- Validates notice period
- Checks document requirements

### Payroll Module
- Uses Grade for salary validation
- Applies attendance fines
- Calculates leave encashment
- Considers holidays for working days

### Employee Module
- Assigns Grade to employees
- Validates salary against grade limits
- Shows grade-based benefits

---

## Best Practices

### Holiday Calendar
1. Add all public holidays at the start of the year
2. Mark recurring holidays for automatic next-year application
3. Use branch-specific holidays for regional offices
4. Review and update annually

### Leave Policies
1. Define clear carry-forward limits
2. Set realistic notice periods
3. Document requirements for sick leave
4. Gender-specific policies for maternity/paternity
5. Probation period considerations

### Attendance Rules
1. Set reasonable grace periods (5-15 minutes)
2. Progressive fine structure for fairness
3. Department-specific rules for critical roles
4. Maximum fine limits to prevent excessive deductions
5. Clear communication to employees

### Grades
1. Non-overlapping salary ranges
2. Clear progression path (L1 → L2 → L3)
3. Document benefits clearly
4. Regular market benchmarking
5. Annual review and adjustment

---

## Testing Checklist

- [ ] Create holiday and verify attendance doesn't mark absent
- [ ] Create leave policy and apply to employee
- [ ] Test carry-forward calculation
- [ ] Test leave encashment
- [ ] Create attendance rule and test late marking
- [ ] Test fine calculation (fixed and per-minute)
- [ ] Create grade and assign to employee
- [ ] Validate salary against grade limits
- [ ] Test soft delete for all entities
- [ ] Test branch-specific configurations
- [ ] Test department-specific rules
- [ ] Test shift-specific rules

---

## Future Enhancements

1. **Holiday Calendar**
   - Import holidays from external API
   - Holiday calendar templates by country/region
   - Substitute holiday management

2. **Leave Policies**
   - Accrual-based leave (monthly accrual)
   - Negative leave balance
   - Leave approval workflow integration

3. **Attendance Rules**
   - Time-based rules (different rules for different times)
   - Seasonal rules (relaxed during festivals)
   - Warning system before fines

4. **Grades**
   - Grade progression rules
   - Automatic grade upgrades based on tenure
   - Grade-based access control

---

## API Documentation

All APIs follow REST conventions:
- **GET**: Fetch records (with optional filters)
- **POST**: Create new record
- **PUT**: Update existing record
- **DELETE**: Soft delete record (sets isActive = false)

All responses follow the format:
```json
{
  "success": true|false,
  "data": {...} | [...],
  "error": "Error message if failed"
}
```

---

## Support

For issues or questions:
1. Check database migration status
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Review Prisma client generation
5. Ensure all foreign keys are valid

---

**Last Updated**: 2024
**Version**: 1.0.0
