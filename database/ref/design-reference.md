# VoltCore ERP — MySQL Database Design Reference

## Company: VoltCore Engineering Pvt Ltd
## Domain: Industrial Plant Maintenance Contractor (India)
## Database: voltcore_erp | Charset: utf8mb4 | Engine: InnoDB

---

## 1. GLOBAL CONVENTIONS

- **ID**: VARCHAR(25), auto-generated strings with meaningful prefixes
- **Timestamps**: DATETIME(3), `createdAt DEFAULT CURRENT_TIMESTAMP(3)`, `updatedAt DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`
- **FK**: All foreign keys use `ON DELETE CASCADE` unless noted
- **INDEX**: Create indexes on all FK columns and frequently queried columns
- **UNIQUE**: All code/no fields must be UNIQUE
- **Engine**: InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
- **Status defaults**: 'Active', 'Pending', 'Open', etc. as appropriate
- **NULL handling**: Core fields NOT NULL, optional fields DEFAULT NULL

---

## 2. SHARED REFERENCE DATA (ALL AGENTS MUST USE THESE EXACT IDs)

### 2.1 Departments (8 records)
| ID | Code | Name | Location |
|----|------|------|----------|
| dept_001 | ENG | Engineering | Mumbai HQ |
| dept_002 | MP | Maintenance Planning | Mumbai HQ |
| dept_003 | HSE | Safety & HSE | Mumbai HQ |
| dept_004 | FIN | Finance | Mumbai HQ |
| dept_005 | HR | Human Resources | Mumbai HQ |
| dept_006 | PROC | Procurement | Mumbai HQ |
| dept_007 | QC | QA/QC | Mumbai HQ |
| dept_008 | OPS | Operations | Mumbai HQ |

### 2.2 Sites (6 records)
| ID | Name | State |
|----|------|-------|
| site_001 | Reliance Jamnagar Refinery | Gujarat |
| site_002 | Tata Steel Plant, Jamshedpur | Jharkhand |
| site_003 | NTPC Singrauli Super Thermal | Madhya Pradesh |
| site_004 | UltraTech Cement, Tadipatri | Andhra Pradesh |
| site_005 | IOCL Panipat Refinery | Haryana |
| site_006 | JSW Steel Plant, Vijayanagar | Karnataka |

### 2.3 Projects (6 records)
| ID | Code | Name | Client | Type | Status |
|----|------|------|--------|------|--------|
| proj_001 | AMC-001 | Reliance Jamnagar AMC | Reliance Industries | AMC | In Progress |
| proj_002 | SHD-001 | Tata Steel BF-3 Shutdown | Tata Steel | Shutdown | In Progress |
| proj_003 | AMC-002 | NTPC Singrauli O&M | NTPC Ltd | O&M | In Progress |
| proj_004 | PM-001 | UltraTech Kiln PM | UltraTech Cement | Preventive | In Progress |
| proj_005 | SHD-002 | IOCL Panipat CDU Turnaround | IOCL | Turnaround | Planning |
| proj_006 | AMC-003 | JSW Hot Strip Mill Maintenance | JSW Steel | AMC | In Progress |

### 2.4 Employees (25 records) — CRITICAL: referenced by many tables
| ID | EmpID | Name | Department | Designation | Site | Trade/Role | Type |
|-----|-------|------|------------|-------------|------|------------|------|
| emp_0001 | VC-001 | Rajesh Mehta | dept_001 | Senior Engineer | site_001 | Mechanical | Staff |
| emp_0002 | VC-002 | Sanjay Kumar Singh | dept_008 | Site Supervisor | site_002 | Mechanical | Staff |
| emp_0003 | VC-003 | Vikram Pandey | dept_008 | Site Incharge | site_003 | Electrical | Staff |
| emp_0004 | VC-004 | Nagarjuna Reddy | dept_002 | Planning Engineer | site_004 | Mechanical | Staff |
| emp_0005 | VC-005 | Arun Sharma | dept_001 | Project Engineer | site_005 | Instrumentation | Staff |
| emp_0006 | VC-006 | Pradeep Rao | dept_008 | Site Supervisor | site_006 | Electrical | Staff |
| emp_0007 | VC-007 | Amit Joshi | dept_001 | Engineer | site_001 | Electrical | Staff |
| emp_0008 | VC-008 | Suresh Patel | dept_001 | Engineer | site_001 | Mechanical | Staff |
| emp_0009 | VC-009 | Deepak Verma | dept_003 | Safety Officer | site_003 | HSE | Staff |
| emp_0010 | VC-010 | Mahesh Kumar | dept_008 | Supervisor | site_002 | Welding | Staff |
| emp_0011 | VC-011 | Kiran Nair | dept_005 | HR Executive | site_001 | HR | Staff |
| emp_0012 | VC-012 | Priya Sharma | dept_004 | Accounts Executive | HQ | Finance | Staff |
| emp_0013 | VC-013 | Ravi Tiwari | dept_006 | Procurement Officer | HQ | Procurement | Staff |
| emp_0014 | VC-014 | Senthil Kumar | dept_007 | QA/QC Inspector | site_003 | QA/QC | Staff |
| emp_0015 | VC-015 | Mohan Lal | dept_008 | Technician | site_001 | Fitter | Labour |
| emp_0016 | VC-016 | Raju Yadav | dept_008 | Technician | site_002 | Welder | Labour |
| emp_0017 | VC-017 | Anil Gupta | dept_002 | Planner | HQ | Planning | Staff |
| emp_0018 | VC-018 | Suresh M | dept_008 | Technician | site_003 | Electrician | Labour |
| emp_0019 | VC-019 | Venkat Rao | dept_001 | Engineer | site_004 | Mechanical | Staff |
| emp_0020 | VC-020 | Ashok Pandit | dept_003 | Safety Officer | site_001 | HSE | Staff |
| emp_0021 | VC-021 | Manoj Singh | dept_008 | Technician | site_005 | Fitter | Labour |
| emp_0022 | VC-022 | Dilip Das | dept_008 | Technician | site_006 | Electrician | Labour |
| emp_0023 | VC-023 | Ganesh Patil | dept_006 | Store Keeper | site_001 | Stores | Staff |
| emp_0024 | VC-024 | Rahul Deshmukh | dept_004 | Finance Manager | HQ | Finance | Staff |
| emp_0025 | VC-025 | Kavita Reddy | dept_005 | HR Manager | HQ | HR | Staff |

### 2.5 Warehouses (4 records)
| ID | Code | Name | Location |
|----|------|------|----------|
| wh_001 | WH-JMG | Jamnagar Central Store | site_001 |
| wh_002 | WH-JSD | Jamshedpur Site Store | site_002 |
| wh_003 | WH-SNG | Singrauli Warehouse | site_003 |
| wh_004 | WH-HQ | Mumbai HQ Store | Mumbai HQ |

### 2.6 Vendors (8 records)
| ID | Code | Name | City |
|----|------|------|------|
| vendor_001 | VND-001 | Bharat Engineering Supplies | Mumbai |
| vendor_002 | VND-002 | SKF India Ltd | Pune |
| vendor_003 | VND-003 | Siemens India | Mumbai |
| vendor_004 | VND-004 | ABB India Ltd | Bengaluru |
| vendor_005 | VND-005 | Indian Oil Petrochemicals | Delhi |
| vendor_006 | VND-006 | Timken India | Jamshedpur |
| vendor_007 | VND-007 | Godrej & Boyce | Mumbai |
| vendor_008 | VND-008 | L&T Valves | Chennai |

### 2.7 Customers (8 records)
| ID | Code | Name | City | State |
|----|------|------|------|-------|
| cust_001 | CUST-001 | Reliance Industries Ltd | Jamnagar | Gujarat |
| cust_002 | CUST-002 | Tata Steel Ltd | Jamshedpur | Jharkhand |
| cust_003 | CUST-003 | NTPC Ltd | New Delhi | Delhi |
| cust_004 | CUST-004 | UltraTech Cement Ltd | Mumbai | Maharashtra |
| cust_005 | CUST-005 | Indian Oil Corporation Ltd | New Delhi | Delhi |
| cust_006 | CUST-006 | JSW Steel Ltd | Mumbai | Maharashtra |
| cust_007 | CUST-007 | Adani Power Ltd | Ahmedabad | Gujarat |
| cust_008 | CUST-008 | Hindalco Industries | Mumbai | Maharashtra |

### 2.8 Roles (6 records)
| ID | Name |
|----|------|
| role_001 | Admin |
| role_002 | Manager |
| role_003 | Engineer |
| role_004 | Supervisor |
| role_005 | Technician |
| role_006 | HR/Finance |

---

## 3. MODULE ASSIGNMENTS (20 Agents)

### Agent 1: DDL Base — CompanySettings
- File: `/home/z/my-project/database/modules/module_01_settings.sql`
- Tables: CompanySettings
- Data: 10 config records (company_name, PAN, GST, PF, ESI, address, leave policies, shift config)

### Agent 2: User & Access Control
- File: `/home/z/my-project/database/modules/module_02_users.sql`
- Tables: Role, Permission, User
- FK: User.role → Role, User.department → Department
- Data: 6 roles, 15 permissions, 10 users

### Agent 3: Department & Designation
- File: `/home/z/my-project/database/modules/module_03_dept_desig.sql`
- Tables: Department, Designation
- FK: Designation.department → Department
- Data: 8 departments, 12 designations

### Agent 4: Employee Master
- File: `/home/z/my-project/database/modules/module_04_employees.sql`
- Tables: Employee
- FK: Employee.department → Department
- Data: 25 employees (use EXACT IDs from Section 2.4)

### Agent 5: Attendance & Punch Log
- File: `/home/z/my-project/database/modules/module_05_attendance.sql`
- Tables: Attendance, PunchLog
- FK: empId → Employee(id)
- Data: 30 attendance records, 20 punch log records
- Note: PunchLog should have source values: 'Face Recognition', 'Thumb Impression', 'RFID Card', 'Manual'

### Agent 6: Leave Management
- File: `/home/z/my-project/database/modules/module_06_leave.sql`
- Tables: LeaveRequest, LeaveBalance
- FK: empId → Employee(id)
- Data: 15 leave requests, 25 leave balance records (one per employee)
- Types: EL, SL, CL, Compensatory Off, Maternity

### Agent 7: Payroll
- File: `/home/z/my-project/database/modules/module_07_payroll.sql`
- Tables: Payroll
- FK: empId → Employee(id)
- Data: 25 payroll records (Jan 2025)
- Columns: basic, hra, da, ot, allowances, gross, pf, esi, tds, pt, deductions, netPay

### Agent 8: Timesheet
- File: `/home/z/my-project/database/modules/module_08_timesheet.sql`
- Tables: Timesheet, TimesheetEntry
- FK: Timesheet.empId → Employee(id), TimesheetEntry.timesheetId → Timesheet(id), project FK to Project(id)
- Data: 10 timesheets with 3-5 entries each
- Include otHours, syncStatus from punch data

### Agent 9: Performance & Recruitment
- File: `/home/z/my-project/database/modules/module_09_performance.sql`
- Tables: PerformanceReview, JobOpening, Candidate
- FK: empId → Employee(id), JobOpening.department → Department, Candidate.jobOpeningId → JobOpening
- Data: 10 performance reviews, 5 job openings, 15 candidates

### Agent 10: Inventory Management
- File: `/home/z/my-project/database/modules/module_10_inventory.sql`
- Tables: Warehouse, InventoryItem, StockMovement
- FK: InventoryItem.warehouse → Warehouse(id)
- Data: 4 warehouses, 25 inventory items, 20 stock movements
- Items should be maintenance spares: bearings, seals, gaskets, motors, valves, belts, etc.

### Agent 11: Procurement
- File: `/home/z/my-project/database/modules/module_11_procurement.sql`
- Tables: PurchaseRequisition, RequisitionItem, VendorQuotation
- FK: RequisitionItem.requisitionId → PurchaseRequisition(id), VendorQuotation.requisitionId → PurchaseRequisition(id)
- Data: 8 purchase requisitions, 15-20 requisition items, 12 vendor quotations

### Agent 12: Purchase Management
- File: `/home/z/my-project/database/modules/module_12_purchases.sql`
- Tables: Vendor, PurchaseOrder, PurchaseOrderItem, GoodsReceipt
- FK: PurchaseOrder.vendor → Vendor(id), PurchaseOrderItem.poId → PurchaseOrder(id), GoodsReceipt.poId → PurchaseOrder(id)
- Data: 8 vendors, 10 purchase orders, 20-25 PO items, 8 goods receipts

### Agent 13: Sales — Quotations & Orders
- File: `/home/z/my-project/database/modules/module_13_sales.sql`
- Tables: Customer, Quotation, QuotationItem, SalesOrder, SalesOrderItem
- FK: Quotation.customer → Customer(id), SalesOrder.customer → Customer(id), Item FKs to parent tables
- Data: 8 customers, 6 quotations, 15-20 quotation items, 8 sales orders, 20-25 SO items

### Agent 14: Sales — Invoicing & Payments
- File: `/home/z/my-project/database/modules/module_14_invoicing.sql`
- Tables: Invoice, InvoiceItem, Payment
- FK: Invoice.customer → Customer(id), Invoice.salesOrder → SalesOrder(id), Payment.customer → Customer(id), Payment.invoice → Invoice(id)
- Data: 10 invoices, 25-30 invoice items, 8 payments
- Include tax breakdown (CGST, SGST, IGST)

### Agent 15: CRM
- File: `/home/z/my-project/database/modules/module_15_crm.sql`
- Tables: Lead, Enquiry, CustomerInteraction, FollowUp
- FK: Enquiry.leadId → Lead(id), FollowUp FKs to Lead/Enquiry/Customer
- Data: 10 leads, 12 enquiries, 20 interactions, 15 follow-ups
- Stages: Lead, Contacted, Qualified, Proposal, Negotiation, Won, Lost

### Agent 16: Project Management
- File: `/home/z/my-project/database/modules/module_16_projects.sql`
- Tables: Project, Task, Milestone, ProjectResource
- FK: Task.projectId → Project(id), Milestone.projectId → Project(id), ProjectResource FKs
- Data: 6 projects, 25-30 tasks, 12 milestones, 15 project resources

### Agent 17: Manufacturing (Basic)
- File: `/home/z/my-project/database/modules/module_17_manufacturing.sql`
- Tables: BillOfMaterials, BOMItem, WorkOrder, ProductionOrder
- FK: BOMItem.bomId → BillOfMaterials(id), ProductionOrder.bomId → BillOfMaterials(id), ProductionOrder.workOrderId → WorkOrder(id)
- Data: 4 BOMs, 15-20 BOM items, 8 work orders, 6 production orders
- Context: Fabrication of maintenance spares, pump assembly, etc.

### Agent 18: Asset Management
- File: `/home/z/my-project/database/modules/module_18_assets.sql`
- Tables: Asset, AssetMaintenance, AssetAllocation, AssetDisposal
- FK: All → Asset(id)
- Data: 15 assets (tools, equipment, vehicles), 12 maintenance records, 10 allocations, 3 disposals
- Categories: Power Tools, Heavy Equipment, Vehicles, IT Equipment, Safety Equipment

### Agent 19: Workflow & Reporting
- File: `/home/z/my-project/database/modules/module_19_workflow.sql`
- Tables: Workflow, WorkflowStep, ReportTemplate, DashboardConfig
- FK: WorkflowStep.workflowId → Workflow(id)
- Data: 6 workflows, 15 workflow steps, 8 report templates, 4 dashboard configs
- Workflows for: Purchase Approval, Leave Approval, Expense Approval, Work Order Approval, PO Approval, Invoice Approval

### Agent 20: Finance & Accounting
- File: `/home/z/my-project/database/modules/module_20_finance.sql`
- Tables: LedgerAccount, JournalEntry, AccountsPayable, AccountsReceivable, BankAccount, BankTransaction, TaxRecord, BudgetItem
- FK: BankTransaction.bankAccountId → BankAccount(id)
- Data: 12 ledger accounts, 20 journal entries, 10 AP, 10 AR, 3 bank accounts, 15 bank transactions, 6 tax records, 8 budget items

---

## 4. SQL OUTPUT FORMAT

Each module file MUST follow this format:

```sql
-- ============================================================================
-- MODULE XX: Module Name
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================

-- [CREATE TABLE statements with proper FK constraints]
-- [INSERT statements with realistic Indian plant maintenance data]
-- [Comments explaining the data context]
```

### DO NOT include:
- DROP DATABASE / CREATE DATABASE (handled by Agent 1)
- USE voltcore_erp (handled by Agent 1)
- Semicolon after last statement in file (merge will handle separators)

### MUST include:
- All DDL first, then all INSERTs
- Proper FK constraints referencing the correct tables/IDs from Section 2
- 5-10 realistic data records per table minimum
- Comments explaining the plant maintenance context
