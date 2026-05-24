# Feature Testing Checklist

All features below are implemented but not yet tested. Follow the steps for each to verify correctness.

---

## 1. Earned Leave Settings

**What it does:** Leave policies can have earned leave (EL) specific settings — accrual method, rate, max accumulation, rounding rules, and eligibility period.

**Where:** Organization → Leave Policies → Create/Edit a policy with leaveType = "Earned Leave"

### Test Steps

1. Go to **Organization → Leave Policies**
2. Click **Add Policy** (or edit an existing one)
3. Set Leave Type to `EL` or `Earned Leave`
4. Verify the following fields appear:
   - Accrual Method (monthly / quarterly / annual)
   - Accrual Rate (days per period)
   - Max Accumulation (max days)
   - Rounding Rule (none / round_up / round_down / round_nearest)
   - Eligible After Days (days of service before EL starts)
5. Fill in values and save
6. Verify the saved policy shows the EL settings when you edit it again
7. Verify non-EL leave types do NOT show these fields

### Expected Result
- EL-specific fields only appear for earned leave type
- Values persist after save and reload

---

## 2. Leave Policy Restrictions During Application

**What it does:** When an employee applies for leave, the system validates against the leave policy rules (min notice days, max consecutive days, applicable gender, service eligibility, document requirements).

**Where:** My Portal → Apply Leave / HRMS → Leave Management

### Test Steps

1. Create a leave policy with restrictions:
   - `minDaysNotice: 7` (must apply 7 days in advance)
   - `maxConsecutiveDays: 3` (max 3 days at a time)
   - `applicableAfterMonths: 6` (only after 6 months of service)
   - `applicableGender: female` (only for female employees)
2. Log in as an employee and try to apply for leave:
   - **Test A:** Apply for tomorrow (should fail — less than 7 days notice)
   - **Test B:** Apply for 5 consecutive days (should fail — max 3)
   - **Test C:** Apply as a male employee for a female-only leave (should fail)
   - **Test D:** Apply as a new employee (joined < 6 months ago) (should fail)
   - **Test E:** Apply correctly within all constraints (should succeed)
3. Verify error messages are clear and specific

### Expected Result
- Each restriction produces a clear error message
- Valid applications go through without issues

---

## 3. Dynamic Shift Assignment / Reshuffle

**What it does:** Admins can assign and reshuffle shifts for employees with effective dates. Shift assignments have `effectiveFrom` and `effectiveTo` dates.

**Where:** HRMS → Shift Roster

### Test Steps

1. Go to **HRMS → Shift Roster**
2. Assign a shift to an employee with `effectiveFrom = today`
3. Verify the assignment appears in the roster view
4. Create a new assignment for the same employee with a different shift and `effectiveFrom = next week`
5. Verify the old assignment gets `effectiveTo` set automatically (or both coexist with date ranges)
6. Try bulk assignment — select multiple employees and assign a shift
7. Verify all selected employees get the new shift

### Expected Result
- Shift assignments respect date ranges
- Only one active shift per employee at any given date
- Bulk assignment works for multiple employees

---

## 4. Shift Roster in Employee Portal

**What it does:** Employees can see their assigned shift schedule in the self-service portal.

**Where:** My Portal → My Shifts

### Test Steps

1. Assign a shift to an employee (from admin side)
2. Log in as that employee
3. Navigate to **My Portal → My Shifts**
4. Verify the employee can see:
   - Current shift name and times
   - Weekly calendar view (5 weeks)
   - Week-off days highlighted
5. Verify employees WITHOUT a shift see an appropriate message

### Expected Result
- Employee sees their current and upcoming shift schedule
- Week-off days are clearly marked
- No shift = informative empty state

---

## 5. Enrolled ID for Biometric Fetching

**What it does:** Biometric sync uses `enrolledId` (the 8-digit biometric enrollment number from `EmpcardNo`) to match employees instead of raw `empCode`. Employee matching uses pattern `UA{enrolledId}`.

**Where:** HRMS → Biometric Sync → Sync & Process

### Test Steps

1. Ensure employees have codes like `UA00000005` (prefix + 8-digit enrolled ID)
2. Go to **HRMS → Biometric Sync**
3. Trigger a sync (incremental or date range)
4. Check the console logs for messages like:
   - `[Biometric] Processing enrolledId=00000005 (UA00000005) for 2026-05-24`
5. Verify that:
   - Raw logs store `enrolledId` field (check Punch Logs table)
   - Processing matches `enrolledId` → `UA{enrolledId}` employee code
   - Attendance records are created for matched employees
6. Test with an employee whose code doesn't match the pattern — verify it appears in "Skipped Records" with a clear reason

### Expected Result
- Biometric data is matched via enrolledId, not empCode
- Unmatched records show clear skip reasons
- Attendance records are created for matched employees

---

## 6. Notification Click → Navigate to Module

**What it does:** Clicking a notification routes the user to the relevant module (e.g., leave notification → Leave Management for admin, My Leave for employee).

**Where:** Bell icon (top-right) → Click a notification

### Test Steps

1. Generate a notification (e.g., apply for leave as an employee)
2. Log in as admin
3. Click the bell icon → see the notification
4. Click the notification
5. Verify it navigates to the correct module:
   - Leave notification → Leave Management (admin) / My Leave (employee)
   - Tour notification → Tour Requests
   - Request notification → Employee Requests / My Requests
   - Attendance notification → Attendance / My Attendance
6. Verify the notification is marked as read after clicking

### Expected Result
- Clicking a notification navigates to the correct module based on entity type and user role
- Notification is marked as read

---

## 7. Tour Approval Synced with Attendance (Payroll)

**What it does:** Approved tour requests count as paid attendance days in payroll. The formula is: `lopDays = workingDays - (presentDays + paidLeaveDays + tourDays)`.

**Where:** HRMS → Tour Requests + Payroll Generation

### Test Steps

1. Create a tour request for an employee (5 days, e.g., May 19–23)
2. Approve the tour request
3. Verify the employee has NO attendance records for those 5 days (no biometric punch)
4. Generate payroll for that month
5. Check the payroll item:
   - `paidLeaveDays` should include the 5 tour days
   - `lopDays` should NOT count those 5 days as absent
   - Net pay should reflect full salary for those days
6. Also test: If the employee has 20 present days + 5 tour days in a 26-day month → lopDays = 1

### Expected Result
- Approved tour days are counted as paid days in payroll
- No LOP deduction for approved tour days
- Tour days + present days + leave days together determine LOP

---

## 8. Mandatory Check in Checklist Template Task

**What it does:** Checklist template tasks can be marked as `documentNecessary = true`, meaning the task cannot be completed without uploading a document.

**Where:** Organization → Checklist Templates → Edit a template → Tasks

### Test Steps

1. Go to **Organization → Checklist Templates**
2. Create or edit a template
3. Add a task with "Document Necessary" checked
4. Save the template
5. Create an onboarding checklist instance for an employee using this template
6. Try to mark the task as complete WITHOUT uploading a document
7. Verify it fails with an appropriate error
8. Upload a document and then mark complete
9. Verify it succeeds

### Expected Result
- Tasks with `documentNecessary = true` cannot be completed without a document
- Clear error message when trying to complete without document
- Works fine after document upload

---

## 9. Employee Onboarding Gate

**What it does:** New users must fill a joining form before accessing the ERP. Admin must approve the form.

**Where:** System → User Management (admin) / Login page (new user)

### Test Steps

#### Admin Side:
1. Go to **System → User Management**
2. Click **Add User**
3. Verify "Require Onboarding Form" checkbox is visible and checked by default
4. Create a new user with the checkbox enabled
5. Verify the user appears with "Onboarding Pending" badge

#### Employee Side:
6. Log in with the new user's credentials
7. Verify you see the **Joining Form** (NOT the ERP dashboard)
8. Fill all 7 steps:
   - Step 1: Personal Details (name, DOB, gender, etc.)
   - Step 2: Address (present + permanent, test "same as present" checkbox)
   - Step 3: Family (father, mother, spouse, children, nominee)
   - Step 4: Previous Employment
   - Step 5: Bank & Statutory (bank, PAN, Aadhar, EPF, ESIC)
   - Step 6: Document Checklist (check mandatory items)
   - Step 7: Declaration (must agree before submit)
9. Submit the form
10. Verify you see "Awaiting Approval" screen
11. Try refreshing — should still show waiting screen

#### Admin Approval:
12. Log in as admin → System → User Management
13. Verify the user now shows "Awaiting Approval" badge
14. Click **Approve Onboarding**
15. Log in as the employee again
16. Verify you now see the ERP dashboard with assigned modules

#### Rejection Flow:
17. Create another user with onboarding required
18. Have them submit the form
19. Admin clicks **Reject**
20. Employee logs in → should see the form again (reset to pending)

### Expected Result
- New users are blocked until form is submitted AND approved
- Form has 7 complete steps matching the joining formalities document
- Admin can approve or reject
- Rejection resets the form for re-submission
- Users created WITHOUT the onboarding requirement can access ERP immediately

---

## 10. Site-Specific Holidays

**What it does:** Holidays can be assigned to specific branches/sites, so only employees at that branch observe the holiday.

**Where:** Organization → Holidays

### Test Steps

1. Go to **Organization → Holidays**
2. Create a holiday with:
   - Name: "Regional Festival"
   - Date: any upcoming date
   - Branch: select a specific branch (not "All")
3. Save the holiday
4. Verify it appears in the list with the branch name
5. Create another holiday with Branch = "All" (applies to everyone)
6. Check attendance processing:
   - Employee at the specific branch → holiday should apply
   - Employee at a different branch → holiday should NOT apply
7. Check leave application:
   - When applying for leave that overlaps with a branch-specific holiday, the holiday day should be excluded from leave count (only for employees at that branch)

### Expected Result
- Holidays can be scoped to specific branches
- "All" holidays apply to everyone
- Branch-specific holidays only affect employees at that branch
- Leave day calculation respects branch-specific holidays

---

## Quick Smoke Test (All Features)

Run through this rapid checklist to verify nothing is broken:

| # | Feature | Quick Check | Pass? |
|---|---------|-------------|-------|
| 1 | Earned Leave | Create EL policy → EL fields visible | ☐ |
| 2 | Leave Restrictions | Apply leave violating a rule → error shown | ☐ |
| 3 | Shift Reshuffle | Assign shift → appears in roster | ☐ |
| 4 | My Shifts | Employee sees their shift in portal | ☐ |
| 5 | Enrolled ID | Biometric sync → logs show enrolledId | ☐ |
| 6 | Notification Nav | Click notification → correct module opens | ☐ |
| 7 | Tour + Payroll | Approve tour → payroll counts as paid | ☐ |
| 8 | Mandatory Doc | Task with doc required → can't complete without | ☐ |
| 9 | Onboarding Gate | New user → sees form → submit → admin approves → access | ☐ |
| 10 | Site Holidays | Branch-specific holiday → only that branch affected | ☐ |

---

## Notes

- Restart the dev server after schema changes (`npx prisma generate` + restart)
- Both `erp` and `erp_demo` databases need schema changes applied
- The superadmin database (`erp_superadmin`) has the onboarding fields on `TenantUser`
- Tour requests use the same payroll integration pattern as leave requests
