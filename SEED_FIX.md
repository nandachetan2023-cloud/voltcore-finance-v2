# Seed Script Fix - Idempotent Implementation

## Issue
The seed script was failing when run multiple times because it tried to create records that already existed, causing unique constraint violations.

## Error Messages
1. `Unique constraint failed on the fields: (name)` for UOM table
2. `Argument 'where' of type CustomerWhereUniqueInput needs at least one of 'id' arguments` for Customer table

## Solution
Updated the seed script to be idempotent (can be run multiple times safely) by:

### 1. UOM Records
Changed from `create()` to `upsert()`:
```typescript
await prisma.uom.upsert({
  where: { name: uom.name },
  update: {},
  create: uom,
})
```

### 2. Customer Records
Changed from `create()` to check-then-create pattern:
```typescript
const existing = await prisma.customer.findFirst({
  where: { name: customer.name },
})
if (!existing) {
  await prisma.customer.create({ data: customer })
}
```

### 3. Attendance Logs
Added check to prevent duplicate attendance logs for the same employee and date:
```typescript
const existingLog = await prisma.attendanceLog.findFirst({
  where: {
    employeeId: emp.id,
    logDate: {
      gte: new Date(yesterday.setHours(0, 0, 0, 0)),
      lt: new Date(yesterday.setHours(23, 59, 59, 999)),
    },
  },
})

if (!existingLog) {
  await prisma.attendanceLog.create({ ... })
}
```

## Already Idempotent
These entities were already using `upsert()` and didn't need changes:
- User (admin)
- Departments
- Designations
- Branches
- Employees

## Result
The seed script can now be run multiple times without errors. It will:
- Skip creating records that already exist
- Update existing records where appropriate (using upsert)
- Only create new records when they don't exist

## Running the Seed Script
```bash
npm run db:seed
```

## Expected Output
```
🌱 Starting seed...
✅ Admin user created
✅ Departments created
✅ Designations created
✅ Branches created
✅ Sample employees created
✅ Attendance logs created
✅ Customers created
✅ UOMs created
🎉 Seed completed successfully!
```
