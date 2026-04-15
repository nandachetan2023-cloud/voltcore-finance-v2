# Fix Turbopack Error

## Error Message
```
thread 'tokio-runtime-worker' panicked at turbopack\crates\turbo-tasks-backend\src\backend\operation\mod.rs:966:13:
Every task must have a task type
```

## Root Cause
This is a known issue with Next.js 16.2.3 Turbopack. It happens when:
- Cache gets corrupted
- Hot reload fails
- Module resolution conflicts

## Solution

### Step 1: Stop the Development Server
Press `Ctrl+C` in your terminal

### Step 2: Clear Next.js Cache
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next

# Windows CMD
rmdir /s /q .next

# Linux/Mac
rm -rf .next
```

### Step 3: Clear Node Modules Cache (Optional)
```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules\.cache

# Linux/Mac
rm -rf node_modules/.cache
```

### Step 4: Restart Development Server
```bash
npm run dev
```

---

## If Error Persists

### Option 1: Downgrade Next.js
```bash
npm install next@15.1.0
```

### Option 2: Disable Turbopack
Edit `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3000"  // Remove --turbo flag if present
  }
}
```

### Option 3: Use Production Build
```bash
npm run build
npm start
```

---

## Prevention

### 1. Regular Cache Clearing
When you encounter issues:
```bash
rm -rf .next
npm run dev
```

### 2: Use Git Clean
```bash
git clean -fdx .next
```

### 3: Environment Variable
Add to `.env.local`:
```
TURBOPACK_BINARY_PATH=
```

---

## Employee Analytics Fix

The Employee Analytics component has been updated to:
1. ✅ Fetch data from database APIs
2. ✅ Map employee data correctly (employeeCode, firstName, lastName, etc.)
3. ✅ Map attendance data with proper date/time formatting
4. ✅ Calculate OT hours from punch times
5. ✅ Show real department, designation, branch data
6. ✅ Display charts with actual database values

### What Was Fixed:
- Employee mapping: Uses `employeeCode`, `firstName`, `lastName`, `department.name`, `designation.name`, `branch.name`
- Attendance mapping: Converts `logDate`, `punchIn`, `punchOut` to proper format
- OT calculation: `(punchOut - punchIn) - 8 hours`
- Status mapping: `present` → `Present`, `absent` → `Absent`

### Charts Now Show:
1. **Employees by Role** - From `designation.name`
2. **Employees by Trade** - From `department.name`
3. **Employees by Site** - From `branch.name`
4. **Employees by Type** - From `employmentType`
5. **Today's Attendance** - Real attendance records
6. **Monthly Payroll Trend** - From payroll data (when available)
7. **Leave by Type** - From leave requests (when available)

---

## Quick Fix Command

```bash
# Stop server (Ctrl+C), then run:
Remove-Item -Recurse -Force .next ; npm run dev
```

This will clear cache and restart in one command!
