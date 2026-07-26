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

**🏢 Masters**
- Sites — project/site master data
- Parties — clients, vendors, suppliers

**🧾 Billing**
- Site Invoices — raise invoices against sites
- Work Orders — work-order records

**💰 Cash**
- Payment Center — record & allocate payments
- Petty Cash — small cash entries
- Payment Advices — payment advice records
- Expense Claims — staff reimbursements
- Site Expenses — expenses booked to a site
- Bank Reconciliation — match bank to books

**📦 Assets**
- Fixed Assets — asset register & depreciation

**📈 Reports**
- Profit & Loss — P&L statement
- Financial Reports — configurable reports

**⚙️ Accounting (top-level)**
- Ledger, Accounts Receivable, Accounts Payable,
  Journal Entries, Bank & Cash, Taxation, Budget

**🔗 Integrations**
- Tally Sync, Sync Config

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
      "office expenses", "cash expense", "petty cash book",
    ],
    summary: "Record small day-to-day cash expenses and top-ups.",
    body: `### Petty Cash

Petty Cash tracks small, day-to-day expenses paid in cash (tea, courier, postage, etc.).

**Steps**
1. Open **Finance → Petty Cash** → **New Entry**.
2. Choose **Expense** (money out) or **Top-up** (cash added to the box).
3. Enter date, amount, category, and a note.
4. Save → reduces/increases the petty cash balance.

**Tips**
- Set a float limit; top up when the box runs low.
- Reconcile the physical cash count periodically.`,
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
      "itc", "tax payable", "gst return", "tds",
    ],
    summary: "Review GST collected (output) vs paid (input/ITC).",
    body: `### Taxation

The Taxation view summarises **GST** position:
- **Output tax** — GST collected on sales invoices
- **Input tax (ITC)** — GST paid on purchases
- **Net payable** = Output − Input

Use it to prepare GST returns. Make sure every invoice/bill has the correct
**GST rate** and the party's **GSTIN** is recorded.`,
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
      "download excel", "trial balance", "balance sheet",
    ],
    summary: "Generate configurable reports and export to Excel.",
    body: `### Financial Reports

Configurable finance reports (Trial Balance, Balance Sheet, custom summaries).

**Steps**
1. Open **Finance → Financial Reports**.
2. Choose the report type and period/filters.
3. View on screen → **Export to Excel/PDF** as needed.`,
    links: [{ label: "Financial Reports", moduleId: "financial-reports" }],
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

  // ── Tally Sync ────────────────────────────────────────────────
  {
    id: "tally-sync",
    title: "Tally Sync",
    relatedModule: "fin-tally-sync",
    keywords: [
      "tally", "sync", "tally sync", "export to tally", "integration",
      "accounting software", "push to tally",
    ],
    summary: "Push finance vouchers into Tally for external accounting.",
    body: `### Tally Sync

Pushes vouchers (invoices, payments, journals) from this app into **Tally** so
your accountant can keep Tally books in sync.

**Steps**
1. Configure the connection in **Finance → Sync Config** (Tally URL / company).
2. Open **Finance → Tally Sync**, pick a date range, and **Sync**.
3. Review the sync log for successes/failures.

**Tips**
- Sync in small batches when first setting up.
- Re-run after fixing any failing vouchers.`,
    links: [
      { label: "Tally Sync", moduleId: "fin-tally-sync" },
      { label: "Sync Config", moduleId: "fin-sync-config" },
    ],
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
