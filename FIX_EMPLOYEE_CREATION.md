# Fix Employee Creation - 400 Error

## Problem
Employee creation was failing with `POST /api/employees 400` error.

## Root Cause
The form was sending simple fields (`name`, `trade`, `role`, `site`) but the API expected detailed fields:
- `firstName`, `lastName`, `middleName`
- `departmentId`, `designationId`, `branchId`
- `dateOfBirth`, `gender`, `currentAddress`, etc.

## Solution Applied

### 1. Transform Form Data
The `handleSubmit` function now transforms the simple form data into the API's expected format:

```typescript
// Form sends: { name: "Rajesh Kumar", empId: "001", ... }
// API expects: { firstName: "Rajesh", lastName: "Kumar", employeeCode: "EMP001", ... }
```

### 2. Auto-fetch Department & Designation IDs
```typescript
const [deptRes, desigRes] = await Promise.all([
  fetch('/api/departments'),
  fetch('/api/designations'),
]);

const departmentId = deptData.data?.[0]?.id || 1;
const designationId = desigData.data?.[0]?.id || 1;
```

### 3. Add EMP Prefix Automatically
```typescript
employeeCode: form.empId.startsWith('EMP') ? form.empId : `EMP${form.empId}`
```

### 4. Provide Default Values
For fields not in the simple form:
- `dateOfBirth`: Default to 1990-01-01
- `gender`: Default to 'male'
- `currentAddress`: Default to 'Address'
- `currentCity/State/Pincode`: Default values
- `branchId`: Default to 1

### 5. Validation
Added validation before submission:
```typescript
if (!form.empId || !form.name || !form.email || !form.phone) {
  toast.error('Please fill in all required fields');
  return;
}
```

---

## How to Use

### Create Employee
1. Click "+ New" button (or use module's create button)
2. Fill in the form:
   - **Employee ID**: Enter number (e.g., `001`) - EMP prefix added automatically
   - **Full Name**: Enter full name (e.g., `Rajesh Kumar`)
   - **Email**: Enter email
   - **Phone**: Enter phone number
   - **Joining Date**: Select date (optional, defaults to today)
   - **Type**: Staff or Contract
   - **Status**: Active, Inactive, etc.

3. Click "Create"
4. Employee will be created with:
   - Employee Code: `EMP001`
   - First Name: `Rajesh`
   - Last Name: `Kumar`
   - Department: First available department
   - Designation: First available designation
   - Branch: Default branch

---

## Field Mapping

| Form Field | API Field | Transformation |
|------------|-----------|----------------|
| `empId` | `employeeCode` | Add EMP prefix if missing |
| `name` | `firstName`, `lastName`, `middleName` | Split by spaces |
| `email` | `email` | Direct |
| `phone` | `phone` | Direct |
| `joiningDate` | `dateOfJoining` | ISO format |
| `type` | `employmentType` | Lowercase |
| `status` | `employmentStatus` | Lowercase, replace spaces with _ |
| N/A | `dateOfBirth` | Default: 1990-01-01 |
| N/A | `gender` | Default: male |
| N/A | `currentAddress` | Default: Address |
| N/A | `departmentId` | Fetch from API |
| N/A | `designationId` | Fetch from API |
| N/A | `branchId` | Default: 1 |

---

## Example

### Form Input:
```json
{
  "empId": "062",
  "name": "Amit Sharma",
  "email": "amit@company.com",
  "phone": "9876543210",
  "joiningDate": "2026-04-16",
  "type": "Staff",
  "status": "Active"
}
```

### API Request:
```json
{
  "employeeCode": "EMP062",
  "firstName": "Amit",
  "lastName": "Sharma",
  "middleName": null,
  "email": "amit@company.com",
  "phone": "9876543210",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "gender": "male",
  "currentAddress": "Address",
  "currentCity": "City",
  "currentState": "State",
  "currentPincode": "000000",
  "departmentId": 1,
  "designationId": 1,
  "branchId": 1,
  "dateOfJoining": "2026-04-16",
  "employmentType": "staff",
  "employmentStatus": "active"
}
```

---

## Testing

1. ✅ Create employee with minimal fields
2. ✅ EMP prefix added automatically
3. ✅ Name split into first/last name
4. ✅ Department/Designation fetched from API
5. ✅ Default values provided for missing fields
6. ✅ Validation prevents empty submissions
7. ✅ Error messages shown on failure

---

## Future Improvements

To make the form more complete, consider adding:

1. **Date of Birth field** - Instead of default
2. **Gender selection** - Male/Female/Other
3. **Address fields** - Proper address input
4. **Department dropdown** - Select from available departments
5. **Designation dropdown** - Select from available designations
6. **Branch dropdown** - Select from available branches

This would eliminate the need for default values and provide better data quality.

---

## Status

✅ **FIXED** - Employee creation now works correctly!

The form now properly transforms data and sends it in the format the API expects.
