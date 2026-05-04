# Troubleshooting Payroll "Failed to Fetch" Errors

## Quick Diagnosis

### 1. Check Browser Console
Press F12 in your browser and go to the Console tab. Look for:
- Red error messages
- Failed network requests (they'll show the exact API endpoint)
- CORS errors
- Timeout errors

### 2. Check Server Logs
SSH into your VPS and run:
```bash
pm2 logs erp-nextjs --lines 100
```

Look for:
- 500 errors
- Database connection errors
- Timeout errors
- "request is not defined" errors

### 3. Check Network Tab
In browser DevTools (F12), go to Network tab:
- Reload the payroll page
- Look for failed requests (red)
- Click on the failed request to see:
  - Status code (500, 404, 502, etc.)
  - Response body (error message)
  - Request headers (check cookies are being sent)

---

## Common Causes & Fixes

### Issue 1: Missing Request Parameter
**Symptom:** `ReferenceError: request is not defined`

**Fix:** The API route is missing the `request` parameter.

Example of broken code:
```typescript
export async function GET() {
  const db = getDbForRequest(request)  // ❌ request not defined
```

Fixed code:
```typescript
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)  // ✅ request is passed
```

### Issue 2: Database Connection Error
**Symptom:** `P2021: The table does not exist` or connection timeout

**Fix:** 
1. Check `.env` has correct database URLs
2. Verify database exists: `psql -U erp_user -d erp -c "\dt"`
3. Push schema if tables missing: `bun run db:push`

### Issue 3: Tenant Database Not Found
**Symptom:** Error about missing tenant database or connection refused

**Fix:**
1. Login to superadmin at `/superadmin`
2. Check the tenant's database URL is correct
3. Verify the database exists on the server
4. Test connection: `psql -U erp_user -d [database_name] -c "SELECT 1"`

### Issue 4: Memory/Timeout on Large Queries
**Symptom:** Request times out after 30-60 seconds

**Fix:**
1. Check PM2 memory: `pm2 monit`
2. If RAM is maxed out, restart: `pm2 restart erp-nextjs`
3. Consider upgrading from KVM 1 to KVM 2
4. Add pagination to large data fetches

### Issue 5: Cookie Not Being Sent
**Symptom:** Works on localhost but fails on VPS

**Fix:**
1. Check your domain is set correctly in Caddy
2. Verify HTTPS is working (cookies require secure context)
3. Check browser isn't blocking third-party cookies
4. Clear browser cookies and login again

---

## Specific Payroll Routes to Check

### Compliance Payroll
- **GET** `/api/payroll?payrollType=compliance`
- **POST** `/api/payroll/salary-compliance-import`
- **GET** `/api/payroll/salary-compliance-template`

### Non-Compliance Payroll
- **GET** `/api/payroll?payrollType=non-compliance`
- **POST** `/api/payroll/salary-non-compliance-import`
- **GET** `/api/payroll/generate-template`

---

## Debug Commands

### On VPS:

```bash
# Check if app is running
pm2 status

# View live logs
pm2 logs erp-nextjs --lines 50

# Check memory usage
free -h
pm2 monit

# Test database connection
psql -U erp_user -d erp -c "SELECT COUNT(*) FROM \"Employee\""

# Restart app
pm2 restart erp-nextjs

# Check Caddy is running
sudo systemctl status caddy-erp
```

### In Browser Console:

```javascript
// Check if cookies are set
document.cookie

// Test API directly
fetch('/api/payroll?payrollType=compliance')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## Still Not Working?

1. **Restart everything:**
   ```bash
   pm2 restart erp-nextjs
   sudo systemctl restart caddy-erp
   sudo systemctl restart postgresql
   ```

2. **Check the exact error:**
   - Copy the full error from PM2 logs
   - Copy the failed network request from browser DevTools
   - Check which specific API endpoint is failing

3. **Verify tenant setup:**
   - Login to `/superadmin`
   - Check tenant database URL is correct
   - Verify tenant user has correct permissions
   - Try creating a new test tenant to isolate the issue
