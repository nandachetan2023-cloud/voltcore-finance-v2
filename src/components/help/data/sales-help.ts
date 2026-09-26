/**
 * Sales & Billing Help — Knowledge Base
 * Covers the Sales & Billing menu and the Sales & BD menu.
 */

import type { HelpEntry } from '../finance-help-data';

export const SALES_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'sales-overview',
    title: "What's in Sales & Billing?",
    popular: true,
    relatedModule: 'sales-billing',
    keywords: [
      'sales', 'billing', 'overview', 'menu', 'sections', 'what is', 'features', 'where is',
      'navigate', 'business development', 'bd',
    ],
    summary: 'Map of the sales, billing and business-development screens.',
    body: `### Sales & Billing / Sales & BD

**🧾 Billing**
- **Quotations** — price offers to customers
- **Sales Orders** — confirmed customer orders
- **RA %-Work Billing** — running-account bills by % of work done
- **Tax Invoices** — GST-compliant invoices
- **Receipt Entry** — money received against invoices
- **Credit Notes** — reduce an invoice (Finance)

**📈 Business development**
- **Opportunity Pipeline** — Kanban of leads by stage
- **Tender Register** — tenders and their outcome
- **Revenue Forecast** — weighted pipeline projections
- **Client Accounts** — client contacts, projects and opportunities

Typical flow: **Quotation → Sales Order → Tax Invoice / RA Bill → Receipt**.`,
    links: [
      { label: 'Quotations', moduleId: 'sales-quotations' },
      { label: 'Tax Invoices', moduleId: 'sales-tax-invoices' },
      { label: 'Opportunity Pipeline', moduleId: 'sales-opportunity-pipeline' },
    ],
  },
  {
    id: 'sales-workflow',
    title: 'Quote-to-cash flow, step by step',
    popular: true,
    relatedModule: 'sales-quotations',
    keywords: [
      'workflow', 'flow', 'process', 'quote to cash', 'steps', 'end to end', 'order to cash',
      'how does billing work',
    ],
    summary: 'Quotation → order → invoice → receipt.',
    body: `### Quote-to-cash

1. **Quotation** — save as Draft, then **Submit** it to the customer.
2. **Sales Order** — once accepted, raise the order (Draft → Submitted → Confirmed).
3. **Invoice** — raise a **Tax Invoice**, or for running contracts an **RA bill** by % of work done.
4. **Receipt** — record the payment against the invoice in **Receipt Entry**.
5. Corrections go through a **Credit Note**.

Invoices and receipts post to Accounts Receivable and the ledger.`,
    links: [
      { label: 'Accounts Receivable', moduleId: 'accounts-receivable' },
      { label: 'Credit Notes', moduleId: 'fin-credit-notes' },
    ],
  },
  {
    id: 'sales-quotations',
    title: 'Creating a quotation',
    relatedModule: 'sales-quotations',
    keywords: [
      'quotation', 'quotations', 'quote', 'new quotation', 'valid until', 'draft',
      'submit quotation', 'offer', 'estimate',
    ],
    summary: 'Draft, submit and track quotations.',
    body: `### Quotations

1. **Sales Quotations → New Quotation**.
2. Pick the **Customer**, the **Quotation Date** and **Valid Until**.
3. Add line items and totals.
4. Choose **Save as Draft** to keep editing, or **Submit** to send it.

The header cards show **Total Quotations**, **Draft**, **Submitted / Accepted** and **Total Amount**. Use **Import** to bulk-load quotations.`,
  },
  {
    id: 'sales-orders',
    title: 'Creating a sales order',
    relatedModule: 'sales-orders',
    keywords: [
      'sales order', 'sales orders', 'so', 'new order', 'customer order', 'confirmed',
      'order status', 'line items',
    ],
    summary: 'Create orders and move them Draft → Submitted → Confirmed.',
    body: `### Sales Orders

1. **Sales Orders → New Order**.
2. Choose the **Customer** and **SO Date**, and set the **Status** (*Draft*, *Submitted*, *Confirmed*).
3. Under **Line Items** use **Add Item** — pick an item, qty and rate; the amount is calculated.
4. Save.

Cards on top show **Total Orders**, **Total Value**, **Draft** and **Submitted / Confirmed**. **Import** loads orders in bulk.`,
  },
  {
    id: 'sales-ra',
    title: 'Running-account (RA) billing by % of work',
    relatedModule: 'ra-work-slider',
    popular: true,
    keywords: [
      'ra', 'ra bill', 'running account', 'percent work', '% work', 'work slider',
      'withholding', 'retention', 'net receivable', 'progress billing', 'previous billed',
    ],
    summary: 'Slide % work complete to raise an RA bill against a job/PO.',
    body: `### RA %-Work Billing

1. **New RA** and select the **Job** — its **Job Code**, **Site** and **PO Total (₹)** fill in, with **Prev Billed %**.
2. Slide the **% work complete** to the cumulative progress.
3. Enter **Withholding %** if retention applies.
4. The screen shows the **Bill Amount**, **Withholding** and **Net Receivable**.
5. **Raise RA** to create the bill.

Only the increment over *Prev Billed %* is billed each time.`,
  },
  {
    id: 'sales-tax-invoices',
    title: 'Creating a GST tax invoice',
    popular: true,
    relatedModule: 'sales-tax-invoices',
    keywords: [
      'tax invoice', 'invoice', 'gst invoice', 'create invoice', 'cgst', 'sgst', 'igst',
      'hsn', 'sac', 'place of supply', 'intra state', 'inter state', 'draft', 'sales invoice',
    ],
    summary: 'GST-compliant invoices with CGST/SGST/IGST.',
    body: `### Tax Invoices

1. **Tax Invoices → Create Tax Invoice**.
2. Choose the **Customer** (required) and **Invoice Date** (required); set **Invoice No** and **Place of Supply**.
3. Pick the **GST Type**:
   - **Intra-State** → CGST 9% + SGST 9%
   - **Inter-State** → IGST 18%
4. **Add Item** rows: description, **HSN/SAC**, UOM, qty, rate, GST. Totals show *Taxable*, *CGST+SGST* or *IGST*, and *Grand Total*.
5. **Save Draft** to keep editing, or submit it.

The list shows each invoice with any **Credit Notes** raised against it.`,
    links: [{ label: 'Credit Notes', moduleId: 'fin-credit-notes' }],
  },
  {
    id: 'sales-receipts',
    title: 'Recording a customer receipt',
    relatedModule: 'receipt-entry',
    keywords: [
      'receipt', 'receipt entry', 'payment received', 'money received', 'collection',
      'customer payment', 'mode', 'cheque', 'neft', 'record receipt',
    ],
    summary: 'Record money received against customer invoices.',
    body: `### Receipt Entry

1. **Receipt Entry → New Receipt**.
2. Select the invoice/customer, the **Mode** (cash, cheque, transfer…), the **Bank / Ref** and the **Job Code**, and the amount.
3. Save — the **Total Receipts** figure updates and Accounts Receivable reduces.

Chase overdue amounts from **Finance → Client Follow Up**.`,
    links: [{ label: 'Client Follow Up', moduleId: 'fin-client-follow-up' }],
  },
  {
    id: 'sales-pipeline',
    title: 'Opportunity pipeline (Kanban)',
    relatedModule: 'sales-opportunity-pipeline',
    keywords: [
      'opportunity', 'pipeline', 'opportunities', 'lead', 'leads', 'kanban', 'stage',
      'win probability', 'weighted', 'win rate', 'bd owner', 'add opportunity', 'drag',
    ],
    summary: 'Track leads by stage with win probability and weighted value.',
    body: `### Opportunity Pipeline

1. **Add Opportunity** — **Project Name**, **Client Name**, **Value**, **Win Probability (%)**, **Due Date**, **BD Owner** and **Scope**.
2. Cards sit in stage columns; **drag a card** to another column to move its stage.
3. Header KPIs: **Win Rate**, **Weighted Pipeline**, **Active Opportunities** and **Overdue Decisions** (past due date, not won/lost).
4. **Pipeline Value by Stage** charts where the value sits.

The opportunity scorecard covers *Budget Available*, *Technical Capability*, *Resource Available* and *Strategic Fit*.`,
    links: [{ label: 'Revenue Forecast', moduleId: 'sales-revenue-forecast' }],
  },
  {
    id: 'sales-tenders',
    title: 'Tender register',
    relatedModule: 'sales-tender-register',
    keywords: [
      'tender', 'tenders', 'tender register', 'rft', 'bid', 'submission deadline', 'estimator',
      'won', 'lost', 'sector', 'new tender', 'win loss',
    ],
    summary: 'Log tenders and analyse win/loss.',
    body: `### Tender Register

- **New Tender** — **Tender No**, **Client**, **Project**, **Sector**, **RFT Issue Date**, **Submission Deadline**, **Estimated Value**, **Estimator**, status, description.
- Dashboard cards: **Active Tenders**, **Submitted**, **Won**, **Total Value**.
- Charts: **Tender Pipeline**, **Sector Distribution**, **Estimator Workload**, **Top Clients by Value** and a **Win / Loss Summary** with **Win Rate** and **Won Value**.
- **Import** loads tenders in bulk.`,
  },
  {
    id: 'sales-forecast',
    title: 'Revenue forecast',
    relatedModule: 'sales-revenue-forecast',
    keywords: [
      'revenue forecast', 'forecast', 'projection', 'weighted pipeline', 'expected close',
      'conversion rate', 'monthly revenue', 'target', 'actual',
    ],
    summary: 'Weighted pipeline projections vs target.',
    body: `### Revenue Forecast

Built from the **Opportunity Pipeline**:

- **Total Pipeline**, **Weighted Pipeline**, **Expected Close (Q)** and **Conversion Rate** cards.
- **Monthly Revenue Forecast (Weighted)** — *Actual* vs *Target*, in ₹ Cr.
- A table of **Pipeline Opportunities** you can filter by **sector** (Power, Mining, Industrial…) and **stage**.
- **Weighted Value by Sector** and **Value by Stage** charts.

Keep opportunity values and win probabilities up to date for a meaningful forecast.`,
  },
  {
    id: 'sales-clients',
    title: 'Client accounts',
    relatedModule: 'sales-client-accounts',
    keywords: [
      'client', 'clients', 'client accounts', 'contacts', 'contact directory', 'account',
      'past projects', 'strength', 'relationship', 'add contact', 'new client',
    ],
    summary: 'Client profile with contacts, past projects and opportunities.',
    body: `### Client Accounts

Select a client on the left to see:

- **Won Value**, **Active Opps**, **Past Projects**, **Last Contact**
- **Contact Directory** — name, role, phone, email, relationship **strength**; use **Add Contact**
- **Past Projects Timeline**
- **Active Opportunities** — stage, value, win probability, expected close and BD owner, with total and weighted value

**New Client** creates one with **sector**, **website** and notes.`,
  },
  {
    id: 'sales-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Sales Help

I'm a **self-contained guide** for Sales & Billing. Ask *"how do I raise an RA bill"* or *"how is weighted pipeline calculated"*, or tap a suggestion. Use the **Open module** chips to jump to a screen.`,
  },
];
