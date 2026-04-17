# Leave Policy Role-Specific Implementation Guide

## Overview

Leave policies can now be configured to be role-specific based on department and designation. This allows different leave entitlements for different employee groups.

## Database Changes

### Schema Updates

Added to `LeavePolicy` model:
```prisma
applicableTo     String       @default("all")  // "all", "department", "designation", "both"
departmentId     Int?                          // Optional department filter
designationId    Int?                          // Optional designation filter
Department       Department?  @relation(...)   // Relation to Department
Designation      Designation? @relation(...)   // Relation to Designation
```

### Migration Applied

File: `prisma/migrations/add_leave_policy_role_filters/migration.sql`

Fields added:
- `applicableTo`: Determines scope (all/department/designation/both)
- `departmentId`: Links to specific department
- `designationId`: Links to specific designation

## Frontend Updates Needed

### 1. Leave Policy Form (`src/components/erp/leave-policies.tsx`)

Add these fields to the form:

```typescript
interface LeavePolicyFormData {
  // ... existing fields
  applicableTo: string;      // "all" | "department" | "designation" | "both"
  departmentId: string;      // Department ID
  designationId: string;     // Designation ID
}
```

Add form fields:

```tsx
<div>
  <Label>Applicable To</Label>
  <Select value={form.applicableTo} onValueChange={(v) => updateForm('applicableTo', v)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Employees</SelectItem>
      <SelectItem value="department">Specific Department</SelectItem>
      <SelectItem value="designation">Specific Designation</SelectItem>
      <SelectItem value="both">Department & Designation</SelectItem>
    </SelectContent>
  </Select>
</div>

{(form.applicableTo === 'department' || form.applicableTo === 'both') && (
  <div>
    <Label>Department</Label>
    <Select value={form.departmentId} onValueChange={(v) => updateForm('departmentId', v)}>
      <SelectTrigger>
        <SelectValue placeholder="Select Department" />
      </SelectTrigger>
      <SelectContent>
        {departments.map(dept => (
          <SelectItem key={dept.id} value={dept.id.toString()}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

{(form.applicableTo === 'designation' || form.applicableTo === 'both') && (
  <div>
    <Label>Designation</Label>
    <Select value={form.designationId} onValueChange={(v) => updateForm('designationId', v)}>
      <SelectTrigger>
        <SelectValue placeholder="Select Designation" />
      </SelectTrigger>
      <SelectContent>
        {designations.map(desig => (
          <SelectItem key={desig.id} value={desig.id.toString()}>
            {desig.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

### 2. API Updates (`src/app/api/leave-policies/route.ts`)

Update POST/PUT handlers to include new fields:

```typescript
// POST - Create
const policy = await db.leavePolicy.create({
  data: {
    // ... existing fields
    applicableTo: body.applicableTo || 'all',
    departmentId: body.departmentId ? parseInt(body.departmentId) : null,
    designationId: body.designationId ? parseInt(body.designationId) : null,
  },
  include: {
    Department: { select: { id: true, name: true } },
    Designation: { select: { id: true, name: true } },
  }
});

// GET - Include relations
const policies = await db.leavePolicy.findMany({
  where: { isActive: true },
  include: {
    Department: { select: { id: true, name: true } },
    Designation: { select: { id: true, name: true } },
  },
  orderBy: { name: 'asc' }
});
```

### 3. Leave Balance Calculation

Update leave module to filter policies based on employee's department/designation:

```typescript
// In src/components/erp/leave.tsx
const getApplicablePolicies = (employeeId: string) => {
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return [];
  
  return leavePolicies.filter(policy => {
    if (!policy.isActive) return false;
    
    // All employees policy
    if (policy.applicableTo === 'all') return true;
    
    // Department-specific
    if (policy.applicableTo === 'department') {
      return policy.departmentId === employee.departmentId;
    }
    
    // Designation-specific
    if (policy.applicableTo === 'designation') {
      return policy.designationId === employee.designationId;
    }
    
    // Both department and designation
    if (policy.applicableTo === 'both') {
      return policy.departmentId === employee.departmentId &&
             policy.designationId === employee.designationId;
    }
    
    return false;
  });
};
```

### 4. Leave Type Dropdown

Filter leave types based on selected employee:

```tsx
<select value={form.type} onChange={e => updateForm('type', e.target.value)}>
  <option value="">Select Leave Type</option>
  {form.empId && getApplicablePolicies(form.empId).map(policy => (
    <option key={policy.id} value={policy.code}>
      {policy.name} ({policy.code})
    </option>
  ))}
</select>
```

## Backend Logic

### Leave Request Validation

Update `src/app/api/leave/route.ts` to validate against applicable policies:

```typescript
// Get employee with department and designation
const employee = await db.employee.findUnique({
  where: { id: parseInt(employeeId) },
  select: {
    id: true,
    branchId: true,
    departmentId: true,
    designationId: true,
  }
});

// Find applicable leave policy
const policy = await db.leavePolicy.findFirst({
  where: {
    code: leaveType,
    isActive: true,
    OR: [
      { applicableTo: 'all' },
      { 
        applicableTo: 'department',
        departmentId: employee.departmentId 
      },
      { 
        applicableTo: 'designation',
        designationId: employee.designationId 
      },
      { 
        applicableTo: 'both',
        departmentId: employee.departmentId,
        designationId: employee.designationId 
      }
    ]
  }
});

if (!policy) {
  return NextResponse.json(
    { success: false, error: 'This leave type is not applicable to your role' },
    { status: 400 }
  );
}

// Validate against policy rules
if (leaveDays > policy.annualQuota) {
  return NextResponse.json(
    { success: false, error: `Cannot exceed annual quota of ${policy.annualQuota} days` },
    { status: 400 }
  );
}

if (policy.minDaysNotice > 0) {
  const noticeDate = new Date(fromDate);
  noticeDate.setDate(noticeDate.getDate() - policy.minDaysNotice);
  if (new Date() > noticeDate) {
    return NextResponse.json(
      { success: false, error: `Requires ${policy.minDaysNotice} days advance notice` },
      { status: 400 }
    );
  }
}

if (policy.maxConsecutiveDays > 0 && leaveDays > policy.maxConsecutiveDays) {
  return NextResponse.json(
    { success: false, error: `Cannot exceed ${policy.maxConsecutiveDays} consecutive days` },
    { status: 400 }
  );
}
```

## Use Cases

### Example 1: Department-Specific Leave

**Scenario**: Sales department gets extra casual leave

```
Policy Name: Sales Casual Leave
Code: SCL
Applicable To: department
Department: Sales
Annual Quota: 12 days
```

Only employees in Sales department will see this leave type.

### Example 2: Designation-Specific Leave

**Scenario**: Managers get additional privilege leave

```
Policy Name: Manager Privilege Leave
Code: MPL
Applicable To: designation
Designation: Manager
Annual Quota: 5 days
```

Only employees with Manager designation will see this leave type.

### Example 3: Combined Filter

**Scenario**: IT Department Senior Engineers get special leave

```
Policy Name: IT Senior Leave
Code: ITSL
Applicable To: both
Department: IT
Designation: Senior Engineer
Annual Quota: 8 days
```

Only IT Department employees with Senior Engineer designation will see this.

### Example 4: Universal Leave

**Scenario**: All employees get earned leave

```
Policy Name: Earned Leave
Code: EL
Applicable To: all
Annual Quota: 24 days
```

All employees will see this leave type.

## Display in UI

### Policy Card

Show applicability information:

```tsx
<div className="policy-card">
  <h3>{policy.name} ({policy.code})</h3>
  <div className="quota">{policy.annualQuota} days/year</div>
  
  <div className="applicability">
    {policy.applicableTo === 'all' && (
      <Badge>All Employees</Badge>
    )}
    {policy.applicableTo === 'department' && (
      <Badge>
        <Building2 className="w-3 h-3" />
        {policy.Department?.name}
      </Badge>
    )}
    {policy.applicableTo === 'designation' && (
      <Badge>
        <Briefcase className="w-3 h-3" />
        {policy.Designation?.name}
      </Badge>
    )}
    {policy.applicableTo === 'both' && (
      <>
        <Badge>{policy.Department?.name}</Badge>
        <Badge>{policy.Designation?.name}</Badge>
      </>
    )}
  </div>
</div>
```

## Testing Checklist

- [ ] Create policy for all employees
- [ ] Create policy for specific department
- [ ] Create policy for specific designation
- [ ] Create policy for department + designation
- [ ] Verify employees see only applicable policies
- [ ] Verify leave balance shows correct policies
- [ ] Verify leave request validates against policy
- [ ] Verify policy rules (quota, notice, consecutive days)
- [ ] Test policy editing
- [ ] Test policy deletion

## Migration Steps

1. ✅ Update schema with new fields
2. ✅ Run `npx prisma db push`
3. ⏳ Update leave-policies component form
4. ⏳ Update leave-policies API
5. ⏳ Update leave module to filter policies
6. ⏳ Update leave request validation
7. ⏳ Test all scenarios

## Benefits

- **Flexible**: Different leave entitlements for different roles
- **Scalable**: Easy to add new policies for new roles
- **Maintainable**: Centralized policy management
- **Fair**: Ensures employees get correct leave entitlements
- **Compliant**: Enforces policy rules automatically

---

**Status**: Schema updated ✅ | Frontend pending ⏳ | Backend pending ⏳
