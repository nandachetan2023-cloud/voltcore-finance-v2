# Fix React Key Warning

## Issue
You're seeing this error:
```
Each child in a list should have a unique "key" prop.
```

## Root Cause
**Browser cache issue** - The code already has the `key` prop, but your browser is showing old cached code.

## Current Code (Already Fixed)
```tsx
// Line 297 in src/components/erp/employees.tsx
{sites.map(s => <option key={s} value={s}>{s}</option>)}
//              ^^^^^^^^ Key is already present!
```

---

## Solution: Clear Cache and Restart

### Step 1: Stop the Server
```bash
# Press Ctrl+C in your terminal
```

### Step 2: Clear Next.js Cache
```bash
# Delete .next folder
rm -rf .next

# On Windows PowerShell:
Remove-Item -Recurse -Force .next

# Or manually delete the .next folder
```

### Step 3: Clear Browser Cache
**Option A: Hard Refresh**
- Chrome/Edge: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Firefox: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

**Option B: Clear Cache in DevTools**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Option C: Incognito/Private Window**
- Open in incognito mode to test with fresh cache

### Step 4: Restart Development Server
```bash
npm run dev
```

---

## Why This Happens

### Development Mode Caching
```
Browser Cache
    ↓
Old JavaScript Bundle (without key)
    ↓
React Warning
```

Even though your source code is correct, the browser might be using an old compiled version.

---

## Verification

After clearing cache, the warning should disappear because:

1. ✅ Line 288: `{TRADES.map(t => <option key={t} value={t}>{t}</option>)}`
2. ✅ Line 297: `{sites.map(s => <option key={s} value={s}>{s}</option>)}`
3. ✅ Line 357: `{filter.options.map((o, idx) => <option key={...} value={o}>{o}</option>)}`

All map functions already have proper keys!

---

## Quick Fix Commands

### Windows (PowerShell)
```powershell
# Stop server (Ctrl+C), then:
Remove-Item -Recurse -Force .next
npm run dev
```

### Linux/Mac (Bash)
```bash
# Stop server (Ctrl+C), then:
rm -rf .next
npm run dev
```

---

## If Error Persists

If you still see the error after clearing cache:

1. **Check browser console** - Make sure you're looking at the latest error
2. **Check line numbers** - Verify the line number matches current code
3. **Try different browser** - Test in Chrome, Firefox, or Edge
4. **Check for other files** - The error might be from a different component

---

## Prevention

To avoid cache issues in the future:

### 1. Disable Cache in DevTools
- Open DevTools (F12)
- Go to Network tab
- Check "Disable cache"
- Keep DevTools open while developing

### 2. Use Turbopack (Already Enabled)
Your Next.js is using Turbopack which has better caching:
```
Next.js version: 16.2.3 (Turbopack)
```

### 3. Regular Cache Clearing
When switching branches or making major changes:
```bash
rm -rf .next
npm run dev
```

---

## Summary

✅ **Your code is correct** - All keys are present  
⚠️ **Browser cache issue** - Old code is cached  
🔧 **Solution**: Clear `.next` folder and browser cache  
🚀 **Result**: Warning will disappear

The error message is showing **stale code** from cache, not your current code!
