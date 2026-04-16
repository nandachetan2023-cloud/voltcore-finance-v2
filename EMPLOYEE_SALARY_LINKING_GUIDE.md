# Employee Salary Sheet Linking Guide

## Problem
The salary compliance sheet uses TOKEN NO. (employee code) as the unique identifier, but we need to ensure this properly links to the main employee data in the system.

## Solution: Use Employee Code as Primary Link

### 1. Employee Code Format
- **Format**: `XXXXXX` (6 digits, e.g., 804450, 804451)
- **Field**: `employeeCode` in Employee table
- **Unique**: Yes (database constraint)
- **Used in**: Salary sheet TOKEN NO. column

### 2. Linking Strategy

#### During Import:
1. Read TOKEN NO. from Excel
2. Find employee by `employeeCode`
3. If found: Link payroll to employee
4. If not found: Report error

#### During Export:
1. Get employee's `employeeCode`
2. Write to TOKEN NO. column
3. Include all employee details

### 3. Data Validation

#### Before Import:
- Verify TOKEN NO. exists in system
- Check for duplicates in import file
- Validate format (6 digits)

#### During Import:
- Match TOKEN NO. to employeeCode
- Update employee bank details if provided
- Create/update payroll record

### 4. Fallback Mechanisms

If TOKEN NO. doesn't match:
1. Try fuzzy matching by name
2. Suggest similar employee codes
3. Allow manual mapping
4. Skip with detailed error

## Implementation
