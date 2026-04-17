# Payroll Excel Generation Guide

## Overview

The system now supports generating comprehensive payroll Excel sheets in two formats:
1. **Non-Compliance Format** - Detailed internal format (68 columns) - **CURRENT SYSTEM DEFAULT**
2. **Compliance Format** - Simplified statutory compliant structure (32 columns) - **NEW ADDITION**

Both formats can be generated with flexible filters for departments, designations, branches, and individual employees.

**Note:** The existing system was using the Non-Compliance format. The new implementation adds the Compliance format as an additional option.

## Features

### 1. Dual Format Support

**Non-Compliance Format (EXISTING - DEFAULT):**
- 68 columns with comprehensive breakdown
- Detailed attendance, OT hours, PH days tracking
- Separate compliance and non-compliance sections
- Advance, arrears, and bonus columns
- Suitable for internal payroll processing and detailed analysis
- **This is the format the system was already using**

**Compliance Format (NEW):**
- 32 columns with essential statutory information
- Simplified structure for government submissions
- Includes EPF, ESIC, PT, TDS calculations
- Meets labor law requirements
- Suitable for external audits and compliance reporting
- **This is the newly added format**

### 2. Flexible Filtering

Generate payroll Excel for:
- **All Employees** - Complete organization payroll
- **Specific Department** - e.g., IT Department only
- **Specific Designation** - e.g., Managers only
- **Specific Branch** - e.g., Head Office only
- **Individual Employee** - Single employee payroll
- **Combinations** - e.g., IT Department + Senior Engineers
- **Include/Exclude Inactive** - Control whether to include terminated employees

### 3. Period Selection

- Select any month and year
- System fetches existing payroll data for the selected period
- Automatically finds the most recent payroll run for that period

## Components

### Frontend Component

**File:** `src/components/erp/payroll-generate.tsx`

**Features:**
- Format selection (Compliance/Non-Compliance)
- Month and year selection
- Department, designation, branch, employee filters
- Include inactive employees checkbox
- Reset filters button
- Generate Excel button with loading state
- Format information cards

**Usage:**
```typescript
import PayrollGenerateModule from '@/components/erp/payroll-generate';

// In your page or layout
<PayrollGenerateModule />
```

### API Endpoint

**File:** `src/app/api/payroll/generate-excel/route.ts`

**Endpoint:** `GET /api/payroll/generate-excel`

**Query Parameters:**
- `format` (required): 'compliance' | 'non-compliance'
- `month` (required): 1-12
- `year` (required): e.g., 2026
- `departmentId` (optional): Filter by department
- `designationId` (optional): Filter by designation
- `branchId` (optional): Filter by branch
- `employeeId` (optional): Filter by specific employee
- `includeInactive` (optional): 'true' to include inactive employees

**Response:**
- Success: Excel file download (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- Error: JSON with error message

## Non-Compliance Format Structure (EXISTING)

### Columns (68 total):

**Employee Information (1-16):**
- SL NO, WORKMEN SL NO, TOKEN NO, NAME, FATHER'S NAME
- DOJ, DOB, BANK NAME, ACCOUNT NO, IFSC CODE
- UAN NO, ESIC IP NO, DESIGNATION, DEPARTMENT, NATURE OF DESIGNATION
- MONTHLY GROSS SALARY

**Attendance & Earnings (17-34):**
- ACTUAL ATTENDANCE, EXTRA DAYS, PH DAYS
- ACTUAL EARN WAGES, ACTUAL OT HRS, ACTUAL OT AMOUNT
- GROSS EARN WAGES, BASIC WAGES/DAY, MONTHLY WORKING DAYS
- OT HRS, ATTENDANCE, PH, WAGES/MONTH
- EARN WAGES, PH AMOUNT, TOTAL EARN WAGES
- OT HRS PAYMENT, TOTAL NETT PAYBLE

**Deductions (35-40):**
- EPF, ESIC, PT, TOTAL DEDUCTION, NETT PAYBLE
- EMPLOYEE SIGNATURE/THUMB IMPRESSION

**Non-Compliance Section (41-48):**
- TOTAL NON COMPLIANCE AMOUNT
- ADVANCE, ARREARS
- NETT PAYBLE NON COMPLIANCE
- GRAND TOTAL NETT PAYBLE SALARY
- LEAVE, BONUS

**Detailed Allowances (49-68):**
- MONTHLY BASIC SALARY, PH AMOUNT, OT AMOUNT, EARN SALARY
- MONTHLY House Rent Allow, Monthly Site Allow
- Monthly Leave Travel Allow, Monthly Special Allow
- Monthly Attendance Allow, TOTAL SALARY
- EPF, ESIC, TDS, ADVANCE

### Use Cases:
- Internal payroll processing (PRIMARY USE)
- Detailed salary analysis
- Overtime tracking
- Advance and arrears management
- Comprehensive employee compensation reports

## Compliance Format Structure (NEW)

### Columns (32 total):

1. SL NO.
2. EMPLOYEE CODE
3. EMPLOYEE NAME
4. FATHER'S NAME
5. DATE OF JOINING
6. DATE OF BIRTH
7. DESIGNATION
8. DEPARTMENT
9. BRANCH
10. UAN NUMBER
11. ESIC NUMBER
12. PAN NUMBER
13. BANK NAME
14. ACCOUNT NUMBER
15. IFSC CODE
16. WORKING DAYS
17. PRESENT DAYS
18. PAID LEAVE DAYS
19. LOP DAYS
20. BASIC SALARY
21. HRA
22. CONVEYANCE
23. MEDICAL
24. SPECIAL ALLOWANCE
25. GROSS EARNINGS
26. EPF DEDUCTION
27. ESI DEDUCTION
28. PT DEDUCTION
29. TDS DEDUCTION
30. OTHER DEDUCTIONS
31. TOTAL DEDUCTIONS
32. NET PAY

### Use Cases:
- Government submissions
- Labor compliance audits
- EPF/ESIC returns
- Statutory reporting
- External audits

## Usage Examples

### Example 1: Generate Non-Compliance Sheet for All Employees (DEFAULT)

```typescript
// User selects:
Format: Non-Compliance
Month: April
Year: 2026
Filters: None (All employees)

// API Call:
GET /api/payroll/generate-excel?format=non-compliance&month=4&year=2026

// Result:
Downloads: Payroll_NonCompliance_APR_2026_[timestamp].xlsx
Contains: All active employees with 68 columns (EXISTING FORMAT)
```

### Example 2: Generate Compliance Sheet for IT Department (NEW FORMAT)

```typescript
// User selects:
Format: Compliance
Month: April
Year: 2026
Department: IT Department (ID: 5)

// API Call:
GET /api/payroll/generate-excel?format=compliance&month=4&year=2026&departmentId=5

// Result:
Downloads: Payroll_Compliance_APR_2026_[timestamp].xlsx
Contains: Only IT Department employees with 32 columns (NEW FORMAT)
```

### Example 3: Generate Non-Compliance Sheet for Single Employee

```typescript
// User selects:
Format: Non-Compliance
Month: April
Year: 2026
Employee: EMP001 (ID: 63)

// API Call:
GET /api/payroll/generate-excel?format=non-compliance&month=4&year=2026&employeeId=63

// Result:
Downloads: Payroll_NonCompliance_APR_2026_[timestamp].xlsx
Contains: Single employee record with 68 columns (EXISTING FORMAT)
```

### Example 4: Generate Non-Compliance Sheet with Multiple Filters

```typescript
// User selects:
Format: Non-Compliance
Month: April
Year: 2026
Department: Sales (ID: 3)
Designation: Manager (ID: 7)
Branch: Head Office (ID: 1)

// API Call:
GET /api/payroll/generate-excel?format=non-compliance&month=4&year=2026&departmentId=3&designationId=7&branchId=1

// Result:
Downloads: Payroll_NonCompliance_APR_2026_[timestamp].xlsx
Contains: Sales Managers at Head Office with 68 columns
```

### Example 5: Include Inactive Employees

```typescript
// User selects:
Format: Non-Compliance (DEFAULT)
Month: March
Year: 2026
Include Inactive: Yes

// API Call:
GET /api/payroll/generate-excel?format=non-compliance&month=3&year=2026&includeInactive=true

// Result:
Downloads: Payroll_NonCompliance_MAR_2026_[timestamp].xlsx
Contains: All employees including terminated ones with 68 columns
```

## Integration with Existing Payroll

The Excel generation works seamlessly with existing payroll data:

1. **Payroll must be generated first** using the existing payroll generation system
2. **Excel generation fetches existing data** - it doesn't create new payroll records
3. **Filters are applied at query time** - no need to regenerate payroll for different filters
4. **Multiple exports possible** - generate different filtered views from the same payroll run

## Module Registration

The new component is registered in the module registry:

```typescript
// src/components/erp/module-registry.tsx
'payroll-generate': () => import('@/components/erp/payroll-generate'),
```

Access it by navigating to the "Generate Payroll" menu item in the ERP system.

## Error Handling

The system handles various error scenarios:

1. **No Payroll Data:**
   - Error: "No payroll data found for [month]/[year]"
   - Solution: Generate payroll for that period first

2. **No Matching Records:**
   - Error: "No payroll data found matching the filters"
   - Solution: Adjust filters or check if employees exist in that category

3. **Invalid Parameters:**
   - Error: "Invalid month or year"
   - Solution: Ensure valid month (1-12) and year values

4. **Server Error:**
   - Error: "Failed to generate payroll Excel"
   - Solution: Check server logs for detailed error information

## Performance Considerations

- **Large Datasets:** The system can handle thousands of employees efficiently
- **Filtering:** Filters are applied at database level for optimal performance
- **Excel Generation:** Uses streaming for large files to minimize memory usage
- **Download:** Files are generated on-demand, not stored on server

## Security

- **Authentication Required:** Only authenticated users can access the endpoint
- **Authorization:** Implement role-based access control as needed
- **Data Privacy:** Sensitive employee data is included - ensure proper access controls
- **Audit Trail:** Consider logging Excel generation requests for compliance

## Future Enhancements

Potential improvements:

1. **Custom Column Selection:** Allow users to choose which columns to include
2. **Template Management:** Save and reuse filter combinations
3. **Scheduled Generation:** Automatically generate and email reports
4. **Format Customization:** Allow organizations to define custom formats
5. **Multi-Sheet Export:** Include summary sheets, charts, and analysis
6. **PDF Export:** Generate PDF versions of salary sheets
7. **Email Distribution:** Directly email payroll sheets to managers
8. **Comparison Reports:** Compare payroll across multiple periods

## Testing Checklist

- [ ] Generate compliance format for all employees
- [ ] Generate non-compliance format for all employees
- [ ] Filter by department only
- [ ] Filter by designation only
- [ ] Filter by branch only
- [ ] Filter by single employee
- [ ] Combine multiple filters
- [ ] Include inactive employees
- [ ] Test with no payroll data (should error)
- [ ] Test with empty filters result (should error)
- [ ] Verify Excel file opens correctly
- [ ] Verify all columns are present
- [ ] Verify data accuracy
- [ ] Test with large dataset (1000+ employees)
- [ ] Test download on different browsers

## Troubleshooting

### Issue: Excel file is empty
**Solution:** Check if payroll data exists for the selected period

### Issue: Wrong data in Excel
**Solution:** Verify payroll was generated correctly, check filter parameters

### Issue: Download fails
**Solution:** Check browser console for errors, verify API endpoint is accessible

### Issue: Slow generation
**Solution:** Consider adding pagination or limiting result size for very large datasets

---

**Status:** Fully Implemented ✅

**Files Created:**
- `src/components/erp/payroll-generate.tsx` - Frontend component
- `src/app/api/payroll/generate-excel/route.ts` - API endpoint

**Files Modified:**
- `src/components/erp/module-registry.tsx` - Added module registration

**Dependencies:**
- `xlsx` - Excel file generation (already installed)
- Existing payroll system and database schema
