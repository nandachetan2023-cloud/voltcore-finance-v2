# 🎯 Biometric Data Usage Across HRMS Modules

## Overview

This document maps how biometric punch data flows through and benefits each HRMS module.

---

## 📊 Module Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                    BIOMETRIC DEVICE                         │
│                  (eTimeOffice Cloud API)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              SYNC SERVICE (Every 5 minutes)                 │
│  • Fetches punch data                                       │
│  • Stores in BiometricRawLog                                │
│  • Processes to AttendanceLog                               │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐     ┌─────────┐    ┌──────────┐
    │Attendance│    │ Payroll │    │  Leave   │
    └────┬────┘     └────┬────┘    └────┬─────┘
         │               │              │
         └───────┬───────┴──────┬───────┘
                 │              │
                 ▼              ▼
         ┌──────────┐    ┌──────────┐
         │ Reports  │    │Dashboard │
         └──────────┘    └──────────┘
```

---

## 1️⃣ Attendance Module

### Primary Use Case
Real-time attendance tracking and management.

### How It's Used

#### Daily Attendance Tracking
```typescript
// Get today's attendance
GET /api/attendance?date=2026-04-15

// Response includes biometric data
{
  "employeeCode": "EMP001",
  "punchIn": "2026-04-15T09:05:00Z",
  "punchOut": "2026-04-15T18:30:00Z",
  "source": "biometric",
  "biometricDeviceId": "Device-1"
}
```

#### Real-time Office Presence
```typescript
// Who's currently in office?
const inOffice = await db.attendanceLog.findMany({
  where: {
    logDate: today,
    punchIn: { not: null },
    punchOut: null,
    source: 'biometric'
  }
})
```

#### Attendance Summary
- Total present
- Total absent
- Late arrivals
- Early departures

### Benefits
✅ Automated attendance capture
✅ Eliminates manual entry errors
✅ Real-time visibility
✅ Accurate time tracking

---

## 2️⃣ Payroll Module

### Primary Use Case
Calculate salaries based on actual working hours.

### How It's Used

#### Working Hours Calculation
```typescript
// Calculate monthly hours
const logs = await db.attendanceLog.findMany({
  where: {
    employeeId: 123,
    logDate: { gte: startOfMonth, lte: endOfMonth }
  }
})

const totalHours = logs.reduce((sum, log) => {
  return sum + differenceInHours(log.punchOut, log.punchIn)
}, 0)
```

#### Overtime Calculation
```typescript
// Hours worked > 8 hours/day = overtime
const overtimeHours = totalHours > 8 ? totalHours - 8 : 0
const overtimePay = overtimeHours * hourlyRate * 1.5
```

#### Late Arrival Penalties
```typescript
// Deduct for late arrivals
const lateCount = await db.attendanceLog.count({
  where: {
    employeeId: 123,
    punchIn: { gte: new Date('09:30:00') } // After 9:30 AM
  }
})

const penalty = lateCount * 100 // ₹100 per late arrival
```

#### Absent Day Deductions
```typescript
// Days without attendance = absent
const workingDays = 26
const presentDays = logs.length
const absentDays = workingDays - presentDays
const absentDeduction = (monthlySalary / workingDays) * absentDays
```

### Payroll Components Affected
- Basic Salary (pro-rated by attendance)
- Overtime Pay (calculated from extra hours)
- Late Penalties (deducted)
- Absent Deductions (deducted)
- Attendance Allowance (bonus for 100% attendance)

### Benefits
✅ Accurate salary calculations
✅ Automated overtime tracking
✅ Fair penalty system
✅ Reduced payroll disputes

---

## 3️⃣ Leave Management Module

### Primary Use Case
Verify leave applications against actual attendance.

### How It's Used

#### Leave Validation
```typescript
// Check if employee was actually present on leave day
const attendance = await db.attendanceLog.findFirst({
  where: {
    employeeId: 123,
    logDate: leaveDate,
    source: 'biometric'
  }
})

if (attendance) {
  // Employee was present - reject leave or mark as invalid
  return { status: 'INVALID', reason: 'Biometric attendance found' }
}
```

#### Leave Discrepancy Detection
```typescript
// Find cases where leave approved but employee was present
const discrepancies = await db.attendanceLog.findMany({
  where: {
    source: 'biometric',
    // Join with Leave table where status = 'approved'
  }
})
```

#### Half-Day Leave Verification
```typescript
// Verify half-day leave by checking hours worked
const hours = differenceInHours(punchOut, punchIn)
if (hours >= 4 && hours < 8) {
  // Valid half-day
}
```

### Benefits
✅ Prevents leave fraud
✅ Automated verification
✅ Accurate leave balance
✅ Compliance with policy

---

## 4️⃣ Reports & Analytics Module

### Primary Use Case
Generate insights from attendance patterns.

### Reports Generated

#### 1. Late Arrival Report
```typescript
// Employees who arrived late
const lateReport = await db.attendanceLog.findMany({
  where: {
    punchIn: { gte: new Date('09:30:00') }
  },
  include: { employee: { include: { department: true } } }
})
```

**Output:**
| Employee | Department | Date | Punch In | Minutes Late |
|----------|------------|------|----------|--------------|
| John Doe | IT | 2026-04-15 | 09:45 | 15 |
| Jane Smith | HR | 2026-04-15 | 10:00 | 30 |

#### 2. Overtime Report
```typescript
// Employees who worked overtime
const overtimeReport = logs.filter(log => {
  const hours = differenceInHours(log.punchOut, log.punchIn)
  return hours > 8
})
```

**Output:**
| Employee | Date | Hours Worked | Overtime Hours |
|----------|------|--------------|----------------|
| John Doe | 2026-04-15 | 10.5 | 2.5 |

#### 3. Attendance Percentage by Department
```typescript
const deptReport = await db.department.findMany({
  include: {
    employees: {
      include: { attendanceLogs: true }
    }
  }
})

// Calculate attendance % per department
```

**Output:**
| Department | Total Employees | Attendance % |
|------------|----------------|--------------|
| IT | 25 | 92.5% |
| HR | 10 | 95.0% |
| Sales | 30 | 88.3% |

#### 4. Punctuality Report
```typescript
// On-time vs late arrivals
const punctualityReport = employees.map(emp => {
  const onTime = emp.attendanceLogs.filter(a => 
    a.punchIn < new Date('09:30:00')
  ).length
  return {
    employee: emp.name,
    punctualityPercentage: (onTime / emp.attendanceLogs.length) * 100
  }
})
```

#### 5. Working Hours Trend
```typescript
// Average working hours over time
const trend = await db.attendanceLog.groupBy({
  by: ['logDate'],
  _avg: { /* calculate hours */ }
})
```

### Benefits
✅ Data-driven decisions
✅ Identify patterns
✅ Performance insights
✅ Compliance reporting

---

## 5️⃣ Dashboard Module

### Primary Use Case
Real-time attendance visibility for management.

### Dashboard Widgets

#### 1. Today's Attendance Summary
```typescript
const stats = {
  totalEmployees: 100,
  present: 85,
  absent: 15,
  late: 12,
  currentlyInOffice: 78
}
```

**Display:**
```
┌─────────────────────────────────────┐
│   TODAY'S ATTENDANCE                │
├─────────────────────────────────────┤
│ Present:    85/100 (85%)            │
│ Absent:     15                      │
│ Late:       12                      │
│ In Office:  78                      │
└─────────────────────────────────────┘
```

#### 2. Recent Punch Activity
```typescript
// Last 10 punches
const recentPunches = await db.attendanceLog.findMany({
  orderBy: { punchIn: 'desc' },
  take: 10,
  include: { employee: true }
})
```

**Display:**
```
Recent Activity:
• John Doe punched in at 09:05 AM
• Jane Smith punched in at 09:12 AM
• Bob Johnson punched out at 06:30 PM
```

#### 3. Department-wise Attendance
```typescript
// Attendance by department
const deptStats = await db.department.findMany({
  include: {
    employees: {
      include: {
        attendanceLogs: {
          where: { logDate: today }
        }
      }
    }
  }
})
```

**Display:**
```
Department Attendance:
IT:     22/25 (88%)
HR:     9/10  (90%)
Sales:  25/30 (83%)
```

#### 4. Attendance Trend Chart
```typescript
// Last 7 days attendance
const trend = await db.attendanceLog.groupBy({
  by: ['logDate'],
  _count: true,
  where: {
    logDate: { gte: last7Days }
  }
})
```

**Display:**
```
Attendance Trend (Last 7 Days)
100 ┤     ╭─╮
 90 ┤   ╭─╯ ╰─╮
 80 ┤ ╭─╯     ╰─╮
 70 ┤─╯         ╰─
    └─────────────
    Mon Tue Wed Thu Fri Sat Sun
```

### Benefits
✅ Real-time visibility
✅ Quick decision making
✅ Trend identification
✅ Proactive management

---

## 6️⃣ Performance Management Module

### Primary Use Case
Factor attendance into performance reviews.

### How It's Used

#### Attendance Score
```typescript
// Calculate attendance score for performance review
const attendanceScore = (presentDays / workingDays) * 100
const punctualityScore = (onTimeDays / presentDays) * 100

const overallScore = (attendanceScore * 0.6) + (punctualityScore * 0.4)
```

#### Performance Metrics
- Attendance Rate: 95%
- Punctuality Rate: 90%
- Overtime Hours: 20 hours/month
- Consistency: High/Medium/Low

### Benefits
✅ Objective performance data
✅ Fair evaluations
✅ Identify dedication
✅ Reward consistency

---

## 7️⃣ Compliance & Audit Module

### Primary Use Case
Maintain audit trail for labor law compliance.

### How It's Used

#### Audit Trail
```typescript
// Complete punch history
const auditTrail = await db.biometricRawLog.findMany({
  where: {
    empCode: 'EMP001',
    punchDate: { gte: startDate, lte: endDate }
  },
  orderBy: { punchDate: 'asc' }
})
```

#### Compliance Reports
- Working hours compliance (max 48 hours/week)
- Overtime limits
- Rest day compliance
- Shift pattern adherence

#### Anomaly Detection
```typescript
// Detect unusual patterns
const anomalies = {
  multiplePunches: [], // More than 4 punches/day
  shortHours: [],      // Less than 2 hours worked
  noCheckout: [],      // Punch in but no punch out
  weekendWork: []      // Work on declared holidays
}
```

### Benefits
✅ Legal compliance
✅ Audit readiness
✅ Fraud detection
✅ Dispute resolution

---

## 8️⃣ Shift Management Module

### Primary Use Case
Verify shift adherence and calculate shift allowances.

### How It's Used

#### Shift Compliance
```typescript
// Check if employee worked assigned shift
const shift = await db.shiftAssignment.findFirst({
  where: { employeeId: 123, effectiveFrom: { lte: today } }
})

const attendance = await db.attendanceLog.findFirst({
  where: { employeeId: 123, logDate: today }
})

// Compare shift.startTime with attendance.punchIn
const isOnTime = attendance.punchIn <= shift.startTime
```

#### Night Shift Allowance
```typescript
// Calculate night shift allowance
if (shift.type === 'night' && attendance.punchIn >= '22:00') {
  const nightAllowance = baseSalary * 0.15 // 15% extra
}
```

### Benefits
✅ Shift adherence tracking
✅ Accurate allowance calculation
✅ Roster optimization
✅ Fair compensation

---

## 9️⃣ Project Management Module

### Primary Use Case
Track time spent on projects for billing.

### How It's Used

#### Project Time Tracking
```typescript
// Link attendance to project work
const projectHours = await db.attendanceLog.findMany({
  where: {
    employeeId: 123,
    // Join with project assignments
  }
})

// Calculate billable hours
const billableHours = projectHours.reduce((sum, log) => {
  return sum + differenceInHours(log.punchOut, log.punchIn)
}, 0)
```

#### Client Billing
```typescript
// Generate timesheet for client billing
const timesheet = {
  employee: 'John Doe',
  project: 'Project X',
  hoursWorked: 160,
  hourlyRate: 50,
  totalBilling: 8000
}
```

### Benefits
✅ Accurate time tracking
✅ Client billing support
✅ Project cost analysis
✅ Resource utilization

---

## 🔟 Finance Module

### Primary Use Case
Integrate attendance data with financial calculations.

### How It's Used

#### Labor Cost Calculation
```typescript
// Calculate actual labor cost
const laborCost = employees.reduce((sum, emp) => {
  const hoursWorked = calculateHours(emp.attendanceLogs)
  return sum + (hoursWorked * emp.hourlyRate)
}, 0)
```

#### Budget vs Actual
```typescript
// Compare budgeted vs actual labor hours
const budgetedHours = 2000
const actualHours = calculateTotalHours(attendanceLogs)
const variance = budgetedHours - actualHours
```

### Benefits
✅ Accurate cost tracking
✅ Budget monitoring
✅ Financial planning
✅ Cost optimization

---

## 📈 Summary: Module Impact Matrix

| Module | Impact Level | Key Benefit |
|--------|-------------|-------------|
| Attendance | 🔴 Critical | Automated tracking |
| Payroll | 🔴 Critical | Accurate calculations |
| Leave | 🟡 High | Fraud prevention |
| Reports | 🟡 High | Data insights |
| Dashboard | 🟡 High | Real-time visibility |
| Performance | 🟢 Medium | Objective metrics |
| Compliance | 🟡 High | Audit trail |
| Shift | 🟢 Medium | Adherence tracking |
| Projects | 🟢 Medium | Time tracking |
| Finance | 🟡 High | Cost accuracy |

---

## 🎯 Implementation Priority

### Phase 1: Core (Week 1)
1. ✅ Attendance Module
2. ✅ Sync Service
3. ✅ Dashboard Widgets

### Phase 2: Financial (Week 2)
4. ✅ Payroll Integration
5. ✅ Leave Verification
6. ✅ Basic Reports

### Phase 3: Advanced (Week 3)
7. ✅ Analytics & Trends
8. ✅ Compliance Reports
9. ✅ Anomaly Detection

### Phase 4: Optimization (Week 4)
10. ✅ Performance Metrics
11. ✅ Project Time Tracking
12. ✅ Advanced Dashboards

---

## 🚀 Next Steps

1. **Setup**: Follow `BIOMETRIC_QUICK_START.md`
2. **Test**: Use `examples/biometric-usage-examples.ts`
3. **Deploy**: Follow `BIOMETRIC_INTEGRATION.md`
4. **Monitor**: Check sync status regularly
5. **Optimize**: Analyze reports and adjust

---

**Last Updated**: April 15, 2026
**Version**: 1.0.0
