-- ============================================================================
-- VoltCore ERP - MySQL Database Script
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- Version : 1.0.0
-- Charset : utf8mb4 / utf8mb4_unicode_ci
-- Engine  : InnoDB
-- ============================================================================
-- Summary:
--   - 34 tables covering: HRMS, Projects, Sites, Attendance, Leave, Payroll,
--     Work Permits, Incidents, Equipment, Expenses, Purchase Orders, Invoices,
--     Subcontractors, Recruitment, Shift Schedules, Certifications, Training,
--     Company Settings, Organization (Dept/Designation), Inventory, Sales,
--     CRM, Support, Knowledgebase, Finance (Ledger, AP, AR, Journal, Bank,
--     Tax, Budget)
--   - Realistic Indian plant maintenance contractor mock data (2024-2025)
--   - Foreign key constraints with ON DELETE CASCADE
--   - Proper indexing on foreign keys and unique columns
-- ============================================================================

DROP DATABASE IF EXISTS voltcore_erp;

CREATE DATABASE voltcore_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE voltcore_erp;

-- ============================================================================
-- TABLE: CompanySettings
-- ============================================================================
CREATE TABLE CompanySettings (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  `key`     VARCHAR(255) NOT NULL UNIQUE,
  value     TEXT         NOT NULL,
  label     VARCHAR(255) NOT NULL,
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Site
-- ============================================================================
CREATE TABLE Site (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  state     VARCHAR(255) NOT NULL,
  project   VARCHAR(255) NOT NULL,
  manpower  INT          NOT NULL DEFAULT 0,
  incharge  VARCHAR(255) NOT NULL,
  status    VARCHAR(255) NOT NULL DEFAULT 'Active',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Project
-- ============================================================================
CREATE TABLE Project (
  id            VARCHAR(25)  NOT NULL PRIMARY KEY,
  code          VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  client        VARCHAR(255) NOT NULL,
  type          VARCHAR(255) NOT NULL,
  contractValue VARCHAR(255) NOT NULL,
  startDate     VARCHAR(255) NOT NULL,
  endDate       VARCHAR(255) NOT NULL,
  progress      INT          NOT NULL DEFAULT 0,
  people        INT          NOT NULL DEFAULT 0,
  status        VARCHAR(255) NOT NULL DEFAULT 'On Track',
  site          VARCHAR(255) NOT NULL,
  createdAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Department
-- ============================================================================
CREATE TABLE Department (
  id            VARCHAR(25)  NOT NULL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL UNIQUE,
  head          VARCHAR(255) DEFAULT NULL,
  location      VARCHAR(255) NOT NULL,
  employeeCount INT          NOT NULL DEFAULT 0,
  status        VARCHAR(255) NOT NULL DEFAULT 'Active',
  createdAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Designation
-- ============================================================================
CREATE TABLE Designation (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  department  VARCHAR(255) NOT NULL,
  level       VARCHAR(255) NOT NULL,
  minSalary   DOUBLE       NOT NULL DEFAULT 0,
  maxSalary   DOUBLE       NOT NULL DEFAULT 0,
  status      VARCHAR(255) NOT NULL DEFAULT 'Active',
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Employee
-- ============================================================================
CREATE TABLE Employee (
  id            VARCHAR(25)  NOT NULL PRIMARY KEY,
  empId         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) DEFAULT NULL,
  phone         VARCHAR(255) DEFAULT NULL,
  trade         VARCHAR(255) NOT NULL,
  role          VARCHAR(255) NOT NULL,
  site          VARCHAR(255) NOT NULL,
  type          VARCHAR(255) NOT NULL DEFAULT 'Staff',
  status        VARCHAR(255) NOT NULL DEFAULT 'Active',
  joiningDate   VARCHAR(255) NOT NULL,
  certifications VARCHAR(255) NOT NULL DEFAULT '',
  createdAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_employee_empId (empId),
  INDEX idx_employee_site (site),
  INDEX idx_employee_trade (trade),
  INDEX idx_employee_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Attendance
-- ============================================================================
CREATE TABLE Attendance (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  empId     VARCHAR(25)  NOT NULL,
  site      VARCHAR(255) NOT NULL,
  date      VARCHAR(255) NOT NULL,
  timeIn    VARCHAR(255) DEFAULT NULL,
  timeOut   VARCHAR(255) DEFAULT NULL,
  otHours   DOUBLE       NOT NULL DEFAULT 0,
  shift     VARCHAR(255) DEFAULT NULL,
  status    VARCHAR(255) NOT NULL DEFAULT 'Present',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_attendance_empId (empId),
  INDEX idx_attendance_date (date),
  INDEX idx_attendance_site (site),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: LeaveRequest
-- ============================================================================
CREATE TABLE LeaveRequest (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  empId       VARCHAR(25)  NOT NULL,
  site        VARCHAR(255) NOT NULL,
  type        VARCHAR(255) NOT NULL,
  fromDate    VARCHAR(255) NOT NULL,
  toDate      VARCHAR(255) NOT NULL,
  days        INT          NOT NULL,
  reason      VARCHAR(255) NOT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'Pending',
  appliedDate VARCHAR(255) NOT NULL,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_leaveRequest_empId (empId),
  INDEX idx_leaveRequest_status (status),
  CONSTRAINT fk_leaveRequest_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Payroll
-- ============================================================================
CREATE TABLE Payroll (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  empId     VARCHAR(25)  NOT NULL,
  month     VARCHAR(255) NOT NULL,
  days      INT          NOT NULL,
  basic     DOUBLE       NOT NULL,
  hra       DOUBLE       NOT NULL,
  ot        DOUBLE       NOT NULL DEFAULT 0,
  gross     DOUBLE       NOT NULL,
  pf        DOUBLE       NOT NULL,
  esi       DOUBLE       NOT NULL DEFAULT 0,
  tds       DOUBLE       NOT NULL DEFAULT 0,
  netPay    DOUBLE       NOT NULL,
  status    VARCHAR(255) NOT NULL DEFAULT 'Pending',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_payroll_empId (empId),
  INDEX idx_payroll_month (month),
  CONSTRAINT fk_payroll_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: WorkPermit
-- ============================================================================
CREATE TABLE WorkPermit (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  permitNo     VARCHAR(255) NOT NULL UNIQUE,
  type         VARCHAR(255) NOT NULL,
  location     VARCHAR(255) NOT NULL,
  issuedTo     VARCHAR(255) NOT NULL,
  expiry       VARCHAR(255) NOT NULL,
  status       VARCHAR(255) NOT NULL DEFAULT 'Active',
  description  TEXT         DEFAULT NULL,
  precautions  TEXT         DEFAULT NULL,
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Incident
-- ============================================================================
CREATE TABLE Incident (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  refNo       VARCHAR(255) NOT NULL UNIQUE,
  date        VARCHAR(255) NOT NULL,
  site        VARCHAR(255) NOT NULL,
  type        VARCHAR(255) NOT NULL,
  severity    VARCHAR(255) NOT NULL,
  person      VARCHAR(255) NOT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'Investigating',
  description TEXT         DEFAULT NULL,
  action      TEXT         DEFAULT NULL,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Equipment
-- ============================================================================
CREATE TABLE Equipment (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  eqId        VARCHAR(255) NOT NULL UNIQUE,
  site        VARCHAR(255) NOT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'Operational',
  lastPM      VARCHAR(255) DEFAULT NULL,
  nextPM      VARCHAR(255) DEFAULT NULL,
  issue       TEXT         DEFAULT NULL,
  downSince   VARCHAR(255) DEFAULT NULL,
  etaRepair   VARCHAR(255) DEFAULT NULL,
  assignedTo  VARCHAR(255) DEFAULT NULL,
  utilization INT          NOT NULL DEFAULT 0,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Expense
-- ============================================================================
CREATE TABLE Expense (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  claimNo   VARCHAR(255) NOT NULL UNIQUE,
  empId     VARCHAR(25)  NOT NULL,
  category  VARCHAR(255) NOT NULL,
  amount    DOUBLE       NOT NULL,
  project   VARCHAR(255) NOT NULL,
  date      VARCHAR(255) NOT NULL,
  status    VARCHAR(255) NOT NULL DEFAULT 'Pending',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_expense_empId (empId),
  INDEX idx_expense_status (status),
  CONSTRAINT fk_expense_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: PurchaseOrder
-- ============================================================================
CREATE TABLE PurchaseOrder (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  poNo      VARCHAR(255) NOT NULL UNIQUE,
  vendor    VARCHAR(255) NOT NULL,
  item      VARCHAR(255) NOT NULL,
  amount    DOUBLE       NOT NULL,
  project   VARCHAR(255) NOT NULL,
  delivery  VARCHAR(255) NOT NULL,
  grn       VARCHAR(255) NOT NULL DEFAULT 'Awaited',
  status    VARCHAR(255) NOT NULL DEFAULT 'Open',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Invoice
-- ============================================================================
CREATE TABLE Invoice (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  invNo     VARCHAR(255) NOT NULL UNIQUE,
  client    VARCHAR(255) NOT NULL,
  project   VARCHAR(255) NOT NULL,
  amount    VARCHAR(255) NOT NULL,
  date      VARCHAR(255) NOT NULL,
  dueDate   VARCHAR(255) NOT NULL,
  status    VARCHAR(255) NOT NULL DEFAULT 'Under Review',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Subcontractor
-- ============================================================================
CREATE TABLE Subcontractor (
  id         VARCHAR(25)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  trade      VARCHAR(255) NOT NULL,
  workers    INT          NOT NULL DEFAULT 0,
  site       VARCHAR(255) NOT NULL,
  pfReg      VARCHAR(255) NOT NULL DEFAULT 'Pending',
  esiReg     VARCHAR(255) NOT NULL DEFAULT 'Pending',
  labourLic  VARCHAR(255) NOT NULL DEFAULT 'Pending',
  compliance VARCHAR(255) NOT NULL DEFAULT 'Non-Compliant',
  createdAt  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: JobOpening
-- ============================================================================
CREATE TABLE JobOpening (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  position     VARCHAR(255) NOT NULL,
  site         VARCHAR(255) NOT NULL,
  openings     INT          NOT NULL,
  applications INT          NOT NULL DEFAULT 0,
  priority     VARCHAR(255) NOT NULL,
  status       VARCHAR(255) NOT NULL DEFAULT 'Open',
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: ShiftSchedule
-- ============================================================================
CREATE TABLE ShiftSchedule (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  empId        VARCHAR(255) NOT NULL,
  employeeName VARCHAR(255) NOT NULL,
  site         VARCHAR(255) NOT NULL,
  shift        VARCHAR(255) NOT NULL,
  weekStart    VARCHAR(255) NOT NULL,
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_shiftSchedule_empId (empId),
  INDEX idx_shiftSchedule_site (site)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Certification
-- ============================================================================
CREATE TABLE Certification (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  empId        VARCHAR(255) NOT NULL,
  employeeName VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  issuedBy     VARCHAR(255) NOT NULL,
  issueDate    VARCHAR(255) NOT NULL,
  expiryDate   VARCHAR(255) NOT NULL,
  status       VARCHAR(255) NOT NULL DEFAULT 'Valid',
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_certification_empId (empId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: TrainingSession
-- ============================================================================
CREATE TABLE TrainingSession (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  title     VARCHAR(255) NOT NULL,
  site      VARCHAR(255) NOT NULL,
  trainer   VARCHAR(255) NOT NULL,
  date      VARCHAR(255) NOT NULL,
  duration  VARCHAR(255) NOT NULL,
  attendees INT          NOT NULL DEFAULT 0,
  status    VARCHAR(255) NOT NULL DEFAULT 'Scheduled',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: InventoryItem
-- ============================================================================
CREATE TABLE InventoryItem (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  itemCode     VARCHAR(255) NOT NULL UNIQUE,
  name         VARCHAR(255) NOT NULL,
  category     VARCHAR(255) NOT NULL,
  unit         VARCHAR(255) NOT NULL DEFAULT 'Nos',
  currentStock INT          NOT NULL DEFAULT 0,
  minStock     INT          NOT NULL DEFAULT 0,
  maxStock     INT          NOT NULL DEFAULT 0,
  unitCost     DOUBLE       NOT NULL DEFAULT 0,
  warehouse    VARCHAR(255) NOT NULL,
  status       VARCHAR(255) NOT NULL DEFAULT 'In Stock',
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: StockMovement
-- ============================================================================
CREATE TABLE StockMovement (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  itemCode     VARCHAR(255) NOT NULL,
  itemName     VARCHAR(255) NOT NULL,
  type         VARCHAR(255) NOT NULL,
  quantity     INT          NOT NULL,
  fromWarehouse VARCHAR(255) DEFAULT NULL,
  toWarehouse  VARCHAR(255) DEFAULT NULL,
  reference    VARCHAR(255) DEFAULT NULL,
  date         VARCHAR(255) NOT NULL,
  remarks      TEXT         DEFAULT NULL,
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_stockMovement_itemCode (itemCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Customer
-- ============================================================================
CREATE TABLE Customer (
  id            VARCHAR(25)  NOT NULL PRIMARY KEY,
  code          VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  contactPerson VARCHAR(255) NOT NULL,
  email         VARCHAR(255) DEFAULT NULL,
  phone         VARCHAR(255) DEFAULT NULL,
  address       TEXT         DEFAULT NULL,
  gst           VARCHAR(255) DEFAULT NULL,
  city          VARCHAR(255) DEFAULT NULL,
  state         VARCHAR(255) DEFAULT NULL,
  totalOrders   INT          NOT NULL DEFAULT 0,
  totalRevenue  DOUBLE       NOT NULL DEFAULT 0,
  status        VARCHAR(255) NOT NULL DEFAULT 'Active',
  createdAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: SalesOrder
-- ============================================================================
CREATE TABLE SalesOrder (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  soNo         VARCHAR(255) NOT NULL UNIQUE,
  customer     VARCHAR(255) NOT NULL,
  project      VARCHAR(255) NOT NULL,
  item         VARCHAR(255) NOT NULL,
  quantity     INT          NOT NULL,
  unitPrice    DOUBLE       NOT NULL,
  amount       DOUBLE       NOT NULL,
  orderDate    VARCHAR(255) NOT NULL,
  deliveryDate VARCHAR(255) DEFAULT NULL,
  status       VARCHAR(255) NOT NULL DEFAULT 'Pending',
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: CrmContact
-- ============================================================================
CREATE TABLE CrmContact (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  company     VARCHAR(255) NOT NULL,
  designation VARCHAR(255) DEFAULT NULL,
  email       VARCHAR(255) DEFAULT NULL,
  phone       VARCHAR(255) DEFAULT NULL,
  source      VARCHAR(255) NOT NULL,
  stage       VARCHAR(255) NOT NULL DEFAULT 'Lead',
  value       DOUBLE       NOT NULL DEFAULT 0,
  lastContact VARCHAR(255) DEFAULT NULL,
  notes       TEXT         DEFAULT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'Active',
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: SupportTicket
-- ============================================================================
CREATE TABLE SupportTicket (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  ticketNo    VARCHAR(255) NOT NULL UNIQUE,
  title       VARCHAR(255) NOT NULL,
  raisedBy    VARCHAR(255) NOT NULL,
  category    VARCHAR(255) NOT NULL,
  priority    VARCHAR(255) NOT NULL DEFAULT 'Medium',
  status      VARCHAR(255) NOT NULL DEFAULT 'Open',
  assignedTo  VARCHAR(255) DEFAULT NULL,
  description TEXT         DEFAULT NULL,
  resolution  TEXT         DEFAULT NULL,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: KBArticle
-- ============================================================================
CREATE TABLE KBArticle (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  title     VARCHAR(255) NOT NULL,
  category  VARCHAR(255) NOT NULL,
  content   TEXT         NOT NULL,
  author    VARCHAR(255) NOT NULL,
  tags      VARCHAR(255) NOT NULL DEFAULT '',
  views     INT          NOT NULL DEFAULT 0,
  helpful   INT          NOT NULL DEFAULT 0,
  status    VARCHAR(255) NOT NULL DEFAULT 'Published',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: LedgerAccount
-- ============================================================================
CREATE TABLE LedgerAccount (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  accountCode VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  `group`     VARCHAR(255) NOT NULL,
  type        VARCHAR(255) NOT NULL,
  balance     DOUBLE       NOT NULL DEFAULT 0,
  status      VARCHAR(255) NOT NULL DEFAULT 'Active',
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: AccountsPayable
-- ============================================================================
CREATE TABLE AccountsPayable (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  billNo      VARCHAR(255) NOT NULL UNIQUE,
  vendor      VARCHAR(255) NOT NULL,
  description TEXT         DEFAULT NULL,
  amount      DOUBLE       NOT NULL,
  dueDate     VARCHAR(255) NOT NULL,
  paidDate    VARCHAR(255) DEFAULT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'Pending',
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: AccountsReceivable
-- ============================================================================
CREATE TABLE AccountsReceivable (
  id            VARCHAR(25)  NOT NULL PRIMARY KEY,
  invoiceNo     VARCHAR(255) NOT NULL UNIQUE,
  client        VARCHAR(255) NOT NULL,
  description   TEXT         DEFAULT NULL,
  amount        DOUBLE       NOT NULL,
  dueDate       VARCHAR(255) NOT NULL,
  receivedDate  VARCHAR(255) DEFAULT NULL,
  status        VARCHAR(255) NOT NULL DEFAULT 'Pending',
  createdAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: JournalEntry
-- ============================================================================
CREATE TABLE JournalEntry (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  entryNo     VARCHAR(255) NOT NULL UNIQUE,
  date        VARCHAR(255) NOT NULL,
  account     VARCHAR(255) NOT NULL,
  debit       DOUBLE       NOT NULL DEFAULT 0,
  credit      DOUBLE       NOT NULL DEFAULT 0,
  description TEXT         DEFAULT NULL,
  reference   VARCHAR(255) DEFAULT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'Posted',
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: BankAccount
-- ============================================================================
CREATE TABLE BankAccount (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  accountName VARCHAR(255) NOT NULL,
  bankName    VARCHAR(255) NOT NULL,
  accountNo   VARCHAR(255) NOT NULL UNIQUE,
  type        VARCHAR(255) NOT NULL DEFAULT 'Current',
  balance     DOUBLE       NOT NULL DEFAULT 0,
  status      VARCHAR(255) NOT NULL DEFAULT 'Active',
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: TaxRecord
-- ============================================================================
CREATE TABLE TaxRecord (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  taxType   VARCHAR(255) NOT NULL,
  period    VARCHAR(255) NOT NULL,
  amount    DOUBLE       NOT NULL,
  dueDate   VARCHAR(255) NOT NULL,
  paidDate  VARCHAR(255) DEFAULT NULL,
  status    VARCHAR(255) NOT NULL DEFAULT 'Pending',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: BudgetItem
-- ============================================================================
CREATE TABLE BudgetItem (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  category    VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  planned     DOUBLE       NOT NULL,
  actual      DOUBLE       NOT NULL DEFAULT 0,
  period      VARCHAR(255) NOT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'On Track',
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

