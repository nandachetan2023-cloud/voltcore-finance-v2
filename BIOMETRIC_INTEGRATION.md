# 🔐 Biometric Integration Guide - eTimeOffice API

## 📋 Overview

This integration connects your HRMS with eTimeOffice biometric devices for automated attendance tracking.

### Architecture Flow
```
[ Biometric Device ] 
       ↓
[ eTimeOffice Cloud API ]
       ↓
[ Sync Service (Every 5 min) ]
       ↓
[ BiometricRawLog Table ]
       ↓
[ Processing Service ]
       ↓
[ AttendanceLog Table ]
       ↓
[ Payroll / Reports / Analytics ]
```

---

## 🗄️ Database Models

### BiometricRawLog
Stores raw punch data from the API before processing.

```prisma
model BiometricRawLog {
  id          Int       @id @default(autoincrement())
  empCode     String
  name        String?
  punchDate   DateTime
  deviceId    String?   // Machine ID
  mFlag       String?
  rawJson     Json      // Complete API response
  processed   Boolean   @default(false)
  processedAt DateTime?
  createdAt   DateTime  @default(now())
}
```

### BiometricSyncLog
Tracks sync operations and maintains state.

```prisma
model BiometricSyncLog {
  id               Int      @id @default(autoincrement())
  lastRecord       String   // MaxRecord from API
  syncType         String   // incremental, full
  recordsFetched   Int
  recordsProcessed Int
  status           String   // success, failed, partial
  errorMessage     String?
  createdAt        DateTime @default(now())
}
```

### AttendanceLog (Enhanced)
Updated with biometric fields.

```prisma
model AttendanceLog {
  id                Int       @id
  employeeId        Int
  logDate           DateTime
  punchIn           DateTime?
  punchOut          DateTime?
  status            String
  biometricDeviceId String?   // NEW
  biometricLogId    String?   // NEW
  source            String    // manual, biometric
  createdAt         DateTime
  updatedAt         DateTime
}
```

---

## 🚀 Setup Instructions

### 1. Update Database Schema

```bash
# Generate Prisma client with new models
npx prisma generate

# Create migration
npx prisma migrate dev --name add_biometric_models

# Or push directly to database
npx prisma db push
```

### 2. Configure Environment Variables

Update `.env` file with your eTimeOffice credentials:

```env
BIOMETRIC_API_URL="https://api.etimeoffice.com/api"
BIOMETRIC_CORPORATE_ID="your_corporate_id"
BIOMETRIC_USERNAME="your_username"
BIOMETRIC_PASSWORD="your_password"
```

### 3. Test API Connection

```bash
# Test incremental sync
curl -X POST http://localhost:3000/api/biometric/sync

# Test date range sync
curl -X POST http://localhost:3000/api/biometric/sync/date-range \
  -H "Content-Type: application/json" \
  -d '{
    "fromDate": "01/01/2024_00:00",
    "toDate": "02/01/2024_00:00"
  }'
```

---

## 📡 API Endpoints

### 1. Incremental Sync (Recommended)
**POST** `/api/biometric/sync`

Fetches new punch data since last sync.

```bash
curl -X POST http://localhost:3000/api/biometric/sync
```

Response:
```json
{
  "success": true,
  "message": "Biometric sync completed",
  "data": {
    "fetched": 45,
    "processed": 45
  }
}
```

### 2. Date Range Sync
**POST** `/api/biometric/sync/date-range`

Sync specific date range (for backfilling).

```bash
curl -X POST http://localhost:3000/api/biometric/sync/date-range \
  -H "Content-Type: application/json" \
  -d '{
    "fromDate": "01/04/2026_00:00",
    "toDate": "15/04/2026_23:59"
  }'
```

### 3. View Raw Logs
**GET** `/api/biometric/logs`

Query parameters:
- `empCode` - Filter by employee code
- `processed` - Filter by processed status (true/false)
- `limit` - Number of records (default: 100)

```bash
# View unprocessed logs
curl "http://localhost:3000/api/biometric/logs?processed=false&limit=50"

# View logs for specific employee
curl "http://localhost:3000/api/biometric/logs?empCode=EMP001"
```

### 4. Sync Status
**GET** `/api/biometric/sync-status`

View sync history and statistics.

```bash
curl http://localhost:3000/api/biometric/sync-status
```

Response:
```json
{
  "success": true,
  "data": {
    "syncHistory": [...],
    "unprocessedCount": 12,
    "lastSuccessfulSync": {
      "id": 45,
      "lastRecord": "092020$456",
      "recordsFetched": 23,
      "recordsProcessed": 23,
      "createdAt": "2026-04-15T10:30:00Z"
    }
  }
}
```

### 5. Process Raw Logs
**POST** `/api/biometric/process`

Manually trigger processing of unprocessed logs.

```bash
curl -X POST http://localhost:3000/api/biometric/process
```

---

## ⏱️ Automated Scheduling

### Option 1: System Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
*/5 * * * * cd /path/to/project && tsx scripts/biometric-sync-cron.ts >> /var/log/biometric-sync.log 2>&1
```

### Option 2: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily, repeat every 5 minutes
4. Action: Start a program
   - Program: `node`
   - Arguments: `scripts/biometric-sync-cron.ts`
   - Start in: `C:\path\to\project`

### Option 3: PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start scheduler
pm2 start scripts/biometric-sync-scheduler.ts --name biometric-sync

# View logs
pm2 logs biometric-sync

# Monitor
pm2 monit

# Auto-start on system boot
pm2 startup
pm2 save
```

### Option 4: Docker Container

```dockerfile
# Add to your Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["tsx", "scripts/biometric-sync-scheduler.ts"]
```

---

## 🎯 Usage Across HRMS Modules

### 1. Attendance Module ✅
**Primary Use**: Daily attendance tracking

```typescript
// Get today's attendance with biometric data
const attendance = await db.attendanceLog.findMany({
  where: {
    logDate: {
      gte: startOfDay(new Date()),
      lte: endOfDay(new Date()),
    },
    source: 'biometric',
  },
  include: {
    employee: true,
  },
})
```

### 2. Payroll Module 💰
**Use**: Calculate working hours, overtime, late penalties

```typescript
// Calculate working hours from biometric punches
const calculateWorkingHours = (punchIn: Date, punchOut: Date) => {
  const diff = punchOut.getTime() - punchIn.getTime()
  return diff / (1000 * 60 * 60) // Hours
}

// Get monthly attendance for payroll
const monthlyAttendance = await db.attendanceLog.findMany({
  where: {
    employeeId: employeeId,
    logDate: {
      gte: startOfMonth(new Date()),
      lte: endOfMonth(new Date()),
    },
  },
})
```

### 3. Leave Management 🏖️
**Use**: Verify actual presence vs leave applications

```typescript
// Check if employee was actually present on leave day
const verifyLeave = async (employeeId: number, leaveDate: Date) => {
  const attendance = await db.attendanceLog.findFirst({
    where: {
      employeeId,
      logDate: leaveDate,
      source: 'biometric',
    },
  })
  
  return attendance ? 'Present (Leave Invalid)' : 'Absent (Leave Valid)'
}
```

### 4. Reports & Analytics 📊
**Use**: Attendance reports, punctuality analysis

```typescript
// Late arrival report
const lateArrivals = await db.attendanceLog.findMany({
  where: {
    punchIn: {
      gte: new Date('2026-04-01T09:30:00'), // After 9:30 AM
    },
    logDate: {
      gte: startOfMonth(new Date()),
    },
  },
  include: {
    employee: {
      include: {
        department: true,
      },
    },
  },
})

// Overtime calculation
const overtimeReport = await db.attendanceLog.findMany({
  where: {
    punchOut: {
      gte: new Date('2026-04-01T18:00:00'), // After 6 PM
    },
  },
})
```

### 5. Dashboard 📈
**Use**: Real-time attendance status

```typescript
// Today's attendance summary
const todaySummary = await db.attendanceLog.groupBy({
  by: ['status'],
  where: {
    logDate: {
      gte: startOfDay(new Date()),
      lte: endOfDay(new Date()),
    },
  },
  _count: true,
})

// Currently in office (punched in, not out)
const currentlyInOffice = await db.attendanceLog.count({
  where: {
    logDate: startOfDay(new Date()),
    punchIn: { not: null },
    punchOut: null,
  },
})
```

### 6. Compliance & Audit 🔍
**Use**: Maintain audit trail of attendance

```typescript
// Get raw biometric logs for audit
const auditTrail = await db.biometricRawLog.findMany({
  where: {
    empCode: 'EMP001',
    punchDate: {
      gte: new Date('2026-04-01'),
      lte: new Date('2026-04-30'),
    },
  },
  orderBy: { punchDate: 'asc' },
})
```

---

## 🔧 Processing Logic

### How Raw Logs Become Attendance

1. **Fetch**: Get punch data from eTimeOffice API
2. **Store**: Save to `BiometricRawLog` table
3. **Group**: Group logs by employee + date
4. **Sort**: Sort by timestamp
5. **Extract**: First punch = IN, Last punch = OUT
6. **Create/Update**: Create or update `AttendanceLog`
7. **Mark**: Mark raw logs as processed

### Example Processing

```
Raw Logs:
- EMP001 | 2026-04-15 09:05:00 | Device-1
- EMP001 | 2026-04-15 13:00:00 | Device-2
- EMP001 | 2026-04-15 14:00:00 | Device-1
- EMP001 | 2026-04-15 18:30:00 | Device-2

Processed Attendance:
- EMP001 | 2026-04-15 | IN: 09:05 | OUT: 18:30 | Status: Present
```

---

## 🛡️ Security Best Practices

1. **Environment Variables**: Never commit credentials to git
2. **HTTPS Only**: Always use HTTPS for API calls
3. **Backend Only**: Don't expose biometric API to frontend
4. **Rate Limiting**: Implement rate limiting on sync endpoints
5. **Authentication**: Protect sync endpoints with API keys
6. **Audit Logs**: Keep sync logs for compliance

---

## 🧪 Testing Checklist

- [ ] API credentials working
- [ ] Incremental sync fetches data
- [ ] Date range sync works
- [ ] Raw logs saved correctly
- [ ] Processing creates attendance records
- [ ] Duplicate prevention works
- [ ] Employee code mapping correct
- [ ] Timezone handling correct
- [ ] Cron job running
- [ ] Error handling works
- [ ] Sync status endpoint works

---

## 🐛 Troubleshooting

### Issue: No data fetched
**Solution**: Check API credentials in `.env`

### Issue: Employee not found
**Solution**: Ensure `employeeCode` in HRMS matches `Empcode` from biometric

### Issue: Duplicate attendance
**Solution**: Check date grouping logic, ensure unique constraint

### Issue: Wrong timezone
**Solution**: Adjust date parsing in `parsePunchDate()` method

### Issue: Sync fails silently
**Solution**: Check `BiometricSyncLog` table for error messages

---

## 📊 Monitoring

### Key Metrics to Track

1. **Sync Success Rate**: % of successful syncs
2. **Processing Lag**: Time between fetch and process
3. **Unprocessed Count**: Number of pending raw logs
4. **API Response Time**: eTimeOffice API latency
5. **Error Rate**: Failed syncs per day

### Monitoring Query

```sql
-- Sync success rate (last 24 hours)
SELECT 
  status,
  COUNT(*) as count,
  AVG(records_fetched) as avg_fetched
FROM biometric_sync_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Unprocessed logs
SELECT COUNT(*) FROM biometric_raw_log WHERE processed = false;

-- Today's attendance coverage
SELECT 
  COUNT(DISTINCT employee_id) as employees_with_attendance,
  (SELECT COUNT(*) FROM employee WHERE is_active = true) as total_active
FROM attendance_log
WHERE log_date = CURRENT_DATE;
```

---

## 🚀 Production Deployment

### Pre-deployment Checklist

1. ✅ Database migrations applied
2. ✅ Environment variables configured
3. ✅ API credentials tested
4. ✅ Cron job/scheduler configured
5. ✅ Monitoring setup
6. ✅ Error alerting configured
7. ✅ Backup strategy in place
8. ✅ Rollback plan ready

### Deployment Steps

```bash
# 1. Backup database
pg_dump -U postgres erp > backup_$(date +%Y%m%d).sql

# 2. Apply migrations
npx prisma migrate deploy

# 3. Test sync manually
curl -X POST http://localhost:3000/api/biometric/sync

# 4. Start scheduler
pm2 start scripts/biometric-sync-scheduler.ts --name biometric-sync

# 5. Monitor logs
pm2 logs biometric-sync --lines 100
```

---

## 📞 Support

For issues or questions:
1. Check sync logs: `/api/biometric/sync-status`
2. Review raw logs: `/api/biometric/logs?processed=false`
3. Check error messages in `BiometricSyncLog` table
4. Verify employee code mapping

---

## 🎉 Success Indicators

Your integration is working correctly when:

✅ Sync runs every 5 minutes without errors
✅ Raw logs are being saved
✅ Attendance records are created automatically
✅ Employee codes match correctly
✅ No unprocessed logs accumulating
✅ Payroll can calculate hours from biometric data

---

**Last Updated**: April 15, 2026
**Version**: 1.0.0
