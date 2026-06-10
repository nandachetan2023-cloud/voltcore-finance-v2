# Deploy Employee Bulk Import Changes - Quick Guide

## Files Changed

These are the files modified for the employee bulk import feature:

1. `src/components/erp/employee-bulk-import.tsx` - Frontend component
2. `src/app/api/employees/bulk-import/route.ts` - Backend API

## Deployment Steps

### Step 1: Push Changes to Git

```bash
# Add all changed files
git add src/components/erp/employee-bulk-import.tsx
git add src/app/api/employees/bulk-import/route.ts

# Commit with descriptive message
git commit -m "Fix: Employee bulk import - validation, optional fields, and type conversions

- Fixed validation not working (format mismatch)
- Made email and address fields optional
- Fixed Prisma schema errors (updatedAt fields)
- Fixed type conversions (numbers to strings)
- Enhanced error handling and user feedback
"

# Push to main branch
git push origin main
```

### Step 2: Deploy to Server

SSH into your server:

```bash
ssh erp@YOUR_SERVER_IP
# or
ssh root@YOUR_SERVER_IP
```

### Step 3: Pull Latest Changes

```bash
cd /home/erp/app

# Pull latest code
git pull origin main

# Install any new dependencies (if needed)
bun install
```

### Step 4: Check Database Schema

The employee bulk import doesn't require schema changes, but let's verify:

```bash
# This is safe - it only shows if there are differences
npx prisma db push --preview-feature
```

If it shows "Your database is already in sync", you're good to go. If it shows changes, review them and apply:

```bash
npx prisma db push
```

### Step 5: Build the Application

```bash
bun run build
```

This will take 2-5 minutes on KVM 2 (or 6-10 minutes on KVM 1).

### Step 6: Restart the Application

```bash
pm2 restart erp-nextjs
```

### Step 7: Verify Deployment

Check the logs to ensure no errors:

```bash
pm2 logs erp-nextjs --lines 50
```

Visit your app in the browser:

```
https://yourdomain.com
```

## Testing After Deployment

### Test 1: Download Template
1. Go to Employee module
2. Click "Bulk Import"
3. Click "Template" button
4. Verify Excel downloads with correct headers (no asterisks on optional fields)

### Test 2: Minimal Import
1. Fill only required fields in Excel:
   - Employee ID*, First Name*, Last Name*, Phone*
   - Date of Birth*, Gender*, Date of Joining*
   - Department*, Designation*, Branch*, Employment Status*
2. Upload and click "Validate"
3. Should show success with no errors

### Test 3: Validation Errors
1. Upload Excel with missing Phone number
2. Click "Validate"
3. Should show specific error: "Phone is required" on affected row

### Test 4: Full Import
1. Fill all fields in Excel
2. Upload, validate, and import
3. Should import successfully
4. Check that all data is saved correctly

### Test 5: Export → Edit → Import
1. Click "Export All" button
2. Edit the exported Excel (add new employees)
3. Upload edited file
4. Validate and import
5. Should work seamlessly (round-trip test)

## Rollback Plan (If Something Goes Wrong)

If the deployment causes issues:

```bash
cd /home/erp/app

# Go back to previous commit
git log --oneline -10  # See last 10 commits
git revert HEAD  # Or use specific commit hash

# Rebuild and restart
bun run build
pm2 restart erp-nextjs
```

## Common Issues After Deployment

### Issue 1: Build Fails
**Error:** Out of memory during build

**Solution:** If on KVM 1, ensure swap is active:
```bash
free -h  # Check swap
sudo swapon /swapfile  # Enable if needed
```

### Issue 2: Import Still Showing Errors
**Error:** Old code is cached

**Solution:** Hard refresh in browser:
```bash
# On Windows/Linux: Ctrl + Shift + R
# On Mac: Cmd + Shift + R
```

Or clear browser cache completely.

### Issue 3: Type Conversion Errors
**Error:** "Expected String, provided Int"

**Solution:** Verify the latest code is deployed:
```bash
cd /home/erp/app
git log --oneline -1  # Should show your latest commit
```

If not up to date:
```bash
git pull origin main
bun run build
pm2 restart erp-nextjs
```

## Monitoring After Deployment

### Check Application Logs

```bash
# Real-time logs
pm2 logs erp-nextjs

# Last 100 lines
pm2 logs erp-nextjs --lines 100

# Error logs only
pm2 logs erp-nextjs --err
```

### Check Memory Usage

```bash
# PM2 monitor
pm2 monit

# System memory
free -h

# Process memory
ps aux --sort=-%mem | head -10
```

### Check Application Status

```bash
pm2 status
```

Should show:
```
│ erp-nextjs │ online │ 0 │ 0s │ 0 │
```

## Performance Considerations

The employee bulk import feature:
- ✅ Validates in batches
- ✅ Imports in batches of 100
- ✅ Uses connection pooling
- ✅ Auto-creates departments/designations

**Expected Performance:**
- Validation: ~1-2 seconds for 100 rows
- Import: ~3-5 seconds for 100 rows
- Memory usage: ~50-100 MB spike during import

## Backup Before Large Imports

If you're importing a large number of employees (500+), backup the database first:

```bash
# Backup main database
pg_dump -U erp_user -h localhost erp > ~/backups/erp_$(date +%Y%m%d_%H%M%S).sql

# Create backups directory if it doesn't exist
mkdir -p ~/backups
```

Restore if needed:
```bash
psql -U erp_user -h localhost erp < ~/backups/erp_YYYYMMDD_HHMMSS.sql
```

## Quick Deploy Command (One-Liner)

Once you've pushed to Git, you can use this command on the server:

```bash
cd /home/erp/app && git pull origin main && bun install && bun run build && pm2 restart erp-nextjs && pm2 logs erp-nextjs --lines 20
```

This will:
1. Pull latest code
2. Install dependencies
3. Build the app
4. Restart PM2
5. Show recent logs

## Success Checklist

- [ ] Code pushed to Git repository
- [ ] SSH into server successful
- [ ] Git pull completed without conflicts
- [ ] Dependencies installed (`bun install`)
- [ ] Build completed successfully (`bun run build`)
- [ ] PM2 restart successful
- [ ] No errors in logs (`pm2 logs`)
- [ ] App accessible at domain
- [ ] Template download works
- [ ] Validation works with proper errors
- [ ] Import works successfully
- [ ] Export works correctly
- [ ] Round-trip (Export → Edit → Import) works

## Support

If you encounter issues:
1. Check the logs: `pm2 logs erp-nextjs --lines 100`
2. Check PM2 status: `pm2 status`
3. Check server resources: `free -h` and `df -h`
4. Verify environment variables: `cat .env` (check NEXTAUTH_URL, DATABASE_URL)
5. Test database connection: `psql -U erp_user -h localhost erp`

## Done! 🎉

Your employee bulk import feature is now live in production with:
- ✅ Working validation
- ✅ Optional email and address fields
- ✅ Proper error messages
- ✅ Type conversions fixed
- ✅ Better user experience
