# VoltCore ERP — Resume Project Summary

---

## Project Title
**VoltCore ERP** — Full-Stack Enterprise Resource Planning & HRMS Platform

---

## One-Line Description
Built a production-grade, multi-tenant ERP system from scratch covering HR, Payroll, Attendance, Onboarding/Offboarding, Finance, Projects, and a self-service employee portal — serving power plant contractor operations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (REST), Prisma ORM |
| Database | PostgreSQL (multi-tenant — separate DB per tenant) |
| Auth | Custom cookie-based session with role hierarchy (superadmin / admin / level-1 / employee) |
| PDF Generation | Custom payslip generator (server-side) |
| Excel | SheetJS (XLSX) — import and export |
| Charts | Recharts |
| Deployment | Caddy reverse proxy, Bun runtime |

---

## Scale & Scope

- **13+ top-level modules** with 60+ submodules
- **Multi-tenant architecture** — each client gets an isolated PostgreSQL database
- **Role-based access control** — OrgRole hierarchy with department-scoped permissions
- **50+ REST API routes** across all modules
- **Full Prisma schema** with 40+ models

---

## Key Features Built

### HRMS
- Employee directory with bulk import (Excel) — auto-creates departments/designations, duplicate prevention
- Attendance tracking with biometric sync, late detection, fine calculation
- Leave management with multi-step approval chains
- Shift roster with weekly/monthly planning
- Payroll processing — compliance (FORM XVII/XIII) and non-compliance (68-column) formats
- Payslip generation (PDF) with dispatch system — employees only see payslips explicitly sent to them
- Training & certification management with expiry tracking
- Recruitment pipeline

### Employee Lifecycle
- **Onboarding** — checklist templates, task dependencies, document upload per task, level-1 role access control
- **Offboarding** — department-based clearance approvals (only level-1 role of that department can approve), auto-approval when all cleared
- **Exit Management** — exit interviews, locked after save (admin-only edit)

### My Portal (Employee Self-Service)
- My Attendance, My Leave, My Requests
- My Profile — full employee record view
- My Payslips — only shows dispatched payslips
- My Documents — onboarding docs + certificates in one place
- My Shifts — 5-week calendar view
- My Notices — real-time unread badge, read state persisted in DB

### Notice Board (Admin/HR)
- Broadcast notices to all staff, specific department, or specific designation
- Pin, expire, read-rate tracking per notice
- Consistent read/unread state across all devices via DB

### Organization
- Departments, Designations, Holidays, Leave Policies, Attendance Rules
- Checklist Templates for onboarding
- Employee Documents — aggregated view of all onboarding docs and certificates per employee

### Finance
- Ledger, Accounts Payable/Receivable, Journal Entries, Bank & Cash, Taxation, Budget, Financial Reports

### Reports Module (10 live reports)
- Manpower, Attendance, Payroll, Leave, Late & Fine, Onboarding Status, Turnover/Exit, Training & Certs, Notice Read Rate, Payslip Dispatch — all backed by real database queries

### System
- User Management with OrgRole assignment
- Notice Board (admin sender side)
- Employee Requests with approval workflow
- Reports

---

## Notable Technical Implementations

- **Multi-tenant DB routing** — every API request reads an `erp_tenant_db` cookie to connect to the correct tenant's PostgreSQL database dynamically
- **Salary sheet import/export** — parses 69-column non-compliance and 25-column compliance Excel formats, maps to correct DB fields, prevents duplicate imports via upsert
- **Payslip dispatch system** — `payslipGenerated` flag gates employee visibility; admin dispatches per payroll run; re-dispatch is idempotent (no duplicates)
- **Department-scoped clearance** — offboarding clearances are auto-generated based on the leaving employee's department; only level-1 OrgRole employees of that department can approve
- **Live unread badge** — sidebar polls `/api/notices/unread-count` every 60s; read state stored in `NoticeRead` table, consistent across logins and devices
- **Auto-create departments/designations on bulk import** — case-insensitive match; creates new records if not found; auto-generated codes are visually flagged in the UI
- **Biometric integration** — syncs punch data from biometric devices, classifies attendance (present/late/absent/half-day) against configurable rules

---

## Bullet Points for Resume

- Architected and built a **full-stack multi-tenant ERP** using Next.js 15, TypeScript, PostgreSQL and Prisma with 60+ submodules across HR, Payroll, Finance, and Operations
- Implemented **role-based access control** with department-scoped permissions — level-1 OrgRole employees can only approve clearances for their own department
- Built a **payroll processing pipeline** supporting statutory compliance formats (FORM XVII/XIII) with Excel import/export, PDF payslip generation, and a controlled dispatch system to employee dashboards
- Designed a **Notice Board system** with targeted broadcasts (all-staff / department / designation), real-time unread badges, and DB-persisted read state consistent across all devices
- Developed an **employee self-service portal** with attendance history, leave application, payslip viewer, document vault, shift calendar, and notice inbox
- Built **10 live operational reports** (manpower, attendance, payroll, leave, turnover, training, etc.) with correct field mapping to actual database models
- Implemented **biometric sync** to auto-classify daily attendance with configurable late/fine rules
- Engineered **bulk import** for employees and salary sheets with duplicate prevention, auto-creation of missing departments/designations, and manual mapping for unmatched records

---

*VoltCore ERP — Built April 2026*
