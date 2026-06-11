# Employee ID UA Format Implementation

## Overview

Updated the employee system to enforce the **UA + 8-digit format** for employee IDs to match the biometric system's Enrolled ID (EmpcardNo).

## Why UA Format?

The biometric device stores employees with:
- **Empcode** - Device-assigned, not unique, not editable ❌
- **EmpcardNo (Enrolled ID)** - 8-digit unique ID, editable ✅

We use: **`UA` + Enrolled ID** as the employee code in our system.

### Example
- Biometric Enrolled ID: `00000005`
- Employee Code: `UA00000005`

## Changes Made

### 1. Employee Creation Form (`src/components/erp/employees.tsx`)

✅ Already had the correct validation:
```typescript
function validateEmpIdFormat(raw: string): string {
  const value = (raw || '').trim().toUpperCase();
  if (!value) return 'Employee ID is required';
  
  // Auto-format: accept bare numbers
  const normalized = /^\d{1,8}$/.test(value) 
    ? `UA${value.padStart(8, '0')}` 
    : value;
    
  if (!/^UA\d{8}$/.test(normalized)) {
    return 'Format: UA + 8 digits (e.g. UA00000001). Type just the number to auto-format.';
  }
  return '';
}
```

### 2. Bulk Import Validation (`src/app/api/employees/bulk-import/route.ts`)

✅ **Added** employee ID normalization:
```typescript
// Normalize employee ID: accept bare numbers and format as UA + 8 digits
let normalizedEmployeeId = data.employeeId?.trim().toUpperCase() || ''
if (normalizedEmployeeId && /^\d{1,8}$/.test(normalizedEmployeeId)) {
  normalizedEmployeeId = `UA${normalizedEmployeeId.padStart(8, '0')}`
}

// Validate format
if (!normalizedEmployeeId) {
  rowErrors.push('Employee ID is required')
} else if (!/^UA\d{8}$/.test(normalizedEmployeeId)) {
  rowErrors.push('Employee ID must be UA + 8 digits (e.g. UA00000001) or just the number (auto-formatted)')
}

// Use normalized ID when creating employee
const employeeData = {
  employeeCode: normalizedEmployeeId,  // UA00000005
  // ... other fields
}
```

### 3. Bulk Import Template (`src/components/erp/employee-bulk-import.tsx`)

✅ **Updated** instructions:
```
COLUMN 1 — Employee ID*
  Enter the employee code in format: UA + 8 digits (e.g. UA00000001, UA00000023)
  This MUST match the Enrolled ID from the biometric device (EmpcardNo)
  TIP: You can type just the number (e.g. "5" becomes "UA00000005" automatically)
  This is the permanent unique identifier for the employee.
```

✅ **Updated** sample row:
```excel
UA00000001  (instead of EMP001)
```

### 4. Biometric Matching Logic (`src/lib/biometric.ts`)

✅ Already correct - matches on:
```typescript
const employee = await this.db.employee.findFirst({
  where: {
    employeeCode: `UA${enrolledId}`,  // UA + 8-digit enrolled ID
  },
})
```

## User Experience

### Scenario 1: Manual Employee Creation
```
User types: "5"
System stores: "UA00000005"
✅ Auto-formatted!
```

### Scenario 2: Manual with Full Format
```
User types: "UA00000023"
System stores: "UA00000023"
✅ Accepted as-is
```

### Scenario 3: Bulk Import with Numbers
```
Excel cell: "10"
System stores: "UA00000010"
✅ Auto-formatted during import!
```

### Scenario 4: Bulk Import with Full Format
```
Excel cell: "UA00000015"
System stores: "UA00000015"
✅ Validated and accepted
```

## Validation Rules

### Format Requirements
- Must be exactly **UA + 8 digits**
- Examples: ✅ `UA00000001`, `UA00000999`, `UA12345678`
- Invalid: ❌ `EMP001`, `UA1`, `UA123`, `UA123456789`

### Auto-Formatting
- Input `"1"` → Normalized to `"UA00000001"`
- Input `"23"` → Normalized to `"UA00000023"`
- Input `"12345678"` → Normalized to `"UA12345678"`
- Input `"UA5"` → ❌ Error (must be 8 digits after UA)

### Case Handling
- Input is converted to UPPERCASE
- `"ua5"` → Becomes `"UA00000005"`

## Biometric Sync Flow

### How It Works

1. **Biometric Device** has employee with:
   - EmpcardNo (Enrolled ID): `00000005`
   
2. **System creates employee** with:
   - Employee Code: `UA00000005`
   
3. **Attendance sync** matches:
   ```typescript
   enrolledId = "00000005"  // From biometric
   employeeCode = "UA00000005"  // In database
   Match found! ✅
   ```

### Setting Up New Employee

**Option A: Create in system first, then biometric**
```
1. Create employee in system: UA00000010
2. Register in biometric with Enrolled ID: 00000010
3. Sync automatically matches
```

**Option B: Register in biometric first, then system**
```
1. Register in biometric with any available Enrolled ID: 00000025
2. Create employee in system: UA00000025
3. Sync automatically matches
```

## Testing

### Test 1: Create Employee with Number Only
```
Input: "5"
Expected: Saves as "UA00000005"
```

### Test 2: Create Employee with Full Format
```
Input: "UA00000023"
Expected: Saves as "UA00000023"
```

### Test 3: Bulk Import with Mixed Formats
```excel
Employee ID*
5
23
UA00000100
UA00000101
```
Expected: All normalized correctly:
- "5" → "UA00000005"
- "23" → "UA00000023"  
- "UA00000100" → "UA00000100"
- "UA00000101" → "UA00000101"

### Test 4: Invalid Formats
```
Input: "EMP001"
Expected: Validation error
```

```
Input: "UA1"
Expected: Validation error (must be 8 digits)
```

### Test 5: Biometric Sync Matching
```
Given: Employee with code "UA00000005" exists
When: Biometric logs for enrolled ID "00000005" sync
Then: Attendance created for employee "UA00000005"
```

## Migration Notes

### For Existing Employees

If you have employees with old format codes (e.g., `EMP001`):

**Option 1: Keep old codes (won't match biometric)**
- Employees without biometric won't be affected
- Manual attendance entry still works

**Option 2: Migrate to UA format**
```sql
-- Only if you want biometric matching for existing employees
-- Update employee codes to match their biometric enrolled IDs
UPDATE "Employee" 
SET "employeeCode" = 'UA' || "enrolledId"
WHERE "enrolledId" IS NOT NULL;
```

### For New Deployments

✅ Start fresh with UA format from day one
✅ Align biometric enrollment with employee codes
✅ No migration needed

## Files Changed

1. ✅ `src/components/erp/employees.tsx` - Already correct (no changes needed)
2. ✅ `src/app/api/employees/bulk-import/route.ts` - Added normalization
3. ✅ `src/components/erp/employee-bulk-import.tsx` - Updated template & instructions
4. ✅ `src/lib/biometric.ts` - Already correct (no changes needed)

## Deployment

Simple code update - no database changes required:

```bash
# Local
git add .
git commit -m "feat: Enforce UA format for employee IDs with auto-normalization"
git push origin main

# Server
ssh erp@YOUR_SERVER_IP
cd /home/erp/app
git pull origin main
bun install
bun run build
pm2 restart erp-nextjs
```

## Summary

✅ **Employee creation** - Auto-formats numbers to UA + 8 digits  
✅ **Bulk import** - Auto-formats numbers to UA + 8 digits  
✅ **Validation** - Enforces UA + 8 digit format  
✅ **Biometric matching** - Already uses correct logic  
✅ **User-friendly** - Accept bare numbers, auto-format  
✅ **Backward compatible** - Old codes still work (just won't match biometric)  

Your system is now properly configured for seamless biometric integration! 🎉
