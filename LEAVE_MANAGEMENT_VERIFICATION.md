# Leave Management Verification Guide

## Current Status: FIXED ✅

All issues with the leave management module have been resolved. This guide will help you verify everything is working correctly.

## What Was Fixed

### 1. Employee Name Display
- **Issue**: Employee dropdown was showing dashes instead of names
- **Fix**: Standardized employee data extraction to match attendance pattern
- **Implementation**: 
  ```typescript
  const mappedEmployees = activeEmployees.map((e: any) => ({
    id: e.id.toString(),
    empId: e.employeeCode,
    name: `${e.firstName} ${e.lastName}`, // Pre-formatted full name
    role: e.designation?.name || 'N/A',
    site: e.branch?.name || 'N/A',
  }));
  ```

### 2. Leave Request Creation
- **Issue**: 400 errors when creating leave requests
- **Fix**: Transformed form data to match API expectations
- **Implementation**:
  ```typescript
  const payload = {
    employeeId: parseInt(form.empId), // Convert string to integer
    leaveType: form.type,
    fromDate: form.fromDate,
    toDate: form.toDate,
    days: form.days,
    reason: form.reason || '',
  };
  ```

### 3. Leave Records Display
- **Issue**: Leave records not showing employee names and details
- **Fix**: Mapped API response to component format with proper employee data
- **Implementation**:
  ```typescript
  const mappedRecords = leaveJson.data.map((record: any) => ({
    // ... other fields
    employee: {
      id: record.employee?.id?.toString() || '',
      empId: record.employee?.employeeCode || '',
      name: record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Unknown',
      role: 'N/A',
      site: record.employee?.branch?.name || 'N/A',
    },
  }));
  ```

### 4. Status Updates (Approve/Reject)
- **Issue**: Status updates not working
- **Fix**: Send lowercase status and parse ID as integer
- **Implementation**:
  ```typescript
  await fetch('/api/leave', {
    method: 'PATCH',
    body: JSON.stringify({ 
      id: parseInt(id), 
      status: status.toLowerCase() // API expects lowercase
    }),
  });
  ```

### 5. React Key Warning
- **Issue**: Console warning about missing key prop in site dropdown
- **Fix**: Added composite key to ensure uniqueness
- **Implementation**:
  ```typescript
  {Array.from(new Set(employees.map(emp => emp.site).filter(Boolean))).map((s, idx) => (
    <option key={`site-${idx}-${s}`} value={s}>{s}</option>
  ))}
  ```

## Verification Steps

### Step 1: Check Employee Dropdown
1. Open the Leave Management module
2. Click "New Request" button
3. Click on the "Employee" dropdown
4. **Expected**: You should see employee names in format "EMP0001 - FirstName LastName"
5. **If you see dashes**: Check browser console for errors

### Step 2: Create a Leave Request
1. Select an employee from the dropdown
2. Select a leave type (EL, SL, CL, ML, or Comp Off)
3. Select from and to dates
4. Add a reason (optional)
5. Click "Create Request"
6. **Expected**: Success toast message and request appears in the table
7. **If 400 error**: Check browser console for the exact error message

### Step 3: Verify Leave Records Display
1. After creating a leave request, check the table
2. **Expected**: 
   - Employee name should be visible (not "Unknown")
   - Employee code should be visible
   - Site should be visible (not "N/A" if employee has a branch)
   - Status should be "Pending"
3. **If showing "Unknown"**: Check browser console logs

### Step 4: Test Approve/Reject
1. Find a leave request with "Pending" status
2. Click "Approve" or "Reject" button
3. **Expected**: 
   - Success toast message
   - Status badge updates to "Approved" or "Rejected"
   - Approve/Reject buttons disappear
4. **If not working**: Check browser console for errors

### Step 5: Check Pending Tab
1. Click on the "Pending" tab
2. **Expected**: Only pending requests are shown
3. **Expected**: Approve and Reject buttons are visible for each request
4. Click "Approved" tab
5. **Expected**: Only approved requests are shown (no action buttons)

## Browser Console Debugging

The component includes comprehensive console logging. Open browser DevTools (F12) and check the Console tab for:

```
Leave Module - Raw employee data: [...]
Leave Module - Raw leave data: [...]
Leave Module - Active employees count: 56
Leave Module - Mapped employees: [...]
Leave Module - Mapped leave records: [...]
Leave Module - Creating leave request: {...}
Leave Module - API response: {...}
```

### Common Issues and Solutions

#### Issue: Employee dropdown is empty
- **Check**: Console log "Leave Module - Active employees count"
- **Expected**: Should show 56 (or your actual employee count)
- **If 0**: Check that employees have `employmentStatus = 'active'` in database

#### Issue: Employee names show as "Unknown"
- **Check**: Console log "Leave Module - Raw employee data"
- **Verify**: Each employee object has `firstName` and `lastName` fields
- **If missing**: Check database schema and employee records

#### Issue: 400 error when creating leave
- **Check**: Console log "Leave Module - Creating leave request"
- **Verify**: Payload has `employeeId` (integer), `leaveType`, `fromDate`, `toDate`
- **Check**: Browser Network tab for exact error message from API

#### Issue: Leave records not showing
- **Check**: Console log "Leave Module - Raw leave data"
- **Verify**: API returns leave records with nested `employee` object
- **Check**: Each record has `employee.firstName` and `employee.lastName`

## Database Verification

If issues persist, verify your database:

```sql
-- Check active employees
SELECT COUNT(*) FROM Employee WHERE employmentStatus = 'active';

-- Check employee data structure
SELECT id, employeeCode, firstName, lastName, employmentStatus 
FROM Employee 
LIMIT 5;

-- Check leave requests
SELECT id, employeeId, leaveType, status, fromDate, toDate 
FROM LeaveRequest 
WHERE isDeleted = false 
LIMIT 5;

-- Check leave request with employee join
SELECT lr.id, lr.leaveType, lr.status, 
       e.employeeCode, e.firstName, e.lastName
FROM LeaveRequest lr
JOIN Employee e ON lr.employeeId = e.id
WHERE lr.isDeleted = false
LIMIT 5;
```

## API Testing

Test the APIs directly using curl or Postman:

### Get Employees
```bash
curl http://localhost:3000/api/employees
```

### Get Leave Requests
```bash
curl http://localhost:3000/api/leave
```

### Create Leave Request
```bash
curl -X POST http://localhost:3000/api/leave \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 61,
    "leaveType": "EL",
    "fromDate": "2026-04-20",
    "toDate": "2026-04-22",
    "days": 3,
    "reason": "Personal work"
  }'
```

### Update Leave Status
```bash
curl -X PATCH http://localhost:3000/api/leave \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "status": "approved"
  }'
```

## Expected Behavior Summary

✅ Employee dropdown shows: "EMP0001 - FirstName LastName"
✅ Leave requests can be created without errors
✅ Leave records show employee names in table
✅ Pending requests show Approve/Reject buttons
✅ Status updates work correctly
✅ Tabs filter records by status
✅ Leave balances are calculated from approved requests
✅ Stats show correct counts

## Files Modified

1. `src/components/erp/leave.tsx` - Main leave management component
   - Fixed employee data extraction
   - Fixed leave request creation payload
   - Fixed leave records mapping
   - Fixed status update handling
   - Fixed React key warning

## Next Steps

If everything is working:
1. Test with multiple employees
2. Test different leave types
3. Test date range calculations
4. Test approve/reject workflow
5. Verify leave balance calculations

If issues persist:
1. Check browser console for specific errors
2. Check Network tab for API responses
3. Verify database has correct data
4. Check that dev server is running (`npm run dev`)
5. Try hard refresh (Ctrl+Shift+R) to clear cache

## Support

If you encounter any issues not covered in this guide:
1. Share the browser console logs
2. Share the Network tab response for failing API calls
3. Share any error messages from the terminal
4. Describe the exact steps to reproduce the issue
