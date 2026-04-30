# My Portal + Notice Board — Full Implementation Plan

> Complete step-by-step guide to implement the Notice Board (sender side) and
> expanded My Portal submodules (receiver side).

---

## Overview

```
SENDER (Admin / Level-1 HR)          RECEIVER (Every Employee)
─────────────────────────────        ──────────────────────────
System → Notice Board                My Portal → My Notices
  - Compose & publish notices          - See notices for their dept
  - Target dept / designation          - Read/unread state in DB
  - Pin, expire, delete                - Unread badge on nav item
  - View read-rate per notice          - Filter: All / Unread / Pinned

                    Both read from the same Notice + NoticeRead tables
```

---

## Phase 1 — Database Schema

### Step 1.1 — Add models to `prisma/schema.prisma`

Add these two models inside the tenant schema (after the existing `Employee` section):

```prisma
model Notice {
  id            Int          @id @default(autoincrement())
  title         String
  body          String       // plain text or markdown
  type          String       @default("general")
  // types: general | policy | payroll | safety | hr | it

  targetDept    String?      // null = all departments
  targetDesig   String?      // null = all designations

  isPinned      Boolean      @default(false)
  publishedAt   DateTime     @default(now())
  expiresAt     DateTime?    // null = never expires
  createdBy     Int?         // employeeId of sender (nullable for admin users)
  createdByName String       // display name stored at creation time
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  reads         NoticeRead[]

  @@index([publishedAt])
  @@index([targetDept])
  @@index([targetDesig])
}

model NoticeRead {
  id         Int      @id @default(autoincrement())
  noticeId   Int
  employeeId Int
  readAt     DateTime @default(now())

  notice     Notice   @relation(fields: [noticeId], references: [id], onDelete: Cascade)

  @@unique([noticeId, employeeId])
  @@index([employeeId])
}
```

### Step 1.2 — Run migration

```bash
npx prisma migrate dev --name add_notice_noticread
```

---

## Phase 2 — API Routes

### Step 2.1 — Create `/src/app/api/notices/route.ts`

Handles admin/HR side: list all, create, update, delete.

**GET** — returns all notices with `_count.reads` (how many employees have read it).
Also accepts `?targetDept=X` or `?targetDesig=X` query params for filtering.

**POST** — create a notice. Body:
```json
{
  "title": "string",
  "body": "string",
  "type": "general|policy|payroll|safety|hr|it",
  "targetDept": "Finance | null",
  "targetDesig": "Manager | null",
  "isPinned": false,
  "expiresAt": "2026-12-31 | null",
  "createdByName": "string"
}
```

**PATCH** — update title, body, isPinned, expiresAt by `id`.

**DELETE** — delete by `id`.

---

### Step 2.2 — Create `/src/app/api/notices/my/route.ts`

Handles employee side: returns notices visible to the logged-in employee.

**GET** — reads `erp_employee_id` cookie → fetches employee's `departmentName` and `designationName` → queries:

```sql
WHERE (targetDept IS NULL OR targetDept = employee.dept)
  AND (targetDesig IS NULL OR targetDesig = employee.desig)
  AND (expiresAt IS NULL OR expiresAt > NOW())
ORDER BY isPinned DESC, publishedAt DESC
```

Also joins `NoticeRead` to attach `isRead: boolean` per notice for this employee.

Returns: `{ data: Notice[], unreadCount: number }`

---

### Step 2.3 — Create `/src/app/api/notices/read/route.ts`

**POST** — marks a notice as read for the current employee.

Body: `{ noticeId: number }`

Reads `erp_employee_id` cookie → upserts `NoticeRead(noticeId, employeeId)`.

---

### Step 2.4 — Create `/src/app/api/notices/unread-count/route.ts`

**GET** — returns `{ count: number }` for the sidebar badge.

Reads `erp_employee_id` → counts notices visible to this employee that have no `NoticeRead` entry.

---

### Step 2.5 — Create `/src/app/api/employee-self/profile/route.ts`

**GET** — returns full employee record for the logged-in employee (reads `erp_employee_id`).
Includes: personal info, contact, bank details, department, designation, documents count, certificates count.

---

### Step 2.6 — Create `/src/app/api/employee-self/payslips/route.ts`

**GET** — returns `PayrollItem` records for the logged-in employee, ordered by year/month desc.
Includes: `PayrollRun` (for month/year), all salary fields.

---

### Step 2.7 — Create `/src/app/api/employee-self/documents/route.ts`

**GET** — returns onboarding task documents + certifications scoped to the logged-in employee.
Reuses the same logic as `/api/employee-documents` but filtered to `erp_employee_id` only.

---

### Step 2.8 — Create `/src/app/api/employee-self/shifts/route.ts`

**GET** — returns upcoming shift assignments for the logged-in employee.
Queries `ShiftAssignment` where `employeeId = erp_employee_id` and `date >= today`.

---

## Phase 3 — Sender UI (Notice Board)

### Step 3.1 — Create `src/components/erp/notice-board.tsx`

**Location in nav:** `System` module → new submodule `notice-board`

**Access control:** Admin always. Level-1 role employees only (same pattern as offboarding — check OrgRole level via superadmin DB).

**UI sections:**

```
┌─ Header ──────────────────────────────────────────────┐
│  Notice Board          [+ New Notice]  [Refresh]      │
└───────────────────────────────────────────────────────┘

┌─ Stats row ───────────────────────────────────────────┐
│  Total Notices | Active | Pinned | Avg Read Rate      │
└───────────────────────────────────────────────────────┘

┌─ Notice list ─────────────────────────────────────────┐
│  [PIN] PAYROLL  Salary for March 2026          📌     │
│  Target: All Staff  ·  Sent: 12 Apr  ·  42/80 read   │
│  ──────────────────────────────────────────────────── │
│  [HR]  Leave Policy Update                            │
│  Target: Finance dept  ·  Sent: 10 Apr  ·  18/22 read│
└───────────────────────────────────────────────────────┘
```

**Compose form (dialog):**
- Title (text input)
- Body (textarea — supports plain text)
- Type (select: General / Policy / Payroll / Safety / HR / IT)
- Target (radio: All Staff → specific Department → specific Designation)
  - If Department: dropdown of all departments
  - If Designation: dropdown of all designations
- Pin this notice (toggle)
- Expires on (date picker, optional)
- [Publish] button

**Per-notice actions:** Edit (title/body/pin only) · Delete (with confirm)

---

## Phase 4 — Receiver UI (My Portal submodules)

### Step 4.1 — Create `src/components/erp/my-notices.tsx`

**Location:** `My Portal → My Notices`

**Unread badge:** Component polls `/api/notices/unread-count` on mount and every 60 seconds. Count shown as a red dot or number on the nav item.

**UI:**

```
┌─ Header ──────────────────────────────────────────────┐
│  My Notices                    [All] [Unread] [Pinned]│
│  3 unread                                             │
└───────────────────────────────────────────────────────┘

┌─ Pinned ──────────────────────────────────────────────┐
│  📌 [PAYROLL]  Salary for March 2026          UNREAD  │
│  From: HR Manager  ·  12 Apr 2026                     │
│  Salary sheets for March have been processed...       │
└───────────────────────────────────────────────────────┘

┌─ Recent ──────────────────────────────────────────────┐
│  [HR]  Leave Policy Update                    READ    │
│  From: Admin  ·  10 Apr 2026                          │
└───────────────────────────────────────────────────────┘
```

- Unread notices: blue left border + slightly tinted background
- Clicking a notice expands it inline and marks it read (POST to `/api/notices/read`)
- Pinned notices always at top regardless of filter

---

### Step 4.2 — Create `src/components/erp/my-profile.tsx`

**Location:** `My Portal → My Profile`

**Sections:**
- Avatar (initials) + name, employee code, department, designation, employment status badge
- Personal Info: DOB, gender, blood group, marital status, father's name
- Contact: phone, alternate phone, personal email, work email
- Address: current + permanent
- Bank Details: bank name, account number, IFSC (masked)
- Emergency Contact
- Documents count (links to My Documents)
- Certificates count (links to My Documents)
- "Request Change" button → opens a pre-filled request form that submits to `/api/employee-requests`

---

### Step 4.3 — Create `src/components/erp/my-payslips.tsx`

**Location:** `My Portal → My Payslips`

**UI:**
- List of payslip months (most recent first)
- Each row: Month Year · Gross · Deductions · Net Pay · [View] [Download PDF]
- View opens a modal with full payslip breakdown
- Download triggers the existing payslip PDF generator scoped to this employee

---

### Step 4.4 — Create `src/components/erp/my-documents.tsx`

**Location:** `My Portal → My Documents`

**UI:**
- Two sections: Onboarding Documents + Certificates
- Each document: title, type badge, upload date, [Download] button
- Reuses `/api/employee-documents?employeeId=<self>` — no new API needed

---

### Step 4.5 — Create `src/components/erp/my-shifts.tsx`

**Location:** `My Portal → My Shifts`

**UI:**
- Current week view + next week
- Each day: shift name, start time, end time, site/branch
- "No shift assigned" for days with no assignment

---

## Phase 5 — Registration

### Step 5.1 — Update `src/store/erp-store.ts`

**MODULE_TREE — add to self-service:**
```ts
'self-service': [
  'my-attendance', 'my-leave', 'my-requests',
  'my-profile', 'my-notices', 'my-payslips', 'my-documents', 'my-shifts'
],
```

**MODULE_TREE — add to system:**
```ts
system: ['system', 'reports', 'settings', 'user-management', 'requests', 'notice-board'],
```

**SUB_MODULES — add to self-service:**
```ts
{ id: 'my-profile',    icon: 'User',         label: 'My Profile',    section: 'My Portal' },
{ id: 'my-notices',    icon: 'Bell',         label: 'My Notices',    section: 'My Portal', badge: 0 },
{ id: 'my-payslips',   icon: 'IndianRupee',  label: 'My Payslips',   section: 'My Portal' },
{ id: 'my-documents',  icon: 'FolderOpen',   label: 'My Documents',  section: 'My Portal' },
{ id: 'my-shifts',     icon: 'RotateCcw',    label: 'My Shifts',     section: 'My Portal' },
```

**SUB_MODULES — add to system:**
```ts
{ id: 'notice-board', icon: 'Megaphone', label: 'Notice Board', section: 'System' },
```

**ModuleId union — add:**
```ts
| 'my-profile' | 'my-notices' | 'my-payslips' | 'my-documents' | 'my-shifts'
| 'notice-board'
```

**MODULE_CONFIG — add:**
```ts
'notice-board':  { title: 'Notice Board',  breadcrumb: 'System › Notice Board' },
'my-profile':    { title: 'My Profile',    breadcrumb: 'My Portal › Profile' },
'my-notices':    { title: 'My Notices',    breadcrumb: 'My Portal › Notices' },
'my-payslips':   { title: 'My Payslips',   breadcrumb: 'My Portal › Payslips' },
'my-documents':  { title: 'My Documents',  breadcrumb: 'My Portal › Documents' },
'my-shifts':     { title: 'My Shifts',     breadcrumb: 'My Portal › Shifts' },
```

---

### Step 5.2 — Update `src/components/erp/module-registry.tsx`

Add lazy imports:
```ts
'notice-board':  () => import('@/components/erp/notice-board'),
'my-profile':    () => import('@/components/erp/my-profile'),
'my-notices':    () => import('@/components/erp/my-notices'),
'my-payslips':   () => import('@/components/erp/my-payslips'),
'my-documents':  () => import('@/components/erp/my-documents'),
'my-shifts':     () => import('@/components/erp/my-shifts'),
```

---

### Step 5.3 — Add `Megaphone` and `User` icons to `erp-layout.tsx`

Import from lucide-react and add to `ICON_MAP`.

---

## Phase 6 — Unread Badge on Sidebar Nav

### Step 6.1 — Dynamic badge count for My Notices

In `erp-layout.tsx` Sidebar component:
- On mount, fetch `/api/notices/unread-count` if `erp_employee_id` cookie exists
- Poll every 60 seconds
- Store count in local state
- Pass as `badge` override to the `my-notices` nav item

This makes the unread count live on the sidebar without a full page reload.

---

## Consistency Guarantee Summary

| What | Where stored | Why consistent |
|---|---|---|
| Notice content | `Notice` table | Single source of truth |
| Read/unread state | `NoticeRead` table (per employee) | DB-persisted, device-agnostic |
| Unread count | Computed from `NoticeRead` on every API call | Always accurate |
| Employee profile | `Employee` table | Live data |
| Payslips | `PayrollItem` table | Live data |
| Documents | `OnboardingTask` + `Certification` tables | Live data |
| Shifts | `ShiftAssignment` table | Live data |

Nothing is stored in localStorage or cookies except the `erp_employee_id` used to scope queries.

---

## Implementation Checklist

- [ ] Step 1.1 — Add `Notice` + `NoticeRead` to `prisma/schema.prisma`
- [ ] Step 1.2 — Run `prisma migrate dev`
- [ ] Step 2.1 — `/api/notices/route.ts` (admin CRUD)
- [ ] Step 2.2 — `/api/notices/my/route.ts` (employee filtered view)
- [ ] Step 2.3 — `/api/notices/read/route.ts` (mark as read)
- [ ] Step 2.4 — `/api/notices/unread-count/route.ts` (badge count)
- [ ] Step 2.5 — `/api/employee-self/profile/route.ts`
- [ ] Step 2.6 — `/api/employee-self/payslips/route.ts`
- [ ] Step 2.7 — `/api/employee-self/documents/route.ts`
- [ ] Step 2.8 — `/api/employee-self/shifts/route.ts`
- [ ] Step 3.1 — `notice-board.tsx` (sender UI)
- [ ] Step 4.1 — `my-notices.tsx` (receiver UI)
- [ ] Step 4.2 — `my-profile.tsx`
- [ ] Step 4.3 — `my-payslips.tsx`
- [ ] Step 4.4 — `my-documents.tsx`
- [ ] Step 4.5 — `my-shifts.tsx`
- [ ] Step 5.1 — Update `erp-store.ts`
- [ ] Step 5.2 — Update `module-registry.tsx`
- [ ] Step 5.3 — Add icons to `erp-layout.tsx`
- [ ] Step 6.1 — Live unread badge in sidebar

---

*VoltCore ERP — My Portal + Notice Board Implementation Plan v1.0*
