# Holiday Integration Guide

## Overview

The holiday system is now fully integrated across all HRMS modules to ensure holidays are properly handled in attendance, leave requests, timesheets, and payroll calculations.

## Key Features

### 1. Holiday Service (`src/lib/services/holiday-service.ts`)

Centralized service for all holiday-related operations:

- **`isHoliday(date, branchId?)`**: Check if a specific date is a holiday
- **`getHolidaysInRange(startDate, endDate, branchId?)`**: Get all holidays in a date range
- **`calculateWorkingDays(startDate, endDate, branchId?, excludeWeekends?)`**: Calculate working days excluding holidays and weekends
- **`getHolidayDates(startDate, endDate, branchId?)`**: Get array of holiday date strings

### 2. Attendance Module Integration

**API**: `src/app/api/attendance/route.ts`

**Behavior**:
- Prevents creating attendance records on holidays
- Returns error with holiday details if attempted
- Validates against both company-wide and branch-specific holidays

**Example Error Response**:
```json
{
  "success": false,
  "error": "Cannot create attendance on holiday: Independence Day",
  "holiday": {
    "name": "Independence Day",
    "date": "2026-08-15"
  }
}
```

### 3. Leave Request Module Integration

**API**: `src/app/api/leave/route.ts`

**Behavior**:
- Validates leave requests against holidays in the date range
- Rejects leave requests that include holidays
- Calculates working days excluding weekends and holidays
- Returns list of conflicting holidays if found

**Example Error Response**:
```json
{
  "success": false,
  "error": "Cannot apply leave on holidays: Diwali (2026-11-05), Diwali Holiday (2026-11-06). Please exclude these dates from your leave request.",
  "holidays": [
    { "name": "Diwali", "date": "2026-11-05" },
    { "name": "Diwali Holiday", "date": "2026-11-06" }
  ]
}
```

**Working Days Calculation**:
- Automatically excludes weekends (Saturday & Sunday)
- Excludes all holidays in the date range
- Uses actual working days for leave balance deduction

### 4. Timesheet Module Integration

**API**: `src/app/api/timesheet/holidays/route.ts`

**Endpoints**:

#### GET `/api/timesheet/holidays`
Get holidays for timesheet display

**Query Parameters**:
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `branchId` (optional): Branch ID for branch-specific holidays

**Response**:
```json
{
  "success": true,
  "data": {
    "holidays": [
      {
        "id": 1,
        "name": "Republic Day",
        "date": "2026-01-26T00:00:00.000Z",
        "type": "public",
        "description": "National Holiday"
      }
    ],
    "holidayMap": {
      "2026-01-26": {
        "name": "Republic Day",
        "type": "public"
      }
    },
    "dates": ["2026-01-26"]
  }
}
```

**Frontend Integration**:
- Fetch holidays for the current view period (daily/weekly/monthly)
- Display "H" or holiday marker in timesheet cells
- Show holiday name on hover
- Style holiday cells differently (e.g., light yellow background)

### 5. Payroll Module Integration

**API**: `src/app/api/payroll/generate/route.ts`

**Behavior**:
- Fetches holidays for the payroll month
- Includes holiday count in attendance data
- Excludes holidays from working days calculation
- Ensures employees are not penalized for holidays

**Attendance Data Structure**:
```typescript
{
  totalDays: 31,        // Total days in month
  presentDays: 22,      // Days employee was present
  paidLeaveDays: 2,     // Approved paid leave
  weeklyOffs: 4,        // Weekly offs (Sundays)
  holidays: 3,          // Public holidays
  lopDays: 0,           // Loss of pay days
  totalHours: 176       // Total working hours
}
```

**Working Days Calculation**:
```
Working Days = Total Days - Weekly Offs - Holidays
Expected Present Days = Working Days - Paid Leave Days
LOP Days = Expected Present Days - Actual Present Days
```

### 6. Holiday Check API

**API**: `src/app/api/holidays/check/route.ts`

**Endpoints**:

#### GET `/api/holidays/check?date=YYYY-MM-DD&branchId=1`
Check if a single date is a holiday

**Response**:
```json
{
  "success": true,
  "data": {
    "isHoliday": true,
    "holiday": {
      "id": 1,
      "name": "Independence Day",
      "date": "2026-08-15T00:00:00.000Z",
      "type": "public",
      "description": "National Holiday"
    }
  }
}
```

#### GET `/api/holidays/check?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&branchId=1`
Check holidays in a date range

**Response**:
```json
{
  "success": true,
  "data": {
    "holidays": [...],
    "count": 3,
    "dates": ["2026-08-15", "2026-10-02", "2026-11-05"]
  }
}
```

## Frontend Integration Examples

### 1. Leave Request Form

```typescript
// Validate dates before submitting
const validateLeaveDates = async (fromDate: string, toDate: string, branchId: number) => {
  const response = await fetch(
    `/api/holidays/check?startDate=${fromDate}&endDate=${toDate}&branchId=${branchId}`
  );
  const result = await response.json();
  
  if (result.success && result.data.count > 0) {
    alert(`Cannot apply leave on holidays: ${result.data.holidays.map(h => h.name).join(', ')}`);
    return false;
  }
  return true;
};
```

### 2. Timesheet Display

```typescript
// Fetch holidays for current view
const fetchHolidays = async (startDate: string, endDate: string) => {
  const response = await fetch(
    `/api/timesheet/holidays?startDate=${startDate}&endDate=${endDate}`
  );
  const result = await response.json();
  
  if (result.success) {
    setHolidayMap(result.data.holidayMap);
  }
};

// Render cell with holiday marker
const renderCell = (date: string, attendance: any) => {
  const holiday = holidayMap[date];
  
  if (holiday) {
    return (
      <div className="holiday-cell" title={holiday.name}>
        H
      </div>
    );
  }
  
  // Regular attendance rendering
  return renderAttendance(attendance);
};
```

### 3. Attendance Punch

```typescript
// Check if today is a holiday before allowing punch
const checkHolidayBeforePunch = async (employeeBranchId: number) => {
  const today = new Date().toISOString().split('T')[0];
  const response = await fetch(
    `/api/holidays/check?date=${today}&branchId=${employeeBranchId}`
  );
  const result = await response.json();
  
  if (result.success && result.data.isHoliday) {
    alert(`Today is a holiday: ${result.data.holiday.name}. Attendance not required.`);
    return false;
  }
  return true;
};
```

## Database Schema

### Holiday Model

```prisma
model Holiday {
  id            Int       @id @default(autoincrement())
  name          String
  date          DateTime
  type          String    @default("public")
  description   String?
  isRecurring   Boolean   @default(false)
  applicableTo  String    @default("all")
  branchId      Int?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime
  Branch        Branch?   @relation(fields: [branchId], references: [id])

  @@index([date])
  @@index([branchId])
}
```

## Holiday Types

- **public**: Public/National holidays (applicable to all)
- **optional**: Optional holidays (employee can choose)
- **restricted**: Restricted holidays (limited availability)

## Branch-Specific Holidays

- Set `branchId` to null for company-wide holidays
- Set `branchId` to specific branch ID for branch-specific holidays
- When checking holidays, both company-wide and branch-specific holidays are considered

## Best Practices

1. **Always validate dates**: Check for holidays before creating attendance or leave records
2. **Use working days**: Always use `calculateWorkingDays()` for accurate day counts
3. **Show holiday info**: Display holiday names and types in the UI
4. **Handle edge cases**: Consider partial overlaps in leave requests
5. **Cache holidays**: Cache holiday data in frontend for better performance
6. **Sync with calendar**: Integrate with calendar views to show holidays

## Testing Checklist

- [ ] Cannot create attendance on holidays
- [ ] Cannot apply leave on holidays
- [ ] Leave day calculation excludes holidays
- [ ] Timesheet shows "H" marker on holidays
- [ ] Payroll excludes holidays from working days
- [ ] Branch-specific holidays work correctly
- [ ] Company-wide holidays apply to all branches
- [ ] Holiday validation works in date ranges
- [ ] Error messages are clear and helpful
- [ ] Frontend shows holiday information

## Future Enhancements

1. **Recurring Holidays**: Auto-create holidays for next year
2. **Holiday Calendar**: Dedicated holiday calendar view
3. **Holiday Notifications**: Notify employees about upcoming holidays
4. **Holiday Swaps**: Allow employees to swap holidays
5. **Regional Holidays**: Support for state/region-specific holidays
6. **Holiday Reports**: Analytics on holiday utilization
7. **Compensatory Off**: Track comp-offs for working on holidays

## API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/holidays` | GET | List all holidays |
| `/api/holidays` | POST | Create holiday |
| `/api/holidays` | PUT | Update holiday |
| `/api/holidays` | DELETE | Soft delete holiday |
| `/api/holidays/check` | GET | Check if date(s) are holidays |
| `/api/timesheet/holidays` | GET | Get holidays for timesheet |
| `/api/attendance` | POST | Create attendance (validates holidays) |
| `/api/leave` | POST | Create leave request (validates holidays) |
| `/api/payroll/generate` | POST | Generate payroll (includes holidays) |

## Support

For issues or questions about holiday integration, check:
1. Holiday service logs in console
2. API error responses with holiday details
3. Database holiday records with `isActive: true`
4. Branch ID matching for branch-specific holidays
