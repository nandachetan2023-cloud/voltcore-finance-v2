# Employee Bulk Import - Implementation Overview

## Current Status
- Excel template exists: `excels/sample-employee(6)(1).xlsx` with "employee format" sheet
- Template has 54 columns covering all employee master data
- Biometric sync is working and fetched 799 punch records
- Issue: Employee codes from biometric don't exist in ERP database yet

## How Bulk Import Would Work (Not Implemented)

### 1. File Upload & Parsing
**Frontend Component:**
- Add file upload button in Employee management page
- Accept `.xlsx` files only
- Show file preview before import

**Backend Processing:**
- Use `xlsx` or `exceljs` library to parse Excel file
- Read "employee format" sheet
- Extract headers and data rows

### 2. Data Mapping

**Excel Column → Prisma Employee Model:**

| Excel Column | Prisma Field | Notes |
|--------------|--------------|-------|
| `employee_id` | `employeeCode` | Unique identifier, required |
| `full_name` | Split into `firstName`, `middleName`, `lastName` | Parse full name |
| `gender` | `gender` | Validate: male/female/other |
| `father_name` | Custom field (not in current schema) | Would need schema update |
| `date_of_birth` | `dateOfBirth` | Parse date format |
| `blood_group` | `bloodGroup` | Optional |
| `contact_no` | `phone` | Required |
| `personal_email` | `personalEmail` | Optional |
| `work_email` | `email` | Required, unique |
| `uan` | `uanNumber` | UAN for PF |
| `esic` | `esicNumber` | ESIC number |
| `pan` | `panNumber` | PAN card |
| `uidia` | `aadharNumber` | Aadhaar number |
| `bank_name` | Custom field | Would need BankDetails model |
| `bank_branch` | Custom field | Would need BankDetails model |
| `account_number` | Custom field | Would need BankDetails model |
| `bank_code` | Custom field | IFSC code |
| `address_*` | `currentAddress`, `currentCity`, `currentState`, `currentPincode` | Combine address fields |
| `permanent_*` | `permanentAddress`, `permanentCity`, `permanentState`, `permanentPincode` | Combine permanent address |
| `date_of_joining` | `dateOfJoining` | Required |
| `department_id` | `departmentId` | Lookup Department by ID/name |
| `designation_id` | `designationId` | Lookup Designation by ID/name |
| `company_id` | `branchId` | Map to Branch |
| `reports_to` | `reportingManagerId` | Lookup by employee code |
| `type_of_employment` | `employmentType` | permanent/contract/intern |
| `status` | `employmentStatus` | active/on_leave/separated |
| `emergency_contact_name` | `emergencyContactName` | Optional |
| `emergency_work_phone` | `emergencyContactPhone` | Optional |
| `relation` | `emergencyContactRelation` | Optional |

### 3. Validation Rules

**Pre-Import Validation:**
```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// For each row:
1. Check required fields:
   - employeeCode (must be unique)
   - firstName, lastName
   - email (must be unique and valid format)
   - phone
   - dateOfBirth, dateOfJoining
   - departmentId, designationId, branchId
   - currentAddress, currentCity, currentState, currentPincode

2. Validate data types:
   - Dates must be valid date format
   - Email must match email regex
   - Phone must be numeric

3. Check foreign keys:
   - departmentId must exist in Department table
   - designationId must exist in Designation table
   - branchId must exist in Branch table
   - reportingManagerId (if provided) must exist

4. Check duplicates:
   - employeeCode must be unique across import batch
   - email must be unique across import batch
```

### 4. Import Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User uploads Excel file                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Parse Excel file and extract data                        │
│    - Read "employee format" sheet                           │
│    - Map columns to fields                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Validate all rows                                        │
│    - Check required fields                                  │
│    - Validate data types and formats                        │
│    - Check foreign key references                           │
│    - Identify duplicates                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Show preview to user                                     │
│    ✓ 150 valid rows ready to import                        │
│    ⚠ 5 rows with warnings (missing optional fields)        │
│    ✗ 3 rows with errors (will be skipped)                  │
│    [Cancel] [Import Valid Rows]                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Bulk insert valid rows                                  │
│    - Use Prisma transaction                                 │
│    - Insert in batches of 100                               │
│    - Log each operation                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Post-import actions                                      │
│    - Match with biometric data by employeeCode              │
│    - Process unprocessed biometric logs                     │
│    - Send summary report                                    │
└─────────────────────────────────────────────────────────────┘
```

### 5. API Endpoint Design

**POST /api/employees/bulk-import**

```typescript
// Request: multipart/form-data
{
  file: File // Excel file
  dryRun?: boolean // If true, only validate without importing
}

// Response:
{
  success: boolean
  summary: {
    totalRows: number
    validRows: number
    importedRows: number
    skippedRows: number
    errorRows: number
  }
  errors: Array<{
    row: number
    employeeCode: string
    field: string
    message: string
  }>
  warnings: Array<{
    row: number
    employeeCode: string
    field: string
    message: string
  }>
  imported: Array<{
    employeeCode: string
    name: string
  }>
}
```

### 6. Implementation Steps (When Ready)

1. **Install dependencies:**
   ```bash
   npm install xlsx
   ```

2. **Create API endpoint:**
   - `src/app/api/employees/bulk-import/route.ts`
   - Handle file upload
   - Parse Excel
   - Validate data
   - Bulk insert

3. **Create UI component:**
   - File upload button
   - Progress indicator
   - Validation preview
   - Import summary

4. **Add to Employee page:**
   - Import button in header
   - Modal for upload and preview

### 7. Benefits

✅ **Speed:** Import 500+ employees in seconds vs hours of manual entry

✅ **Accuracy:** Validation prevents data quality issues before import

✅ **Audit Trail:** Log all import operations with timestamp and user

✅ **Rollback:** Transaction ensures all-or-nothing import for data integrity

✅ **Biometric Integration:** Automatically match and process biometric data after import

✅ **Error Handling:** Clear error messages for each failed row

### 8. Alternative: Manual Quick Import

For immediate needs, you can:

1. **Check missing employees:**
   - Visit `/api/biometric/employee-check`
   - See which employee codes are missing

2. **Create employees via API:**
   ```bash
   POST /api/employees
   {
     "employeeCode": "804450",
     "firstName": "Susant",
     "lastName": "Swain",
     "email": "susant@example.com",
     "phone": "9876543210",
     "dateOfBirth": "1980-12-10",
     "gender": "male",
     "currentAddress": "Address",
     "currentCity": "City",
     "currentState": "State",
     "currentPincode": "123456",
     "departmentId": 1,
     "designationId": 1,
     "branchId": 1,
     "dateOfJoining": "2014-12-22"
   }
   ```

3. **Or use the ERP UI:**
   - Navigate to Employees module
   - Click "Add Employee"
   - Fill in the form

## Current Biometric Integration Status

✅ API connection working (200 status)
✅ Fetched 799 punch records from Site 67
✅ Records saved to BiometricRawLog table
⚠️ Processing skipped due to missing employees
⏳ Waiting for employee import to complete the flow

## Next Steps

1. Import employees (bulk or manual)
2. Run biometric process: `/api/biometric/process`
3. Verify attendance records created
4. Set up automated sync schedule
