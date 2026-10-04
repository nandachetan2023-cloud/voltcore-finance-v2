/**
 * Master Setup, Petty Cash, MIS, Login & Role and System Help — Knowledge Base
 * (Petty Cash also reuses the two petty-cash entries from `finance-help-data.ts`.)
 */

import type { HelpEntry } from '../finance-help-data';

// ── Master Setup ────────────────────────────────────────────────
export const MASTER_SETUP_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'master-overview',
    title: "What's in Master Setup?",
    popular: true,
    relatedModule: 'master-setup',
    keywords: [
      'master setup', 'masters', 'master data', 'overview', 'menu', 'sections', 'what is',
      'set up', 'setup first', 'where is',
    ],
    summary: 'The master data every other module depends on.',
    body: `### Master Setup

Set these up **first** — invoices, POs, petty cash and reports all pick from them.

- **Sites** — site code, location, state, contacts, budget
- **Jobs (PO-wise)** — a job code tied to a site and PO
- **Clients & Vendors** — the party master (GST, PAN, TDS)
- **Vendor Management** — vendor directory with rating and compliance
- **Employees** — employee directory
- **Chart of Accounts** — the account tree used by the ledger

Suggested order: **Chart of Accounts → Sites → Parties → Jobs**.`,
    links: [
      { label: 'Sites', moduleId: 'fin-sites' },
      { label: 'Clients & Vendors', moduleId: 'fin-parties' },
      { label: 'Chart of Accounts', moduleId: 'chart-of-accounts' },
    ],
  },
  {
    id: 'master-coa',
    title: 'Chart of Accounts — adding and organising accounts',
    popular: true,
    relatedModule: 'chart-of-accounts',
    keywords: [
      'chart of accounts', 'coa', 'account', 'accounts', 'new account', 'account code',
      'parent account', 'group', 'ledger account', 'drag', 'tree', 'expand', 'collapse',
      'tax account', 'inactive',
    ],
    summary: 'Build the account tree; drag to re-parent or reorder.',
    body: `### Chart of Accounts

1. **New Account**.
2. Fill in **Account Code**, **Name** (required), **Parent Account** (or *Root*), **Group**, **Type** and **Description**.
3. Tick **Tax applicable account** for GST/TDS accounts (shown with a *TAX* tag).
4. Save.

**Organising the tree**
- **Expand / Collapse** all branches.
- **Drag a row onto another** to make it a child, or onto its edge to reorder.
- Accounts can be **Active** or **Inactive**.`,
    links: [{ label: 'Ledger', moduleId: 'ledger' }],
  },
  {
    id: 'master-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Master Setup Help

I'm a **self-contained guide** for Master Setup. Ask *"how do I add an account"*, or tap a suggestion. For sites, jobs and parties, open them from the chips below — their detailed guides live in the Finance helper.`,
  },
];

// ── Petty Cash (extends the two petty-cash entries already in the finance KB) ──
export const PETTY_CASH_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'pc-overview',
    title: "What's in Petty Cash?",
    popular: true,
    relatedModule: 'petty-cash',
    keywords: [
      'petty cash', 'overview', 'menu', 'sections', 'what is', 'features', 'where is', 'navigate',
      'float', 'imprest',
    ],
    summary: 'Map of the petty-cash screens and who does what.',
    body: `### Petty Cash

- **Custodian Dashboard** — sanctioned limit and current balance per site
- **Vouchers** — record and review petty-cash vouchers, plus the cash reports
- **Approval Queue** — vouchers waiting for your approval
- **Replenishment** — request more float for a site

**Who does what**
- **Site Employee** — requests cash for a job code
- **Site Manager** — approves expense requests for their site
- **Finance Head** — allocates float to sites directly (no queue)`,
    links: [
      { label: 'Vouchers', moduleId: 'fin-petty-cash' },
      { label: 'Approval Queue', moduleId: 'fin-petty-cash-approval-queue' },
    ],
  },
  {
    id: 'pc-custodian',
    title: 'Custodian dashboard — fund limit and balance',
    relatedModule: 'fin-petty-cash-custodian',
    keywords: [
      'custodian', 'custodian dashboard', 'fund limit', 'sanctioned limit', 'balance',
      'current balance', 'sites tracked', 'over limit', 'nearing limit', 'float',
    ],
    summary: 'See each site’s sanctioned limit vs balance and edit the limit.',
    body: `### Custodian Dashboard

Cards show **Total Sanctioned Limit**, **Total Current Balance** and **Sites Tracked**. Each site row lists its **Custodian**, **Fund Limit** and **Balance**.

- Click the fund limit to edit it and **Save**.
- **Nearing sanctioned limit** — the balance is close to the ceiling.
- **Over sanctioned limit — replenishment needed** — raise a replenishment request.

*"No active sites found"* means no site in Sites master is active yet.`,
    links: [{ label: 'Replenishment', moduleId: 'fin-petty-cash-replenishment' }],
  },
  {
    id: 'pc-replenishment',
    title: 'Requesting a petty-cash replenishment',
    popular: true,
    relatedModule: 'fin-petty-cash-replenishment',
    keywords: [
      'replenishment', 'replenish', 'top up', 'top-up', 'float request', 'request cash',
      'more cash', 'refill', 'add float',
    ],
    summary: 'Request more float for a site; a draft credit voucher is created.',
    body: `### Petty Cash Replenishment

1. **Petty Cash → Replenishment**.
2. Pick the **Site** — the **custodian** and **sanctioned fund limit** auto-fill from the Site Master.
3. Enter the **Requested Amount (₹)** (required) and a **Reason**. The float is requested against a job so the spend lands on the right cost centre.
4. Submit — a **Credit voucher is created as a Draft** and routed automatically for approval.

*Recent Replenishment Requests* lists what you've already asked for.`,
  },
  {
    id: 'pc-vouchers-tabs',
    title: 'Vouchers, daily cash report and settlements',
    relatedModule: 'fin-petty-cash',
    keywords: [
      'voucher', 'vouchers', 'daily cash report', 'summary by site', 'employee settlement',
      'employee-wise', 'cash in', 'cash out', 'sync po', 'sync expense', 'new voucher',
      'pending approval', 'draft', 'rejected', 'approved', 'import',
    ],
    summary: 'Filter vouchers and use the three petty-cash reports.',
    body: `### Petty Cash Vouchers

**New Voucher** records a debit (cash out) or credit (cash in). Filter by **type**, **category**, **payment mode**, **source** (*Direct*, *Linked to PO*, *Linked to Expense*) and **approval status** (*Draft*, *Pending*, *Approved*, *Rejected*).

**Tabs**
- **Vouchers** — the list
- **Daily Cash Report** — cash in/out for the day with balance
- **Summary by Site** — totals per site
- **Employee-wise Settlement** — what each person holds

**Sync PO** / **Sync Expense** pull PO payments and expense claims into petty cash. **Import** loads vouchers in bulk. Cards show *Cash In*, *Cash Out*, *Balance (Approved)* and *Pending Approval*.`,
  },
  {
    id: 'pc-approval-queue',
    title: 'Approving petty-cash vouchers',
    relatedModule: 'fin-petty-cash-approval-queue',
    keywords: [
      'approval queue', 'approve voucher', 'approve petty cash', 'reject voucher', 'approving as',
      'segregation of duties', 'sod', 'finance role', 'waiting on you',
    ],
    summary: 'Approve or reject vouchers assigned to you.',
    body: `### Approval Queue

Shows the vouchers waiting **on you**, under **Approving As** your finance role.

- **Approve** or **Reject** each one; a rejection needs a **reason**.
- *"Nothing waiting on you right now"* means the queue is clear.
- *"No finance role assigned yet"* — ask an admin to assign you one in **Login & Role → Finance Access Control**.

**Segregation of Duties** is enforced on the server: you cannot approve a voucher you submitted yourself.`,
    links: [{ label: 'Finance Access Control', moduleId: 'fin-user-management' }],
  },
  {
    id: 'pc-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Petty Cash Help

I'm a guide for **Petty Cash**. Ask *"how do I request a top-up"* or *"who approves vouchers"*. I can also **create a voucher from a sentence**, e.g. *"create petty cash of 500 for courier at site …"*. Use the **Open module** chips to jump to a screen.`,
  },
];

// ── MIS ──────────────────────────────────────────────────────────
export const MIS_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'mis-overview',
    title: "What's in MIS?",
    popular: true,
    relatedModule: 'mis',
    keywords: [
      'mis', 'management information', 'reports', 'overview', 'menu', 'sections', 'what is',
      'analysis', 'where is',
    ],
    summary: 'Map of the MIS reporting screens.',
    body: `### MIS

Management reports built from posted data:

- **Site / Job P&L Drill-down** — P&L and Balance Sheet by account
- **PO Cost Tree** — cost rolled up Site → Job → PO
- **Customer Profitability** — revenue, cost, profit and margin per customer
- **Budget vs Actual** — planned vs actual spend

Reports are only as complete as the entries behind them: tag every invoice, PO and voucher with a **site** and **job**.`,
    links: [
      { label: 'PO Cost Tree', moduleId: 'po-cost-tree' },
      { label: 'Customer Profitability', moduleId: 'customer-profitability' },
    ],
  },
  {
    id: 'mis-drilldown',
    title: 'P&L / Balance Sheet drill-down',
    relatedModule: 'report-drilldown',
    keywords: [
      'drilldown', 'drill down', 'drill-down', 'p&l', 'profit and loss', 'balance sheet',
      'account balance', 'child accounts', 'site pl', 'job pl',
    ],
    summary: 'Expand accounts to see child balances.',
    body: `### P&L / Balance Sheet Drill-down

Switch between **P&L** and **Balance Sheet**. Each row shows **Account**, **Type** and **Balance**; open an account to see its **child accounts**.

*"No accounts"* means no chart of accounts or postings exist yet — see **Master Setup → Chart of Accounts**.`,
    links: [{ label: 'Chart of Accounts', moduleId: 'chart-of-accounts' }],
  },
  {
    id: 'mis-po-tree',
    title: 'PO-wise cost tree',
    relatedModule: 'po-cost-tree',
    keywords: [
      'po cost tree', 'cost tree', 'po wise', 'po-wise cost', 'cost node', 'site job po',
      'cost rollup', 'cost by po',
    ],
    summary: 'See cost rolled up by site, job and PO.',
    body: `### PO-wise Cost Tree

A tree of **Cost Node**, **Level** and **Amount** — expand a **Site** to see its **Jobs**, then the **POs** under each.

*"No purchase orders"* means nothing has been raised yet.`,
  },
  {
    id: 'mis-customer-profit',
    title: 'Customer profitability',
    relatedModule: 'customer-profitability',
    keywords: [
      'customer profitability', 'profitability', 'margin', 'customer wise', 'profit share',
      'revenue cost profit', 'overall margin',
    ],
    summary: 'Revenue, cost, profit and margin per customer.',
    body: `### Customer-wise Profitability

Cards: **Total Revenue**, **Total Cost**, **Total Profit** and **Overall Margin**. Charts: **Profit by Customer** and **Profit Share by Customer**.

Margins depend on invoices and costs being tagged to the customer — untagged entries won't appear.`,
  },
  {
    id: 'mis-budget',
    title: 'Budget vs actual',
    relatedModule: 'budget',
    keywords: [
      'budget', 'budget vs actual', 'planned', 'actual', 'utilization', 'over budget',
      'under budget', 'on track', 'budget item',
    ],
    summary: 'Compare planned and actual spend by category.',
    body: `### Budget vs Actual

**New Item** → **Category**, **Description**, **Planned (₹)**, **Actual (₹)**, **Period** and **Status**; optionally tag **Job Code**, **PO Number**, **Cost Center**, **Department** and **Project Manager**.

Status shows **On Track**, **Under Budget** or **Over Budget**; cards summarise **Planned**, **Actual** and **Utilization**. Use **Import** to load budgets in bulk.`,
  },
  {
    id: 'mis-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### MIS Help

I'm a **self-contained guide** for MIS reports. Ask *"where do I see customer margins"* or *"how does the cost tree work"*, or tap a suggestion.`,
  },
];

// ── Login & Role ─────────────────────────────────────────────────
export const LOGIN_ROLE_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'login-overview',
    title: 'Finance Access Control — overview',
    popular: true,
    relatedModule: 'fin-user-management',
    keywords: [
      'login', 'role', 'roles', 'access control', 'finance access', 'user management',
      'overview', 'permissions', 'what is', 'where is', 'finance role',
    ],
    summary: 'Hierarchical finance roles, site scope, SoD and audit trail.',
    body: `### Finance Access Control

Five tabs:

- **Role Catalog** — finance roles with a **level (1–5)**, colour badge and access mode
- **Assignments** — which user holds which role, and for which sites
- **Permissions** — the permission catalog
- **SoD Rules** — Segregation-of-Duties pairings
- **Audit Log** — who changed what`,
  },
  {
    id: 'login-roles',
    title: 'Creating a finance role',
    popular: true,
    relatedModule: 'fin-user-management',
    keywords: [
      'new role', 'create role', 'role catalog', 'level', 'access mode', 'read only',
      'auditor', 'full access', 'badge color', 'role code',
    ],
    summary: 'Define role code, level and access mode.',
    body: `### Role Catalog

1. **New Role**.
2. Enter **Code** and **Name** (required) and a **Level (1..5)**; pick a **Badge Color**.
3. Choose the **Access Mode**:
   - **Full access** — can create, approve and export as permitted
   - **Read-only (Auditor)** — view only
4. Save, then set its permissions in the **Permissions** tab.`,
  },
  {
    id: 'login-assign',
    title: 'Assigning a role to a user (site-scoped)',
    relatedModule: 'fin-user-management',
    keywords: [
      'assign', 'assignment', 'assign role', 'site scope', 'all sites', 'site scoped',
      'sod', 'segregation of duties', 'custodian', 'finance head', 'conflict',
    ],
    summary: 'Give a user a role for all sites or specific sites.',
    body: `### Assignments

1. **Assign**.
2. Select the **User** (a system user) and the **Role**.
3. Set the **Site Scope** — **All Sites** or specific sites.
4. Save.

**Segregation of Duties:** conflicting pairings (e.g. *Custodian × Finance Head*) are **blocked automatically**. Review the rules in the **SoD Rules** tab.`,
  },
  {
    id: 'login-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Login & Role Help

I'm a **self-contained guide** for Finance Access Control. Ask *"how do I make a read-only auditor"* or *"why is my assignment blocked"*. For business roles across the whole ERP see **Organization → Roles & Access**.`,
    links: [{ label: 'Roles & Access', moduleId: 'roles-access' }],
  },
];

// ── System ───────────────────────────────────────────────────────
export const SYSTEM_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'sys-overview',
    title: "What's in the System module?",
    popular: true,
    relatedModule: 'system',
    keywords: [
      'system', 'overview', 'menu', 'sections', 'what is', 'features', 'where is', 'navigate',
      'admin', 'administration',
    ],
    summary: 'Map of the system administration screens.',
    body: `### System

- **Reports** — hub for the report pages
- **Settings** — company identity, branding and document text
- **User Management** — login accounts for your company
- **Onboarding Approvals** — review new-joiner forms
- **Employee Requests** — approve general and advance-payment requests
- **Notice Board** — publish notices
- **Recycle Bin** — restore deleted items
- **Notifications** — your personal inbox (bell)`,
    links: [
      { label: 'Settings', moduleId: 'settings' },
      { label: 'User Management', moduleId: 'user-management' },
      { label: 'Notice Board', moduleId: 'notice-board' },
    ],
  },
  {
    id: 'sys-settings',
    title: 'Company settings, logo and document text',
    popular: true,
    relatedModule: 'settings',
    keywords: [
      'settings', 'company settings', 'logo', 'branding', 'company name', 'gstin', 'pan', 'tan',
      'cin', 'address', 'header', 'footer', 'terms', 'declaration', 'signatory', 'tagline',
    ],
    summary: 'Company identity, logo and invoice header/footer text.',
    body: `### Company Settings

Saved to the database, so it persists across sessions.

- **Logo & Branding** — upload the **Company Logo** (PNG/JPG under 500 KB). It appears on Site Invoices, Payment Advices, Credit Notes and Sales invoices. **Remove** clears it.
- **Company Identity** — name, type, industry, incorporation date, CIN, website.
- **Registered Address** — lines, city, state, pincode, country.
- **Statutory & Compliance** — PAN, TAN and similar identifiers.
- **Document Header & Footer** — tagline, **Signatory Label**, footer note, **Tax Invoice Declaration** and **Terms & Conditions**.`,
  },
  {
    id: 'sys-users',
    title: 'Adding users and bulk-creating accounts',
    popular: true,
    relatedModule: 'user-management',
    keywords: [
      'user management', 'user', 'users', 'add user', 'login account', 'bulk assign', 'password',
      'default password', 'onboarding form', 'create account', 'inactive', 'employee login',
    ],
    summary: 'Create login accounts singly or in bulk.',
    body: `### User Management

**Add User** creates one login. **Bulk Assign** creates many at once:

1. Select the employees who don't have accounts yet (only unassigned employees are shown; **Select All** / **Clear** help).
2. Pick the **Role** — module access follows the role automatically.
3. Set a **Default Password**.
4. Optionally tick **Require onboarding form** so the person completes their joining form first.
5. Create.

Account states include **Inactive**, **Onboarding Pending** and **Awaiting Approval** (use **Approve Onboarding** / **Reject**).

Roles themselves are defined in **Organization → Roles & Access**.`,
    links: [{ label: 'Roles & Access', moduleId: 'roles-access' }],
  },
  {
    id: 'sys-onboarding-approvals',
    title: 'Approving onboarding submissions',
    relatedModule: 'onboarding-approvals',
    keywords: [
      'onboarding approvals', 'onboarding approval', 'joining form', 'new joiner', 'approve onboarding',
      'reject onboarding', 'epf', 'esic', 'form 11', 'nomination', 'bank account',
    ],
    summary: 'Review joining forms and approve or reject them.',
    body: `### Onboarding Approvals

Lists joining-form submissions from new employees.

- **View Full Form** shows personal, family, identity, bank, EPF (Form 11), ESIC and nomination details.
- **Approve** accepts it.
- **Reject** needs a remark — the employee sees it and is asked to refill the form.

*"No submissions to review"* means the queue is empty.`,
  },
  {
    id: 'sys-requests',
    title: 'Employee requests (general & advance)',
    relatedModule: 'requests',
    keywords: [
      'requests', 'employee requests', 'advance', 'advance payment', 'approve request',
      'reject request', 'approved amount', 'insufficient level', 'general request',
    ],
    summary: 'Approve, reduce or reject employee requests.',
    body: `### Employee Requests

Filter by type (**General**, **Advance Payment**) and status (**Pending**, **Approved**, **Rejected**).

- **Approve** — for an advance you may approve the full amount or **reduce** it; it cannot exceed the requested amount.
- **Reject** — a **reason** is required.
- *"Insufficient level"* means your role's level isn't high enough to act on that request.`,
  },
  {
    id: 'sys-notice-board',
    title: 'Publishing notices',
    relatedModule: 'notice-board',
    keywords: [
      'notice', 'notices', 'notice board', 'announcement', 'publish', 'new notice', 'pin',
      'target', 'expires', 'policy', 'safety notice', 'reads',
    ],
    summary: 'Publish notices to everyone, a department or a designation.',
    body: `### Notice Board

**New Notice** → **Title** and **Body** (required), the **Type** (*General*, *Policy*, *Payroll*, *Safety*) and the **Target**:

- **All Staff**
- **Specific Department**
- **Specific Designation**

Optionally set **Expires On** and **Pin this notice**. Cards show **Total Notices**, **Pinned** and **Total Reads**.`,
  },
  {
    id: 'sys-trash',
    title: 'Recycle Bin — restore or permanently delete',
    relatedModule: 'trash',
    keywords: [
      'trash', 'recycle bin', 'deleted', 'restore', 'undelete', 'permanently delete',
      'recover', 'deleted items',
    ],
    summary: 'Restore deleted items or remove them for good.',
    body: `### Recycle Bin

Lists deleted items by **Type**, **Name**, **Details** and **Deleted** date.

- **Restore Item** moves it back to the active list.
- **Permanently Delete** removes it from the database — **this cannot be undone**.`,
  },
  {
    id: 'sys-notifications',
    title: 'Notifications inbox',
    relatedModule: 'notifications',
    keywords: [
      'notification', 'notifications', 'bell', 'inbox', 'mark all read', 'clear read',
      'unread', 'alerts', 'filter sources',
    ],
    summary: 'Read, filter and clear your notifications.',
    body: `### Notifications

Your personal inbox — everyone has one.

- **Mark all read** and **Clear read** tidy the list.
- Filter by **source** and use **Clear filters** to reset.
- Some items link to the screen they concern; others say *no linked screen*.`,
  },
  {
    id: 'sys-reports',
    title: 'Reports hub',
    relatedModule: 'reports',
    keywords: [
      'reports', 'report', 'reporting', 'hub', 'manpower', 'attendance report', 'payroll report',
      'export', 'where are reports',
    ],
    summary: 'Where the report pages live.',
    body: `### Reports

The hub links to report pages for manpower, attendance, payroll, leave, tours, late & fines, onboarding, turnover, certificates, notice read-rate and payslip dispatch.

Financial and project reports are elsewhere: **Finance & Accounts → Financial Reports / Profit & Loss** and the **MIS** module.`,
    links: [
      { label: 'Financial Reports', moduleId: 'financial-reports' },
      { label: 'MIS', moduleId: 'mis' },
    ],
  },
  {
    id: 'sys-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### System Help

I'm a **self-contained guide** for the System module. Ask *"how do I add a logo"* or *"how do I bulk-create logins"*, or tap a suggestion. Use the **Open module** chips to jump to a screen.`,
  },
];
