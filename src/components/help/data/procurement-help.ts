/**
 * Procurement & Purchase Help — Knowledge Base
 * Covers the Procurement and Purchase menus (PR → RFQ → PO → GRN → bill).
 */

import type { HelpEntry } from '../finance-help-data';

export const PROCUREMENT_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'proc-overview',
    title: "What's in Procurement & Purchase?",
    popular: true,
    relatedModule: 'procurement',
    keywords: [
      'procurement', 'purchase', 'overview', 'menu', 'sections', 'what is', 'features',
      'where is', 'list', 'navigate',
    ],
    summary: 'Map of the procurement and purchase screens.',
    body: `### Procurement & Purchase

**📝 Request & source**
- **Purchase Requisition** — raise and approve material requests
- **RFQ Management** — invite vendors, record bids, award
- **Quotation Comparison** — line-by-line bid comparison

**🛒 Order**
- **PO Register** — all purchase orders with filters, preview and PDF
- **PO Approval** — step a PO through its approval stages
- **Purchase Orders** — quick register to raise a PO

**📦 Receive & pay**
- **GRN 3-Way Match** — PO vs goods received vs invoice
- **Material Tracking** — deliveries, transit and site stock
- **Purchase Bills (AP)** — vendor bills (Finance & Accounts)

**🤝 Vendors & contracts**
- **Vendor Management** — vendor directory, rating, compliance
- **Subcontract Register** — subcontracts and progress claims
- **Expenses** — expense claims

The typical flow is **PR → RFQ → PO → GRN → Bill → Payment**.`,
    links: [
      { label: 'Purchase Requisition', moduleId: 'procurement-pr' },
      { label: 'RFQ Management', moduleId: 'procurement-rfq' },
      { label: 'PO Register', moduleId: 'procurement-po-register' },
    ],
  },
  {
    id: 'proc-workflow',
    title: 'Procure-to-pay flow, step by step',
    popular: true,
    relatedModule: 'procurement-pr',
    keywords: [
      'workflow', 'flow', 'process', 'procure to pay', 'p2p', 'steps', 'end to end',
      'how does purchasing work', 'lifecycle', 'pr to po',
    ],
    summary: 'PR → RFQ → PO → GRN → bill → payment.',
    body: `### Procure-to-pay

1. **Purchase Requisition** — a site engineer raises a PR; it goes through approval.
2. **RFQ** — invite vendors, record each vendor's bid, compare, and **award** (this creates the PO).
3. **Purchase Order** — approve the PO (Draft → Pending Approval → Approved → Converted).
4. **GRN** — record goods received against the PO (Inventory → Material Receipt / Site Store).
5. **3-Way Match** — check PO qty vs GRN qty vs invoice; fix short receipts and variances.
6. **Bill & payment** — post the vendor bill in Accounts Payable and pay from the Payment Center.

Each step links back to the same **project / job**, so cost tracking stays intact.`,
    links: [
      { label: 'GRN 3-Way Match', moduleId: 'grn-3way-match' },
      { label: 'Accounts Payable', moduleId: 'accounts-payable' },
    ],
  },
  {
    id: 'proc-pr',
    title: 'Raising a Purchase Requisition (PR)',
    popular: true,
    relatedModule: 'procurement-pr',
    keywords: [
      'pr', 'purchase requisition', 'requisition', 'raise pr', 'new pr', 'material request',
      'requisition register', 'approve pr', 'upload excel', 'bulk upload', 'template', 'wbs',
    ],
    summary: 'Create, approve and bulk-import purchase requisitions.',
    body: `### Purchase Requisitions

1. Open **Procurement → Purchase Requisition** → **New PR**.
2. Fill **Requester** and **Project / WBS** (required) and **Required On-Site By**.
3. Under **Line Items** use **Add Item** — description, qty, unit and estimated cost; the **Total Est. Cost** updates.
4. Save. The PR appears in the **Requisition Register** as *Draft*.

**Approval**
Open a PR to see its **Approval Workflow** — Site Engineer → Project Manager → Procurement → Finance. Approvers use **Approve Next** or **Reject** (a rejection needs a reason).

**Statuses:** Draft · Pending Approval · Approved · Converted.

**Bulk upload** — *Upload Excel* accepts an .xlsx that matches the template; use **Download Template** first. **Print** gives a printable PR.`,
    links: [{ label: 'RFQ Management', moduleId: 'procurement-rfq' }],
  },
  {
    id: 'proc-rfq',
    title: 'RFQs — inviting vendors, bids and awarding',
    popular: true,
    relatedModule: 'procurement-rfq',
    keywords: [
      'rfq', 'request for quotation', 'quotation', 'quote', 'vendor bids', 'bid', 'bids',
      'award', 'awarded', 'invite vendors', 'bid comparison', 'lowest price', 'compare',
    ],
    summary: 'Create an RFQ, record vendor bids, compare and award.',
    body: `### RFQ Management

1. **New RFQ** — enter the description, project, issue date and **response deadline**, then add line items (description, qty, unit).
2. Open the RFQ and go through its tabs:
   - **Line Items** — what you are asking for
   - **Invited Vendors** — who received it
   - **Vendor Bids** — enter each vendor's unit price, lead time and compliance
   - **Bid Comparison** — totals per vendor with the **Best Price** highlighted and a *Recommended* vendor
3. When you're happy, **Confirm Purchase Order** — the RFQ is marked **Awarded** and a **Purchase Order** is created for that vendor.

**Statuses:** Draft · Sent · Responses In · Awarded.

The **Quotation Comparison** screen shows the same bids as a line-by-line matrix with the lowest compliant bid highlighted.`,
    links: [{ label: 'Quotation Comparison', moduleId: 'rfq-comparison-matrix' }],
  },
  {
    id: 'proc-comparison',
    title: 'Quotation comparison matrix',
    relatedModule: 'rfq-comparison-matrix',
    keywords: [
      'comparison', 'matrix', 'quotation comparison', 'compare vendors', 'lowest compliant',
      'cs', 'comparative statement', 'bid matrix',
    ],
    summary: 'Compare vendor bids line by line.',
    body: `### Quotation Comparison

1. Open **Purchase → Quotation Comparison**.
2. Choose an RFQ under **Select RFQ**.
3. The matrix lists each **Line Item** against every vendor's **total (qty × rate)**; the **lowest compliant bid** is highlighted.

If it says *"No bids recorded for this RFQ yet"*, enter bids in **RFQ Management → Vendor Bids** first.`,
  },
  {
    id: 'proc-po-register',
    title: 'PO Register — find, preview and print purchase orders',
    relatedModule: 'procurement-po-register',
    keywords: [
      'po register', 'po', 'purchase order', 'purchase orders', 'register', 'print po',
      'pdf', 'overdue delivery', 'ready to pay', 'new po', 'gst', 'cgst', 'sgst',
    ],
    summary: 'Filter POs, preview the document and print/save as PDF.',
    body: `### Purchase Order Register

- **New PO** to create one; each PO carries a **site code** and **job code**.
- Filter by **Project**, **Vendor** and **Status**, or tick **Overdue Deliveries Only** / **Ready to Pay**.
- Open a PO for details: vendor, project, status, total value, required date, delivery address.
- **Preview** shows the formal Purchase Order document with subtotal, **CGST/SGST** and grand total — use **Print / Save PDF**.

**Delivery status:** Full · Partial · Pending · Overdue.`,
    links: [{ label: 'PO Approval', moduleId: 'po-approval-stepper' }],
  },
  {
    id: 'proc-po-approval',
    title: 'PO approval stepper',
    relatedModule: 'po-approval-stepper',
    keywords: [
      'po approval', 'approve po', 'approval', 'stepper', 'pending approval', 'converted',
      'draft', 'advance po', 'approval stage',
    ],
    summary: 'Walk a PO from Draft to Converted.',
    body: `### PO Approval

Select a purchase order on the left and advance it through:

**Draft → Pending Approval → Approved → Converted**

- **New PO** creates one (vendor, description, job, amount).
- The stepper highlights the current stage; use the action button to move it forward.
- Once **Converted**, the PO is ready for receiving goods and billing.`,
  },
  {
    id: 'proc-purchases',
    title: 'Raising a quick Purchase Order',
    relatedModule: 'purchases',
    keywords: [
      'raise po', 'new purchase order', 'purchase order register', 'grn status', 'po status',
      'vendor', 'delivery date', 'delete po', 'create po',
    ],
    summary: 'Raise a PO with vendor, item, amount, delivery date and project.',
    body: `### Purchase Order Register

1. **Procurement → Purchase Orders** → **Raise PO**.
2. Enter **Vendor**, **Item**, **Amount (₹)**, **Delivery Date** and **Project** — all required.
3. Save. The register shows **PO Status** and **GRN Status** per row.

Delete a PO from its row — confirm the prompt (it can't be undone).`,
  },
  {
    id: 'proc-grn',
    title: 'GRN 3-way match',
    relatedModule: 'grn-3way-match',
    keywords: [
      '3 way', '3-way', 'three way', 'grn', 'goods receipt', 'match', 'short receipt',
      'variance', 'exceptions', 'invoice mismatch', 'received quantity',
    ],
    summary: 'Compare PO qty, GRN qty and invoice; flag exceptions.',
    body: `### GRN 3-Way Match

Compares **PO quantity vs goods received (GRN) vs invoice** for each line.

- Toggle **All** / **Exceptions** to see only problem lines.
- Lines flagged **Short** were received in a smaller quantity than ordered.
- Resolve exceptions (record the missing receipt, or correct the invoice) before paying the bill.

If the list is empty it says *"No lines to match"* — post a GRN first (Inventory → Material Receipt).`,
    links: [{ label: 'Material Receipt', moduleId: 'material-receipt' }],
  },
  {
    id: 'proc-vendors',
    title: 'Vendor management',
    relatedModule: 'procurement-vendors',
    keywords: [
      'vendor', 'vendors', 'supplier', 'vendor master', 'new vendor', 'preferred',
      'blacklisted', 'rating', 'compliance', 'otd', 'on time delivery', 'contact person',
    ],
    summary: 'Vendor directory with rating, compliance and on-time delivery.',
    body: `### Vendor Management

The **Vendor Directory** lists vendors with **Region**, **Rating**, **Compliance** and **OTD** (on-time delivery).

- **New Vendor** — name (required), contact person, phone, email, address, notes.
- Mark a vendor **Preferred** or **Blacklisted** to steer buying decisions.
- **Compliance** shows document validity: Valid · Expiring · Expired.

For GST/PAN/TDS details on a party, use **Master Setup → Clients & Vendors**.`,
    links: [{ label: 'Clients & Vendors', moduleId: 'fin-parties' }],
  },
  {
    id: 'proc-material-tracking',
    title: 'Material tracking',
    relatedModule: 'procurement-material-tracking',
    keywords: [
      'material tracking', 'materials', 'delivery', 'in transit', 'site stock', 'overdue',
      'on time', 'upcoming', 'timeline', 'expected date', 'dashboard',
    ],
    summary: 'Track PO deliveries, in-transit quantities and site stock.',
    body: `### Material Tracking

Two views: **List** and **Dashboard**.

- **New Entry** — PO no., material, category, vendor, project, site, unit, qty required / in stock / in transit, scheduled & expected dates.
- Filter by **project**, **site** and **status** — *Overdue*, *On-Time*, *Upcoming*.
- **Dashboard** shows total POs monitored, on-time deliveries, overdue POs, site stock items, an **Overdue PO alerts** list and the delivery timeline.`,
  },
  {
    id: 'proc-subcontracts',
    title: 'Subcontract register & progress claims',
    relatedModule: 'procurement-subcontracts',
    keywords: [
      'subcontract', 'subcontracts', 'subcontractor', 'contract', 'progress claim',
      'claim', 'retention', 'scope', '% complete', 'work done',
    ],
    summary: 'Track subcontracts, retention and progress claims.',
    body: `### Subcontract Register

- **New Subcontract** — subcontract no., vendor/contractor, project/site, scope summary, value, start & end dates, **retention %**, status.
- Open a subcontract to see **% Complete**, scope and retention held.
- **New Progress Claim** — claim no., date and amount claimed; submit it against the subcontract.

For contractor compliance (PF/ESI/licences) see **Assets → Subcontractors**.`,
    links: [{ label: 'Subcontractors', moduleId: 'subcontractors' }],
  },
  {
    id: 'proc-expenses',
    title: 'Expense claims',
    relatedModule: 'expenses',
    keywords: [
      'expense', 'expenses', 'expense claim', 'claim', 'reimbursement', 'new claim',
      'reject claim', 'approve claim', 'category',
    ],
    summary: 'Submit and approve expense claims.',
    body: `### Expense Claims

1. **Expenses → New Claim**.
2. Pick the **Site**, **Category**, **Amount (₹)** and **Date** (all required); add a **Job Code** if the cost belongs to a job. *Submitted By* fills from your login.
3. Submit — an approver can **approve** or **reject** it from the list.

Booked claims flow into the Finance module's Expense Claims and Site Expenses.`,
    links: [{ label: 'Finance Expense Claims', moduleId: 'fin-expense-claims' }],
  },
  {
    id: 'proc-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Procurement Help

I'm a **self-contained guide** for Procurement & Purchase. Ask *"how do I award an RFQ"* or *"what is a 3-way match"*, or tap a suggested question. Use the **Open module** chips to jump to a screen.`,
  },
];
