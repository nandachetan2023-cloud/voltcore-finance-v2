# 🧪 Biometric Integration Testing Guide

## Overview

This guide helps you test the biometric integration thoroughly before production deployment.

---

## 🔧 Pre-Testing Setup

### 1. Environment Setup
```bash
# Ensure database is ready
npx prisma generate
npx prisma migrate dev

# Start development server
npm run dev
```

### 2. Configure Test Credentials
Update `.env` with test/sandbox credentials:
```env
BIOMETRIC_API_URL="https://api.etimeoffice.com/api"
BIOMETRIC_CORPORATE_ID="test_corporate"
BIOMETRIC_USERNAME="test_user"
BIOMETRIC_PASSWORD="test_pass"
```

---

## 📋 Testing Checklist

### ✅ Phase 1: API Connection Tests

#### Test 1.1: Basic Authentication
```bash
# Test if credentials work
curl -X POST http://localhost:3000/api/biometric/sync
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Biometric sync completed",
  "data": {
    "fetched": 0,
    "processed": 0
  }
}
```

**Pass Criteria:**
- ✅ No authentication errors
- ✅ API responds successfully
- ✅ Returns valid JSON

---

#### Test 1.2: Date Range Sync
```bash
curl -X POST http://localhost:3000/api/biometric/sync/date-range \
  -H "Content-Type: application/json" \
  -d '{
    "fromDate": "01/04/2026_00:00",
    "toDate": "02/04/2026_23:59"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Date range sync completed",
  "data": {
    "fetched": 45,
    "processed": 45
  }
}
```

**Pass Criteria:**
- ✅ Data fetched successfully
- ✅ Records saved to database
- ✅ No errors in response

---

### ✅ Phase 2: Data Storage Tests

#### Test 2.1: Raw Logs Saved
```sql
-- Check if raw logs are saved
SELECT COUNT(*) FROM biometric_raw_log;

-- View sample logs
SELECT * FROM biometric_raw_log LIMIT 5;
```

**Expected Result:**
- ✅ Records exist in table
- ✅ All fields populated correctly
- ✅ JSON data stored properly

---

#### Test 2.2: Sync Log Created
```sql
-- Check sync logs
SELECT * FROM biometric_sync_log ORDER BY created_at DESC LIMIT 5;
```

**Expected Result:**
```
id | last_record | sync_type    | records_fetched | status  | created_at
1  | 092020$456  | incremental  | 45              | success | 2026-04-15 10:30:00
```

**Pass Criteria:**
- ✅ Sync log entry created
- ✅ Status is 'success'
- ✅ Record counts match

---

### ✅ Phase 3: Processing Tests

#### Test 3.1: Process Raw Logs
```bash
# Trigger processing
curl -X POST http://localhost:3000/api/biometric/process
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Raw logs processed successfully",
  "data": {
    "processedCount": 45
  }
}
```

---

#### Test 3.2: Attendance Records Created
```sql
-- Check if attendance records created
SELECT 
  e.employee_code,
  e.first_name,
  a.log_date,
  a.punch_in,
  a.punch_out,
  a.source
FROM attendance_log a
JOIN employee e ON a.employee_id = e.id
WHERE a.source = 'biometric'
ORDER BY a.log_date DESC
LIMIT 10;
```

**Expected Result:**
```
employee_code | first_name | log_date   | punch_in            | punch_out           | source
EMP001        | John       | 2026-04-15 | 2026-04-15 09:05:00 | 2026-04-15 18:30:00 | biometric
EMP002        | Jane       | 2026-04-15 | 2026-04-15 09:12:00 | 2026-04-15 18:25:00 | biometric
```

**Pass Criteria:**
- ✅ Attendance records created
- ✅ Punch in/out times correct
- ✅ Source marked as 'biometric'
- ✅ Employee mapping correct

---

#### Test 3.3: Duplicate Prevention
```bash
# Run sync twice
curl -X POST http://localhost:3000/api/biometric/sync
curl -X POST http://localhost:3000/api/biometric/sync
```

**Check Database:**
```sql
-- Should not have duplicates
SELECT emp_code, punch_date, COUNT(*) as count
FROM biometric_raw_log
GROUP BY emp_code, punch_date
HAVING COUNT(*) > 1;
```

**Expected Result:**
- ✅ No duplicate records
- ✅ Second sync skips existing records

---

### ✅ Phase 4: Employee Mapping Tests

#### Test 4.1: Employee Code Matching
```sql
-- Check if all employee codes from biometric exist in HRMS
SELECT DISTINCT b.emp_code
FROM biometric_raw_log b
LEFT JOIN employee e ON b.emp_code = e.employee_code
WHERE e.id IS NULL;
```

**Expected Result:**
- ✅ Empty result (all codes match)
- ⚠️ If not empty, create missing employees

---

#### Test 4.2: Unmapped Employees
```bash
# View logs for unmapped employees
curl "http://localhost:3000/api/biometric/logs?processed=false&limit=100"
```

**Action:**
- Create missing employees in HRMS
- Or update employee codes to match

---

### ✅ Phase 5: Incremental Sync Tests

#### Test 5.1: First Sync
```bash
# Clear sync logs
DELETE FROM biometric_sync_log;

# Run first sync
curl -X POST http://localhost:3000/api/biometric/sync
```

**Check:**
```sql
SELECT last_record FROM biometric_sync_log ORDER BY created_at DESC LIMIT 1;
```

**Expected:**
- ✅ `last_record` is populated
- ✅ Records fetched

---

#### Test 5.2: Subsequent Sync
```bash
# Wait 5 minutes or add new test data
# Run sync again
curl -X POST http://localhost:3000/api/biometric/sync
```

**Check:**
```sql
SELECT 
  last_record,
  records_fetched,
  created_at
FROM biometric_sync_log
ORDER BY created_at DESC
LIMIT 2;
```

**Expected:**
- ✅ `last_record` updated
- ✅ Only new records fetched
- ✅ No duplicate processing

---

### ✅ Phase 6: Error Handling Tests

#### Test 6.1: Invalid Credentials
```bash
# Temporarily change credentials in .env
BIOMETRIC_USERNAME="invalid"

# Restart server and test
curl -X POST http://localhost:3000/api/biometric/sync
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Biometric API error: 401 Unauthorized"
}
```

**Pass Criteria:**
- ✅ Error caught gracefully
- ✅ Error message clear
- ✅ Sync log shows 'failed' status

---

#### Test 6.2: Network Timeout
```bash
# Simulate network issue (disconnect internet)
curl -X POST http://localhost:3000/api/biometric/sync
```

**Expected:**
- ✅ Error handled
- ✅ Sync log created with error
- ✅ System remains stable

---

#### Test 6.3: Invalid Date Format
```bash
curl -X POST http://localhost:3000/api/biometric/sync/date-range \
  -H "Content-Type: application/json" \
  -d '{
    "fromDate": "invalid-date",
    "toDate": "also-invalid"
  }'
```

**Expected:**
- ✅ Validation error returned
- ✅ No database corruption

---

### ✅ Phase 7: Scheduler Tests

#### Test 7.1: Manual Scheduler
```bash
# Start scheduler
npm run biometric:scheduler
```

**Monitor:**
```bash
# Watch logs
tail -f logs/biometric-sync.log
```

**Expected:**
- ✅ Runs every 5 minutes
- ✅ Logs each sync attempt
- ✅ No crashes

---

#### Test 7.2: PM2 Scheduler
```bash
# Start with PM2
pm2 start scripts/biometric-sync-scheduler.ts --name biometric-sync

# Monitor
pm2 logs biometric-sync

# Check status
pm2 status
```

**Expected:**
- ✅ Process running
- ✅ No restarts
- ✅ Logs show successful syncs

---

### ✅ Phase 8: API Endpoint Tests

#### Test 8.1: View Raw Logs
```bash
# All logs
curl "http://localhost:3000/api/biometric/logs"

# Unprocessed only
curl "http://localhost:3000/api/biometric/logs?processed=false"

# Specific employee
curl "http://localhost:3000/api/biometric/logs?empCode=EMP001"

# Limited results
curl "http://localhost:3000/api/biometric/logs?limit=10"
```

**Pass Criteria:**
- ✅ All filters work
- ✅ Data returned correctly
- ✅ Pagination works

---

#### Test 8.2: Sync Status
```bash
curl "http://localhost:3000/api/biometric/sync-status"
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "syncHistory": [...],
    "unprocessedCount": 0,
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

**Pass Criteria:**
- ✅ History shows recent syncs
- ✅ Unprocessed count accurate
- ✅ Last sync details correct

---

### ✅ Phase 9: Integration Tests

#### Test 9.1: Attendance API Integration
```bash
# Get today's attendance
curl "http://localhost:3000/api/attendance"
```

**Expected:**
- ✅ Includes biometric attendance
- ✅ Source field shows 'biometric'
- ✅ Device ID populated

---

#### Test 9.2: Payroll Integration
```typescript
// Test payroll calculation
import { calculateMonthlyWorkingHours } from '@/examples/biometric-usage-examples'

const result = await calculateMonthlyWorkingHours(123, 4, 2026)
console.log(result)
```

**Expected:**
```json
{
  "totalDays": 22,
  "totalHours": 176.5,
  "averageHoursPerDay": 8.02,
  "overtimeHours": 4.5
}
```

**Pass Criteria:**
- ✅ Hours calculated correctly
- ✅ Overtime detected
- ✅ No calculation errors

---

### ✅ Phase 10: Performance Tests

#### Test 10.1: Large Dataset Sync
```bash
# Sync 1 month of data
curl -X POST http://localhost:3000/api/biometric/sync/date-range \
  -H "Content-Type: application/json" \
  -d '{
    "fromDate": "01/03/2026_00:00",
    "toDate": "31/03/2026_23:59"
  }'
```

**Monitor:**
- Response time
- Memory usage
- Database performance

**Pass Criteria:**
- ✅ Completes within 2 minutes
- ✅ No memory leaks
- ✅ Database not overloaded

---

#### Test 10.2: Concurrent Requests
```bash
# Run multiple syncs simultaneously
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/biometric/sync &
done
wait
```

**Expected:**
- ✅ All requests handled
- ✅ No race conditions
- ✅ No duplicate records

---

## 🎯 Test Scenarios

### Scenario 1: New Employee First Day

**Setup:**
1. Create new employee in HRMS
2. Employee punches in biometric device
3. Wait for sync

**Test:**
```bash
curl -X POST http://localhost:3000/api/biometric/sync
```

**Verify:**
```sql
SELECT * FROM attendance_log 
WHERE employee_id = (SELECT id FROM employee WHERE employee_code = 'NEW_EMP')
ORDER BY log_date DESC LIMIT 1;
```

**Expected:**
- ✅ Attendance record created
- ✅ First punch captured

---

### Scenario 2: Employee Forgot to Punch Out

**Setup:**
1. Employee punches in
2. Forgets to punch out
3. Next day arrives

**Test:**
```sql
-- Check previous day attendance
SELECT * FROM attendance_log 
WHERE employee_id = 123 
AND log_date = '2026-04-14';
```

**Expected:**
- ✅ Punch in recorded
- ✅ Punch out is NULL
- ✅ Status can be marked for review

---

### Scenario 3: Multiple Punches Same Day

**Setup:**
1. Employee punches in morning
2. Goes out for lunch (punches out/in)
3. Leaves evening (punches out)

**Test:**
```sql
-- Check raw logs
SELECT * FROM biometric_raw_log 
WHERE emp_code = 'EMP001' 
AND DATE(punch_date) = '2026-04-15'
ORDER BY punch_date;
```

**Expected:**
- ✅ All punches recorded
- ✅ First punch = IN
- ✅ Last punch = OUT
- ✅ Middle punches ignored or logged

---

### Scenario 4: Night Shift

**Setup:**
1. Employee works 10 PM to 6 AM
2. Punches cross midnight

**Test:**
```sql
SELECT * FROM attendance_log 
WHERE employee_id = 123 
AND log_date = '2026-04-15';
```

**Expected:**
- ✅ Attendance on correct date
- ✅ Hours calculated correctly
- ✅ Shift allowance applicable

---

## 📊 Test Results Template

```markdown
## Test Execution Report

**Date:** 2026-04-15
**Tester:** [Name]
**Environment:** Development

### Phase 1: API Connection
- [ ] Test 1.1: Basic Authentication - PASS/FAIL
- [ ] Test 1.2: Date Range Sync - PASS/FAIL

### Phase 2: Data Storage
- [ ] Test 2.1: Raw Logs Saved - PASS/FAIL
- [ ] Test 2.2: Sync Log Created - PASS/FAIL

### Phase 3: Processing
- [ ] Test 3.1: Process Raw Logs - PASS/FAIL
- [ ] Test 3.2: Attendance Records - PASS/FAIL
- [ ] Test 3.3: Duplicate Prevention - PASS/FAIL

### Phase 4: Employee Mapping
- [ ] Test 4.1: Code Matching - PASS/FAIL
- [ ] Test 4.2: Unmapped Employees - PASS/FAIL

### Phase 5: Incremental Sync
- [ ] Test 5.1: First Sync - PASS/FAIL
- [ ] Test 5.2: Subsequent Sync - PASS/FAIL

### Phase 6: Error Handling
- [ ] Test 6.1: Invalid Credentials - PASS/FAIL
- [ ] Test 6.2: Network Timeout - PASS/FAIL
- [ ] Test 6.3: Invalid Date - PASS/FAIL

### Phase 7: Scheduler
- [ ] Test 7.1: Manual Scheduler - PASS/FAIL
- [ ] Test 7.2: PM2 Scheduler - PASS/FAIL

### Phase 8: API Endpoints
- [ ] Test 8.1: View Raw Logs - PASS/FAIL
- [ ] Test 8.2: Sync Status - PASS/FAIL

### Phase 9: Integration
- [ ] Test 9.1: Attendance API - PASS/FAIL
- [ ] Test 9.2: Payroll Integration - PASS/FAIL

### Phase 10: Performance
- [ ] Test 10.1: Large Dataset - PASS/FAIL
- [ ] Test 10.2: Concurrent Requests - PASS/FAIL

### Issues Found:
1. [Issue description]
2. [Issue description]

### Overall Status: PASS / FAIL / PARTIAL
```

---

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No data syncing | Wrong credentials | Check `.env` file |
| Employee not found | Code mismatch | Update employee codes |
| Duplicate records | Sync logic error | Check `lastRecord` tracking |
| Wrong timezone | Date parsing | Adjust `parsePunchDate()` |
| Slow sync | Large dataset | Optimize queries, add indexes |
| Memory leak | Unclosed connections | Check database connection pool |

---

## ✅ Production Readiness Checklist

Before deploying to production:

- [ ] All tests passed
- [ ] No critical issues
- [ ] Performance acceptable
- [ ] Error handling verified
- [ ] Scheduler working
- [ ] Monitoring setup
- [ ] Backup strategy ready
- [ ] Rollback plan documented
- [ ] Team trained
- [ ] Documentation complete

---

## 📞 Support

If tests fail:
1. Check logs: `pm2 logs biometric-sync`
2. Check database: `SELECT * FROM biometric_sync_log WHERE status = 'failed'`
3. Review error messages
4. Consult `BIOMETRIC_INTEGRATION.md`

---

**Last Updated**: April 15, 2026
**Version**: 1.0.0
