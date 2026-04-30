# Employee Import Template Update

## 🎯 Summary

Added 4 new fields to the employee import template and database to support non-compliance salary sheet generation.

---

## 🆕 New Fields Added

| Field | Column | Type | Required | Description |
|-------|--------|------|----------|-------------|
| **Token Number** | C | TEXT (Unique) | No | Unique token number (different from Employee ID) |
| **Workmen Sl. No.** | D | TEXT | No | Workmen serial number for salary sheet |
| **Monthly Gross Salary** | E | DECIMAL(15,2) | No | Monthly gross salary amount |
| **Nature of Designation** | F | TEXT | No | Skilled/Unskilled/Semi-skilled |

### Field Details

#### 1. Token Number
- **Purpose**: Unique identifier for salary sheet (Column C in salary sheet)
- **Different from Employee ID**: Employee ID is for internal system use, Token Number is for salary documentation
- **Format**: Free text (e.g., TKN001, TKN002, etc.)
- **Unique**: Yes - no two employees can have the same token number
- **Example**: `TKN001`, `TOKEN-2024-001`

#### 2. Workmen Sl. No.
- **Purpose**: Workmen serial number (Column B in salary sheet)
- **Format**: Free text (e.g., WM001, WM002, etc.)
- **Unique**: No - can be duplicated if needed
- **Example**: `WM001`, `WORKMEN-001`

#### 3. Monthly Gross Salary
- **Purpose**: Monthly gross salary for non-compliance salary sheet (Column Q)
- **Format**: Decimal number with 2 decimal places
- **Example**: `15000.00`, `25000.50`

#### 4. Nature of Designation
- **Purpose**: Classification of employee skill level (Column P in salary sheet)
- **Format**: Text
- **Common Values**: 
  - `Skilled`
  - `Unskilled`
  - `Semi-skilled`
  - `Highly Skilled`
- **Example**: `Skilled`, `Unskilled`

---

## 📊 Updated Column Structure

### Before (38 columns):
```
A: Sl.No.
B: Employee ID
C: Name of Employee
D: Username
... (34 more columns)
```

### After (42 columns):
```
A: Sl.No. (auto-generated)
B: Employee ID
C: Token Number (NEW) 🆕
D: Workmen Sl. No. (NEW) 🆕
E: Monthly Gross Salary (NEW) 🆕
F: Nature of Designation (NEW) 🆕
G: Name of Employee
H: Username
... (34 more columns)
```

---

## 📁 Files Updated

### 1. Database Schema
**File**: `prisma/schema.prisma`

```prisma
model Employee {
  id                   Int      @id @default(autoincrement())
  employeeCode         String   @unique
  tokenNumber          String?  @unique  // NEW
  workmenSlNo          String?           // NEW
  monthlyGrossSalary   Decimal? @db.Decimal(15, 2)  // NEW
  natureOfDesignation  String?           // NEW
  // ... other fields
}
```

### 2. Migration SQL
**File**: `prisma/migrations/add_employee_salary_fields/migration.sql`

Applied to both databases:
- ✅ Main Tenant (erp)
- ✅ Demo Tenant (erp_demo)

### 3. Excel Template
**File**: `excels/employees_updated.xlsx`

New template with 4 additional columns (C, D, E, F)

---

## 🔄 Migration Status

### Database Changes: ✅ COMPLETED

| Database | Status | Columns Added |
|----------|--------|---------------|
| Main Tenant (erp) | ✅ Success | 4 columns |
| Demo Tenant (erp_demo) | ✅ Success | 4 columns |

### Prisma Client: ✅ REGENERATED

---

## 📝 Usage Guide

### 1. Using the New Template

**Old Template**: `excels/employees.xlsx` (38 columns)
**New Template**: `excels/employees_updated.xlsx` (42 columns)

#### Sample Data:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 1 | EMP001 | TKN001 | WM001 | 15000 | Skilled | John Doe |
| 2 | EMP002 | TKN002 | WM002 | 18000 | Semi-skilled | Jane Smith |
| 3 | EMP003 | TKN003 | WM003 | 12000 | Unskilled | Bob Johnson |

### 2. Field Mapping to Salary Sheet

| Employee Field | Salary Sheet Column | Auto-Generated? |
|----------------|---------------------|-----------------|
| Sl.No. | A - SL NO. | ✅ Yes (row number) |
| Workmen Sl. No. | B - WORKMEN SL. NO. | ❌ No (from import) |
| Token Number | C - TOKEN NO. | ❌ No (from import) |
| Name | D - NAME OF EMPLOYEE | ❌ No (from import) |
| Father's Name | E - FATHER'S NAME | ❌ No (from import) |
| Date of Joining | F - DOJ | ❌ No (from import) |
| Date of Birth | G - DOB | ❌ No (from import) |
| Bank Name | H - BANK NAME | ❌ No (from import) |
| Bank Account | I - ACCOUNT NO. | ❌ No (from import) |
| IFSC Code | J - IFSC CODE NO. | ❌ No (from import) |
| UAN | L - UAN NO. | ❌ No (from import) |
| ESIC | M - ESIC IP NO | ❌ No (from import) |
| Designation | N - DESIGNATION | ❌ No (from import) |
| Department | O - DEPARTMENT | ❌ No (from import) |
| Nature of Designation | P - NATURE OF DESIGNATION | ❌ No (from import) |
| Monthly Gross Salary | Q - MONTHLY GROSS SALARY | ❌ No (from import) |

### 3. Import Process

```typescript
// Example: Reading from Excel
const employee = {
  employeeCode: row[1],        // B: Employee ID
  tokenNumber: row[2],         // C: Token Number (NEW)
  workmenSlNo: row[3],         // D: Workmen Sl. No. (NEW)
  monthlyGrossSalary: row[4],  // E: Monthly Gross Salary (NEW)
  natureOfDesignation: row[5], // F: Nature of Designation (NEW)
  firstName: row[6].split(' ')[0],  // G: Name of Employee
  // ... other fields
};
```

---

## ⚠️ Important Notes

### 1. Sl.No. (Column A) - Auto-Generated
- **Do NOT import** from Excel
- Generated automatically as row number during salary sheet generation
- Example: 1, 2, 3, 4, ...

### 2. Token Number - Must Be Unique
- Each employee must have a unique token number
- System will reject duplicate token numbers
- Can be left empty if not needed

### 3. Backward Compatibility
- All new fields are **optional** (nullable)
- Existing employees without these fields will continue to work
- Can be updated later via employee edit form

### 4. Salary Sheet Generation
- If `monthlyGrossSalary` is empty, it can be calculated from salary structure
- If `tokenNumber` is empty, can use `employeeCode` as fallback
- If `workmenSlNo` is empty, can be auto-generated or left blank

---

## 🧪 Testing Checklist

- [ ] Import employee with all new fields filled
- [ ] Import employee with new fields empty (should work)
- [ ] Verify token number uniqueness constraint
- [ ] Generate salary sheet with new fields
- [ ] Check that Sl.No. is auto-generated (not imported)
- [ ] Verify monthly gross salary appears in Column Q
- [ ] Verify nature of designation appears in Column P
- [ ] Test employee edit form with new fields
- [ ] Test backward compatibility with old data

---

## 🔧 Next Steps

### 1. Update Employee Import Component
**File**: `src/components/erp/employee-bulk-import.tsx`

Add handling for new columns:
```typescript
const newEmployee = {
  // ... existing fields
  tokenNumber: row[2] || null,
  workmenSlNo: row[3] || null,
  monthlyGrossSalary: row[4] ? parseFloat(row[4]) : null,
  natureOfDesignation: row[5] || null,
};
```

### 2. Update Employee Form
**File**: `src/components/erp/employees.tsx`

Add form fields for:
- Token Number (text input with unique validation)
- Workmen Sl. No. (text input)
- Monthly Gross Salary (number input)
- Nature of Designation (dropdown: Skilled/Unskilled/Semi-skilled)

### 3. Update Salary Sheet Generation
**File**: `src/app/api/payroll/generate-excel/route.ts`

Use new fields when generating non-compliance salary sheet:
```typescript
const salarySheetRow = {
  slNo: index + 1,  // Auto-generated
  workmenSlNo: employee.workmenSlNo,
  tokenNo: employee.tokenNumber,
  name: employee.firstName + ' ' + employee.lastName,
  // ... other fields
  monthlyGrossSalary: employee.monthlyGrossSalary,
  natureOfDesignation: employee.natureOfDesignation,
};
```

---

## 📚 Related Documentation

- [SALARY_SHEET_COLUMN_ANALYSIS.md](./SALARY_SHEET_COLUMN_ANALYSIS.md) - Column mapping and analysis
- [SALARY_CALCULATION_FROM_5_INPUTS.md](./SALARY_CALCULATION_FROM_5_INPUTS.md) - Salary calculation formulas
- [EMPLOYEE_BULK_IMPORT_OVERVIEW.md](./EMPLOYEE_BULK_IMPORT_OVERVIEW.md) - Employee import guide

---

## 🎉 Summary

✅ **4 new fields added** to Employee table
✅ **Database migrated** for both tenants
✅ **Prisma client regenerated**
✅ **New Excel template created** with sample data
✅ **All fields are optional** for backward compatibility
✅ **Token number has unique constraint**
✅ **Sl.No. will be auto-generated** (not imported)

**New Template Location**: `excels/employees_updated.xlsx`
