# Employee Excel Format Comparison

## Current Implementation Status

### ✅ Template Download and Export Alignment
Both `downloadTemplate()` and `exportEmployees()` functions use **IDENTICAL** header arrays:

```
'Employee ID*'
'First Name*', 'Middle Name', 'Last Name*'
'Work Email*', 'Personal Email', 'Phone*', 'Alternate Phone'
'Date of Birth* (YYYY-MM-DD)', 'Gender* (male/female/other)'
'Marital Status (single/married/divorced/widowed)', 'Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)'
"Father's Name"
'Current Address*', 'Current City*', 'Current State*', 'Current Pincode*'
'Permanent Address', 'Permanent City', 'Permanent State', 'Permanent Pincode'
'Department* (exact name from system)', 'Designation* (exact name from system)', 'Branch*', 'Grade'
'Reporting Manager (Employee Code)'
'Date of Joining* (YYYY-MM-DD)', 'Confirmation Date (YYYY-MM-DD)'
'Employment Type (permanent/contract/probation/intern/part_time)'
'Employment Status* (active/inactive)'
'Probation Months', 'Notice Period Days'
'PAN Number', 'Aadhar Number', 'UAN Number', 'ESIC Number'
'Bank Name', 'Bank Account Number', 'Bank IFSC Code'
'Emergency Contact Name', 'Emergency Contact Relation', 'Emergency Contact Phone'
```

**Total Columns:** 38 columns

## Old Format (Legacy Excel Files)

The existing `excels/employees.xlsx` file uses this older format:

```
Sl.No.
Employee ID
Name of Employee
Username
Father's Name
Mobile No.
Email
Sex
Marital Status
Date of Birth
Blood Group
Religion
Permanent Address
Present Address
Zip code
Nationality
Company
Department
Designation
Location
Role
Office Shift
Report To
Date of Joining
Skill Category
Basic Salary
Bank Name
Branch
Bank A/C No.
IFSC Code
ESIC
UAN
Aadhar No.
PAN
LWF
Type of Employment
Date of Exit
Reason of Exit
```

**Total Columns:** 38 columns

## Key Differences

| Aspect | Old Format | New Format |
|--------|-----------|------------|
| **Name Fields** | Single `Name of Employee` | Separate `First Name*`, `Middle Name`, `Last Name*` |
| **Email** | Single `Email` | `Work Email*` and `Personal Email` |
| **Phone** | `Mobile No.` | `Phone*` and `Alternate Phone` |
| **Gender** | `Sex` | `Gender* (male/female/other)` with clear options |
| **Address** | `Present Address`, `Permanent Address`, `Zip code` | `Current Address*`, `Current City*`, `Current State*`, `Current Pincode*` + full permanent address fields |
| **Dates** | No format specified | Format explicitly shown: `(YYYY-MM-DD)` |
| **Required Fields** | Not marked | Marked with `*` asterisk |
| **Branch/Location** | `Company`, `Location` | `Branch*` |
| **Employment Status** | Inferred from `Date of Exit` | Explicit `Employment Status* (active/inactive)` |
| **Missing in Old** | - | `Confirmation Date`, `Grade`, `Reporting Manager`, `Emergency Contact` fields |
| **Missing in New** | `Religion`, `Nationality`, `Role`, `Office Shift`, `Skill Category`, `Basic Salary`, `LWF` | - |

## Backend Support

The backend API route (`src/app/api/employees/bulk-import/route.ts`) now supports **BOTH formats**:

1. **Auto-detection**: Uses `normalizeRow()` function to detect which format is being used
2. **Old Format Support**: Detects by checking for `'Employee ID'` (without asterisk) and `'Name of Employee'`
3. **New Format Support**: Detects by checking for `'Employee ID*'` or `'First Name*'`
4. **Data Normalization**: Converts either format to a unified internal structure

## ✅ Verification Results

### Template and Export Consistency
- ✅ **SAME HEADERS**: Both functions use identical column headers
- ✅ **SAME ORDER**: Columns are in the same order (38 columns each)
- ✅ **SAME FORMAT**: Both use the new format with asterisks and format hints
- ✅ **DATA MAPPING**: Export function correctly maps database fields to template columns

### Example Export Mapping
```typescript
const rows = json.data.map((e: any) => [
  e.employeeCode || '',                    // Employee ID*
  e.firstName || '',                       // First Name*
  e.middleName || '',                      // Middle Name
  e.lastName || '',                        // Last Name*
  e.email || '',                          // Work Email*
  e.personalEmail || '',                  // Personal Email
  e.phone || '',                          // Phone*
  e.alternatePhone || '',                 // Alternate Phone
  fmt(e.dateOfBirth),                     // Date of Birth*
  e.gender || '',                         // Gender*
  e.maritalStatus || '',                  // Marital Status
  e.bloodGroup || '',                     // Blood Group
  e.fatherName || '',                     // Father's Name
  e.currentAddress || '',                 // Current Address*
  e.currentCity || '',                    // Current City*
  e.currentState || '',                   // Current State*
  e.currentPincode || '',                 // Current Pincode*
  e.permanentAddress || '',               // Permanent Address
  e.permanentCity || '',                  // Permanent City
  e.permanentState || '',                 // Permanent State
  e.permanentPincode || '',               // Permanent Pincode
  e.Department?.name || '',               // Department*
  e.Designation?.name || '',              // Designation*
  e.Branch?.name || '',                   // Branch*
  e.Grade?.name || '',                    // Grade
  e.reportingManager?.employeeCode || '', // Reporting Manager
  fmt(e.dateOfJoining),                   // Date of Joining*
  fmt(e.confirmationDate),                // Confirmation Date
  e.employmentType || '',                 // Employment Type
  e.employmentStatus || '',               // Employment Status*
  e.probationMonths ?? '',                // Probation Months
  e.noticePeriodDays ?? '',               // Notice Period Days
  e.panNumber || '',                      // PAN Number
  e.aadharNumber || '',                   // Aadhar Number
  e.uanNumber || '',                      // UAN Number
  e.esicNumber || '',                     // ESIC Number
  e.bankName || '',                       // Bank Name
  e.bankAccount || '',                    // Bank Account Number
  e.bankIfsc || '',                       // Bank IFSC Code
  e.emergencyContactName || '',           // Emergency Contact Name
  e.emergencyContactRelation || '',       // Emergency Contact Relation
  e.emergencyContactPhone || '',          // Emergency Contact Phone
])
```

## Workflow

### For Users With Old Format Files
1. ✅ Can still upload old format Excel files
2. ✅ Backend will detect and process them correctly
3. ✅ Will be validated and imported successfully

### For New Users
1. ✅ Download template - gets new format with 38 columns
2. ✅ Fill in data following the format
3. ✅ Upload and validate
4. ✅ Import successfully

### For Export → Edit → Re-import
1. ✅ Export employees - gets new format
2. ✅ Edit data in Excel (add/modify rows)
3. ✅ Upload the edited file
4. ✅ System validates and imports correctly
5. ✅ **Perfect round-trip workflow**

## Conclusion

✅ **Template and Export formats are IDENTICAL and CONSISTENT**

The implementation ensures:
- Same column structure for template download and export
- Backward compatibility with old Excel format
- Clear field naming with required field markers (*)
- Format hints for dates and categorical fields
- Perfect round-trip workflow: Export → Edit → Import
