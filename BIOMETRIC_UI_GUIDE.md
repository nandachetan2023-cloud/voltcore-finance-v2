# Biometric Screen - Complete User Guide

## Overview
The Biometric module integrates with eTimeOffice biometric devices to automatically sync employee attendance data into your ERP system.

---

## Top Section: Site Selector & Sync Button

### 1. **Site Dropdown** (Building icon)
**Location:** Top right, next to "Sync Now" button

**What it does:**
- Allows you to select which biometric site to work with
- Options: "All Sites", "Site 67", "Site 68"
- Filters all operations to the selected site

**When to use:**
- Select "All Sites" to sync/view data from both locations
- Select specific site (Site 67 or Site 68) to work with one location only

**Example:**
- You have machines at two different factory locations
- Select "Site 67" to only see/sync data from that location

---

### 2. **Sync Now Button** (Orange button with refresh icon)
**Location:** Top right corner

**What it does:**
- Fetches new punch data from biometric devices
- Uses incremental sync (only gets new data since last sync)
- Automatically processes the data into attendance records

**When to use:**
- Daily: Run once per day to get yesterday's attendance
- Real-time: Run anytime to get latest punch data
- After adding new employees: Sync to match their biometric data

**What happens:**
1. Connects to eTimeOffice API
2. Fetches new punch logs since last sync
3. Saves raw logs to database
4. Matches employee codes with ERP employees
5. Creates/updates attendance records
6. Shows success message with employee names

**Example Output:**
```
Sync completed!

Processed 45 records for 12 employees:

Dipak kumar roul (0002): 4 records
Tushar ranjan behera (0004): 3 records
...and 10 more employees
```

---

## Statistics Cards (Top Row)

### 1. **Unprocessed Logs** (Database icon)
**Shows:** Number of raw punch logs not yet converted to attendance

**What it means:**
- These are punch events from biometric devices
- They need to be processed to create attendance records
- Should be 0 after processing

**Action:** Click "Process Logs" button if this number is > 0

---

### 2. **Last Sync** (Activity icon)
**Shows:** Time of the most recent successful sync

**What it means:**
- When you last fetched data from biometric devices
- "Never" if no sync has been done yet

**Action:** If it's been more than 24 hours, run "Sync Now"

---

### 3. **Last Fetched** (Check icon)
**Shows:** Number of records fetched in last sync

**What it means:**
- How many punch events were downloaded
- 0 means no new data available

---

### 4. **Last Processed** (Users icon)
**Shows:** Number of records processed into attendance

**What it means:**
- How many punch logs were converted to attendance records
- Should match "Last Fetched" if all employees exist in ERP

---

## Tab 1: Sync Operations

### **Incremental Sync Section**

#### **Run Incremental Sync Button** (Orange button)
**What it does:**
- Fetches only NEW data since last sync
- Most efficient method for daily operations
- Automatically processes the data

**When to use:**
- Daily routine: Run once per day
- Real-time updates: Run anytime during the day
- After employees punch in/out

**How it works:**
1. Checks last sync record
2. Asks API for data after that point
3. Downloads only new punch logs
4. Processes them into attendance

**Best Practice:** Use this for daily operations (recommended)

---

### **Date Range Sync Section**

#### **From Date & To Date Fields**
**Format:** dd/MM/yyyy_HH:mm
**Example:** 01/04/2026_00:00 to 30/04/2026_23:59

**What it does:**
- Allows you to specify exact date range to sync

**When to use:**
- Initial setup: Import historical data
- Backfilling: Fill gaps in attendance data
- Specific period: Get data for a particular month

---

#### **Sync Date Range Button** (Blue button)
**What it does:**
- Fetches ALL punch data for the specified date range
- Useful for historical data import

**When to use:**
- First time setup: Import last 3-6 months of data
- Data recovery: Re-import if something went wrong
- Specific period: Need data for a particular timeframe

**Example:**
```
From: 01/01/2026_00:00
To: 31/01/2026_23:59
Result: All January 2026 punch data
```

**Warning:** Large date ranges may take time to process

---

### **Process Raw Logs Section**

#### **Process Logs Button** (Shows count of unprocessed logs)
**What it does:**
- Converts raw punch logs into attendance records
- Groups multiple punches per day into one attendance record
- Matches employee codes with ERP database

**When to use:**
- After sync if "Unprocessed Logs" > 0
- If attendance records are missing
- To manually trigger processing

**What happens:**
1. Finds all unprocessed raw logs
2. Groups by employee + date
3. Finds first punch (IN time) and last punch (OUT time)
4. Creates attendance record with both times
5. Marks logs as processed

**Example:**
```
Employee 0002 on 2026-04-15:
- Punch 1: 08:00 AM (IN)
- Punch 2: 12:00 PM (OUT for lunch)
- Punch 3: 01:00 PM (IN from lunch)
- Punch 4: 05:00 PM (OUT)

Result: 1 attendance record
- Punch In: 08:00 AM
- Punch Out: 05:00 PM
- Hours: 9 hours (1 hour OT)
```

**Note:** Automatically runs after "Sync Now" but can be run manually

---

## Tab 2: Raw Logs

### **Purpose**
View individual punch events from biometric devices before they're processed into attendance.

### **Filter Buttons**

#### **All Button**
Shows all raw logs (processed and unprocessed)

#### **Unprocessed Button**
Shows only logs that haven't been converted to attendance yet

#### **Processed Button**
Shows logs that have been converted to attendance records

---

### **Raw Logs Table Columns**

1. **Site** - Which biometric site (Site 67 or Site 68)
2. **Employee Code** - Employee ID from biometric device
3. **Name** - Employee name from biometric device
4. **Punch Date** - Exact date and time of punch
5. **Device ID** - Which biometric machine was used
6. **Status** - Processed (green) or Pending (yellow)
7. **Created** - When this log was synced into ERP

**Use Case:**
- Verify punch data was synced correctly
- Debug missing attendance records
- Check which employees punched in/out
- Identify unprocessed logs

---

## Tab 3: Sync History

### **Purpose**
View history of all sync operations to track what was synced and when.

### **Sync History Table Columns**

1. **Site** - Which site was synced
2. **Date/Time** - When the sync happened
3. **Type** - "incremental" or "full" (date range)
4. **Fetched** - Number of records downloaded
5. **Processed** - Number converted to attendance
6. **Status** - Success (green) or Failed (red)
7. **Error** - Error message if sync failed

**Use Case:**
- Audit trail of sync operations
- Troubleshoot sync failures
- Verify daily syncs are running
- Check how much data was synced

---

## Common Workflows

### **Daily Routine (Recommended)**
1. Open Biometric module
2. Select "All Sites" (or specific site)
3. Click "Sync Now"
4. Wait for success message
5. Verify "Unprocessed Logs" = 0
6. Check Attendance module for new records

**Time:** 10-30 seconds

---

### **Initial Setup (First Time)**
1. Import employees using Bulk Import
2. Go to Biometric module
3. Select "All Sites"
4. Use "Date Range Sync":
   - From: 01/01/2026_00:00
   - To: Current date
5. Click "Sync Date Range"
6. Wait for completion (may take 1-2 minutes)
7. Click "Process Logs" if needed
8. Verify attendance records created

**Time:** 2-5 minutes for 3 months of data

---

### **Troubleshooting Missing Attendance**
1. Go to "Raw Logs" tab
2. Click "Unprocessed" button
3. Check if logs exist for the employee
4. If yes: Click "Process Logs" button
5. If no: Run "Sync Now" to fetch data
6. Check "Sync History" for errors

---

### **Monthly Backfill**
1. Select specific site or "All Sites"
2. Enter date range for the month:
   - From: 01/03/2026_00:00
   - To: 31/03/2026_23:59
3. Click "Sync Date Range"
4. Wait for completion
5. Verify in Attendance module

---

## Tips & Best Practices

### ✅ Do's
- Run "Sync Now" daily (preferably morning)
- Check "Unprocessed Logs" regularly
- Use incremental sync for daily operations
- Use date range sync for historical data
- Verify sync history for errors
- Keep employee codes consistent between ERP and biometric

### ❌ Don'ts
- Don't sync large date ranges frequently (slow)
- Don't ignore unprocessed logs
- Don't delete raw logs (needed for audit)
- Don't change employee codes after syncing
- Don't run multiple syncs simultaneously

---

## Error Messages & Solutions

### "API returned 500: Internal Server Error"
**Cause:** eTimeOffice API server issue or wrong credentials
**Solution:** 
- Check credentials in .env file
- Verify API is accessible
- Contact eTimeOffice support

### "Employee not found: 0XXX"
**Cause:** Employee code exists in biometric but not in ERP
**Solution:**
- Import employee using Bulk Import
- Ensure employee code matches exactly
- Run "Process Logs" after importing

### "No data found in Excel file"
**Cause:** Wrong sheet selected or empty file
**Solution:**
- Select correct sheet from dropdown
- Verify Excel file has data
- Check file format

### "Sync completed! Processed 0 records"
**Cause:** No new data available since last sync
**Solution:**
- Normal if already synced today
- Check if employees actually punched in/out
- Verify date range if using date range sync

---

## Quick Reference

| Button | Purpose | Frequency |
|--------|---------|-----------|
| Sync Now | Get latest punch data | Daily |
| Date Range Sync | Import historical data | Once/As needed |
| Process Logs | Convert to attendance | Auto/Manual |
| All/Unprocessed/Processed | Filter raw logs | As needed |

---

## Support

**Need Help?**
1. Check "Sync History" tab for errors
2. Review "Raw Logs" tab for data
3. Visit `/api/biometric/diagnostic` for detailed info
4. Check BIOMETRIC_TESTING_GUIDE.md for troubleshooting

**API Endpoints for Testing:**
- `/api/biometric/test` - Test API connection
- `/api/biometric/diagnostic` - View detailed statistics
- `/api/biometric/employee-check` - Check employee matching
- `/api/biometric/processing-report` - Processing details
