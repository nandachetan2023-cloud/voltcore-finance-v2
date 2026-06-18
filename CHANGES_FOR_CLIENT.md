# 📋 What's New in VoltCore ERP

> A summary of all changes made for the client, explained in plain language.

---

## 🔷 1. Payroll — Salary Calculation Fixes

**What was wrong:** The salary sheet had incorrect calculations — employee salaries didn't match what was expected.

**What we fixed:**
- **Wages formula corrected** — The "U" column (actual salary) now correctly uses total working days including public holidays. Example: Employee 1 now shows ₹47,950 instead of a wrong amount.
- **Overtime (column W)** — Overtime is now calculated correctly by excluding leave days. Previously, leave days were counted in overtime, overpaying employees.
- **ESI deduction fixed** — ESI (health insurance) is now calculated at 0.75% of the basic wage only, not on the total salary. This matches the government compliance format.
- **DA (Dearness Allowance)** — Added a separate column for Dearness Allowance so it's stored properly and shows up in exports.
- **Compliance salary sheets** — The daily rate used for calculations now uses the correct formula: `basic salary ÷ days present`.
- **Working days auto-fill** — When generating a salary template, the system now automatically fills in the monthly working days based on the employee's shift schedule. The user can still edit this if needed.

---

## 🔷 2. Login & Security Improvements

**New login options:**
- **Login by Employee Code** — Users can now log in using their employee code (e.g., `UA0001`) instead of email.
- **Email login still works** — Old accounts (superadmin, admin created with email) continue to work. The system now handles both employee codes and emails seamlessly.
- **Case-insensitive login** — If you type `ADMIN@VOLTCORE.COM` instead of `admin@voltcore.com`, it still works.
- **Change Password page** — Users can now change their own password from the login screen by clicking "Change Password". They just need their current password + new password.

**Security fixes:**
- **Session validation** — The system now properly checks active sessions on page load. If cookies expire, users get logged out cleanly.
- **Idle timeout fix** — The 30-minute inactivity timeout now works correctly (was broken due to a code bug).
- **Better error handling** — Login errors show clear messages instead of generic failures.

---

## 🔷 3. Employee Management

**Bulk Import improvements:**
- New fields added to the Excel import: **Token Number**, **Workmen Sl. No.**, **Nature of Designation**, **Monthly Gross Salary**
- **Last Name and Phone** are now optional in the Excel template (reduced validation errors)
- **Current Address fields** are now optional in the employee form

**Employee List & Sorting:**
- Employee list is now sorted by **employee code in ascending order** across all screens (consistent ordering everywhere)

**Document Upload — New Feature!**
- **Admin can upload documents for employees in bulk** — Upload payslips, offer letters, etc. for multiple employees at once
- **Employees can see their own documents** in the "My Documents" section
- **Verify/Confirm flow** — Admins can mark employee documents as verified or rejected with a remark
- **Scope fix** — The verify/confirm action only applies to admin-uploaded documents (not employee-uploaded ones)

**Onboarding:**
- Fixed a bug where admin-set onboarding fields could be overwritten by the employee

---

## 🔷 4. User Management

- **Employee ID and Employee Code** are now shown in the User Management screen — so you can easily see which employee a login account is linked to

---

## 🔷 5. Navigation & UI

- **Dropdowns fixed** — Employee picker dropdowns were getting clipped/cut off; now they display properly with a searchable combo box
- **Browser Back Button now works!** — You can now use your browser's back/forward buttons to navigate between modules (e.g., going from Payroll back to Employees). The URL also shows which module you're on (e.g., `/?module=payroll`) so pages can be bookmarked

---

## 🔷 6. Database Upgrades (Technical — No User Impact)

- All necessary database schema changes have been documented as migration scripts that can be run safely on the server
- These add the new fields mentioned above (Dearness Allowance, Employee Code, Document verification fields, etc.) without deleting any existing data

---

## 📁 Summary of Changed Files

**52 files** were modified across these areas:

| Area | Files Changed | Purpose |
|------|--------------|---------|
| Payroll | 9 files | Salary calculation fixes, compliance format |
| Auth & Login | 5 files | Employee code login, change password, session fixes |
| Employees | 5 files | Bulk import, sorting, onboarding |
| Documents | 5 files | Admin upload, employee view, verify/confirm |
| User Management | 1 file | Show employee ID |
| Navigation/UI | 6 files | Back button, dropdowns, module navigation |
| Database | 3 SQL files | Migration scripts for new columns |
| Infrastructure | 18 files | Supporting changes for above features |

---

## ✅ Deployment Status

All changes are pushed to GitHub and ready for deployment. The server needs to run:
1. `git pull` to get the latest code
2. Apply 3 database migration SQL files (safe, no data loss)
3. Rebuild and restart the application

---

*Document generated on 17 June 2026*
