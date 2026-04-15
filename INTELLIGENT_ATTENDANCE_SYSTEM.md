# Intelligent Attendance Status System

## Overview

Implemented a smart attendance status calculation system that automatically determines employee attendance status based on shift timings, punch data, and date logic.

---

## Key Features

### 1. **Future Date Handling**
- ✅ Future dates show no status (displays "—")
- ✅ Prevents marking employees absent for dates that haven't occurred
- ✅ Status only appears once the date has passed or is current

### 2. **Shift-Based Status Calculation**
- ✅ Uses employee's assigned shift timing
- ✅ 10-minute grace period (configurable per shift)
- ✅ Automatic late detection
- ✅ Intelligent absent marking

### 3. **Grace Period Logic**
- ✅ Default: 10 minutes after shift start time
- ✅ Configurable per shift (stored in `graceMinutes` field)
- ✅ Punch in within grace period = Present
- ✅ Punch in after grace period = Late

### 4. **Absent Status Rules**
- ✅ Only marked absent AFTER shift end time has passed
- ✅ For today: Status remains "pending" until shift ends
- ✅ For past dates: Marked absent if no punch in
- ✅ Never marks future dates as absent

---

## Status Calculation Logic

### Status Flow Chart:

```
Is Future Date?
├─ YES → Status: "—" (pending, not shown)
└─ NO → Has Punch In?
    ├─ YES → Has Shift Timing?
    │   ├─ YES → Punch In Time <= (Shift Start + Grace)?
    │   │   ├─ YES → Status: "Present" ✅
    │   │   └─ NO → Status: "Late" ⚠️
    │   └─ NO → Status: "Present" ✅
    └─ NO → Has Shift Timing?
        ├─ YES → Is Today?
        │   ├─ YES → Current Time > Shift End?
        │   │   ├─ YES → Status: "Absent" ❌
        │   │   └─ NO → Status: "—" (pending)
        │   └─ NO → Status: "Absent" ❌
        └─ NO → Is Today?
            ├─ YES → Status: "—" (pending)
            └─ NO → Status: "Absent" ❌
```

---

## Examples

### Example 1: Employee with Shift Timing

**Shift Details:**
- Start Time: 09:00
- End Time: 18:00
- Grace Period: 10 minutes
- Grace Deadline: 09:10

**Scenarios:**

| Punch In Time | Status | Reason |
|---------------|--------|--------|
| 08:55 | Present ✅ | Within grace period |
| 09:05 | Present ✅ | Within grace period |
| 09:10 | Present ✅ | Exactly at grace deadline |
| 09:15 | Late ⚠️ | 5 minutes late |
| 09:30 | Late ⚠️ | 20 minutes late |
| No punch | Absent ❌ | After 18:00 (shift end) |

### Example 2: Today's Attendance (Current Time: 10:00)

**Shift: 09:00 - 18:00**

| Employee | Punch In | Status | Reason |
|----------|----------|--------|--------|
| Employee A | 08:55 | Present ✅ | Punched in on time |
| Employee B | 09:15 | Late ⚠️ | Punched in after grace |
| Employee C | No punch | — (pending) | Shift hasn't ended yet |

**At 18:30 (after shift end):**

| Employee | Punch In | Status | Reason |
|----------|----------|--------|--------|
| Employee C | No punch | Absent ❌ | Shift ended, no punch in |

### Example 3: Future Dates

**Date: 2026-04-20 (Future)**

| Employee | Punch In | Status | Reason |
|----------|----------|--------|--------|
| Any Employee | Any | — | Future date - status not applicable |

---

## Database Schema

### Shift Model:
```prisma
model Shift {
  id              Int       @id @default(autoincrement())
  name            String
  type            String    @default("fixed") // fixed, flexi
  startTime       String    // HH:mm format (e.g., "09:00")
  endTime         String    // HH:mm format (e.g., "18:00")
  crossesMidnight Boolean   @default(false)
  breakMinutes    Int       @default(60)
  graceMinutes    Int       @default(10)  // ← Grace period
  otThresholdMin  Int       @default(30)
  weekOffDays     Int[]     // 0-6 (Sun-Sat)
  
  isActive        Boolean   @default(true)
  isDeleted       Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  assignments     ShiftAssignment[]
}

model ShiftAssignment {
  id              Int       @id @default(autoincrement())
  employeeId      Int
  employee        Employee  @relation(fields: [employeeId], references: [id])
  shiftId         Int
  shift           Shift     @relation(fields: [shiftId], references: [id])
  effectiveFrom   DateTime
  effectiveTo     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## API Endpoints

### 1. GET /api/shifts
Fetch all active shifts

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Day Shift",
      "startTime": "09:00",
      "endTime": "18:00",
      "graceMinutes": 10,
      "crossesMidnight": false
    }
  ]
}
```

### 2. GET /api/attendance
Fetch attendance with intelligent status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employeeId": 1,
      "logDate": "2026-04-16",
      "punchIn": "2026-04-16T09:05:00",
      "punchOut": "2026-04-16T18:10:00",
      "status": "present",
      "employee": {
        "employeeCode": "EMP0001",
        "firstName": "Rajesh",
        "lastName": "Kumar"
      }
    }
  ]
}
```

---

## Utility Functions

### Location: `src/lib/attendance-utils.ts`

#### 1. `calculateAttendanceStatus(record)`
Calculates the intelligent status based on all rules

**Parameters:**
```typescript
{
  date: string;           // YYYY-MM-DD
  punchIn: string | null; // ISO datetime
  punchOut: string | null;
  status: string;
  shiftTiming?: {
    startTime: string;    // HH:mm
    endTime: string;
    graceMinutes: number;
    crossesMidnight: boolean;
  };
}
```

**Returns:**
```typescript
{
  status: string;      // 'present', 'late', 'absent', 'pending'
  reason: string;      // Human-readable reason
  shouldShow: boolean; // Whether to display status in UI
}
```

#### 2. `getDisplayStatus(record)`
Gets the UI-ready status with colors

**Returns:**
```typescript
{
  status: string;
  color: string;  // Tailwind classes
  label: string;  // Display label
}
```

#### 3. `isFutureDate(dateStr)`
Checks if a date is in the future

#### 4. `isToday(dateStr)`
Checks if a date is today

#### 5. `calculateOTHours(punchIn, punchOut, shiftTiming)`
Calculates overtime hours based on shift duration

---

## UI Components

### Status Badge Colors:

| Status | Color | Badge |
|--------|-------|-------|
| Present | Green (#00e676) | ✅ Present |
| Late | Orange (#ffab40) | ⚠️ Late |
| Absent | Red (#ff3d3d) | ❌ Absent |
| On Leave | Purple (#a78bfa) | 🏖️ On Leave |
| Half Day | Blue (#00d4ff) | ⏰ Half Day |
| Pending | Gray (#5a6878) | — |

### Info Banner:
Displays at the top of attendance module explaining the intelligent status logic to users.

---

## Configuration

### Default Values:
- **Grace Period**: 10 minutes (configurable per shift)
- **OT Threshold**: 30 minutes
- **Break Time**: 60 minutes
- **Standard Work Hours**: 8 hours

### Customization:
1. Edit shift in database to change grace period
2. Update `graceMinutes` field in Shift table
3. System automatically uses new grace period

---

## Benefits

### For HR/Admin:
1. ✅ No manual status updates needed
2. ✅ Accurate attendance tracking
3. ✅ Fair grace period for employees
4. ✅ Automatic late detection
5. ✅ No false absents for future dates

### For Employees:
1. ✅ 10-minute grace period
2. ✅ Fair late marking
3. ✅ No premature absent marking
4. ✅ Transparent status calculation

### For System:
1. ✅ Consistent status logic
2. ✅ Shift-aware calculations
3. ✅ Timezone-aware (IST)
4. ✅ Scalable and maintainable

---

## Testing Scenarios

### Test Case 1: Future Date
- **Date**: Tomorrow
- **Expected**: Status shows "—" (not displayed)
- **Actual**: ✅ Pass

### Test Case 2: On-Time Arrival
- **Shift**: 09:00 - 18:00 (Grace: 10 min)
- **Punch In**: 09:05
- **Expected**: Present
- **Actual**: ✅ Pass

### Test Case 3: Late Arrival
- **Shift**: 09:00 - 18:00 (Grace: 10 min)
- **Punch In**: 09:15
- **Expected**: Late
- **Actual**: ✅ Pass

### Test Case 4: Today, No Punch, Before Shift End
- **Shift**: 09:00 - 18:00
- **Current Time**: 10:00
- **Punch In**: None
- **Expected**: Pending (—)
- **Actual**: ✅ Pass

### Test Case 5: Today, No Punch, After Shift End
- **Shift**: 09:00 - 18:00
- **Current Time**: 19:00
- **Punch In**: None
- **Expected**: Absent
- **Actual**: ✅ Pass

### Test Case 6: Past Date, No Punch
- **Date**: Yesterday
- **Punch In**: None
- **Expected**: Absent
- **Actual**: ✅ Pass

---

## Migration Guide

### For Existing Systems:

1. **Run Database Migration** (if shifts don't exist):
```bash
npx prisma migrate dev --name add_shift_management
```

2. **Create Default Shifts**:
```sql
INSERT INTO "Shift" (name, type, "startTime", "endTime", "graceMinutes", "breakMinutes")
VALUES 
  ('Day Shift', 'fixed', '09:00', '18:00', 10, 60),
  ('Night Shift', 'fixed', '21:00', '06:00', 10, 60);
```

3. **Assign Employees to Shifts**:
```sql
INSERT INTO "ShiftAssignment" ("employeeId", "shiftId", "effectiveFrom")
SELECT id, 1, CURRENT_DATE
FROM "Employee"
WHERE "employmentStatus" = 'active';
```

4. **Update Attendance Module**:
- Already updated with intelligent status logic
- No code changes needed

---

## Troubleshooting

### Issue: All employees showing absent
**Solution**: Check if shifts are assigned to employees

### Issue: Status not updating
**Solution**: Clear browser cache and reload

### Issue: Wrong timezone
**Solution**: System uses IST (UTC+5:30) - verify server timezone

### Issue: Grace period not working
**Solution**: Verify `graceMinutes` field in Shift table

---

## Future Enhancements

### Planned Features:
1. 🔄 Configurable grace period per employee
2. 🔄 Multiple shifts per day support
3. 🔄 Automatic shift rotation
4. 🔄 Holiday calendar integration
5. 🔄 Weekend detection
6. 🔄 Half-day auto-detection
7. 🔄 Notification for late arrivals
8. 🔄 Attendance regularization workflow

---

## Files Modified

1. ✅ `src/lib/attendance-utils.ts` - Created utility functions
2. ✅ `src/app/api/shifts/route.ts` - Implemented shifts API
3. ✅ `src/components/erp/attendance.tsx` - Updated with intelligent status
4. ✅ `INTELLIGENT_ATTENDANCE_SYSTEM.md` - This documentation

---

## Status

✅ **FULLY IMPLEMENTED AND WORKING**

The intelligent attendance system is now live and automatically calculates status based on:
- Date (future/current/past)
- Shift timing
- Grace period
- Punch in/out times

No manual intervention needed!

