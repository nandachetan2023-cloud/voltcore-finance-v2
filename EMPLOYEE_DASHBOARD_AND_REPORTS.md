# Employee Self-Service Dashboard + Reports Audit

## 1. Personalized Employee Dashboard (`my-dashboard`)

A new landing page for the employee "My Portal". When an employee opens My Portal,
they now land on **My Dashboard** first (it's the first sub-module in the
self-service group).

### What it shows (all personalized to the logged-in employee)
- **Hero banner:** greeting, name, employee code, designation/department/branch, and
  today's status (Present / Late / Absent / Half Day / Week Off / Checked In) with
  punch-in/out times and today's shift window.
- **KPI cards (clickable):** this-month attendance rate (with progress ring), total
  leave days remaining, latest net pay, and total pending actions.
- **Leave balance** breakdown by type (EL/SL/ML/CL/Comp Off) with usage bars.
- **This-month attendance** mini-stats (present/late/absent/half-day) plus late
  minutes and fines.
- **Quick actions** grid: apply leave, request tour, new request, payslips, notices
  (with unread badge), my shifts.
- **Alerts strip:** unread notices, expired/expiring certificates, pending leave
  approvals — each links to the relevant module.

### Backend
New aggregated endpoint **`GET /api/employee-self/dashboard`** returns everything in
ONE round-trip (instead of 6+ calls). Identified by the `erp_employee_id` cookie
(with `?employeeId=` fallback), tenant-scoped via `getDbForRequest`. Runs its
independent queries in parallel. Leave balance = active leave-policy entitlement
minus approved leave taken this year. Status filters tolerate both lowercase and
capitalized values.

### Registration
- `src/components/erp/my-dashboard.tsx` (component)
- `src/app/api/employee-self/dashboard/route.ts` (API)
- Registered in `erp-store.ts` (MODULE_TREE self-service, SUB_MODULES, MODULE_CONFIG,
  ModuleId) and `module-registry.tsx`. Icon: `BarChart3`.

## 2. Reports Audit

Audited all 10 existing reports (manpower, attendance, payroll, leave, late-fine,
onboarding, turnover, training, notices, dispatch).

**Result: all 10 are healthy.** Each:
- fetches **real** data from the database via `db.*.findMany` (no mock/placeholder),
- is **tenant-scoped** through `getDbForRequest(request)`,
- handles loading and empty states,
- exports to Excel via the shared `downloadExcel` utility.

Two flagged "issues" were checked and dismissed as false positives:
- The late-fine `status: 'late'` filter is **correct** (matches the stored value).
- "Missing `isDeleted` filters" — the report models (OnboardingChecklist, Resignation,
  TrainingSession, Certification, Notice) **don't have an `isDeleted` column**, so
  adding such a filter would break those queries. Left as-is.

### Gap fixed: Tour Requests report
`tour-requests` is a live module but had no report. Added:
- `case 'tour'` in `src/app/api/reports/route.ts` (tenant-scoped, date-filtered,
  `isDeleted: false`),
- `src/components/erp/report-tour.tsx` (summary stats, top-destinations chart,
  detail table, Excel export),
- registered under Reports in the store + module-registry.

### Still not covered (intentionally deferred)
Projects, Assets, and Procurement modules have no reports yet. These live on separate
feature branches (`feature/new-modules`) and aren't on `main`, so adding reports for
them belongs with that work, not here.

## No DB / schema changes. No new dependencies. Build verified passing.
