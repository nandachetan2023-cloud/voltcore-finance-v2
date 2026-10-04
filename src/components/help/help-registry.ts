/**
 * Help registry
 * ─────────────
 * Maps every module id to the help "area" that documents it. The chat widget
 * (`module-help-chat.tsx`) asks `resolveHelpArea(activeModule)` and renders
 * nothing when the module has no area — which is how HRMS (and My Portal /
 * HR reports) stay outside the help widget.
 *
 * To document a new module: add its id to an area's `moduleIds` and, if
 * needed, a topic to that area's data file under `./data/`.
 */

import { FINANCE_HELP_ENTRIES, type HelpEntry } from './finance-help-data';
import { ORGANIZATION_HELP_ENTRIES } from './data/organization-help';
import { PROCUREMENT_HELP_ENTRIES } from './data/procurement-help';
import { INVENTORY_HELP_ENTRIES } from './data/inventory-help';
import { SALES_HELP_ENTRIES } from './data/sales-help';
import { PROJECTS_HELP_ENTRIES, ASSETS_HELP_ENTRIES } from './data/projects-assets-help';
import {
  MASTER_SETUP_HELP_ENTRIES,
  PETTY_CASH_HELP_ENTRIES,
  MIS_HELP_ENTRIES,
  LOGIN_ROLE_HELP_ENTRIES,
  SYSTEM_HELP_ENTRIES,
} from './data/admin-help';

export interface HelpArea {
  id: string;
  /** Shown in the header, e.g. "Procurement" → "Procurement Help". */
  name: string;
  greeting: string;
  placeholder: string;
  entries: HelpEntry[];
  /** True when the area can also create records through /api/finance-assistant. */
  assistant: boolean;
  moduleIds: string[];
  /** Curated starting suggestions; defaults to the area's `popular` topics. */
  popularIds?: string[];
}

const byId = (id: string) => FINANCE_HELP_ENTRIES.filter((e) => e.id === id);

const AREA_DEFS: HelpArea[] = [
  // Petty Cash is listed before Finance so `fin-petty-cash` resolves here.
  {
    id: 'petty-cash',
    name: 'Petty Cash',
    greeting:
      "Hi! I'm your **Petty Cash** helper. Ask how anything works — or tell me to create a voucher, e.g. *\"create petty cash of 500 for courier at site TPP Adani Godda job JOB-2026-001 po PO-2026-001 cost center CC-SIT-001 department Projects pm R. Sharma\"*.",
    placeholder: 'Ask, or create - e.g. "create petty cash of 500 for courier"',
    entries: [...PETTY_CASH_HELP_ENTRIES, ...byId('petty-cash'), ...byId('petty-cash-approval')],
    assistant: true,
    moduleIds: [
      'petty-cash',
      'fin-petty-cash-custodian',
      'fin-petty-cash',
      'fin-petty-cash-approval-queue',
      'fin-petty-cash-replenishment',
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    greeting:
      "Hi! I'm your **Finance** helper. Ask me how to use any finance feature — or tell me to create an entry, e.g. *\"create a journal entry Dr Rent 50000 Cr SBI Bank 50000\"* or *\"raise an invoice of 2 lakh to L&T at site NTPC Rihand\"*.",
    placeholder: 'Ask, or create - e.g. "create a journal entry"',
    entries: FINANCE_HELP_ENTRIES,
    assistant: true,
    // Sourced from MODULE_TREE['finance-accounts'] in src/store/erp-store.ts.
    moduleIds: [
      'finance-accounts',
      'tally-sync',
      'notifications-ultra',
      'finance-dashboard',
      'ledger',
      'accounts-receivable',
      'accounts-payable',
      'journal-entries',
      'create-journal-entry',
      'bank-cash',
      'taxation',
      'budget',
      'financial-reports',
      'fin-sites',
      'fin-jobs',
      'fin-parties',
      'fin-invoices',
      'fin-payments',
      'fin-payment-advices',
      'fin-assets',
      'fin-profit-loss',
      'fin-bank-reconciliation',
      'fin-expense-claims',
      'fin-site-expenses',
      'fin-work-orders',
      'fin-purchase-orders',
      'fin-credit-notes',
      'fin-client-follow-up',
    ],
  },
  {
    id: 'organization',
    name: 'Organization',
    greeting:
      "Hi! I'm your **Organization** helper. Ask how to set up departments, holidays, leave policies, attendance rules or roles — e.g. *\"how do I add a holiday\"*.",
    placeholder: 'Ask - e.g. "how do I create a leave policy"',
    entries: ORGANIZATION_HELP_ENTRIES,
    assistant: false,
    moduleIds: [
      'organization',
      'departments',
      'designations',
      'payroll-sites',
      'holidays',
      'leave-policies',
      'attendance-rules',
      'checklist-templates',
      'employee-documents',
      'roles-access',
    ],
  },
  {
    id: 'procurement',
    name: 'Procurement',
    greeting:
      "Hi! I'm your **Procurement** helper. Ask about requisitions, RFQs, purchase orders, vendors or GRN matching — e.g. *\"how do I award an RFQ\"*.",
    placeholder: 'Ask - e.g. "how do I raise a purchase requisition"',
    entries: PROCUREMENT_HELP_ENTRIES,
    assistant: false,
    moduleIds: [
      'procurement',
      'purchase',
      'purchases',
      'expenses',
      'procurement-pr',
      'procurement-rfq',
      'procurement-po-register',
      'procurement-vendors',
      'procurement-material-tracking',
      'procurement-subcontracts',
      'po-approval-stepper',
      'rfq-comparison-matrix',
      'grn-3way-match',
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    greeting:
      "Hi! I'm your **Inventory** helper. Ask about goods receipts, issuing material to jobs, the stock ledger or scrap — e.g. *\"how do I issue material to a job\"*.",
    placeholder: 'Ask - e.g. "how do I record a material receipt"',
    entries: INVENTORY_HELP_ENTRIES,
    assistant: false,
    moduleIds: ['inventory', 'site-store', 'material-receipt', 'material-issue-wip', 'stock-ledger', 'scrap-entry'],
  },
  {
    id: 'sales',
    name: 'Sales & Billing',
    greeting:
      "Hi! I'm your **Sales & Billing** helper. Ask about quotations, orders, GST invoices, RA bills, receipts, the pipeline or tenders — e.g. *\"how do I raise an RA bill\"*.",
    placeholder: 'Ask - e.g. "how do I create a tax invoice"',
    entries: SALES_HELP_ENTRIES,
    assistant: false,
    moduleIds: [
      'sales',
      'sales-billing',
      'sales-orders',
      'sales-quotations',
      'sales-tax-invoices',
      'ra-work-slider',
      'receipt-entry',
      'sales-opportunity-pipeline',
      'sales-tender-register',
      'sales-revenue-forecast',
      'sales-client-accounts',
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    greeting:
      "Hi! I'm your **Projects** helper. Ask about the portfolio, job hierarchy, BOQ, progress or sites — e.g. *\"how do I add a sub-job\"*.",
    placeholder: 'Ask - e.g. "how do I create a BOQ"',
    entries: PROJECTS_HELP_ENTRIES,
    assistant: false,
    moduleIds: ['projects', 'project-list', 'project-hierarchy', 'boq-entry', 'job-progress', 'sites'],
  },
  {
    id: 'assets',
    name: 'Assets',
    greeting:
      "Hi! I'm your **Assets** helper. Ask about equipment maintenance, work permits, safety incidents or subcontractor compliance — e.g. *\"how do I revoke a permit\"*.",
    placeholder: 'Ask - e.g. "how do I log a safety incident"',
    entries: ASSETS_HELP_ENTRIES,
    assistant: false,
    moduleIds: ['assets', 'equipment', 'permits', 'safety', 'subcontractors'],
  },
  {
    id: 'master-setup',
    name: 'Master Setup',
    greeting:
      "Hi! I'm your **Master Setup** helper. Ask what to configure first, or how to build the chart of accounts — e.g. *\"how do I add an account\"*.",
    placeholder: 'Ask - e.g. "what should I set up first"',
    entries: [...MASTER_SETUP_HELP_ENTRIES, ...byId('sites'), ...byId('jobs'), ...byId('parties')],
    assistant: false,
    moduleIds: ['master-setup', 'chart-of-accounts'],
  },
  {
    id: 'mis',
    name: 'MIS',
    greeting:
      "Hi! I'm your **MIS** helper. Ask about drill-downs, the PO cost tree or customer profitability — e.g. *\"where do I see customer margins\"*.",
    placeholder: 'Ask - e.g. "how does the PO cost tree work"',
    entries: MIS_HELP_ENTRIES,
    assistant: false,
    moduleIds: ['mis', 'report-drilldown', 'po-cost-tree', 'customer-profitability'],
  },
  {
    id: 'login-role',
    name: 'Login & Role',
    greeting:
      "Hi! I'm your **Login & Role** helper. Ask about finance roles, site-scoped assignments or segregation of duties — e.g. *\"how do I make a read-only auditor\"*.",
    placeholder: 'Ask - e.g. "how do I assign a finance role"',
    entries: LOGIN_ROLE_HELP_ENTRIES,
    assistant: false,
    moduleIds: ['login-role', 'fin-user-management'],
  },
  {
    id: 'system',
    name: 'System',
    greeting:
      "Hi! I'm your **System** helper. Ask about company settings, user accounts, notices, approvals or the recycle bin — e.g. *\"how do I add a logo\"*.",
    placeholder: 'Ask - e.g. "how do I bulk-create logins"',
    entries: SYSTEM_HELP_ENTRIES,
    assistant: false,
    moduleIds: [
      'system',
      'settings',
      'user-management',
      'onboarding-approvals',
      'requests',
      'notice-board',
      'trash',
      'notifications',
      'reports',
    ],
  },
];

/**
 * Every topic across all areas — the fallback pool when a question isn't
 * answered inside the current area. "About" and troubleshooting topics are
 * left out because they only make sense in their own area.
 */
export const ALL_HELP_ENTRIES: HelpEntry[] = (() => {
  const seen = new Set<string>();
  const out: HelpEntry[] = [];
  for (const area of AREA_DEFS) {
    for (const entry of area.entries) {
      if (seen.has(entry.id) || entry.id === 'troubleshoot' || entry.id === 'about' || entry.id.endsWith('-about')) continue;
      seen.add(entry.id);
      out.push(entry);
    }
  }
  return out;
})();

// ── Dashboard: the ERP-wide entry point ─────────────────────────
const DASHBOARD_OVERVIEW: HelpEntry = {
  id: 'dash-overview',
  title: 'What can I do in VOLTCORE ERP?',
  popular: true,
  keywords: [
    'voltcore', 'erp', 'overview', 'modules', 'menu', 'what is', 'what can i do', 'getting started',
    'start', 'where is', 'navigate', 'features', 'list', 'dashboard', 'home',
  ],
  summary: 'Map of every module and where to start.',
  body: `### VOLTCORE ERP

Pick a module tile on the dashboard (or from the sidebar):

- **Organization** — departments, designations, holidays, leave & attendance rules, roles
- **Procurement / Purchase** — requisitions, RFQs, POs, vendors, GRN matching
- **Inventory** — site store, receipts, issues to WIP, stock ledger, scrap
- **Sales & Billing** — quotations, orders, GST invoices, RA bills, receipts, tenders, pipeline
- **Finance & Accounts** — ledger, journals, AR/AP, bank, GST/TDS, P&L, Tally sync
- **Petty Cash** — vouchers, custodian dashboard, approvals, replenishment
- **Master Setup** — sites, jobs, parties, chart of accounts
- **Projects** — portfolio, job hierarchy, BOQ, progress
- **Assets** — equipment, permits, safety, subcontractors
- **MIS** — drill-downs, PO cost tree, customer profitability
- **Login & Role / System** — access control, users, settings, notices

**Suggested first-time order:** Master Setup → Projects → Procurement → Inventory → Sales & Billing → Finance.

Ask me a question, or tell me to create an entry — e.g. *"raise an invoice of 2 lakh to L&T at site NTPC Rihand"*. Inside a module I'll answer for that module first.`,
  links: [
    { label: 'Master Setup', moduleId: 'master-setup' },
    { label: 'Procurement', moduleId: 'procurement' },
    { label: 'Sales & Billing', moduleId: 'sales-billing' },
    { label: 'Finance & Accounts', moduleId: 'finance-accounts' },
  ],
};

const DASHBOARD_AREA: HelpArea = {
  id: 'dashboard',
  name: 'VOLTCORE ERP',
  greeting:
    "Hi! I'm the **VOLTCORE ERP** helper. Ask how to do anything in any module — or tell me to create an entry, e.g. *\"raise an invoice of 2 lakh to L&T at site NTPC Rihand\"* or *\"create a journal entry Dr Rent 50000 Cr SBI Bank 50000\"*.",
  placeholder: 'Ask about any module, or create - e.g. "create a journal entry"',
  entries: [DASHBOARD_OVERVIEW, ...ALL_HELP_ENTRIES],
  assistant: true,
  moduleIds: ['dashboard'],
  popularIds: [
    'dash-overview',
    'master-overview',
    'proc-workflow',
    'sales-workflow',
    'workflow-procure-to-pay',
    'workflow-invoice-to-ledger',
    'org-roles-access',
    'sys-users',
  ],
};

const MODULE_TO_AREA = new Map<string, HelpArea>();
for (const area of [...AREA_DEFS, DASHBOARD_AREA]) {
  for (const id of area.moduleIds) {
    // First definition wins, so overlapping ids resolve deterministically.
    if (!MODULE_TO_AREA.has(id)) MODULE_TO_AREA.set(id, area);
  }
}

/** The help area documenting a module, or `null` (e.g. HRMS, My Portal). */
export function resolveHelpArea(moduleId: string): HelpArea | null {
  return MODULE_TO_AREA.get(moduleId) ?? null;
}

/** Starting suggestions for an area. */
export function popularEntriesFor(area: HelpArea): HelpEntry[] {
  if (area.popularIds) {
    return area.popularIds
      .map((id) => area.entries.find((e) => e.id === id))
      .filter((e): e is HelpEntry => Boolean(e));
  }
  return area.entries.filter((e) => e.popular);
}
