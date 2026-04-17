# Soft Delete Implementation Guide

## Overview

Your ERP system uses **soft delete** for data management. Records are marked as inactive rather than permanently removed from the database.

## How It Works

### Database Schema
Each model has an `isActive` boolean field:
```prisma
model LeavePolicy {
  id        Int      @id @default(autoincrement())
  name      String
  // ... other fields
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime
}
```

### Soft Delete Process
When a user clicks "Delete":
1. Record is NOT removed from database
2. `isActive` is set to `false`
3. `updatedAt` is set to current timestamp
4. Record becomes invisible in normal queries

### Query Filtering
```typescript
// Normal queries only show active records
const policies = await db.leavePolicy.findMany({
  where: { isActive: true }
});

// To see deleted records (admin view)
const deletedPolicies = await db.leavePolicy.findMany({
  where: { isActive: false }
});

// To see all records
const allPolicies = await db.leavePolicy.findMany();
```

## Benefits

1. **Data Recovery** - Restore accidentally deleted records
2. **Audit Trail** - Track what was deleted and when
3. **Referential Integrity** - Related records don't break
4. **Compliance** - Meet data retention requirements
5. **Undo Functionality** - Easy to implement restore feature

## Permanent Deletion Options

### Option 1: Manual Database Cleanup (Recommended for Production)

Create a cleanup script that runs periodically:

```typescript
// scripts/cleanup-deleted-records.ts
import { db } from '@/lib/db';

async function cleanupOldDeletedRecords() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Permanently delete records that have been soft-deleted for 30+ days
  const result = await db.leavePolicy.deleteMany({
    where: {
      isActive: false,
      updatedAt: {
        lt: thirtyDaysAgo
      }
    }
  });

  console.log(`Permanently deleted ${result.count} leave policies`);
}

cleanupOldDeletedRecords();
```

**Run it:**
```bash
tsx scripts/cleanup-deleted-records.ts
```

**Schedule it (using cron or task scheduler):**
```bash
# Run monthly on the 1st at 2 AM
0 2 1 * * tsx scripts/cleanup-deleted-records.ts
```

### Option 2: Admin UI for Permanent Deletion

Add a "Trash" or "Deleted Items" view where admins can:
- View soft-deleted records
- Restore records (set `isActive: true`)
- Permanently delete records

Example API endpoint:
```typescript
// src/app/api/leave-policies/trash/route.ts
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET - View deleted policies
export async function GET() {
  const deletedPolicies = await db.leavePolicy.findMany({
    where: { isActive: false },
    orderBy: { updatedAt: 'desc' }
  });
  return NextResponse.json({ success: true, data: deletedPolicies });
}

// POST - Restore a policy
export async function POST(request: NextRequest) {
  const { id } = await request.json();
  const restored = await db.leavePolicy.update({
    where: { id: parseInt(id) },
    data: { isActive: true, updatedAt: new Date() }
  });
  return NextResponse.json({ success: true, data: restored });
}

// DELETE - Permanently delete
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await db.leavePolicy.delete({
    where: { id: parseInt(id) }
  });
  return NextResponse.json({ success: true });
}
```

### Option 3: Automatic Cleanup with Database Triggers

Add a database trigger or scheduled job:

**PostgreSQL Example:**
```sql
-- Delete records soft-deleted more than 90 days ago
CREATE OR REPLACE FUNCTION cleanup_old_deleted_records()
RETURNS void AS $$
BEGIN
  DELETE FROM "LeavePolicy"
  WHERE "isActive" = false
    AND "updatedAt" < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule to run daily
SELECT cron.schedule('cleanup-deleted-records', '0 3 * * *', 
  'SELECT cleanup_old_deleted_records()');
```

### Option 4: Direct Database Query (One-time cleanup)

For immediate cleanup, run SQL directly:

```sql
-- View soft-deleted records
SELECT * FROM "LeavePolicy" WHERE "isActive" = false;

-- Permanently delete all soft-deleted records
DELETE FROM "LeavePolicy" WHERE "isActive" = false;

-- Delete records soft-deleted before a specific date
DELETE FROM "LeavePolicy" 
WHERE "isActive" = false 
  AND "updatedAt" < '2026-01-01';
```

## Recommended Approach

For your ERP system, I recommend:

1. **Keep soft-deleted records for 90 days** (compliance/recovery period)
2. **Create a monthly cleanup script** (Option 1)
3. **Add an admin "Trash" view** (Option 2) for manual management
4. **Schedule automatic cleanup** using cron or Windows Task Scheduler

## Implementation Steps

### Step 1: Create Cleanup Script

```bash
# Create the script
touch scripts/cleanup-deleted-records.ts
```

### Step 2: Add to package.json

```json
{
  "scripts": {
    "cleanup:deleted": "tsx scripts/cleanup-deleted-records.ts"
  }
}
```

### Step 3: Schedule It

**Windows (Task Scheduler):**
- Open Task Scheduler
- Create Basic Task
- Schedule: Monthly
- Action: Start a program
- Program: `npm`
- Arguments: `run cleanup:deleted`
- Start in: Your project directory

**Linux/Mac (Crontab):**
```bash
# Edit crontab
crontab -e

# Add this line (runs 1st of each month at 2 AM)
0 2 1 * * cd /path/to/project && npm run cleanup:deleted
```

## Monitoring

Add logging to track deletions:

```typescript
// Add to cleanup script
const result = await db.leavePolicy.deleteMany({
  where: { isActive: false, updatedAt: { lt: thirtyDaysAgo } }
});

// Log to file
const logEntry = `${new Date().toISOString()} - Deleted ${result.count} records\n`;
fs.appendFileSync('logs/cleanup.log', logEntry);
```

## Best Practices

1. **Always backup before permanent deletion**
2. **Set appropriate retention periods** (30-90 days typical)
3. **Log all permanent deletions** for audit trail
4. **Test restore functionality** regularly
5. **Notify users** before permanent deletion (email warnings)
6. **Check for dependencies** before permanent deletion
7. **Require admin approval** for permanent deletion

## Current Status

✅ Soft delete implemented for:
- Leave Policies
- Attendance Rules
- Holidays
- Departments
- Designations

❌ Not yet implemented:
- Trash/Restore UI
- Automatic cleanup script
- Permanent deletion API

## Next Steps

1. Create cleanup script (see Option 1)
2. Add trash view for admins (see Option 2)
3. Schedule monthly cleanup
4. Add restore functionality
5. Implement audit logging
