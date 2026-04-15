# 🚀 Biometric Integration - Quick Start

## ⚡ 5-Minute Setup

### 1. Update Database
```bash
npx prisma generate
npx prisma migrate dev --name add_biometric_models
```

### 2. Configure Credentials
Edit `.env`:
```env
BIOMETRIC_API_URL="https://api.etimeoffice.com/api"
BIOMETRIC_CORPORATE_ID="your_corporate_id"
BIOMETRIC_USERNAME="your_username"
BIOMETRIC_PASSWORD="your_password"
```

### 3. Test Connection
```bash
# Start your Next.js server
npm run dev

# In another terminal, test sync
npm run biometric:sync
```

### 4. Start Auto-Sync (Choose One)

**Option A: PM2 (Recommended)**
```bash
npm install -g pm2
pm2 start scripts/biometric-sync-scheduler.ts --name biometric-sync
pm2 save
```

**Option B: System Cron**
```bash
crontab -e
# Add: */5 * * * * cd /path/to/project && npm run biometric:sync
```

**Option C: Manual Scheduler**
```bash
npm run biometric:scheduler
```

---

## 📡 API Endpoints Cheat Sheet

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/biometric/sync` | POST | Incremental sync (use this!) |
| `/api/biometric/sync/date-range` | POST | Backfill specific dates |
| `/api/biometric/logs` | GET | View raw logs |
| `/api/biometric/sync-status` | GET | Check sync health |
| `/api/biometric/process` | POST | Process pending logs |

---

## 🎯 Common Use Cases

### Get Today's Attendance
```typescript
import { db } from '@/lib/db'
import { startOfDay, endOfDay } from 'date-fns'

const attendance = await db.attendanceLog.findMany({
  where: {
    logDate: {
      gte: startOfDay(new Date()),
      lte: endOfDay(new Date()),
    },
  },
  include: { employee: true },
})
```

### Calculate Monthly Hours for Payroll
```typescript
import { differenceInHours, startOfMonth, endOfMonth } from 'date-fns'

const logs = await db.attendanceLog.findMany({
  where: {
    employeeId: 123,
    logDate: {
      gte: startOfMonth(new Date()),
      lte: endOfMonth(new Date()),
    },
  },
})

const totalHours = logs.reduce((sum, log) => {
  if (log.punchIn && log.punchOut) {
    return sum + differenceInHours(log.punchOut, log.punchIn)
  }
  return sum
}, 0)
```

### Check Who's Currently in Office
```typescript
const inOffice = await db.attendanceLog.findMany({
  where: {
    logDate: startOfDay(new Date()),
    punchIn: { not: null },
    punchOut: null,
  },
  include: { employee: true },
})
```

---

## 🔍 Monitoring Commands

```bash
# Check sync status
curl http://localhost:3000/api/biometric/sync-status

# View unprocessed logs
curl "http://localhost:3000/api/biometric/logs?processed=false"

# View logs for specific employee
curl "http://localhost:3000/api/biometric/logs?empCode=EMP001"

# Trigger manual sync
curl -X POST http://localhost:3000/api/biometric/sync

# Process pending logs
curl -X POST http://localhost:3000/api/biometric/process
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No data syncing | Check `.env` credentials |
| Employee not found | Verify `employeeCode` matches API `Empcode` |
| Duplicate records | Check `BiometricSyncLog` for errors |
| Wrong timezone | Adjust `parsePunchDate()` in `biometric.ts` |

---

## ✅ Success Checklist

- [ ] Database models created
- [ ] `.env` configured with credentials
- [ ] Manual sync works
- [ ] Scheduler running
- [ ] Attendance records created
- [ ] Employee codes match
- [ ] No errors in sync logs

---

## 📚 Full Documentation

See `BIOMETRIC_INTEGRATION.md` for complete documentation.

See `examples/biometric-usage-examples.ts` for code examples.

---

## 🆘 Quick Help

**View sync logs:**
```sql
SELECT * FROM biometric_sync_log ORDER BY created_at DESC LIMIT 10;
```

**View unprocessed logs:**
```sql
SELECT COUNT(*) FROM biometric_raw_log WHERE processed = false;
```

**View today's attendance:**
```sql
SELECT e.employee_code, e.first_name, a.punch_in, a.punch_out
FROM attendance_log a
JOIN employee e ON a.employee_id = e.id
WHERE a.log_date = CURRENT_DATE;
```

---

**Need more help?** Check the full documentation in `BIOMETRIC_INTEGRATION.md`
