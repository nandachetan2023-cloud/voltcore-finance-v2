# Employee Fields Summary - Quick Reference

## 🎯 New Fields Added (4 fields)

| # | Field Name | Excel Column | DB Column | Type | Unique | Auto-Gen | Purpose |
|---|------------|--------------|-----------|------|--------|----------|---------|
| 1 | **Sl.No.** | A | - | Number | No | ✅ YES | Row number (auto-generated, not stored) |
| 2 | **Token Number** | C | tokenNumber | TEXT | ✅ YES | ❌ NO | Unique token for salary sheet |
| 3 | **Workmen Sl. No.** | D | workmenSlNo | TEXT | No | ❌ NO | Workmen serial number |
| 4 | **Monthly Gross Salary** | E | monthlyGrossSalary | DECIMAL(15,2) | No | ❌ NO | Monthly gross salary |
| 5 | **Nature of Designation** | F | natureOfDesignation | TEXT | No | ❌ NO | Skilled/Unskilled/Semi-skilled |

---

## 📊 Complete Field Mapping: Employee Import → Salary Sheet

| Import Col | Import Field | DB Field | Salary Col | Salary Field | Notes |
|------------|--------------|----------|------------|--------------|-------|
| A | Sl.No. | - | A | SL NO. | ✅ Auto-generated (row number) |
| B | Employee ID | employeeCode | - | - | Internal use only |
| **C** | **Token Number** | **tokenNumber** | **C** | **TOKEN NO.** | 🆕 NEW - Must be unique |
| **D** | **Workmen Sl. No.** | **workmenSlNo** | **B** | **WORKMEN SL. NO.** | 🆕 NEW |
| **E** | **Monthly Gross Salary** | **monthlyGrossSalary** | **Q** | **MONTHLY GROSS SALARY** | 🆕 NEW |
| **F** | **Nature of Designation** | **natureOfDesignation** | **P** | **NATURE OF DESIGNATION** | 🆕 NEW |
| G | Name of Employee | firstName, lastName | D | NAME OF EMPLOYEE | Concatenated |
| I | Father's Name | fatherName | E | FATHER'S NAME | Direct mapping |
| AB | Date of Joining | dateOfJoining | F | DOJ | Direct mapping |
| N | Date of Birth | dateOfBirth | G | DOB | Direct mapping |
| AE | Bank Name | bankName | H | BANK NAME | Direct mapping |
| AG | Bank A/C No. | bankAccount | I | ACCOUNT NO. | Direct mapping |
| AH | IFSC Code | bankIfsc | J | IFSC CODE NO. | Direct mapping |
| AJ | UAN | uanNumber | L | UAN NO. | Direct mapping |
| AI | ESIC | esicNumber | M | ESIC IP NO | Direct mapping |
| W | Designation | Designation.name | N | DESIGNATION | From relation |
| V | Department | Department.name | O | DEPARTMENT | From relation |

---

## 🔑 Key Differences

### Employee ID vs Token Number

| Aspect | Employee ID (Column B) | Token Number (Column C) |
|--------|------------------------|-------------------------|
| **Purpose** | Internal system identifier | Salary sheet identifier |
| **Appears in Salary Sheet** | ❌ No | ✅ Yes (Column C) |
| **Must be Unique** | ✅ Yes | ✅ Yes |
| **Format** | System-defined (e.g., EMP001) | User-defined (e.g., TKN001) |
| **Required** | ✅ Yes | ❌ No (optional) |
| **Used for Login** | ✅ Yes | ❌ No |

### Sl.No. - Auto-Generated

```
❌ DO NOT import Sl.No. from Excel
✅ It will be auto-generated as row number (1, 2, 3, ...)

Example:
Row 1 → Sl.No. = 1
Row 2 → Sl.No. = 2
Row 3 → Sl.No. = 3
```

---

## 📥 Import Example

### Excel Template (employees_updated.xlsx)

| A | B | C | D | E | F | G | ... |
|---|---|---|---|---|---|---|-----|
| 1 | EMP001 | TKN001 | WM001 | 15000 | Skilled | John Doe | ... |
| 2 | EMP002 | TKN002 | WM002 | 18000 | Semi-skilled | Jane Smith | ... |
| 3 | EMP003 | TKN003 | WM003 | 12000 | Unskilled | Bob Johnson | ... |

### Generated Salary Sheet

| A | B | C | D | E | ... | P | Q |
|---|---|---|---|---|-----|---|---|
| 1 | WM001 | TKN001 | John Doe | Father Name | ... | Skilled | 15000 |
| 2 | WM002 | TKN002 | Jane Smith | Father Name | ... | Semi-skilled | 18000 |
| 3 | WM003 | TKN003 | Bob Johnson | Father Name | ... | Unskilled | 12000 |

---

## ✅ Validation Rules

### Token Number
```typescript
- Must be unique across all employees
- Can be empty (optional)
- If empty, can use employeeCode as fallback
- Format: Free text (no restrictions)
- Example: TKN001, TOKEN-2024-001, T001
```

### Workmen Sl. No.
```typescript
- Can be duplicate (not unique)
- Can be empty (optional)
- Format: Free text (no restrictions)
- Example: WM001, WORKMEN-001, W001
```

### Monthly Gross Salary
```typescript
- Must be a valid number
- Can have up to 2 decimal places
- Can be empty (optional)
- Range: 0.00 to 9,999,999,999,999.99
- Example: 15000, 15000.50, 25000.00
```

### Nature of Designation
```typescript
- Free text field
- Common values: Skilled, Unskilled, Semi-skilled, Highly Skilled
- Can be empty (optional)
- Example: Skilled, Unskilled, Semi-skilled
```

---

## 🔄 Migration Status

### ✅ Completed

- [x] Prisma schema updated
- [x] Migration SQL created
- [x] Database migrated (erp)
- [x] Database migrated (erp_demo)
- [x] Prisma client regenerated
- [x] Excel template updated
- [x] Documentation created

### 📋 Pending (Next Steps)

- [ ] Update employee import component
- [ ] Update employee form UI
- [ ] Add validation for token number uniqueness
- [ ] Update salary sheet generation logic
- [ ] Test import with new fields
- [ ] Test salary sheet generation

---

## 💻 Code Snippets

### Reading from Excel

```typescript
// Column indices (0-based)
const COLUMNS = {
  SL_NO: 0,              // A - Auto-generated, don't import
  EMPLOYEE_ID: 1,        // B
  TOKEN_NUMBER: 2,       // C - NEW
  WORKMEN_SL_NO: 3,      // D - NEW
  MONTHLY_GROSS: 4,      // E - NEW
  NATURE_OF_DESIG: 5,    // F - NEW
  NAME: 6,               // G
  // ... other columns
};

const employee = {
  employeeCode: row[COLUMNS.EMPLOYEE_ID],
  tokenNumber: row[COLUMNS.TOKEN_NUMBER] || null,
  workmenSlNo: row[COLUMNS.WORKMEN_SL_NO] || null,
  monthlyGrossSalary: row[COLUMNS.MONTHLY_GROSS] 
    ? parseFloat(row[COLUMNS.MONTHLY_GROSS]) 
    : null,
  natureOfDesignation: row[COLUMNS.NATURE_OF_DESIG] || null,
  // ... other fields
};
```

### Generating Salary Sheet

```typescript
const salarySheetRow = {
  slNo: index + 1,  // Auto-generated
  workmenSlNo: employee.workmenSlNo || '',
  tokenNo: employee.tokenNumber || employee.employeeCode,
  name: `${employee.firstName} ${employee.lastName}`,
  fatherName: employee.fatherName || '',
  doj: formatDate(employee.dateOfJoining),
  dob: formatDate(employee.dateOfBirth),
  bankName: employee.bankName || '',
  accountNo: employee.bankAccount || '',
  ifscCode: employee.bankIfsc || '',
  uan: employee.uanNumber || '',
  esic: employee.esicNumber || '',
  designation: employee.Designation?.name || '',
  department: employee.Department?.name || '',
  natureOfDesignation: employee.natureOfDesignation || '',
  monthlyGrossSalary: employee.monthlyGrossSalary || 0,
  // ... calculated fields (Y, Z, AA, AB, AC)
  // ... calculated columns (AD-AN)
};
```

---

## 📞 Quick Reference

**New Template**: `excels/employees_updated.xlsx`
**Old Template**: `excels/employees.xlsx`
**Total Columns**: 42 (was 38)
**New Columns**: 4 (C, D, E, F)
**Auto-Generated**: Sl.No. (Column A)
**Unique Constraint**: Token Number (Column C)
