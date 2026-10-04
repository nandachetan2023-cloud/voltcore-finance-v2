/**
 * Inventory Help — Knowledge Base
 * Covers the Inventory menu: site store, receipts, issues to WIP, stock ledger, scrap.
 */

import type { HelpEntry } from '../finance-help-data';

export const INVENTORY_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'inv-overview',
    title: "What's in the Inventory module?",
    popular: true,
    relatedModule: 'inventory',
    keywords: [
      'inventory', 'stock', 'store', 'overview', 'menu', 'sections', 'what is', 'features',
      'where is', 'navigate',
    ],
    summary: 'Map of the inventory screens.',
    body: `### Inventory module

- **Site Store Management** — the all-in-one store desk: GRN, MRS & issue, returns, tools, gate pass, equipment, scrap and physical verification
- **Material Receipt** — goods receipt against purchase orders into stock
- **Material Issue → WIP** — issue material to a job and post it to work-in-progress
- **Stock Ledger** — every stock in/out posting
- **Scrap Entry** — record scrap disposal and credit it out of stock

Stock comes **in** through receipts and **out** through issues, returns and scrap; the **Stock Ledger** is the running record of all of it.`,
    links: [
      { label: 'Site Store', moduleId: 'site-store' },
      { label: 'Stock Ledger', moduleId: 'stock-ledger' },
    ],
  },
  {
    id: 'inv-site-store',
    title: 'Using Site Store Management',
    popular: true,
    relatedModule: 'site-store',
    keywords: [
      'site store', 'store', 'grn', 'mrs', 'issue', 'returns', 'tool register', 'tools',
      'gate pass', 'equipment', 'scrap register', 'physical verification', 'monthly report',
      'material requisition', 'store keeper',
    ],
    summary: 'Tabs for GRN, MRS-gated issue, returns, tools, gate pass and more.',
    body: `### Site Store Management

One screen with a tab per store activity:

| Tab | Use it to |
|---|---|
| **GRN** | receive goods — pick site, job, PO, vendor, invoice no. |
| **MRS & Issue** | raise a Material Requisition Slip and issue material against it |
| **Returns** | take material back into the store |
| **Tool Register** | issue tools and record their condition on return |
| **Gate Pass** | record materials leaving the site |
| **Equipment** | equipment movements |
| **Scrap Register** | log scrap |
| **Physical Verification** | reconcile counted stock to book stock |
| **Monthly Report** | month-end store summary |

**Important:** material can only be issued against an **Approved MRS**. If an issue is blocked, check the requisition's status first.`,
  },
  {
    id: 'inv-receipt',
    title: 'Recording a material receipt (GRN)',
    relatedModule: 'material-receipt',
    keywords: [
      'material receipt', 'receipt', 'grn', 'goods receipt', 'receive goods', 'received',
      'qty received', 'receipt value', 'against po',
    ],
    summary: 'Receive goods against a PO into stock.',
    body: `### Material Receipt

1. **Inventory → Material Receipt** → **New Receipt**.
2. Link the **PO**, then enter **Qty Received**, **Unit**, **Rate (₹)** and the **Job Code**.
3. Save — the **Receipt Value** is calculated and stock increases.

Short receipts show up as exceptions in **Purchase → GRN 3-Way Match**.`,
    links: [{ label: 'GRN 3-Way Match', moduleId: 'grn-3way-match' }],
  },
  {
    id: 'inv-issue-wip',
    title: 'Issuing material to a job (WIP)',
    relatedModule: 'material-issue-wip',
    keywords: [
      'issue material', 'issue material job', 'material job', 'material issue', 'wip', 'work in progress', 'issue to job',
      'job wip', 'wip account', 'consumption',
    ],
    summary: 'Issue stock to a job and post it to WIP.',
    body: `### Material Issue → Job WIP

1. **Inventory → Material Issue → WIP** → **Issue Material**.
2. Enter **Job Code / Job Name**, **Material Description**, **Item Code**, **Qty**, **Unit**, **Rate**, **Site** and the **WIP Account**.
3. Save — the amount is posted to WIP and the **Stock Ledger** is updated.

The screen totals **WIP (Posted)** and lists **Job-wise WIP Postings**.`,
    links: [{ label: 'Stock Ledger', moduleId: 'stock-ledger' }],
  },
  {
    id: 'inv-stock-ledger',
    title: 'Stock ledger and manual stock entries',
    relatedModule: 'stock-ledger',
    keywords: [
      'stock ledger', 'stock', 'post entry', 'stock entry', 'qty in', 'qty out', 'balance',
      'item code', 'opening stock', 'adjustment',
    ],
    summary: 'See every stock movement or post a manual entry.',
    body: `### Stock Ledger

Every stock movement — receipts, issues, returns, scrap — is listed with **Qty In**, **Qty Out**, **Rate** and **Job**.

**Post Entry** adds a manual posting: **Item Code**, **Item Name**, **Unit**, **Type**, **Qty**, **Rate** and **Job**. Use it for opening stock or corrections.

*"No stock postings"* means nothing has been received or issued yet.`,
  },
  {
    id: 'inv-scrap',
    title: 'Recording scrap disposal',
    relatedModule: 'scrap-entry',
    keywords: [
      'scrap', 'scrap entry', 'dispose', 'disposal', 'scrap value', 'realisable', 'waste',
      'record scrap',
    ],
    summary: 'Record scrap and credit it out of stock.',
    body: `### Scrap Entry

1. **Inventory → Scrap Entry** → **Record Scrap**.
2. Enter **Item Code**, **Item Name**, **Scrap Qty**, **Unit**, **Rate (₹)** and **Remarks**.
3. Save — the quantity is credited out of stock.

Totals at the top show **Total Scrap Qty** and **Scrap Realisable Value**.`,
  },
  {
    id: 'inv-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Inventory Help

I'm a **self-contained guide** for Inventory. Ask *"how do I issue material to a job"* or *"what is an MRS"*, or tap a suggestion. Use the **Open module** chips to jump to a screen.`,
  },
];
