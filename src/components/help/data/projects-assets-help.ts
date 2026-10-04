/**
 * Projects & Assets Help — Knowledge Base
 * Covers the Projects menu and the Assets menu (equipment, permits, HSE, subcontractors).
 */

import type { HelpEntry } from '../finance-help-data';

export const PROJECTS_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'proj-overview',
    title: "What's in the Projects module?",
    popular: true,
    relatedModule: 'projects',
    keywords: [
      'projects', 'project', 'overview', 'menu', 'sections', 'what is', 'features', 'where is',
      'navigate',
    ],
    summary: 'Map of the project screens.',
    body: `### Projects module

- **All Projects** — the project portfolio, by type and health
- **Project / Job Hierarchy** — contract-level project → jobs → sub-jobs
- **Budget vs Actual** — planned vs actual spend
- **BOQ Entry & Tracking** — bill of quantities with line items
- **Job Progress & Milestones** — % completion and milestone checklists
- **Site Map** — site overview

Projects and jobs are the backbone of cost tracking: POs, invoices, petty cash and stock issues all tag a **job code**.`,
    links: [
      { label: 'All Projects', moduleId: 'project-list' },
      { label: 'Job Hierarchy', moduleId: 'project-hierarchy' },
      { label: 'BOQ Entry', moduleId: 'boq-entry' },
    ],
  },
  {
    id: 'proj-portfolio',
    title: 'Project portfolio — adding a project',
    popular: true,
    relatedModule: 'project-list',
    keywords: [
      'project list', 'all projects', 'portfolio', 'new project', 'create project', 'add project',
      'thermal', 'solar', 'transmission', 'substation', 'maintenance', 'on track', 'at risk',
      'delayed', 'health',
    ],
    summary: 'Create and track projects by type and health.',
    body: `### Project Portfolio

1. **Projects → All Projects** → **New Project**.
2. Choose the **type** — *Thermal*, *Solar*, *Transmission*, *Substation* or *Maintenance* — and fill in the details.
3. Track health with the status: **On Track**, **At Risk**, **Delayed**, **Near Done** or **Completed**.
4. Edit or delete from the project card. Deleting removes all associated data, so confirm carefully.`,
  },
  {
    id: 'proj-hierarchy',
    title: 'Project / job hierarchy',
    relatedModule: 'project-hierarchy',
    keywords: [
      'hierarchy', 'job', 'jobs', 'sub job', 'sub-job', 'parent job', 'job code', 'project code',
      'contract value', 'wbs', 'new job', 'project manager',
    ],
    summary: 'Contract project → jobs → sub-jobs, each tied to a site.',
    body: `### Project / Job Hierarchy

**Project (contract level)** — code, name, client, **contract value (₹)**, sector, project manager, start/end dates, status.

**Jobs under a project**
- **Job Code**, **Project**, **Site** (required) and **Budget (₹)**.
- Set **Parent Job** to make a sub-job, or leave it *Top-level job*.

A project with no jobs shows *"No jobs under this project"*. Deleting a project asks for confirmation.`,
    links: [{ label: 'Jobs (PO-wise)', moduleId: 'fin-jobs' }],
  },
  {
    id: 'proj-boq',
    title: 'BOQ entry and tracking',
    relatedModule: 'boq-entry',
    keywords: [
      'boq', 'bill of quantities', 'bill of quantity', 'quantities', 'line items', 'version',
      'uom', 'boq value', 'new boq', 'budget vs actual',
    ],
    summary: 'Build a BOQ with versioned line items.',
    body: `### BOQ Entry & Tracking

1. **New BOQ** → **Create BOQ**.
2. Enter the **Title**, **Project**, **Version** and the **Site & Job**.
3. **Add line** for each item — **Description**, **UOM**, **Qty**, **Rate**; the **Amount** is calculated.
4. Save.

Cards show **Total BOQs**, **Total BOQ Value** and **Approved Value**. BOQ lines feed budget-vs-actual tracking.`,
    links: [{ label: 'Budget vs Actual', moduleId: 'budget' }],
  },
  {
    id: 'proj-progress',
    title: 'Job progress & milestones',
    relatedModule: 'job-progress',
    keywords: [
      'job progress', 'progress', 'milestone', 'milestones', 'completion', 'percent complete',
      '% complete', 'update progress', 'overall', 'active jobs',
    ],
    summary: 'Track % completion and milestone checklists per job.',
    body: `### Job Progress & Milestones

1. **Update Progress** and choose the job (**Job Code**, name and **Site Code** fill in).
2. Set **Overall %**, the **Status** and **Notes**.
3. **Add milestone** for each checkpoint and tick it off as it completes.

Header cards: **Avg Completion**, **Completed Jobs** and **Active Jobs**.`,
  },
  {
    id: 'proj-sites',
    title: 'Site overview',
    relatedModule: 'sites',
    keywords: [
      'site', 'sites', 'site map', 'site overview', 'new site', 'state', 'active site',
      'slow', 'closing', 'inactive', 'location',
    ],
    summary: 'Create and review project sites.',
    body: `### Site Overview

- **New Site** — name, location and **state**.
- Site status: **Active**, **Slow**, **Closing** or **Inactive**.
- Search by name; edit or delete from a site's card (delete asks for confirmation).

For finance site codes, budgets and contacts use **Master Setup → Sites**.`,
    links: [{ label: 'Finance Sites', moduleId: 'fin-sites' }],
  },
  {
    id: 'proj-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Projects Help

I'm a **self-contained guide** for Projects. Ask *"how do I add a sub-job"* or *"how do I create a BOQ"*, or tap a suggestion. Use the **Open module** chips to jump to a screen.`,
  },
];

export const ASSETS_HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'asset-overview',
    title: "What's in the Assets module?",
    popular: true,
    relatedModule: 'assets',
    keywords: [
      'assets', 'asset', 'overview', 'menu', 'sections', 'what is', 'features', 'where is',
      'navigate', 'operations',
    ],
    summary: 'Map of the assets & operations screens.',
    body: `### Assets & Operations

- **Equipment** — equipment register with maintenance dates and utilization
- **Work Permits** — permit-to-work with expiry and revocation
- **Safety & HSE** — incident register
- **Subcontractors** — contractor register with statutory compliance

For the accounting side of fixed assets (register & depreciation) see the Finance help.`,
    links: [
      { label: 'Equipment', moduleId: 'equipment' },
      { label: 'Work Permits', moduleId: 'permits' },
      { label: 'Safety & HSE', moduleId: 'safety' },
    ],
  },
  {
    id: 'asset-equipment',
    title: 'Equipment register & preventive maintenance',
    popular: true,
    relatedModule: 'equipment',
    keywords: [
      'equipment', 'machine', 'add equipment', 'maintenance', 'pm', 'preventive maintenance',
      'last pm', 'next pm', 'utilization', 'operational', 'decommissioned', 'assigned to',
    ],
    summary: 'Register equipment and schedule preventive maintenance.',
    body: `### Equipment

1. **Equipment → Add Equipment**.
2. Enter **Equipment Name**, **Site**, **Assigned To**, **Status**, **Last PM Date** and **Next PM Date**.
3. Status is **Operational**, **Maintenance** or **Decommissioned**.

The list shows **Last PM**, **Next PM** and **Utilization**, and flags equipment whose next PM is due. Edit or delete from each row.`,
  },
  {
    id: 'asset-permits',
    title: 'Work permits (permit-to-work)',
    relatedModule: 'permits',
    keywords: [
      'permit', 'permits', 'work permit', 'ptw', 'permit to work', 'new permit', 'expiry',
      'revoke', 'issued to', 'safety precautions', 'hot work', 'expired permit',
    ],
    summary: 'Issue, monitor and revoke work permits.',
    body: `### Work Permits

1. **Work Permits → New Permit**.
2. Enter **Permit Type**, **Location**, **Issued To** and **Expiry** (all required), plus the **Description** and **Safety Precautions**.
3. Save. The permit is listed with its status and expiry.

Use **Revoke** to cancel an active permit. A warning appears for permits that are expiring or expired. Delete asks for confirmation.`,
  },
  {
    id: 'asset-safety',
    title: 'Reporting a safety incident',
    relatedModule: 'safety',
    keywords: [
      'safety', 'hse', 'incident', 'accident', 'near miss', 'report incident', 'severity',
      'incident register', 'injury', 'action taken', 'person involved',
    ],
    summary: 'Log incidents in the HSE register.',
    body: `### Safety & HSE — Incident Register

1. **Report Incident**.
2. Enter **Date**, **Site**, **Type**, **Severity** and **Person Involved** (required), then the **Description** and **Action Taken**.
3. Save; update the **Status** as the investigation progresses.

Delete removes the record after confirmation.`,
  },
  {
    id: 'asset-subcontractors',
    title: 'Subcontractor register & compliance',
    relatedModule: 'subcontractors',
    keywords: [
      'subcontractor', 'subcontractors', 'contractor', 'labour licence', 'pf registration',
      'esi registration', 'compliance', 'non compliant', 'workers deployed', 'trade',
    ],
    summary: 'Track contractors, workers deployed and statutory compliance.',
    body: `### Subcontractors

**Add Subcontractor** with **Company Name**, **Trade**, **Site** and **Workers Deployed**, then record:

- **PF Registration** — Done / Pending / Missing
- **ESI Registration** — Done / Pending / Missing
- **Labour Licence** — Valid / Expired

The **Compliance Status** shows **Compliant** or **Non-Compliant** from those checks. Edit or delete from each row.

For contract value and progress claims see **Procurement → Subcontract Register**.`,
    links: [{ label: 'Subcontract Register', moduleId: 'procurement-subcontracts' }],
  },
  {
    id: 'asset-about',
    title: 'About this helper',
    keywords: ['help', 'about', 'assistant', 'guide', 'support', 'who are you', 'what can you do'],
    summary: 'What this helper does.',
    body: `### Assets Help

I'm a **self-contained guide** for Assets & Operations. Ask *"how do I revoke a permit"* or *"how do I log an incident"*, or tap a suggestion. Use the **Open module** chips to jump to a screen.`,
  },
];
