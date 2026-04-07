-- ============================================================================
-- MODULE 19: Workflow & Reporting
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : Workflow, WorkflowStep, ReportTemplate, DashboardConfig
-- FK      : WorkflowStep.workflowId → Workflow(id) ON DELETE CASCADE
-- Data    : 6 workflows, 18 workflow steps, 8 report templates, 4 dashboards
-- Context : Multi-level approval workflows for purchase requisitions, leave
--           requests, expense claims, work orders, POs, and invoices. Reports
--           and dashboards for management decision-making across modules.
-- ============================================================================


-- ============================================================================
-- TABLE: Workflow
-- ============================================================================
CREATE TABLE Workflow (
  id           VARCHAR(25)   NOT NULL PRIMARY KEY,
  name         VARCHAR(255)  NOT NULL,
  module       VARCHAR(100)  NOT NULL COMMENT 'Purchase Requisition, Leave Request, Expense Claim, Work Order, PO Approval, Invoice Approval',
  description  TEXT          DEFAULT NULL,
  triggerEvent VARCHAR(255)  DEFAULT NULL COMMENT 'On Submit, On Status Change',
  isActive     BOOLEAN       NOT NULL DEFAULT TRUE,
  status       VARCHAR(50)   NOT NULL DEFAULT 'Active',
  createdAt    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_workflow_module (module),
  INDEX idx_workflow_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- TABLE: WorkflowStep
-- ============================================================================
CREATE TABLE WorkflowStep (
  id                  VARCHAR(25)   NOT NULL PRIMARY KEY,
  workflowId          VARCHAR(25)   NOT NULL,
  stepOrder           INT           NOT NULL,
  name                VARCHAR(255)  NOT NULL,
  assigneeRole        VARCHAR(100)  DEFAULT NULL COMMENT 'Admin, Manager, Department Head, etc.',
  assigneeDesignation VARCHAR(255)  DEFAULT NULL,
  action              VARCHAR(50)   DEFAULT NULL COMMENT 'Approve, Reject, Review, Notify',
  conditions          TEXT          DEFAULT NULL COMMENT 'JSON conditions for step execution',
  isFinal             BOOLEAN       NOT NULL DEFAULT FALSE,
  timeoutHours        INT           NOT NULL DEFAULT 0 COMMENT 'Escalation timeout in hours',
  escalationTo        VARCHAR(255)  DEFAULT NULL COMMENT 'Designation to escalate to on timeout',
  remarks             TEXT          DEFAULT NULL,
  createdAt           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_workflowStep_workflowId (workflowId),
  CONSTRAINT fk_workflowStep_workflow FOREIGN KEY (workflowId) REFERENCES Workflow (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- TABLE: ReportTemplate
-- ============================================================================
CREATE TABLE ReportTemplate (
  id          VARCHAR(25)   NOT NULL PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  module      VARCHAR(100)  DEFAULT NULL,
  description TEXT          DEFAULT NULL,
  reportType  VARCHAR(50)   DEFAULT NULL COMMENT 'Summary, Detailed, Analytical, Cross-tab',
  frequency   VARCHAR(50)   DEFAULT NULL COMMENT 'Daily, Weekly, Monthly, Quarterly, On Demand',
  format      VARCHAR(50)   NOT NULL DEFAULT 'PDF' COMMENT 'PDF, Excel, CSV',
  lastRun     DATETIME      DEFAULT NULL,
  parameters  TEXT          DEFAULT NULL COMMENT 'JSON parameter definitions for report filters',
  status      VARCHAR(50)   NOT NULL DEFAULT 'Active',
  createdAt   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_reportTemplate_module (module),
  INDEX idx_reportTemplate_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- TABLE: DashboardConfig
-- ============================================================================
CREATE TABLE DashboardConfig (
  id              VARCHAR(25)   NOT NULL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  module          VARCHAR(100)  DEFAULT NULL,
  description     TEXT          DEFAULT NULL,
  layout          TEXT          DEFAULT NULL COMMENT 'JSON layout configuration (grid positions)',
  widgets         TEXT          DEFAULT NULL COMMENT 'JSON widget definitions (charts, KPIs, tables)',
  roles           TEXT          DEFAULT NULL COMMENT 'JSON array of roles with access',
  refreshInterval INT           NOT NULL DEFAULT 300 COMMENT 'Auto-refresh interval in seconds',
  isDefault       BOOLEAN       NOT NULL DEFAULT FALSE,
  status          VARCHAR(50)   NOT NULL DEFAULT 'Active',
  createdAt       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_dashboardConfig_module (module),
  INDEX idx_dashboardConfig_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ############################################################################
-- INSERT DATA
-- ############################################################################


-- ============================================================================
-- 19.1 WORKFLOW (6 records)
-- Approval workflows for key VoltCore ERP business processes
-- ============================================================================
INSERT INTO Workflow (id, name, module, description, triggerEvent, isActive, status, createdAt, updatedAt) VALUES
('wf_001', 'Purchase Requisition Approval', 'Purchase Requisition',
 'Multi-level approval for material and spare parts purchase requisitions across plant sites. Ensures budget control and procurement compliance.',
 'On Submit', TRUE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

('wf_002', 'Leave Request Approval', 'Leave Request',
 'Employee leave approval workflow — routed to reporting manager first, then HR for final sanction and leave balance verification.',
 'On Submit', TRUE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

('wf_003', 'Expense Claim Approval', 'Expense Claim',
 'Site expense and travel claim approval — manager reviews for reasonableness, finance verifies bills and processes reimbursement.',
 'On Submit', TRUE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

('wf_004', 'Work Order Approval', 'Work Order',
 'Work order approval for maintenance jobs and fabrication tasks. Site incharge validates scope, planning team confirms resource availability.',
 'On Submit', TRUE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

('wf_005', 'PO Approval', 'PO Approval',
 'Purchase order release approval — procurement head validates vendor and pricing, finance authorises payment commitment against budget.',
 'On Submit', TRUE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

('wf_006', 'Invoice Approval', 'Invoice Approval',
 'Vendor invoice approval — finance manager verifies invoice against PO and goods receipt before authorising payment.',
 'On Submit', TRUE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');


-- ============================================================================
-- 19.2 WORKFLOW STEP (18 records)
-- Sequential approval steps for each workflow — 2 to 4 steps per workflow
-- ============================================================================

-- ── wf_001: Purchase Requisition Approval (4 steps) ───────────────────────
-- Initiate → Dept Head Review → Procurement Review → Finance Approval
INSERT INTO WorkflowStep (id, workflowId, stepOrder, name, assigneeRole, assigneeDesignation, action, conditions, isFinal, timeoutHours, escalationTo, remarks, createdAt, updatedAt) VALUES
-- Step 1: Submission / Initiation
('ws_001', 'wf_001', 1, 'Submit Purchase Requisition', 'Engineer', 'Project Engineer / Site Supervisor',
 'Notify',
 '{"requires": ["itemList", "justification", "urgency"]}',
 FALSE, 0, NULL,
 'Employee submits requisition with item details, estimated cost, and urgency level. System notifies Dept Head.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 2: Department Head Review
('ws_002', 'wf_001', 2, 'Department Head Review', 'Manager', 'Department Head',
 'Approve',
 '{"amountThreshold": 50000, "autoApproveBelow": true}',
 FALSE, 48, 'VP Operations',
 'Dept Head validates requirement, checks against project scope. Amounts below ₹50,000 may auto-approve.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 3: Procurement Review
('ws_003', 'wf_001', 3, 'Procurement Review', 'Engineer', 'Procurement Officer',
 'Review',
 '{"checkVendorAvailability": true, "compareQuotations": true}',
 FALSE, 72, 'Procurement Head',
 'Procurement team checks stock availability, identifies vendors, compares quotations. May suggest alternatives.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 4: Finance Approval
('ws_004', 'wf_001', 4, 'Finance Approval', 'HR/Finance', 'Finance Manager',
 'Approve',
 '{"budgetCheck": true, "costCenterRequired": true}',
 TRUE, 48, 'CFO',
 'Finance verifies budget allocation, cost centre, and payment terms. Final approval before PO creation.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');


-- ── wf_002: Leave Request Approval (3 steps) ─────────────────────────────
-- Initiate → Manager Review → HR Approval
INSERT INTO WorkflowStep (id, workflowId, stepOrder, name, assigneeRole, assigneeDesignation, action, conditions, isFinal, timeoutHours, escalationTo, remarks, createdAt, updatedAt) VALUES
-- Step 1: Submission
('ws_005', 'wf_002', 1, 'Submit Leave Request', 'Engineer', 'Employee',
 'Notify',
 '{"requiredFields": ["type", "fromDate", "toDate", "reason"]}',
 FALSE, 0, NULL,
 'Employee submits leave request. System validates leave balance and notifies reporting manager.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 2: Manager Review
('ws_006', 'wf_002', 2, 'Manager Review', 'Manager', 'Site Supervisor / Project Engineer',
 'Approve',
 '{"maxConsecutiveLeaves": 10, "checkProjectSchedule": true}',
 FALSE, 24, 'Department Head',
 'Reporting manager reviews leave request against project schedule and team availability. Can approve or reject.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 3: HR Approval
('ws_007', 'wf_002', 3, 'HR Approval', 'HR/Finance', 'HR Manager',
 'Approve',
 '{"leaveBalanceCheck": true, "minBalanceRequired": 3}',
 TRUE, 24, 'Director HR',
 'HR verifies leave balance, updates records, and confirms leave. Minimum 3-day balance must be maintained.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');


-- ── wf_003: Expense Claim Approval (3 steps) ─────────────────────────────
-- Initiate → Manager Review → Finance Approval
INSERT INTO WorkflowStep (id, workflowId, stepOrder, name, assigneeRole, assigneeDesignation, action, conditions, isFinal, timeoutHours, escalationTo, remarks, createdAt, updatedAt) VALUES
-- Step 1: Submission
('ws_008', 'wf_003', 1, 'Submit Expense Claim', 'Engineer', 'Employee',
 'Notify',
 '{"requiredFields": ["category", "amount", "date", "bills"], "maxPerClaim": 25000}',
 FALSE, 0, NULL,
 'Employee uploads expense claim with bills. System validates amount limits and routes to manager.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 2: Manager Review
('ws_009', 'wf_003', 2, 'Manager Review', 'Manager', 'Site Supervisor / Project Engineer',
 'Approve',
 '{"maxAutoApprove": 5000, "requiresBillAttachment": true}',
 FALSE, 48, 'Department Head',
 'Manager verifies expense reasonableness and bill authenticity. Claims up to ₹5,000 may be auto-approved.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 3: Finance Verification & Reimbursement
('ws_010', 'wf_003', 3, 'Finance Verification', 'HR/Finance', 'Finance Manager',
 'Approve',
 '{"gstValidation": true, "perDiemCheck": true, "taxCompliance": true}',
 TRUE, 72, 'CFO',
 'Finance validates GST on bills, per diem rates, and tax compliance. Processes reimbursement upon approval.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');


-- ── wf_004: Work Order Approval (3 steps) ────────────────────────────────
-- Initiate → Site Incharge Review → Planning Approval
INSERT INTO WorkflowStep (id, workflowId, stepOrder, name, assigneeRole, assigneeDesignation, action, conditions, isFinal, timeoutHours, escalationTo, remarks, createdAt, updatedAt) VALUES
-- Step 1: Submission
('ws_011', 'wf_004', 1, 'Submit Work Order', 'Engineer', 'Site Supervisor / Engineer',
 'Notify',
 '{"requiredFields": ["equipmentId", "jobDescription", "priority"]}',
 FALSE, 0, NULL,
 'Site team submits work order with equipment details, job scope, and priority level.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 2: Site Incharge Review
('ws_012', 'wf_004', 2, 'Site Incharge Review', 'Manager', 'Site Incharge',
 'Review',
 '{"safetyCheckRequired": true, "permitCheck": true}',
 FALSE, 24, 'Project Manager',
 'Site Incharge validates job scope, ensures safety permits are in place, and checks manpower availability.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 3: Planning Approval
('ws_013', 'wf_004', 3, 'Planning Approval', 'Engineer', 'Planning Engineer',
 'Approve',
 '{"resourceAvailability": true, "materialCheck": true, "scheduleConflictCheck": true}',
 TRUE, 48, 'Head of Maintenance Planning',
 'Planning team confirms resource availability, material readiness, and no schedule conflicts. Authorises work order.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');


-- ── wf_005: PO Approval (3 steps) ────────────────────────────────────────
-- Initiate → Procurement Head Review → Finance Approval
INSERT INTO WorkflowStep (id, workflowId, stepOrder, name, assigneeRole, assigneeDesignation, action, conditions, isFinal, timeoutHours, escalationTo, remarks, createdAt, updatedAt) VALUES
-- Step 1: PO Generation
('ws_014', 'wf_005', 1, 'Generate Purchase Order', 'Engineer', 'Procurement Officer',
 'Notify',
 '{"requires": ["requisitionId", "vendorId", "items", "deliveryDate"]}',
 FALSE, 0, NULL,
 'Procurement team generates PO based on approved requisition, selected vendor quotation, and agreed terms.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 2: Procurement Head Review
('ws_015', 'wf_005', 2, 'Procurement Head Review', 'Manager', 'Procurement Head',
 'Approve',
 '{"amountThreshold": 100000, "singleVendorCheck": true}',
 FALSE, 48, 'VP Operations',
 'Procurement Head validates vendor selection, pricing competitiveness, and delivery terms. High-value POs escalated.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 3: Finance Authorisation
('ws_016', 'wf_005', 3, 'Finance Authorisation', 'HR/Finance', 'Finance Manager',
 'Approve',
 '{"budgetHead": "Procurement", "paymentTermsValidation": true}',
 TRUE, 48, 'CFO',
 'Finance confirms budget availability under procurement head and validates payment terms before PO release.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');


-- ── wf_006: Invoice Approval (2 steps) ───────────────────────────────────
-- Initiate → Finance Manager Approval
INSERT INTO WorkflowStep (id, workflowId, stepOrder, name, assigneeRole, assigneeDesignation, action, conditions, isFinal, timeoutHours, escalationTo, remarks, createdAt, updatedAt) VALUES
-- Step 1: Invoice Submission
('ws_017', 'wf_006', 1, 'Submit Invoice for Verification', 'HR/Finance', 'Accounts Executive',
 'Notify',
 '{"requiredFields": ["invoiceNo", "vendorId", "poReference", "amount", "taxBreakdown"]}',
 FALSE, 0, NULL,
 'Accounts team uploads vendor invoice with PO reference. System performs 3-way match check (PO, GRN, Invoice).',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- Step 2: Finance Manager Approval
('ws_018', 'wf_006', 2, 'Finance Manager Approval', 'HR/Finance', 'Finance Manager',
 'Approve',
 '{"threeWayMatch": true, "gstValidation": true, "tdsComputation": true, "maxAutoApprove": 50000}',
 TRUE, 72, 'CFO',
 'Finance Manager verifies invoice against PO and GRN (3-way match), validates GST, computes TDS. Authorises payment.',
 '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');


-- ============================================================================
-- 19.3 REPORT TEMPLATE (8 records)
-- Standard reports for HR, Inventory, Procurement, Sales, Projects, Finance
-- and Asset management modules
-- ============================================================================
INSERT INTO ReportTemplate (id, name, module, description, reportType, frequency, format, lastRun, parameters, status, createdAt, updatedAt) VALUES
-- 1. Employee Attendance Report
('rpt_001', 'Employee Attendance Report', 'HRMS',
 'Comprehensive attendance report showing daily punch-in/out times, OT hours, shift adherence, and absentee trends across all plant sites.',
 'Detailed', 'Monthly', 'Excel',
 '2025-01-31 18:00:00',
 '{"filters": ["site", "department", "employee", "dateRange", "shift"], "groupBy": ["site", "department"], "columns": ["employeeName", "empId", "date", "timeIn", "timeOut", "otHours", "shift", "status"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-31 18:00:00.000'),

-- 2. Payroll Summary Report
('rpt_002', 'Payroll Summary Report', 'HRMS',
 'Monthly payroll summary with department-wise breakup of gross salary, deductions (PF, ESI, TDS, PT), and net pay disbursement.',
 'Summary', 'Monthly', 'PDF',
 '2025-01-28 12:00:00',
 '{"filters": ["month", "department", "employeeType", "site"], "groupBy": ["department"], "columns": ["department", "employeeCount", "totalGross", "totalPF", "totalESI", "totalTDS", "totalNetPay"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-28 12:00:00.000'),

-- 3. Inventory Stock Report
('rpt_003', 'Inventory Stock Report', 'Inventory',
 'Weekly inventory position report showing current stock, min/max levels, reorder status, and stock movement summary for all warehouses.',
 'Detailed', 'Weekly', 'Excel',
 '2025-01-27 08:00:00',
 '{"filters": ["warehouse", "category", "itemCode", "stockStatus"], "groupBy": ["warehouse", "category"], "columns": ["itemCode", "itemName", "category", "warehouse", "currentStock", "minStock", "maxStock", "unitCost", "stockValue", "status"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-27 08:00:00.000'),

-- 4. Purchase Order Status Report
('rpt_004', 'Purchase Order Status Report', 'Procurement',
 'Tracks all purchase orders from creation to delivery — status, vendor-wise pending orders, delayed deliveries, and value summary.',
 'Detailed', 'Weekly', 'PDF',
 '2025-01-26 10:00:00',
 '{"filters": ["vendor", "status", "dateRange", "site"], "groupBy": ["vendor", "status"], "columns": ["poNo", "vendor", "item", "amount", "orderDate", "deliveryDate", "grnStatus", "status"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-26 10:00:00.000'),

-- 5. Sales Pipeline Report
('rpt_005', 'Sales Pipeline Report', 'Sales',
 'Sales pipeline report tracking quotations, conversion rates, stage-wise values, and expected revenue from active deals.',
 'Analytical', 'Weekly', 'PDF',
 '2025-01-25 09:00:00',
 '{"filters": ["customer", "stage", "dateRange", "salesPerson"], "groupBy": ["stage", "customer"], "columns": ["quotationNo", "customer", "amount", "stage", "probability", "expectedCloseDate", "daysInStage"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-25 09:00:00.000'),

-- 6. Project Progress Report
('rpt_006', 'Project Progress Report', 'Projects',
 'Weekly project progress report with task completion %, milestone tracking, resource utilisation, and deviation from baseline schedule.',
 'Analytical', 'Weekly', 'PDF',
 '2025-01-25 17:00:00',
 '{"filters": ["project", "status", "dateRange"], "groupBy": ["project"], "columns": ["projectName", "client", "plannedProgress", "actualProgress", "tasksCompleted", "tasksPending", "milestonesAchieved", "resourceUtilisation", "variance"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-25 17:00:00.000'),

-- 7. Financial Summary Report
('rpt_007', 'Financial Summary Report', 'Finance',
 'Monthly financial snapshot — revenue, operating expenses, accounts receivable/payable ageing, cash flow, and budget vs actual analysis.',
 'Summary', 'Monthly', 'PDF',
 '2025-01-30 16:00:00',
 '{"filters": ["period", "costCenter", "accountGroup"], "groupBy": ["accountGroup", "costCenter"], "columns": ["accountGroup", "budgeted", "actual", "variance", "variancePercent"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-30 16:00:00.000'),

-- 8. Asset Register Report
('rpt_008', 'Asset Register Report', 'Assets',
 'Complete asset register with acquisition details, current location/assignment, depreciation, maintenance history, and disposal status.',
 'Detailed', 'Monthly', 'Excel',
 '2025-01-31 10:00:00',
 '{"filters": ["category", "site", "status", "department"], "groupBy": ["category", "site"], "columns": ["assetId", "name", "category", "location", "assignedTo", "purchaseDate", "purchaseCost", "currentValue", "depreciation", "status"]}',
 'Active', '2025-01-01 00:00:00.000', '2025-01-31 10:00:00.000');


-- ============================================================================
-- 19.4 DASHBOARD CONFIG (4 records)
-- Role-based dashboards for Management, HR, Finance, and Operations teams
-- ============================================================================

-- 1. Management Dashboard — CEO/Directors overview
INSERT INTO DashboardConfig (id, name, module, description, layout, widgets, roles, refreshInterval, isDefault, status, createdAt, updatedAt) VALUES
('dash_001', 'Management Dashboard', NULL,
 'Executive overview dashboard for senior management — provides a bird-eye view of all key business metrics across HR, Finance, Projects, and Operations.',
 '{"type": "grid", "columns": 4, "rows": 6, "gap": 16}',
 '[
   {"id": "w_revenue_trend", "type": "lineChart", "title": "Revenue Trend (6 Months)", "row": 1, "col": 1, "width": 2, "height": 2, "dataModule": "Finance"},
   {"id": "w_project_status", "type": "pieChart", "title": "Project Status Breakdown", "row": 1, "col": 3, "width": 2, "height": 2, "dataModule": "Projects"},
   {"id": "w_headcount", "type": "kpiCard", "title": "Total Headcount", "row": 3, "col": 1, "width": 1, "height": 1, "dataModule": "HRMS"},
   {"id": "w_pending_invoices", "type": "kpiCard", "title": "Pending Invoices (₹ Lakhs)", "row": 3, "col": 2, "width": 1, "height": 1, "dataModule": "Finance"},
   {"id": "w_active_projects", "type": "kpiCard", "title": "Active Projects", "row": 3, "col": 3, "width": 1, "height": 1, "dataModule": "Projects"},
   {"id": "w_safety_incidents", "type": "kpiCard", "title": "Safety Incidents (MTD)", "row": 3, "col": 4, "width": 1, "height": 1, "dataModule": "HSE"},
   {"id": "w_attendance_trend", "type": "barChart", "title": "Site-wise Attendance (%)", "row": 4, "col": 1, "width": 2, "height": 2, "dataModule": "HRMS"},
   {"id": "w_budget_variance", "type": "barChart", "title": "Budget vs Actual by Department", "row": 4, "col": 3, "width": 2, "height": 2, "dataModule": "Finance"},
   {"id": "w_po_pipeline", "type": "table", "title": "Recent PO Activity", "row": 6, "col": 1, "width": 4, "height": 1, "dataModule": "Procurement"}
 ]',
 '["Admin", "Manager"]',
 300, TRUE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- 2. HR Dashboard — HR Manager & Executives
INSERT INTO DashboardConfig (id, name, module, description, layout, widgets, roles, refreshInterval, isDefault, status, createdAt, updatedAt) VALUES
('dash_002', 'HR Dashboard', 'HRMS',
 'HR management dashboard tracking attendance rates, leave utilisation, payroll status, recruitment pipeline, and employee distribution across sites.',
 '{"type": "grid", "columns": 3, "rows": 4, "gap": 16}',
 '[
   {"id": "w_attendance_today", "type": "kpiCard", "title": "Today''s Attendance (%)", "row": 1, "col": 1, "width": 1, "height": 1, "dataModule": "HRMS"},
   {"id": "w_leave_pending", "type": "kpiCard", "title": "Pending Leave Requests", "row": 1, "col": 2, "width": 1, "height": 1, "dataModule": "HRMS"},
   {"id": "w_payroll_status", "type": "kpiCard", "title": "Payroll Pending (Count)", "row": 1, "col": 3, "width": 1, "height": 1, "dataModule": "HRMS"},
   {"id": "w_site_attendance", "type": "barChart", "title": "Site-wise Attendance (7 Days)", "row": 2, "col": 1, "width": 2, "height": 2, "dataModule": "HRMS"},
   {"id": "w_leave_breakdown", "type": "pieChart", "title": "Leave Type Distribution", "row": 2, "col": 3, "width": 1, "height": 2, "dataModule": "HRMS"},
   {"id": "w_dept_headcount", "type": "barChart", "title": "Department-wise Headcount", "row": 4, "col": 1, "width": 2, "height": 1, "dataModule": "HRMS"},
   {"id": "w_open_positions", "type": "kpiCard", "title": "Open Job Positions", "row": 4, "col": 3, "width": 1, "height": 1, "dataModule": "HRMS"}
 ]',
 '["HR/Finance", "Admin", "Manager"]',
 300, FALSE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- 3. Finance Dashboard — CFO, Finance Manager, Accounts Team
INSERT INTO DashboardConfig (id, name, module, description, layout, widgets, roles, refreshInterval, isDefault, status, createdAt, updatedAt) VALUES
('dash_003', 'Finance Dashboard', 'Finance',
 'Finance dashboard for tracking accounts payable/receivable, cash flow position, budget utilisation, tax compliance status, and bank balances.',
 '{"type": "grid", "columns": 3, "rows": 5, "gap": 16}',
 '[
   {"id": "w_cash_balance", "type": "kpiCard", "title": "Total Bank Balance (₹)", "row": 1, "col": 1, "width": 1, "height": 1, "dataModule": "Finance"},
   {"id": "w_ap_outstanding", "type": "kpiCard", "title": "AP Outstanding (₹ Lakhs)", "row": 1, "col": 2, "width": 1, "height": 1, "dataModule": "Finance"},
   {"id": "w_ar_outstanding", "type": "kpiCard", "title": "AR Outstanding (₹ Lakhs)", "row": 1, "col": 3, "width": 1, "height": 1, "dataModule": "Finance"},
   {"id": "w_ap_ar_trend", "type": "lineChart", "title": "AP & AR Trend (6 Months)", "row": 2, "col": 1, "width": 2, "height": 2, "dataModule": "Finance"},
   {"id": "w_ap_ageing", "type": "barChart", "title": "AP Ageing (0-30 / 31-60 / 61-90 / 90+ days)", "row": 2, "col": 3, "width": 1, "height": 2, "dataModule": "Finance"},
   {"id": "w_budget_utilisation", "type": "gaugeChart", "title": "Budget Utilisation (%)", "row": 4, "col": 1, "width": 1, "height": 1, "dataModule": "Finance"},
   {"id": "w_tax_pending", "type": "kpiCard", "title": "Tax Dues Pending (₹)", "row": 4, "col": 2, "width": 1, "height": 1, "dataModule": "Finance"},
   {"id": "w_recent_payments", "type": "table", "title": "Recent Payments Made", "row": 4, "col": 3, "width": 1, "height": 1, "dataModule": "Finance"},
   {"id": "w_expense_category", "type": "pieChart", "title": "Expense by Category", "row": 5, "col": 1, "width": 2, "height": 1, "dataModule": "Finance"},
   {"id": "w_journal_count", "type": "kpiCard", "title": "Journal Entries (MTD)", "row": 5, "col": 3, "width": 1, "height": 1, "dataModule": "Finance"}
 ]',
 '["HR/Finance", "Admin"]',
 600, FALSE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000'),

-- 4. Operations Dashboard — Site Incharges, Planning Engineers, Ops Managers
INSERT INTO DashboardConfig (id, name, module, description, layout, widgets, roles, refreshInterval, isDefault, status, createdAt, updatedAt) VALUES
('dash_004', 'Operations Dashboard', 'Operations',
 'Operations dashboard for monitoring active projects, work order status, equipment utilisation, and site safety metrics across all plant locations.',
 '{"type": "grid", "columns": 3, "rows": 4, "gap": 16}',
 '[
   {"id": "w_active_wo", "type": "kpiCard", "title": "Active Work Orders", "row": 1, "col": 1, "width": 1, "height": 1, "dataModule": "Operations"},
   {"id": "w_equipment_util", "type": "kpiCard", "title": "Equipment Utilisation (%)", "row": 1, "col": 2, "width": 1, "height": 1, "dataModule": "Operations"},
   {"id": "w_safety_score", "type": "kpiCard", "title": "Safety Score (MTD)", "row": 1, "col": 3, "width": 1, "height": 1, "dataModule": "Operations"},
   {"id": "w_project_progress", "type": "barChart", "title": "Project Progress (%)", "row": 2, "col": 1, "width": 2, "height": 2, "dataModule": "Projects"},
   {"id": "w_wo_status", "type": "pieChart", "title": "Work Order Status", "row": 2, "col": 3, "width": 1, "height": 2, "dataModule": "Operations"},
   {"id": "w_stock_alerts", "type": "table", "title": "Low Stock Alerts", "row": 4, "col": 1, "width": 2, "height": 1, "dataModule": "Inventory"},
   {"id": "w_overdue_tasks", "type": "kpiCard", "title": "Overdue Tasks", "row": 4, "col": 3, "width": 1, "height": 1, "dataModule": "Projects"}
 ]',
 '["Admin", "Manager", "Engineer", "Supervisor"]',
 300, FALSE, 'Active', '2025-01-01 00:00:00.000', '2025-01-01 00:00:00.000');
