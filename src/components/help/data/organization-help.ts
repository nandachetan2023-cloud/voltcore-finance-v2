/**
 * Organization Help — Knowledge Base
 * Covers the Organization menu: company structure, policies and access roles.
 * Same shape as `finance-help-data.ts`; add a topic by appending one entry.
 */

import type { HelpEntry } from '../finance-help-data';

export const ORGANIZATION_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'org-overview',
    title: "What's in the Organization module?",
    popular: true,
    relatedModule: 'organization',
    keywords: [
      'organization', 'organisation', 'overview', 'menu', 'sections', 'what is', 'setup',
      'company structure', 'masters', 'configure', 'where is',
    ],
    summary: 'Map of the Organization set-up screens.',
    body: `### Organization module

Organization holds the **company-wide set-up** the rest of the ERP relies on. Configure it once, then everything else picks it up.

**🏢 Structure**
- **Departments** — code + name for each department
- **Designations** — job titles, each with optional sub-designations

**📅 Policies & rules**
- **Holidays** — company / public / optional holidays
- **Leave Policies** — leave types, quotas, carry-forward, encashment
- **Attendance Rules** — grace period, late mark, half-day and fine rules
- **Global OT Settings** — working days and overtime divisors per site

**📋 Onboarding & records**
- **Checklist Templates** — reusable onboarding task lists
- **Employee Documents** — onboarding documents & certificates per employee

**🔐 Access**
- **Roles & Access** — business roles, authority levels, module access and approval chains

Open any item from the sidebar under **Organization**.`,
    links: [
      { label: 'Departments', moduleId: 'departments' },
      { label: 'Designations', moduleId: 'designations' },
      { label: 'Roles & Access', moduleId: 'roles-access' },
    ],
  },
  {
    id: 'org-departments',
    title: 'Adding and editing departments',
    relatedModule: 'departments',
    popular: true,
    keywords: [
      'department', 'departments', 'add department', 'create department', 'dept',
      'department code', 'edit department', 'delete department', 'engineering',
    ],
    summary: 'Create, search, edit and delete departments.',
    body: `### Departments

1. Open **Organization → Departments**.
2. Use the **Add Department** form: enter a short **code** (e.g. \`ENG\`) and a **name** (e.g. *Engineering*), then save.
3. Use the search box to find a department by **name or code**.
4. Edit or delete a department from its card.

**Tips**
- Departments are used by Checklist Templates, Notice Board targeting and Roles & Access scoping — create them first.
- If a delete fails, the department is probably still referenced by employees or other records; reassign those first.`,
    links: [{ label: 'Designations', moduleId: 'designations' }],
  },
  {
    id: 'org-designations',
    title: 'Designations and sub-designations',
    relatedModule: 'designations',
    keywords: [
      'designation', 'designations', 'job title', 'title', 'sub designation',
      'sub-designation', 'grade', 'senior engineer', 'position',
    ],
    summary: 'Define job titles and their sub-designations (grades).',
    body: `### Designations

1. Open **Organization → Designations**.
2. Add a designation, e.g. *Senior Engineer*.
3. Add **sub-designations** (e.g. *Grade A*) — type one and press **Enter** to add it to the list; remove it the same way you added it.
4. Search by name to find one quickly.

A sub-designation that already exists in the list is rejected as a duplicate.`,
  },
  {
    id: 'org-ot-settings',
    title: 'Global OT settings (working days & overtime divisors)',
    relatedModule: 'payroll-sites',
    keywords: [
      'ot', 'overtime', 'ot settings', 'global ot', 'working days', 'divisor',
      'ot type 1', 'ot type 2', 'payroll sites', 'monthly working days',
    ],
    summary: 'Set monthly working days and OT divisors per site.',
    body: `### Global OT Settings

Each site row shows **Working Days**, **OT Type 1** and **OT Type 2**. Click a row's edit action to change:

- **Monthly Working Days (Fixed employees)** — used to derive the daily rate
- **OT Type 1 Divisor** and **OT Type 2 Divisor** — used to derive the hourly OT rate

Every value must be between **1 and 31**.

If the list says *"No sites found"*, the sites themselves are configured by the system administrator (biometric sites) — they cannot be created from this screen.`,
  },
  {
    id: 'org-holidays',
    title: 'Managing the holiday calendar',
    relatedModule: 'holidays',
    popular: true,
    keywords: [
      'holiday', 'holidays', 'calendar', 'add holiday', 'public holiday', 'optional holiday',
      'restricted holiday', 'recurring', 'branch holiday', 'independence day', 'festival',
    ],
    summary: 'Add public, company and optional holidays.',
    body: `### Holidays Calendar

1. Open **Organization → Holidays** and choose **Add New Holiday**.
2. Fill in the **Holiday Name** and **Date** (both required).
3. Pick the **Type** — *Public*, *Company* or *Optional*.
4. Choose **Applicable To** — leave it as *All branches (company-wide)* or select a specific branch.
5. Tick **Recurring annually** for holidays that repeat on the same date every year.
6. Optionally add a description and save.

Search by name, type or branch. Use **Edit** / **Delete** on a row to change or remove a holiday.`,
    links: [
      { label: 'Leave Policies', moduleId: 'leave-policies' },
      { label: 'Attendance Rules', moduleId: 'attendance-rules' },
    ],
  },
  {
    id: 'org-leave-policies',
    title: 'Creating a leave policy',
    relatedModule: 'leave-policies',
    popular: true,
    keywords: [
      'leave policy', 'leave policies', 'leave', 'quota', 'annual quota', 'carry forward',
      'encash', 'encashable', 'encashment', 'paid leave', 'pl', 'accrual', 'leave type',
    ],
    summary: 'Define leave types, quotas, carry-forward and encashment.',
    body: `### Leave Policies

1. Open **Organization → Leave Policies** → **Create Leave Policy**.
2. Enter a **Name** (e.g. *Paid Leave*) and a **Code** (e.g. \`PL\`) — both are required.
3. Choose the **Type** (paid / unpaid etc.) and set the **Annual Quota**.
4. Set **Carry Forward** and **Encashable** as your policy demands, including the maximum days allowed.
5. Save. Edit or delete from the row actions.

Employees then see these leave types when applying for leave.`,
  },
  {
    id: 'org-attendance-rules',
    title: 'Attendance rules — grace, late marks and fines',
    relatedModule: 'attendance-rules',
    keywords: [
      'attendance rule', 'attendance rules', 'late', 'late mark', 'grace period', 'half day',
      'fine', 'late fine', 'late after', 'half day after', 'punctuality',
    ],
    summary: 'Configure grace period, late-after, half-day-after and fines.',
    body: `### Attendance Rules

1. Open **Organization → Attendance Rules** → **Create Attendance Rule**.
2. Give it a **Name** (required), e.g. *Standard Late Rule*, and pick the rule **Type**.
3. Set:
   - **Grace Period** — minutes allowed before a punch counts as late
   - **Late After** — time after which the day is marked late
   - **Half Day After** — time after which it becomes a half-day
   - **Fine** — the deduction applied
4. Save. The rules table lists each rule with edit / delete actions.

Rules are applied when attendance is processed.`,
  },
  {
    id: 'org-checklists',
    title: 'Onboarding checklist templates',
    relatedModule: 'checklist-templates',
    keywords: [
      'checklist', 'checklist template', 'templates', 'onboarding checklist', 'task',
      'onboarding tasks', 'joining tasks', 'document upload', 'days after joining',
    ],
    summary: 'Build reusable onboarding task lists by department/designation.',
    body: `### Checklist Templates

Reusable onboarding checklists, targeted by **department or designation**.

1. Open **Organization → Checklist Templates** and create a template (e.g. *Software Engineer Onboarding*) — a name is required.
2. Add tasks — each needs a **title** and can have a due offset in **days after joining**.
3. Tick **Requires document upload** if the task cannot be completed without an uploaded file.
4. Save. A template needs **at least one task**.`,
  },
  {
    id: 'org-employee-documents',
    title: 'Employee documents',
    relatedModule: 'employee-documents',
    keywords: [
      'employee documents', 'documents', 'certificates', 'onboarding documents',
      'training certificates', 'view documents', 'employee files',
    ],
    summary: 'Browse onboarding documents & certificates per employee.',
    body: `### Employee Documents

Shows **onboarding documents and training certificates** grouped per employee.

- Search by **name, code or department**.
- Open an employee to see documents by category; an empty category reads *"No documents in this category"*.`,
  },
  {
    id: 'org-roles-access',
    title: 'Roles & Access — authority levels and approval chains',
    relatedModule: 'roles-access',
    popular: true,
    keywords: [
      'role', 'roles', 'access', 'roles and access', 'permission', 'permissions', 'level',
      'approval chain', 'chain', 'hierarchy', 'authority', 'module access', 'capacity',
      'level 1', 'approver', 'add role',
    ],
    summary: 'Create business roles, set module access and approval chains.',
    body: `### Roles & Access

**Roles** define who can do what, and where they sit in the hierarchy.

1. Open **Organization → Roles & Access** and add a role (e.g. *HR Manager*). A name is required.
2. Set the **level** — **1 = highest authority** (just below admin); higher numbers are lower positions.
3. Choose the **modules** the role can access. Only modules enabled for your company are shown.
4. Optionally scope the role by **department, designation or site**.

**Approval chains**
- A chain says who approves requests raised by a given role.
- **Level-1 roles go directly to admin** — no chain is needed or allowed.
- For other roles, pick the requester role first, then add at least one approver from a **higher-authority** role.

The **Hierarchy** panel lists roles from highest to lowest authority. Account Capacity shows how many logins your plan allows.`,
    links: [{ label: 'User Management', moduleId: 'user-management' }],
  },
  {
    id: 'org-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Organization Help

I'm a **self-contained guide** for the Organization module. Ask *"how do I add a holiday"* or *"what does level 1 mean in roles"*, or tap a suggested question. Use the **Open module** chips to jump to a screen.`,
  },
];
