# Employee Code Format

## Overview
All employee codes in the ERP system use the format `EMP####` where `####` is a 4-digit number (e.g., `EMP0002`, `EMP0042`).

## Format Rules
- **Display Format**: `EMP####` (e.g., `EMP0002`, `EMP0042`, `EMP0123`)
- **Storage Format**: Same as display - stored with `EMP` prefix in database
- **Biometric Format**: Raw codes without prefix (e.g., `0002`, `0042`, `0123`)

## Biometric Integration
The biometric devices use raw numeric codes (e.g., `0002`, `0042`). The system automatically handles the conversion:

### When Syncing from Biometric
1. Biometric API returns: `empCode: "0042"`
2. System tries to match: `EMP0042` first
3. If not found, tries: `0042` (fallback for legacy data)
4. Creates attendance record with matched employee

### Code Example
```typescript
// Biometric processing logic
let employee = await db.employee.findUnique({
  where: { employeeCode: `EMP${empCode}` }, // Try with EMP prefix
})

if (!employee) {
  employee = await db.employee.findUnique({
    where: { employeeCode: empCode }, // Fallback without prefix
  })
}
```

## Bulk Import
When importing employees from Excel:
- **Excel Column**: "Employee ID" contains raw codes (e.g., `0002`, `0042`)
- **System Processing**: Automatically adds `EMP` prefix during import
- **Result**: Stored as `EMP0002`, `EMP0042` in database

### Example
```
Excel:     0002, 0042, 0123
Database:  EMP0002, EMP0042, EMP0123
```

## Migration
Existing employees without `EMP` prefix can be updated using:
```bash
bun run scripts/add-emp-prefix.ts
```

This script:
- Finds all employees without `EMP` prefix
- Adds `EMP` prefix to their codes
- Skips employees that already have the prefix
- Maintains all relationships (attendance, payroll, etc.)

## Display
Employee codes are displayed with the `EMP` prefix throughout the UI:
- Employee list: `EMP0002`
- Attendance records: `EMP0042`
- Payroll: `EMP0123`
- Reports: `EMP####`

## Benefits
1. **Clear Identification**: Easy to identify employee codes vs other numeric IDs
2. **Consistency**: Uniform format across all modules
3. **Compatibility**: Seamless integration with biometric devices
4. **Scalability**: Supports up to 9,999 employees (0001-9999)

## Technical Details

### Database Schema
```prisma
model Employee {
  employeeCode String @unique  // Format: EMP####
  // ... other fields
}
```

### Indexes
The `employeeCode` field is indexed for fast lookups:
```sql
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
```

### API Responses
All API endpoints return employee codes with `EMP` prefix:
```json
{
  "employeeCode": "EMP0042",
  "firstName": "Ranjan",
  "lastName": "Mohanty"
}
```

## Troubleshooting

### Employee Not Found in Biometric Sync
If biometric sync shows "Employee not found" warnings:
1. Check if employee exists: `SELECT * FROM "Employee" WHERE "employeeCode" = 'EMP####'`
2. Verify biometric raw log: `SELECT * FROM "BiometricRawLog" WHERE "empCode" = '####'`
3. Ensure employee code matches (with or without EMP prefix)

### Duplicate Employee Codes
If you get duplicate errors during import:
1. Check existing codes: `SELECT "employeeCode" FROM "Employee" ORDER BY "employeeCode"`
2. Verify Excel file doesn't have duplicates
3. System checks for `EMP####` format during validation

## Related Files
- `src/lib/biometric.ts` - Biometric matching logic
- `src/app/api/employees/bulk-import/route.ts` - Bulk import with EMP prefix
- `scripts/add-emp-prefix.ts` - Migration script
- `scripts/seed-employees-from-record.ts` - Seed script with EMP prefix
