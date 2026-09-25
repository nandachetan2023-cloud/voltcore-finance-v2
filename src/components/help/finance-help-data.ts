/**
 * Finance Help — Knowledge Base
 * ─────────────────────────────
 * Self-contained, offline help content scoped to the FINANCE module only.
 * The chat widget (`finance-help-chat.tsx`) scores the user's query against
 * `keywords` + `title` and returns the best match, rendering `body` as Markdown.
 *
 * To add a new topic: append one entry to `FINANCE_HELP_ENTRIES`.
 * Keep `keywords` generous (synonyms, typos, action verbs) for good matching.
 */

export type ModuleId = string;

export interface HelpLink {
  label: string;
  moduleId: ModuleId;
}

export interface HelpEntry {
  id: string;
  title: string;
  /** Lowercase keywords/phrases used for fuzzy matching. */
  keywords: string[];
  /** One-line summary shown in suggestion lists. */
  summary: string;
  /** Markdown body. */
  body: string;
  /** Module this answer is most related to (for the primary "Open module" chip). */
  relatedModule?: ModuleId;
  /** Extra click-to-navigate chips. */
  links?: HelpLink[];
  /** Mark topics that are popular — surfaced in the empty state / fallback. */
  popular?: boolean;
}

export const FINANCE_HELP_ENTRIES: HelpEntry[] = [
  // ── Troubleshooting ────────────────────────────────────────────
  {
    id: "troubleshoot",
    title: "Common errors & troubleshooting",
    keywords: [
      "error", "fix", "broken", "not working", "crash", "blank", "white screen",
      "chunk", "chunkloaderror", "database", "connection", "prisma", "failed",
      "can't connect", "won't load", "troubleshoot", "500", "404", "restart",
    ],
    summary: "Fixes for chunk errors, DB connection issues, and blank screens.",
    body: `### Common problems & fixes

**"Module Updated" / ChunkLoadError**
The browser is running stale JS. Hard reload:
- Windows: \`Ctrl + Shift + R\`
- Or open DevTools → right-click reload → "Empty Cache and Hard Reload".

**Database connection failed / Prisma errors**
- Check \`.env\` → \`DATABASE_URL\` is correct and the DB server is running.
- Re-run \`npm run db:push\` to sync schema.
- Run \`npm run db:generate\` to regenerate the client after schema changes.

**Blank screen after login**
- Check the browser console (F12) for errors.
- Clear cache & cookies, then reload.
- Restart \`npm run dev\`.

**Build fails**
- Run \`npm install\` again (deps may have changed).
- Run \`npm run lint\` to surface issues.
- Delete \`.next\` and rebuild: \`rm -rf .next && npm run build\`.`,
  },

  // ── Finance overview ───────────────────────────────────────────
  {
    id: "finance-overview",
    title: "What's in the Finance module?",
    popular: true,
    keywords: [
      "finance", "overview", "what is", "modules", "sections", "menu",
      "features", "where is", "list", "navigate", "finance module",
    ],
    summary: "Map of all finance sub-modules and where to find them.",
    body: `### Finance module overview

The **Finance** module (open it from the main sidebar) groups these areas:

**📊 Overview**
- Finance Dashboard — KPIs, charts, cash position

**🏢 Master Data**
- Sites — project/site master data
- Jobs (PO-wise) — job master, each job ties a job code to a site + PO
- Parties — clients, vendors, suppliers

**📒 Ledger & Journal**
- Ledger Management — chart of accounts & balances
- Journal Entries / Create Journal Entry — manual double-entry postings

**🧾 Billing / Receivables**
- Site Invoices — raise invoices against sites
- Accounts Receivable — customer outstanding & ageing
- Client Follow Up — track collections and call-backs
- Work Orders — work-order records

**💸 Payables**
- Purchase Orders — vendor orders tagged to site/job
- Accounts Payable — vendor outstanding & ageing
- Payment Center — record & allocate payments
- Payment Advices — payment advice records
- Credit Notes — reduce invoices / AR

**🏦 Cash & Bank**
- Bank & Cash — bank/cash accounts & transactions
- Bank Reconciliation — match bank to books
- Petty Cash — small cash entries & the three petty-cash reports

**📦 Expenses & Assets**
- Expense Claims — staff reimbursements
- Site Expenses — expenses booked to a site
- Fixed Assets — asset register & depreciation

**📈 Compliance & Reporting**
- Taxation & Compliance — GST registers, GSTR-3B, TDS
- Budget & Forecasting — budget vs actual
- Profit & Loss — P&L statement
- Financial Reports — Balance Sheet, ageing, cash flow

  **🔗 Sync / Integration**
- **Tally Sync (CA-Grade)** — ERP ↔ Tally Prime, FY-locked, GST/TDS, cost-centre, bill-wise, 3 triggers (Manual/Scheduled/On-Approve), Trial Balance reconcile
- **Notifications Ultra** — Purchase & Sales FY/site-scoped P0/P1/P2, in-app+email, digest, SSE live, snooze/escalate
- Sync Config — per-module auto-sync settings

Click any module name in the sidebar (under **Finance**) to open it.`,
    links: [
      { label: "Finance Dashboard", moduleId: "finance-dashboard" },
      { label: "Ledger", moduleId: "ledger" },
      { label: "Profit & Loss", moduleId: "fin-profit-loss" },
    ],
  },

  // ── Dashboard ──────────────────────────────────────────────────
  {
    id: "finance-dashboard",
    title: "Using the Finance Dashboard",
    relatedModule: "finance-dashboard",
    popular: true,
    keywords: [
      "dashboard", "kpi", "overview", "summary", "charts", "graphs",
      "cash position", "metrics", "finance home", "home",
    ],
    summary: "Read KPIs, cash position, and charts on the finance dashboard.",
    body: `### Finance Dashboard

The dashboard is the **landing page** of the Finance module. It shows a snapshot of the company's financial health.

**What you'll see**
- **KPI cards** — revenue, expenses, receivables, payables, net cash
- **Charts** — cash flow, P&L trend, top expenses (powered by Recharts)
- **Cash position** — bank & cash balances

**Tips**
- Figures reflect data already entered (invoices, payments, journals).
- Use the **Reports** sub-modules for detail behind each KPI.
- If numbers look stale, post recent invoices/payments and refresh.`,
    links: [{ label: "Open Dashboard", moduleId: "finance-dashboard" }],
  },

  // ── Ledger ─────────────────────────────────────────────────────
  {
    id: "ledger",
    title: "General Ledger",
    relatedModule: "ledger",
    keywords: [
      "ledger", "general ledger", "gl", "accounts", "chart of accounts",
      "account balance", "coa", "ledger view",
    ],
    summary: "Browse the chart of accounts and ledger balances.",
    body: `### General Ledger

The Ledger lists all **ledger accounts** and their balances (debit/credit).

**What you can do**
- View the chart of accounts and running balances
- Drill into an account to see its line items
- Filter by account / date range

**Where the data comes from**
Every Journal Entry, Invoice, and Payment ultimately **posts to the ledger**.
The ledger is the single source of truth for account balances.`,
    links: [{ label: "Open Ledger", moduleId: "ledger" }],
  },

  // ── Journal Entries ────────────────────────────────────────────
  {
    id: "journal-entries",
    title: "How to create a Journal Entry",
    relatedModule: "create-journal-entry",
    popular: true,
    keywords: [
      "journal", "journal entry", "je", "manual entry", "double entry",
      "debit", "credit", "create journal", "pass entry", "voucher",
      "adjusting entry", "accrual",
    ],
    summary: "Post a manual double-entry voucher with balanced debit/credit.",
    body: `### Creating a Journal Entry

Use a journal entry (JE) for manual adjustments, accruals, or any posting not
created automatically by invoicing/payments.

**Steps**
1. Open **Finance → Journal Entries** and click **Create / New**.
2. Pick a **date** and an optional **narration / reference**.
3. Add **lines** — for each line choose a ledger account, then enter a **Debit** or **Credit** amount.
4. The form requires the **total debits = total credits** (double-entry rule). The footer shows the difference — it must be \`0\` before you can save.
5. Save. The entry posts to the Ledger immediately.

**Tips**
- Use clear narration so auditors can trace the entry later.
- One JE per logical transaction keeps the ledger clean.`,
    links: [
      { label: "Create Journal Entry", moduleId: "create-journal-entry" },
      { label: "View Journal Entries", moduleId: "journal-entries" },
      { label: "Open Ledger", moduleId: "ledger" },
    ],
  },

  // ── Accounts Receivable ────────────────────────────────────────
  {
    id: "ar",
    title: "Accounts Receivable (AR)",
    relatedModule: "accounts-receivable",
    keywords: [
      "accounts receivable", "ar", "receivables", "money owed", "customer",
      "outstanding", "aging", "debtor", "debtors", "collect",
    ],
    summary: "Track money owed to you by customers (invoices → receipts).",
    body: `### Accounts Receivable

AR tracks **money owed TO you** by customers/clients.

**Lifecycle**
1. **Raise an invoice** (Site Invoices / Sales Tax Invoice) → creates a receivable.
2. **Record a receipt** (Payment Center) against that invoice → reduces the receivable.
3. **Aging report** shows overdue invoices by bucket (0–30, 31–60, 60+ days).

**What you can do here**
- See outstanding customer balances
- View aging buckets
- Match receipts to open invoices`,
    links: [
      { label: "Open AR", moduleId: "accounts-receivable" },
      { label: "Site Invoices", moduleId: "fin-invoices" },
      { label: "Payment Center", moduleId: "fin-payments" },
    ],
  },

  // ── Accounts Payable ───────────────────────────────────────────
  {
    id: "ap",
    title: "Accounts Payable (AP)",
    relatedModule: "accounts-payable",
    keywords: [
      "accounts payable", "ap", "payables", "money owed to vendor",
      "supplier", "outstanding bills", "aging", "creditor", "creditors",
      "bills to pay", "vendor payment",
    ],
    summary: "Track money you owe to vendors/suppliers (bills → payments).",
    body: `### Accounts Payable

AP tracks **money YOU owe** to vendors/suppliers.

**Lifecycle**
1. **Enter a vendor bill** (Purchase Order / expense entry) → creates a payable.
2. **Record a payment** (Payment Center) against that bill → reduces the payable.
3. **Aging report** shows overdue bills by bucket.

**What you can do here**
- See outstanding vendor balances
- View aging buckets
- Match payments to open bills`,
    links: [
      { label: "Open AP", moduleId: "accounts-payable" },
      { label: "Purchase Orders", moduleId: "fin-purchase-orders" },
      { label: "Payment Center", moduleId: "fin-payments" },
    ],
  },

  // ── Purchase Orders ───────────────────────────────────────────
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    relatedModule: "fin-purchase-orders",
    keywords: [
      "purchase order", "po", "order material", "vendor order", "place order",
      "po register", "create po", "approve po", "po status", "purchase order finance",
    ],
    summary: "Raise purchase orders, tag them to a site/job, and track them through to payment.",
    body: `### Purchase Orders

A **Purchase Order (PO)** is your formal order to a vendor for materials or services.

**Steps**
1. Open **Finance → Payables → Purchase Orders** → **New PO**.
2. Choose the **Vendor**, **Site**, and **Job Code**, and fill the PO costing tags
   (Cost Center, Department, Project Manager).
3. Add line items (description, qty, rate) and the order value.
4. Save. The PO becomes a payable when the vendor bill is received.

**Tips**
- Tag **Site** and **Job Code** so the spend lands in the right site/job cost sheet.
- From the PO you can drive **Payment Advice → Payment** to close the payable.`,
    links: [
      { label: "Purchase Orders", moduleId: "fin-purchase-orders" },
      { label: "Accounts Payable", moduleId: "accounts-payable" },
      { label: "Payment Center", moduleId: "fin-payments" },
    ],
  },

  // ── Credit Notes ──────────────────────────────────────────────
  {
    id: "credit-notes",
    title: "Credit Notes",
    relatedModule: "fin-credit-notes",
    keywords: [
      "credit note", "credit memo", "refund", "return", "reverse invoice",
      "invoice adjustment", "cancel invoice", "contra entry",
    ],
    summary: "Issue a credit note against a sales invoice to reduce what the customer owes.",
    body: `### Credit Notes

A **Credit Note (CN)** reverses or reduces a sales invoice — e.g. a return,
short-billing, or discount. Issuing one reduces the customer's outstanding (AR).

**Steps**
1. Open **Finance → Payables → Credit Notes** → **New Credit Note**.
2. Select the **invoice** it applies to.
3. Enter the **amount**, a **reason**, and the date.
4. Save. The credit note updates the customer's outstanding balance.

**Tips**
- Tag the same **Site / Job Code** as the original invoice for clean costing.
- Issue the CN against the exact invoice so AR matches correctly.`,
    links: [
      { label: "Credit Notes", moduleId: "fin-credit-notes" },
      { label: "Site Invoices", moduleId: "fin-invoices" },
      { label: "Accounts Receivable", moduleId: "accounts-receivable" },
    ],
  },

  // ── Client Follow Up ──────────────────────────────────────────
  {
    id: "client-follow-up",
    title: "Client Follow Up",
    relatedModule: "fin-client-follow-up",
    keywords: [
      "client follow up", "follow up", "followup", "collection", "reminder",
      "call back", "outstanding follow up", "receivable follow up", "client call",
      "follow up register",
    ],
    summary: "Track follow-ups with clients on outstanding amounts and schedule call-backs.",
    body: `### Client Follow Up

Track **follow-ups with clients** on overdue / outstanding amounts so collections
don't slip through the cracks.

**Steps**
1. Open **Finance → Billing / Receivables → Client Follow Up** → **New Follow Up**.
2. Enter the **client**, the **outstanding amount**, related **PO / invoice numbers**,
   and a **contact person** + number.
3. Note what was **discussed** and set a **call-back date**.
4. Save. The system files an alert when a follow-up is due.

**Tips**
- Use the **Import** button to upload a follow-up sheet in bulk (PO numbers are
  resolved automatically against the PO register).
- Pair it with **Accounts Receivable** and **Collection Ageing** to prioritise
  the biggest overdue balances.`,
    links: [
      { label: "Client Follow Up", moduleId: "fin-client-follow-up" },
      { label: "Accounts Receivable", moduleId: "accounts-receivable" },
    ],
  },

  // ── Invoices ───────────────────────────────────────────────────
  {
    id: "invoices",
    title: "Creating & printing invoices (GST tax invoice)",
    relatedModule: "fin-invoices",
    popular: true,
    keywords: [
      "invoice", "bill", "gst", "tax invoice", "create invoice", "raise invoice",
      "print invoice", "pdf", "export invoice", "site invoice", "customer bill",
      "billing", "gst number", "hsn", "cgst", "sgst", "igst",
    ],
    summary: "Raise an invoice against a site/party and print a GST tax invoice.",
    body: `### Site Invoices (GST tax invoices)

Use **Finance → Site Invoices** to bill a client for work on a site.

**Steps**
1. Open **Finance → Site Invoices** → click **New / Create**.
2. Select the **Site** and **Party** (customer).
3. Add line items — description, qty, rate, HSN/SAC, GST rate.
4. The system computes **CGST + SGST** (or **IGST** for inter-state).
5. Save → the invoice is numbered and posted to **Accounts Receivable**.

**Printing**
- Open an invoice → click **Print** / **Download PDF**.
- The layout is a **Letter-size GST tax invoice** with your company details, GSTIN, and tax split.

**Tips**
- Make sure the party's **GSTIN** is set in **Parties** for a valid tax invoice.
- Excel import is available for bulk invoice creation.`,
    links: [
      { label: "Site Invoices", moduleId: "fin-invoices" },
      { label: "Parties", moduleId: "fin-parties" },
      { label: "Accounts Receivable", moduleId: "accounts-receivable" },
    ],
  },

  // ── Payments ───────────────────────────────────────────────────
  {
    id: "payments",
    title: "Recording payments (Payment Center)",
    relatedModule: "fin-payments",
    popular: true,
    keywords: [
      "payment", "pay", "receipt", "receive money", "payment center",
      "record payment", "allocate", "neft", "rtgs", "cheque", "cash payment",
      "bank payment", "settle invoice", "settle bill",
    ],
    summary: "Record money in/out and allocate it to invoices or bills.",
    body: `### Payment Center

Record every money movement — **receipts** (money in) and **payments** (money out).

**Steps**
1. Open **Finance → Payment Center** → **New Payment**.
2. Choose direction: **Receipt** (from customer) or **Payment** (to vendor/expense).
3. Select the **Party**, **date**, **amount**, **mode** (Cash / Bank / Cheque / UPI).
4. **Allocate** the amount against one or more open invoices/bills.
5. Save → updates AR/AP and posts to the Ledger & Bank-Cash.

**Tips**
- Part-allocations are supported (split one payment across multiple invoices).
- Match the payment mode to the right bank/cash account.`,
    links: [
      { label: "Payment Center", moduleId: "fin-payments" },
      { label: "Bank & Cash", moduleId: "bank-cash" },
    ],
  },

  // ── Bank & Cash ────────────────────────────────────────────────
  {
    id: "bank-cash",
    title: "Bank & Cash accounts",
    relatedModule: "bank-cash",
    keywords: [
      "bank", "cash", "bank account", "cash in hand", "balance", "bank balance",
      "account balance", "bank book", "cash book",
    ],
    summary: "View balances and transactions for each bank/cash account.",
    body: `### Bank & Cash

Each bank account and cash box is a **ledger account**. This view shows their
balances and the transactions flowing through them.

**What you can do**
- See running balance per bank/cash account
- Drill into transactions (receipts, payments, journals)
- Reconcile against the bank statement in **Bank Reconciliation**`,
    links: [
      { label: "Bank & Cash", moduleId: "bank-cash" },
      { label: "Bank Reconciliation", moduleId: "fin-bank-reconciliation" },
    ],
  },

  // ── Bank Reconciliation ────────────────────────────────────────
  {
    id: "bank-recon",
    title: "Bank Reconciliation",
    relatedModule: "fin-bank-reconciliation",
    keywords: [
      "bank reconciliation", "reconciliation", "reconcile", "match statement",
      "bank statement", "brs", "clearing", "uncleared",
    ],
    summary: "Match your books to the bank statement to find differences.",
    body: `### Bank Reconciliation

Reconciliation (BRS) matches transactions in your books against the **bank statement**.

**Steps**
1. Open **Finance → Bank Reconciliation**.
2. Select the **bank account** and **statement period**.
3. For each book transaction, mark it **cleared** when it appears on the bank statement (optionally enter the statement date).
4. The view shows **book balance**, **bank balance**, and the **difference**.
5. When the difference = \`0\`, the account is reconciled for that period.

**Why it matters**
Catches missing payments, duplicate entries, bank charges, and timing differences.`,
    links: [{ label: "Bank Reconciliation", moduleId: "fin-bank-reconciliation" }],
  },

  // ── Petty Cash ─────────────────────────────────────────────────
  {
    id: "petty-cash",
    title: "Petty Cash",
    relatedModule: "fin-petty-cash",
    keywords: [
      "petty cash", "petty", "small cash", "reimburse", "voucher",
      "office expenses", "cash expense", "petty cash book", "custodian",
      "float", "daily cash report", "site summary", "settlement",
    ],
    summary: "Record small day-to-day cash expenses, top-ups, and run the three petty cash reports.",
    body: `### Petty Cash

Petty Cash tracks small, day-to-day site and office expenses paid in cash,
wallet or UPI — tea, local conveyance, diesel, stationery, courier, labour
welfare, emergency purchases.

**Creating a voucher**
1. Open **Finance → Petty Cash** → **New Voucher**.
2. In **Project Allocation**, pick the **Site**, **Job Code**, **PO** and the costing
   dimensions (**Cost Center**, **Department**, **Project Manager**) — these six tags
   are required so the spend flows into Site-wise and Job-wise costing.
3. In **Expense Details**, tap a category tile — **FUEL / MAINT / LOCAL / FOOD /
   STATIONARY / MISC** (mapped to Travel / Maintenance / Site Material / Food &
   Refreshment / Office Supplies / Miscellaneous) — or type a custom category,
   enter the **amount**, choose **Debit** (money out) or **Credit** (float / top-up),
   and describe the expense.
4. In **Payment & Evidence**, choose **Cash / Wallet / UPI** and drop in the receipt.
5. **Save Draft** keeps it as a draft; **Submit for Approval** sends it to the
   approver (Draft → Pending → Approved). The running balance updates automatically.

**Four tabs**
| Tab | What it shows |
|---|---|
| **Vouchers** | The full voucher register with filters and approval actions |
| **Daily Cash Report** | Opening balance → cash in → expense → closing, per day |
| **Summary by Site** | Cash given vs expense vs balance, per site |
| **Employee-wise Settlement** | Advance vs expense vs balance, per custodian |

**Custodian & limit**
Each voucher records the **custodian** (Site Incharge / Store Incharge / Admin
Executive) and their sanctioned **limit** — e.g. a site petty cash limit of ₹50,000.

See also: **Petty cash approval workflow** for the Draft → Pending → Approved cycle.`,
    links: [{ label: "Petty Cash", moduleId: "fin-petty-cash" }],
  },

  // ── Petty Cash approval workflow ───────────────────────────────
  {
    id: "petty-cash-approval",
    title: "Petty cash approval workflow",
    relatedModule: "fin-petty-cash",
    keywords: [
      "petty cash approval", "approve voucher", "reject voucher", "submit voucher",
      "approval", "approve", "reject", "pending approval", "draft voucher",
      "approval history", "audit trail", "who approved", "rejection reason",
    ],
    summary: "Draft → Pending → Approved/Rejected cycle for petty cash vouchers, with full audit trail.",
    popular: true,
    body: `### Petty cash approval workflow

Every voucher carries an **approval status** and moves through this cycle:

\`\`\`
Draft ──submit──▶ Pending ──approve──▶ Approved
                     │
                     └──reject──▶ Rejected ──resubmit──▶ Pending
\`\`\`

**Statuses**
| Status | Meaning |
|---|---|
| **Draft** | Just created, not yet sent for approval |
| **Pending** | Submitted, waiting on the approver |
| **Approved** | Signed off — counts as final |
| **Rejected** | Sent back with a reason; fix it and resubmit |

**How to use it**
- **Submit** (paper-plane icon) on a Draft or Rejected voucher sends it for approval.
- **Approve** (✓) or **Reject** (✗) appear on Pending vouchers. Rejecting
  *requires* a reason, which the requester sees on the voucher.
- Click the **status badge** in the Approval column to open the full
  **approval history** — who submitted, who approved or rejected, when, and any comments.

**Finding what needs action**
The **Pending Approval** stat card at the top shows the outstanding count, and the
**Approval Status** filter narrows the register to just Pending (or Draft / Rejected).`,
    links: [{ label: "Petty Cash", moduleId: "fin-petty-cash" }],
  },

  // ── Payment Advices ────────────────────────────────────────────
  {
    id: "payment-advices",
    title: "Payment Advices",
    relatedModule: "fin-payment-advices",
    keywords: [
      "payment advice", "advice", "advice note", "payment note",
      "remittance", "import advice", "advice import",
    ],
    summary: "Import/record payment advice notes from clients or for vendors.",
    body: `### Payment Advices

A **Payment Advice** documents that a payment has been initiated (e.g. a client
emails "we've transferred ₹X against invoice Y"). Record it here before the
receipt appears in Bank Reconciliation.

**Steps**
- **Add manually** — enter party, amount, reference, date.
- **Bulk import** — use the **Import** button to upload an Excel sheet of advices.

Once the money hits the bank, match the advice to a receipt in **Bank Reconciliation**.`,
    links: [
      { label: "Payment Advices", moduleId: "fin-payment-advices" },
      { label: "Bank Reconciliation", moduleId: "fin-bank-reconciliation" },
    ],
  },

  // ── Expense Claims ─────────────────────────────────────────────
  {
    id: "expense-claims",
    title: "Expense Claims (staff reimbursement)",
    relatedModule: "fin-expense-claims",
    keywords: [
      "expense claim", "reimbursement", "claim", "staff expense",
      "employee expense", "out of pocket", "reimburse staff",
    ],
    summary: "Employees submit expenses; finance approves & reimburses.",
    body: `### Expense Claims

Staff submit **out-of-pocket expenses** for reimbursement.

**Flow**
1. Employee creates a **claim** with receipts/details.
2. Finance/Manager **reviews** the claim.
3. On **approval**, the claim becomes payable and is paid via the **Payment Center**.

**Tips**
- Attach receipts (amount, date, purpose) for audit.
- Approve before paying so the books stay accurate.`,
    links: [
      { label: "Expense Claims", moduleId: "fin-expense-claims" },
      { label: "Payment Center", moduleId: "fin-payments" },
    ],
  },

  // ── Site Expenses ──────────────────────────────────────────────
  {
    id: "site-expenses",
    title: "Site Expenses",
    relatedModule: "fin-site-expenses",
    keywords: [
      "site expense", "project expense", "expense to site", "direct expense",
      "job expense", "cost to site",
    ],
    summary: "Book expenses directly against a site/project for costing.",
    body: `### Site Expenses

Book expenses **directly to a site/project** so you can measure site-level
profitability.

**Steps**
1. Open **Finance → Site Expenses** → **New**.
2. Choose the **Site**, **expense head**, amount, and date.
3. Save → the cost is attached to that site for P&L/costing.

Use this alongside **Site Invoices** to see margin per site.`,
    links: [
      { label: "Site Expenses", moduleId: "fin-site-expenses" },
      { label: "Profit & Loss", moduleId: "fin-profit-loss" },
    ],
  },

  // ── Work Orders ────────────────────────────────────────────────
  {
    id: "work-orders",
    title: "Work Orders",
    relatedModule: "fin-work-orders",
    keywords: [
      "work order", "wo", "job order", "scope of work", "subcontract work",
      "work contract",
    ],
    summary: "Record work orders issued/received for a scope of work.",
    body: `### Work Orders

A **Work Order** documents an agreed scope of work (often with a subcontractor
or vendor) and its value.

**Steps**
1. Open **Finance → Work Orders** → **New**.
2. Capture party, site, scope description, value, and dates.
3. Save. Use it to track commitments and to match against later bills/payments.`,
    links: [{ label: "Work Orders", moduleId: "fin-work-orders" }],
  },

  // ── Fixed Assets ───────────────────────────────────────────────
  {
    id: "fixed-assets",
    title: "Fixed Assets & depreciation",
    relatedModule: "fin-assets",
    keywords: [
      "fixed asset", "asset", "depreciation", "asset register", "equipment",
      "capitalise", "capex", "wdv", "slm", "useful life",
    ],
    summary: "Maintain the asset register and post depreciation.",
    body: `### Fixed Assets

The asset register tracks **capital assets** (machinery, vehicles, furniture, etc.)
and their depreciation.

**Steps**
1. Open **Finance → Fixed Assets** → **Add Asset**.
2. Enter asset name, **purchase cost**, **purchase date**, and depreciation method (**SLM** / **WDV**) with useful life.
3. Save. Run **depreciation** periodically — the system posts the depreciation journal to the Ledger.

**Concepts**
- **SLM** — Straight Line: equal depreciation each year.
- **WDV** — Written Down Value: depreciation on the reducing balance.`,
    links: [{ label: "Fixed Assets", moduleId: "fin-assets" }],
  },

  // ── Profit & Loss ──────────────────────────────────────────────
  {
    id: "profit-loss",
    title: "Profit & Loss statement",
    relatedModule: "fin-profit-loss",
    popular: true,
    keywords: [
      "profit", "loss", "p&l", "pnl", "income statement", "statement",
      "revenue", "expense", "net profit", "gross profit", "earnings",
    ],
    summary: "View revenue, expenses, and net profit for a period.",
    body: `### Profit & Loss (P&L)

The P&L statement shows **Revenue − Expenses = Net Profit** for a chosen period.

**Steps**
1. Open **Finance → Profit & Loss**.
2. Pick the **period** (month/quarter/year) and filters (site, party).
3. The statement groups income and expenses and shows **Gross Profit** and **Net Profit**.

**Where the numbers come from**
- **Income** ← invoices raised in the period
- **Expenses** ← payments, site expenses, journals, depreciation posted in the period

**Tips**
- P&L is **accrual-based** — it reflects invoiced revenue, not just cash received.
- Use **Financial Reports** for custom breakdowns.`,
    links: [
      { label: "Profit & Loss", moduleId: "fin-profit-loss" },
      { label: "Financial Reports", moduleId: "financial-reports" },
    ],
  },

  // ── Taxation ───────────────────────────────────────────────────
  {
    id: "taxation",
    title: "Taxation (GST)",
    relatedModule: "taxation",
    keywords: [
      "tax", "taxation", "gst", "tax liability", "output tax", "input tax",
      "itc", "tax payable", "gst return", "tds", "gstr", "gstr-1", "gstr-3b",
      "gstr1", "gstr3b", "gst register", "sales register", "purchase register",
      "tds register", "26q", "form 26q", "194c", "194j", "194i", "192",
      "cgst", "sgst", "igst", "tds payable", "tds deduction",
    ],
    summary: "GST sales/purchase registers, GSTR-3B summary, and the TDS register with Form 26Q export.",
    popular: true,
    body: `### Taxation, GST & TDS

The Taxation screen has **six tabs**:

| Tab | What it does |
|---|---|
| **Tax Payments** | Statutory calendar — GST/TDS/PF/ESI dues and payment status |
| **GST Sales Register** | Every sales invoice with taxable value + CGST/SGST/IGST split |
| **GST Purchase Register** | Every purchase order with taxable value and GST (ITC) |
| **GSTR-3B Summary** | Outward supplies, output tax, ITC available, **net payable** |
| **TDS Register** | All deductions with section, rate, taxable amount and status |
| **TDS Payable** | Outstanding TDS grouped by section, with Form 26Q export |

**How GST is split**
Supply within your home state → **CGST + SGST** (9% + 9%).
Inter-state supply → **IGST** (18%). This is driven by the party's **state code**,
so keep GSTIN and state on every party record accurate.

**TDS sections tracked**
- **194C** — Contractor payments
- **194J** — Professional / technical fees
- **194I** — Rent
- **192** — Salary

**Worked example**
> Vendor bill ₹1,00,000 · TDS 194C @1% = ₹1,000 · Net payment ₹99,000

Net GST payable on GSTR-3B = **Total output tax − ITC available**.`,
    links: [{ label: "Taxation", moduleId: "taxation" }],
  },

  // ── Budget ────────────────────────────────────────────────────
  {
    id: "budget",
    title: "Budget",
    relatedModule: "budget",
    keywords: [
      "budget", "forecast", "plan", "target", "budget vs actual", "variance",
    ],
    summary: "Set budgets and compare actuals (budget vs actual).",
    body: `### Budget

Set **budgeted** income/expense per period and compare against **actuals**.

**Steps**
1. Open **Finance → Budget** → create a budget for a period/account.
2. Enter planned amounts.
3. The view shows **Budget vs Actual** and the **variance**.

Use it to control spending and track performance against plan.`,
    links: [{ label: "Budget", moduleId: "budget" }],
  },

  // ── Financial Reports ─────────────────────────────────────────
  {
    id: "financial-reports",
    title: "Financial Reports",
    relatedModule: "financial-reports",
    keywords: [
      "report", "reports", "financial report", "custom report", "export",
      "download excel", "trial balance", "balance sheet", "ageing", "aging",
      "vendor ageing", "customer ageing", "collection ageing", "0-30", "90+",
      "assets liabilities equity", "net worth", "cash flow",
    ],
    summary: "Balance Sheet, Vendor & Customer Ageing, cash flow, budget performance and tax compliance.",
    popular: true,
    body: `### Financial Reports

One dashboard with the core statements and analytics:

**Balance Sheet**
Full **Assets / Liabilities / Equity** statement built from the Chart of Accounts,
with a *Balanced* check that confirms Assets = Liabilities + Equity.

**Vendor Ageing** and **Customer / Collection Ageing**
Two separate reports (not one combined chart), each bucketing outstanding amounts into:

| Bucket | Meaning |
|---|---|
| **0–30 days** | Current |
| **31–60 days** | Watch |
| **61–90 days** | Chase |
| **90+ days** | Escalate |

Ageing is measured from each bill's **due date**, so keep due dates accurate on
AP and AR records.

**Also on this screen**
- Income Statement — revenue vs expenses by category
- Cash Flow Trend — monthly inflow vs outflow
- Budget Performance — planned vs actual, with utilisation bars
- Tax Compliance — paid vs pending, with overdue warnings`,
    links: [{ label: "Financial Reports", moduleId: "financial-reports" }],
  },

  // ── Site / Job / PO wise profitability ────────────────────────
  {
    id: "profitability-tagging",
    title: "Site, Job, PO & Customer-wise profitability",
    relatedModule: "fin-profit-loss",
    keywords: [
      "site wise", "job wise", "po wise", "customer wise", "profitability",
      "job code", "site code", "cost center", "costing", "tagging", "department wise",
      "project manager", "budget vs actual", "which fields are mandatory",
    ],
    summary: "The six tags that make Site/Job/PO/Customer-wise profitability possible.",
    popular: true,
    body: `### Site, Job, PO & Customer-wise profitability

Profitability analysis only works if transactions are **tagged** as they're entered.
Six fields do the work:

| Field | Used for |
|---|---|
| **Site Code** | Site-wise P&L and cost control |
| **Job Code** | Job-wise profitability |
| **PO Number** | PO-wise costing |
| **Cost Center** | Department/cost-centre analysis |
| **Department** | Department-wise costing |
| **Project Manager** | Accountability |

**Where to enter them**
- Maintain the list of valid job codes in **Finance → Master Data → Jobs (PO-wise)**
  — each job ties a unique **Job Code** to a Site and (optionally) the PO that funds it.
- **Invoices, Purchase Orders, Payment Advices, Petty Cash, Expense Claims,
  Credit Notes** — each has a **Site** dropdown and a **Job Code** field, plus
  Cost Center / Department / Project Manager.
- **Journal Entries** — Site and Party on the header; Job Code, PO, Cost Center,
  Department and Project Manager as costing tags.
- **AP / AR** — Site, linked Party and Job Code (AP also links the PO).

**Why it matters**
> Example: Material purchase ₹1,00,000 tagged \`SITE-001\` / \`JOB-2026-001\` / \`PO-125\`
> flows straight into that site's P&L, that job's cost sheet, and that PO's costing —
> no month-end reallocation needed.

**Note**
These costing tags are now **mandatory** on finance transactions — the system
won't save an invoice, payment, petty cash voucher, PO, expense claim or credit
note until they're tagged. Keep the **Jobs** master and **Sites** master up to
date so the tags are always selectable.`,
    links: [
      { label: "Profit & Loss", moduleId: "fin-profit-loss" },
      { label: "Financial Reports", moduleId: "financial-reports" },
    ],
  },

  // ── Sites (masters) ───────────────────────────────────────────
  {
    id: "sites",
    title: "Sites (master)",
    relatedModule: "fin-sites",
    keywords: [
      "site", "sites", "project", "location", "site master", "add site",
      "create site",
    ],
    summary: "Master list of sites/projects used by billing & expenses.",
    body: `### Sites

**Sites** are the projects/locations you bill against and book expenses to.

**Steps**
1. Open **Finance → Sites** → **New Site**.
2. Enter site name, code, client (party), and details.
3. Save. The site is now selectable in **Site Invoices** and **Site Expenses**.`,
    links: [
      { label: "Sites", moduleId: "fin-sites" },
      { label: "Parties", moduleId: "fin-parties" },
    ],
  },

  // ── Jobs (master) ─────────────────────────────────────────────
  {
    id: "jobs",
    title: "Jobs (PO-wise master)",
    relatedModule: "fin-jobs",
    keywords: [
      "job", "jobs", "job master", "job code", "create job", "add job",
      "po wise job", "job register", "job status", "active job",
      "new job", "job master data",
    ],
    summary: "Master list of jobs — each links a unique job code to a site and (optionally) the PO that funds it.",
    body: `### Jobs (PO-wise master)

**Jobs** are the work packages every transaction is tagged to via a **Job Code**.
Each job has one unique code (e.g. \`JOB-2026-006\`) and belongs to a **Site**.

**Steps**
1. Open **Finance → Master Data → Jobs (PO-wise)** → **New Job**.
2. Pick the **Site** the job runs at.
3. Optionally link the **Purchase Order** that funds the job.
4. Add a short **description** and set a **status** (Active / Completed / On Hold / Closed).
5. Save. Job codes are **auto-generated** (\`JOB-YYYY-NNN\`) if you leave the field blank.

**Why it matters**
When you enter an invoice, payment, petty cash, PO or expense claim, you tag the
**Job Code** — that's what powers Job-wise costing and profitability. Keep the
master list tidy: one job per work package, with the correct site and PO.`,
    links: [
      { label: "Jobs", moduleId: "fin-jobs" },
      { label: "Sites", moduleId: "fin-sites" },
    ],
  },

  // ── Parties (masters) ─────────────────────────────────────────
  {
    id: "parties",
    title: "Parties (clients / vendors)",
    relatedModule: "fin-parties",
    keywords: [
      "party", "parties", "client", "vendor", "supplier", "customer",
      "master", "gstin", "add party", "create party", "contact",
    ],
    summary: "Master list of clients, vendors, and suppliers with GSTIN.",
    body: `### Parties

**Parties** are everyone you do money with — **clients**, **vendors**, **suppliers**.

**Steps**
1. Open **Finance → Parties** → **New Party**.
2. Capture name, type (client/vendor), **GSTIN**, billing address, contact.
3. Save. The party is selectable in invoices, payments, AR/AP.

**Tips**
- A correct **GSTIN** is required for valid GST tax invoices.
- Keep one party record per legal entity to avoid duplicate ledgers.`,
    links: [{ label: "Parties", moduleId: "fin-parties" }],
  },

  // ── Workflows ─────────────────────────────────────────────────
  {
    id: "workflow-invoice-to-ledger",
    title: "Workflow: Invoice → Payment → Ledger",
    popular: true,
    keywords: [
      "workflow", "flow", "process", "end to end", "lifecycle", "how it flows",
      "invoice to payment", "invoice to ledger", "accounting flow",
      "double entry flow", "money flow",
    ],
    summary: "How an invoice flows through payment into the ledger.",
    body: `### Workflow: Invoice → Payment → Ledger

This is the core money-in flow:

1. **Raise invoice** (Site Invoices / Sales Tax Invoice)
   → posts **Revenue (credit)** and **Accounts Receivable (debit)**.
2. **Customer pays** → record a **Receipt** in Payment Center, allocated to that invoice
   → posts **Bank/Cash (debit)** and **Accounts Receivable (credit)** — the receivable closes.
3. **Ledger** now shows the revenue and the cash received, with AR back to zero.

The **mirror image** for vendors: **Vendor Bill → Payment → Ledger** (AP flow).

Every step is a double-entry posting, so the books always balance.`,
    links: [
      { label: "Site Invoices", moduleId: "fin-invoices" },
      { label: "Payment Center", moduleId: "fin-payments" },
      { label: "Open Ledger", moduleId: "ledger" },
    ],
  },

  // ── Procure-to-pay workflow ───────────────────────────────────
  {
    id: "workflow-procure-to-pay",
    title: "Workflow: Purchase Requisition → PO → Payment",
    popular: true,
    keywords: [
      "procure to pay", "p2p", "purchase requisition", "pr", "requisition",
      "rfq", "quotation", "grn", "purchase invoice", "purchase flow",
      "pr approval", "approve pr", "approval chain", "procurement workflow",
    ],
    summary: "The full procure-to-pay chain and how the PR approval workflow gates it.",
    body: `### Workflow: Purchase Requisition → Payment

The money-out chain, end to end:

\`\`\`
Purchase Request → RFQ → Quotation → PO → GRN
     → Purchase Invoice → Payment Advice → Payment
\`\`\`

**1. Purchase Requisition (PR)**
Raised by site staff for material they need. Every PR moves through a
**four-step approval chain** before it can become a PO:

\`\`\`
Draft ──submit──▶ Pending Approval ──▶ Approved
                        │
                        └──reject──▶ back to Draft
\`\`\`

| Step | Approver |
|---|---|
| 1 | Site Engineer |
| 2 | Project Manager |
| 3 | Procurement |
| 4 | Finance |

Open a PR and use **Submit for Approval**, then **Approve Next** / **Reject**.
Approvals are recorded in order with who acted and when. Rejecting **requires a
reason**, sends the PR back to Draft, and resetting the chain on resubmission —
so a reworked PR is re-approved from step 1.

**2. PO onward**
Once approved, convert to **RFQ** (to compare vendor bids) or straight to a **PO**.
Receive material against a **GRN**, book the **vendor bill** (AP), issue a
**Payment Advice**, then record the **Payment** — which posts
*Dr Vendor A/c · Cr Bank A/c* and closes the payable.

Tag **Site** and **Job Code** on the PO so the spend lands in the right
site/job cost sheet.`,
    links: [
      { label: "Purchase Requisitions", moduleId: "procurement-pr" },
      { label: "Purchase Orders", moduleId: "fin-purchase-orders" },
      { label: "Payment Advices", moduleId: "fin-payment-advices" },
    ],
  },

  // ── Tally Sync (CA-Grade) ──────────────────────────────────────
  {
    id: "tally-sync",
    title: "Tally Sync — CA-Grade (ERP ↔ Tally Prime)",
    relatedModule: "tally-sync",
    popular: true,
    keywords: [
      "tally", "tally sync", "tally prime", "erp9", "port 9000", "xml", "export to tally", "push to tally",
      "tally export", "tally auto", "scheduled sync", "on approve", "manual push", "dry run", "fy", "financial year",
      "gst", "tds", "cost centre", "bill wise", "idempotent", "alterid", "created altered rejected", "trial balance",
      "reconcile", "reconciliation", "gapless", "voucher series", "tally company", "tally ttl",
    ],
    summary: "Push ERP vouchers to Tally Prime — FY-locked, GST/TDS, cost-centre, bill-wise, idempotent, 3 triggers + Trial Balance reconcile.",
    body: `### Tally Sync — CA-Grade

**Where:** Finance → Tally Sync (4 tabs)

| Tab | What it does |
|---|---|
| **Export** | Choose masters (Debtors/Creditors) + vouchers (Sales/Purchase/Payment/Journal/GRN/Credit Note), pick FY (e.g. 2025-26) + Company + Since date, **DryRun** preview XML, then **Push to Tally** (port 9000). |
| **Auto** | **Manual** (button) + **Scheduled** (cron \`GET /api/fin/tally-auto?trigger=scheduled\`, reads SyncConfig autoSync) + **On Approve** (Journal Posted → auto via tally-sync-engine). Toggle Enabled/AutoSync in Sync Config. |
| **History** | FinTallySync log: direction, trigger, company, FY, voucherType, rows, status Completed/Failed, actor, AlterID, duration. |
| **Reconcile** | **Trial Balance ERP (Σ FinJournalLine by FinAccount) vs Tally Trial Balance** (EXPORTDATA Trial Balance). Shows diffs per ledger, blocks FY close if diff ≠0. |

**CA guarantees**
- **FY is law:** finYear derived Apr-Mar, voucher numbers gapless per FY+type via FinVoucherSeries (INV/25-26/0001).
- **Double-entry or nothing:** tally-xml validates Σ debit==credit (incl. CGST/SGST/IGST/Cess/TDS/Retention/RoundOff) or throws.
- **GST:** per-line HSN/SAC, CGST/SGST vs IGST by state, Output/Input CGST/SGST/IGST/Cess ledgers.
- **TDS:** 194C/194J via FinParty.tdsSection/Rate → TDS Payable/Receivable.
- **Cost centre:** every ledger line → COSTCENTREALLOCATIONS (jobCode/costCentre).
- **Bill-wise:** BILLALLOCATIONS New Ref/Agst Ref for ageing.
- **Idempotent:** hash + FinTallyVoucher (company+fy+type+no unique, AlterID) → re-push = ALTERED not duplicate.
- **RBAC:** GL_CREATE/AR_CREATE required; Auditor readOnly dryRun only.

**APIs**
- \`POST /api/fin/tally-export {companyName, finYear, actions, dryRun, trigger}\` — hardened manual
- \`GET /api/fin/tally-auto?dryRun=1&trigger=manual\` — scheduled (SyncConfig tally-export)
- \`GET /api/fin/tally-reconcile?finYear=2025-26&company=VoltCore\` — diff, FY/company

**Tips**
- Test with **DryRun** first, check XML preview (GSTIN/INCOMETAXNUMBER/LEDSTATENAME correct).
- Keep Tally company FY open; closed FY → 409 FY Locked.
- After push, open Reconcile — 0 diffs = TB clean for CA sign-off.`,
    links: [
      { label: "Tally Sync", moduleId: "tally-sync" },
      { label: "Financial Reports", moduleId: "financial-reports" },
    ],
  },

  // ── Notifications Ultra ────────────────────────────────────────
  {
    id: "notifications-ultra",
    title: "Notifications Ultra — Finance Purchase & Sales",
    relatedModule: "notifications-ultra",
    popular: true,
    keywords: [
      "notification", "notifications ultra", "alert", "bell", "inbox", "unread", "p0", "p1", "p2", "priority",
      "digest", "realtime", "hourly", "daily", "snooze", "escalate", "archive", "actioned", "sse", "live",
      "purchase", "sales", "invoice", "ap", "ar", "grn", "mrs", "tally", "journal", "fy", "site", "cost centre",
      "channel", "email", "whatsapp", "push",
    ],
    summary: "Your finance inbox — P0/P1/P2 alerts for invoices, AP, payments, POs, approvals, overdue items and Tally failures, with live updates.",
    body: `### Notifications Ultra

**Where:** Finance & Accounts → Notifications Ultra. The header bell shows a **Finance alerts** row with the unread count.

| Tab | What it does |
|---|---|
| **Inbox** | P0 red / P1 amber / P2 green. Filter by **status** (unread, read, actioned, snoozed, archived), priority, site and FY. Bulk **Read / Unread / Actioned / Snooze 1h / Archive**. **Open** jumps to the related screen. Live updates. |
| **Digest** | Realtime / Hourly / Daily / Off. **Off** stops new P1/P2 alerts for you; P0 always comes through. Hourly/Daily are stored for the email digest (email not connected yet). |
| **Preferences** | In-App / Email / WhatsApp toggles, saved per user. Turning In-App off stops P1/P2 alerts. Email & WhatsApp delivery are not connected yet. |

**Who gets what** (roles from Finance Access Control; users scoped to a site get that site's alerts, all-site users get every site)
| Event | Priority | Sent to |
|---|---|---|
| Invoice created | P1 | Finance Head + Finance Executive |
| Invoice overdue (daily) | P1, P0 at 45+ days | Finance Head + Finance Executive |
| Credit note issued | P1 | Finance Head + Finance Executive |
| AP bill created | P2, P1 if due within 7 days | Finance Head + Finance Executive |
| AP bill paid / payment made | P2 | Finance Head + Finance Executive |
| AP bill overdue (daily) | P1, P0 at 45+ days (MSME) | Finance Head + Finance Executive |
| Purchase order / expense claim created | P2 | Finance Head + Finance Executive |
| Journal submitted | P1 | Finance Head |
| Journal approved / rejected | P2 / P1 | The submitter |
| Petty cash or site expense submitted | P1 | Site Manager + Finance Executive + Finance Head |
| Petty cash or site expense approved / rejected | P2 / P1 | The submitter |
| Tally auto-push failed | P0 | Finance Head |

You never get an alert for your own action.

**Setup**
- Assign people to roles in **Finance Access Control** — no role, no alerts.
- Optional: \`npx tsx scripts/seed-fin-notification-templates.ts\` creates editable wording templates (FinNotificationTemplate).
- Optional: call \`/api/cron/fin-overdue\` daily with the \`x-cron-key\` header. Overdue checks also run hourly when someone opens the inbox.

**APIs** (always the signed-in user's inbox)
- \`GET /api/notifications/ultra?status=unread&priority=P0&siteCode=SITE-004&finYear=2025-26\`
- \`POST /api/notifications/ultra {action: read|unread|actioned|snooze|escalate|archive, ids:[]}\`
- \`GET/PUT /api/notifications/ultra/preferences\`
- \`GET /api/notifications/stream\` — live updates`,
    links: [
      { label: "Notifications Ultra", moduleId: "notifications-ultra" },
      { label: "Tally Sync", moduleId: "tally-sync" },
      { label: "Financial Reports", moduleId: "financial-reports" },
    ],
  },

  // ── Contact / about ───────────────────────────────────────────
  {
    id: "about",
    title: "About this helper",
    keywords: [
      "help", "about", "what is this", "chatbot", "assistant", "who",
      "this bot", "guide", "support",
    ],
    summary: "What this helper does and how to use it.",
    body: `### Finance Help

I'm a **self-contained finance guide** for this ERP. I answer questions about:

- **How to use each finance feature** (invoices, payments, journals, AR/AP…)
- **Finance workflows & concepts** (invoice→payment→ledger, GST, reconciliation)

**How to ask**
- Type naturally, e.g. *"how do I print a GST invoice"* or *"what is AR"*.
- Click a **suggested question** to start.
- Use the **Open …** chips to jump straight to a module.

If I can't find a match, I'll suggest popular topics. This helper is scoped to
**Finance only**.`,
  },
];

/** Subset shown as starting suggestions / fallback. */
export const POPULAR_HELP_IDS = FINANCE_HELP_ENTRIES
  .filter((e) => e.popular)
  .map((e) => e.id);
