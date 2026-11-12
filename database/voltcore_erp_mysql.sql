-- ============================================================================
-- VoltCore ERP - MySQL Database Script
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Indian Power Plant EPC Contractor
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
--   - Realistic Indian power plant contractor mock data (2024-2025)
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


-- ############################################################################
-- #                                                                          #
-- #                          M O C K   D A T A                              #
-- #                                                                          #
-- ############################################################################

-- ============================================================================
-- CompanySettings (10 records)
-- ============================================================================
INSERT INTO CompanySettings (id, `key`, value, label, createdAt, updatedAt) VALUES
('cls001companysettings001', 'company_name', 'VoltCore Engineering Pvt Ltd', 'Company Name', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls002companysettings002', 'pan', 'AABCV1234F', 'PAN Number', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls003companysettings003', 'gst', '27AABCV1234F1ZV', 'GST Registration No', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls004companysettings004', 'pf_reg', 'MHBAN0012345000', 'PF Registration No', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls005companysettings005', 'esi_reg', '31-00-123456-000-0001', 'ESI Registration No', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls006companysettings006', 'address', 'Plot No. 42, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra - 400093', 'Registered Address', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls007companysettings007', 'leave_el', '15', 'Earned Leave (per year)', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls008companysettings008', 'leave_sl', '12', 'Sick Leave (per year)', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls009companysettings009', 'leave_cl', '10', 'Casual Leave (per year)', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000'),
('cls010companysettings010', 'shift_config', 'Day A: 06:00-14:00, Day B: 14:00-22:00, Night B: 22:00-06:00, General: 09:00-18:00', 'Shift Configuration', '2024-01-01 09:00:00.000', '2024-01-01 09:00:00.000');

-- ============================================================================
-- Sites (6 records) - Power plant locations across India
-- ============================================================================
INSERT INTO Site (id, name, state, project, manpower, incharge, status, createdAt, updatedAt) VALUES
('clsite001vckal001', 'VCKPL Kalisindh, Jhalawar', 'Rajasthan', 'PRJ-001', 45, 'Rajesh Kumar Sharma', 'Active', '2024-01-15 09:00:00.000', '2024-12-01 09:00:00.000'),
('clsite002adani001', 'Adani Mundra TPP, Kutch', 'Gujarat', 'PRJ-002', 38, 'Amit Patel', 'Active', '2024-02-01 09:00:00.000', '2024-11-15 09:00:00.000'),
('clsite003tatapowr001', 'Tata Trombay Thermal, Mumbai', 'Maharashtra', 'PRJ-003', 52, 'Suresh Menon', 'Active', '2024-03-10 09:00:00.000', '2024-12-05 09:00:00.000'),
('clsite004neyveli001', 'NLC Neyveli Lignite, Cuddalore', 'Tamil Nadu', 'PRJ-004', 30, 'Karthik Rajan', 'Active', '2024-04-20 09:00:00.000', '2024-11-28 09:00:00.000'),
('clsite005ntpcl001', 'NTPC Khargone Super Thermal', 'Madhya Pradesh', 'PRJ-005', 60, 'Vikram Singh Tomar', 'Active', '2024-05-01 09:00:00.000', '2024-12-10 09:00:00.000'),
('clsite006kpcl001', 'KPCL Raichur Thermal, Raichur', 'Karnataka', 'PRJ-003', 28, 'Ramesh Gowda', 'Active', '2024-06-01 09:00:00.000', '2024-12-01 09:00:00.000');

-- ============================================================================
-- Projects (5 records)
-- ============================================================================
INSERT INTO Project (id, code, name, client, type, contractValue, startDate, endDate, progress, people, status, site, createdAt, updatedAt) VALUES
('clproj001vck001', 'PRJ-001', 'VCKPL 250MW Unit-5 EPC', 'RVUNL (Rajasthan Vidyut Utpadan Nigam)', 'EPC', '₹485 Cr', '2024-01-15', '2026-06-30', 32, 45, 'On Track', 'VCKPL Kalisindh, Jhalawar', '2024-01-15 09:00:00.000', '2024-12-01 09:00:00.000'),
('clproj002adan001', 'PRJ-002', 'Adani Mundra 660MW Unit-4 O&M', 'Adani Power Ltd', 'O&M', '₹125 Cr', '2024-02-01', '2025-01-31', 78, 38, 'On Track', 'Adani Mundra TPP, Kutch', '2024-02-01 09:00:00.000', '2024-11-15 09:00:00.000'),
('clproj003tata001', 'PRJ-003', 'Tata Trombay BoP Modernization', 'Tata Power', 'BoP', '₹210 Cr', '2024-03-10', '2025-09-30', 45, 52, 'At Risk', 'Tata Trombay Thermal, Mumbai', '2024-03-10 09:00:00.000', '2024-12-05 09:00:00.000'),
('clproj004nlc001', 'PRJ-004', 'NLC Neyveli 1000MW BOP Civil', 'NLC India Ltd', 'BoP', '₹320 Cr', '2024-04-20', '2026-12-31', 18, 30, 'On Track', 'NLC Neyveli Lignite, Cuddalore', '2024-04-20 09:00:00.000', '2024-11-28 09:00:00.000'),
('clproj005ntpc001', 'PRJ-005', 'NTPC Khargone 2x660MW EPC', 'NTPC Ltd', 'EPC', '₹850 Cr', '2024-05-01', '2027-03-31', 12, 60, 'On Track', 'NTPC Khargone Super Thermal', '2024-05-01 09:00:00.000', '2024-12-10 09:00:00.000');

-- ============================================================================
-- Departments (8 records)
-- ============================================================================
INSERT INTO Department (id, name, head, location, employeeCount, status, createdAt, updatedAt) VALUES
('cldept001engg001', 'Engineering', 'Sanjay Verma', 'Mumbai HQ', 22, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldept002hr001', 'Human Resources', 'Priya Nair', 'Mumbai HQ', 8, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldept003fin001', 'Finance', 'Deepak Joshi', 'Mumbai HQ', 6, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldept004safe001', 'Safety & HSE', 'Ramesh Gupta', 'Mumbai HQ', 10, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldept005ops001', 'Operations', 'Vikram Singh Tomar', 'NTPC Khargone Site', 45, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldept006proc001', 'Procurement', 'Manish Agarwal', 'Mumbai HQ', 5, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldept007qac001', 'QA/QC', 'Anand Deshmukh', 'Mumbai HQ', 12, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldept008adm001', 'Admin', 'Kavita Sharma', 'Mumbai HQ', 4, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000');

-- ============================================================================
-- Designations (10 records)
-- ============================================================================
INSERT INTO Designation (id, title, department, level, minSalary, maxSalary, status, createdAt, updatedAt) VALUES
('cldesg001pm001', 'Project Manager', 'Engineering', 'L6', 80000, 150000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg002siteeng001', 'Site Engineer', 'Engineering', 'L4', 35000, 55000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg003supt001', 'Supervisor', 'Operations', 'L3', 25000, 40000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg004soff001', 'Safety Officer', 'Safety & HSE', 'L4', 30000, 50000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg005hrmgr001', 'HR Manager', 'Human Resources', 'L5', 50000, 80000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg006acct001', 'Accounts Executive', 'Finance', 'L3', 25000, 40000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg007elec001', 'Electrician', 'Operations', 'L2', 18000, 28000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg008weld001', 'Welder', 'Operations', 'L2', 20000, 32000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg009insp001', 'QA/QC Inspector', 'QA/QC', 'L4', 30000, 50000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('cldesg010admin001', 'Admin Executive', 'Admin', 'L2', 20000, 30000, 'Active', '2024-01-01 09:00:00.000', '2024-12-01 09:00:00.000');

-- ============================================================================
-- Employees (15 records) - IDs used as FK in Attendance, Leave, Payroll, Expense
-- ============================================================================
INSERT INTO Employee (id, empId, name, email, phone, trade, role, site, type, status, joiningDate, certifications, createdAt, updatedAt) VALUES
('clemp001rajsh001', 'EMP-001', 'Rajesh Kumar Sharma', 'rajesh.sharma@voltcore.in', '9876543210', 'Engineer', 'Site Incharge', 'VCKPL Kalisindh, Jhalawar', 'Staff', 'Active', '2022-03-15', 'B.E. Electrical, PMP', '2022-03-15 09:00:00.000', '2024-12-01 09:00:00.000'),
('clemp002amitp001', 'EMP-002', 'Amit Patel', 'amit.patel@voltcore.in', '9876543211', 'Engineer', 'Site Engineer', 'Adani Mundra TPP, Kutch', 'Staff', 'Active', '2022-06-01', 'B.E. Mechanical, BOE', '2022-06-01 09:00:00.000', '2024-11-15 09:00:00.000'),
('clemp003surem001', 'EMP-003', 'Suresh Menon', 'suresh.menon@voltcore.in', '9876543212', 'Engineer', 'Project Manager', 'Tata Trombay Thermal, Mumbai', 'Staff', 'Active', '2021-01-10', 'B.Tech, PMP, Six Sigma', '2021-01-10 09:00:00.000', '2024-12-05 09:00:00.000'),
('clemp004kartk001', 'EMP-004', 'Karthik Rajan', 'karthik.rajan@voltcore.in', '9876543213', 'Safety Officer', 'HSE Officer', 'NLC Neyveli Lignite, Cuddalore', 'Staff', 'Active', '2022-09-20', 'B.Sc, NEBOSH IGC, IOSH', '2022-09-20 09:00:00.000', '2024-11-28 09:00:00.000'),
('clemp005vikst001', 'EMP-005', 'Vikram Singh Tomar', 'vikram.tomar@voltcore.in', '9876543214', 'Engineer', 'Site Incharge', 'NTPC Khargone Super Thermal', 'Staff', 'Active', '2021-05-01', 'B.E. Mechanical, PMP', '2021-05-01 09:00:00.000', '2024-12-10 09:00:00.000'),
('clemp006ramesh001', 'EMP-006', 'Ramesh Gowda', 'ramesh.gowda@voltcore.in', '9876543215', 'Supervisor', 'Site Supervisor', 'KPCL Raichur Thermal, Raichur', 'Staff', 'Active', '2023-01-15', 'Diploma Electrical', '2023-01-15 09:00:00.000', '2024-12-01 09:00:00.000'),
('clemp007priya001', 'EMP-007', 'Priya Nair', 'priya.nair@voltcore.in', '9876543216', 'HR', 'HR Manager', 'VCKPL Kalisindh, Jhalawar', 'Staff', 'Active', '2022-04-01', 'MBA HR, SHRM-CP', '2022-04-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('clemp008deepak001', 'EMP-008', 'Deepak Joshi', 'deepak.joshi@voltcore.in', '9876543217', 'Accounts', 'Accounts Executive', 'Tata Trombay Thermal, Mumbai', 'Staff', 'Active', '2023-02-10', 'CA Inter, Tally', '2023-02-10 09:00:00.000', '2024-12-05 09:00:00.000'),
('clemp009sunilk001', 'EMP-009', 'Sunil Kumar', NULL, '9876543218', 'Electrician', 'Foreman', 'VCKPL Kalisindh, Jhalawar', 'Contract', 'Active', '2023-06-01', 'ITI Electrician', '2023-06-01 09:00:00.000', '2024-12-01 09:00:00.000'),
('clemp010mohans001', 'EMP-010', 'Mohan Singh', NULL, '9876543219', 'Welder', 'Welder', 'Adani Mundra TPP, Kutch', 'Contract', 'Active', '2023-07-15', 'ITI Welder, AWS CWI', '2023-07-15 09:00:00.000', '2024-11-15 09:00:00.000'),
('clemp011arjunp001', 'EMP-011', 'Arjun Prasad', NULL, '9876543220', 'Fitter', 'Fitter', 'NTPC Khargone Super Thermal', 'Contract', 'Active', '2024-01-10', 'ITI Fitter', '2024-01-10 09:00:00.000', '2024-12-10 09:00:00.000'),
('clemp012dinesh001', 'EMP-012', 'Dinesh Yadav', NULL, '9876543221', 'Rigger', 'Rigger', 'Tata Trombay Thermal, Mumbai', 'Contract', 'Active', '2023-11-01', 'ITI Rigger', '2023-11-01 09:00:00.000', '2024-12-05 09:00:00.000'),
('clemp013sureshb001', 'EMP-013', 'Suresh Babu', NULL, '9876543222', 'Instrument Tech', 'Technician', 'NLC Neyveli Lignite, Cuddalore', 'Staff', 'Active', '2022-11-15', 'Diploma Instrumentation', '2022-11-15 09:00:00.000', '2024-11-28 09:00:00.000'),
('clemp014anand001', 'EMP-014', 'Anand Deshmukh', 'anand.deshmukh@voltcore.in', '9876543223', 'QA/QC', 'QC Inspector', 'NTPC Khargone Super Thermal', 'Staff', 'Active', '2022-08-01', 'B.E. Mechanical, ASNT Level II', '2022-08-01 09:00:00.000', '2024-12-10 09:00:00.000'),
('clemp015manish001', 'EMP-015', 'Manish Agarwal', 'manish.agarwal@voltcore.in', '9876543224', 'Procurement', 'Procurement Manager', 'Tata Trombay Thermal, Mumbai', 'Staff', 'Active', '2021-09-01', 'MBA, CIPS', '2021-09-01 09:00:00.000', '2024-12-05 09:00:00.000');

-- ============================================================================
-- Attendance (14 records) - Using employee IDs from above
-- ============================================================================
INSERT INTO Attendance (id, empId, site, date, timeIn, timeOut, otHours, shift, status, createdAt, updatedAt) VALUES
('clatt001day001', 'clemp001rajsh001', 'VCKPL Kalisindh, Jhalawar', '2025-01-15', '06:00', '14:30', 1.5, 'Day A', 'Present', '2025-01-15 06:00:00.000', '2025-01-15 14:30:00.000'),
('clatt002day001', 'clemp002amitp001', 'Adani Mundra TPP, Kutch', '2025-01-15', '14:00', '22:00', 0, 'Day B', 'Present', '2025-01-15 14:00:00.000', '2025-01-15 22:00:00.000'),
('clatt003day001', 'clemp003surem001', 'Tata Trombay Thermal, Mumbai', '2025-01-15', '09:00', '18:30', 1.5, 'General', 'Present', '2025-01-15 09:00:00.000', '2025-01-15 18:30:00.000'),
('clatt004day001', 'clemp004kartk001', 'NLC Neyveli Lignite, Cuddalore', '2025-01-15', '06:00', '14:00', 0, 'Day A', 'Present', '2025-01-15 06:00:00.000', '2025-01-15 14:00:00.000'),
('clatt005day001', 'clemp005vikst001', 'NTPC Khargone Super Thermal', '2025-01-15', '06:00', '15:00', 2.0, 'Day A', 'Present', '2025-01-15 06:00:00.000', '2025-01-15 15:00:00.000'),
('clatt006day001', 'clemp006ramesh001', 'KPCL Raichur Thermal, Raichur', '2025-01-15', '06:00', '14:00', 0, 'Day A', 'Present', '2025-01-15 06:00:00.000', '2025-01-15 14:00:00.000'),
('clatt007day001', 'clemp007priya001', 'VCKPL Kalisindh, Jhalawar', '2025-01-15', '09:00', '18:00', 0, 'General', 'Present', '2025-01-15 09:00:00.000', '2025-01-15 18:00:00.000'),
('clatt008day001', 'clemp008deepak001', 'Tata Trombay Thermal, Mumbai', '2025-01-15', '09:00', '18:00', 0, 'General', 'Present', '2025-01-15 09:00:00.000', '2025-01-15 18:00:00.000'),
('clatt009day001', 'clemp009sunilk001', 'VCKPL Kalisindh, Jhalawar', '2025-01-15', '06:00', '14:00', 0, 'Day A', 'Present', '2025-01-15 06:00:00.000', '2025-01-15 14:00:00.000'),
('clatt010day001', 'clemp010mohans001', 'Adani Mundra TPP, Kutch', '2025-01-15', '06:00', '16:00', 3.0, 'Day A', 'Present', '2025-01-15 06:00:00.000', '2025-01-15 16:00:00.000'),
('clatt011day001', 'clemp011arjunp001', 'NTPC Khargone Super Thermal', '2025-01-15', '22:00', '06:00', 1.0, 'Night B', 'Present', '2025-01-15 22:00:00.000', '2025-01-16 06:00:00.000'),
('clatt012day001', 'clemp012dinesh001', 'Tata Trombay Thermal, Mumbai', '2025-01-15', '14:00', '22:00', 0, 'Day B', 'Present', '2025-01-15 14:00:00.000', '2025-01-15 22:00:00.000'),
('clatt013day001', 'clemp013sureshb001', 'NLC Neyveli Lignite, Cuddalore', '2025-01-15', '06:00', '14:00', 0, 'Day A', 'Present', '2025-01-15 06:00:00.000', '2025-01-15 14:00:00.000'),
('clatt014day001', 'clemp014anand001', 'NTPC Khargone Super Thermal', '2025-01-15', '09:00', '17:30', 0.5, 'General', 'Present', '2025-01-15 09:00:00.000', '2025-01-15 17:30:00.000');

-- ============================================================================
-- Leave Requests (6 records)
-- ============================================================================
INSERT INTO LeaveRequest (id, empId, site, type, fromDate, toDate, days, reason, status, appliedDate, createdAt, updatedAt) VALUES
('clleave001req001', 'clemp001rajsh001', 'VCKPL Kalisindh, Jhalawar', 'CL', '2025-01-20', '2025-01-21', 2, 'Personal work in Jaipur', 'Pending', '2025-01-10 10:00:00.000', '2025-01-10 10:00:00.000', '2025-01-10 10:00:00.000'),
('clleave002req002', 'clemp003surem001', 'Tata Trombay Thermal, Mumbai', 'EL', '2025-01-25', '2025-02-01', 5, 'Family vacation to Goa', 'Approved', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000', '2025-01-06 14:00:00.000'),
('clleave003req003', 'clemp007priya001', 'VCKPL Kalisindh, Jhalawar', 'SL', '2025-01-12', '2025-01-13', 2, 'Medical - fever and cold', 'Approved', '2025-01-11 08:30:00.000', '2025-01-11 08:30:00.000', '2025-01-11 12:00:00.000'),
('clleave004req004', 'clemp010mohans001', 'Adani Mundra TPP, Kutch', 'CL', '2025-01-18', '2025-01-19', 2, 'Attend cousin marriage in Ahmedabad', 'Pending', '2025-01-12 11:00:00.000', '2025-01-12 11:00:00.000', '2025-01-12 11:00:00.000'),
('clleave005req005', 'clemp009sunilk001', 'VCKPL Kalisindh, Jhalawar', 'EL', '2024-12-28', '2025-01-04', 5, 'Visit native village for festival', 'Rejected', '2024-12-20 09:00:00.000', '2024-12-20 09:00:00.000', '2024-12-21 16:00:00.000'),
('clleave006req006', 'clemp006ramesh001', 'KPCL Raichur Thermal, Raichur', 'CL', '2025-02-10', '2025-02-11', 2, 'Bank work in Bengaluru', 'Pending', '2025-01-14 10:30:00.000', '2025-01-14 10:30:00.000', '2025-01-14 10:30:00.000');

-- ============================================================================
-- Payroll (5 records) - January 2025
-- ============================================================================
INSERT INTO Payroll (id, empId, month, days, basic, hra, ot, gross, pf, esi, tds, netPay, status, createdAt, updatedAt) VALUES
('clpay001jan001', 'clemp001rajsh001', 'January 2025', 31, 55000.00, 16500.00, 2250.00, 73750.00, 6600.00, 553.13, 3500.00, 63096.87, 'Paid', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000', '2025-02-01 10:00:00.000'),
('clpay002jan002', 'clemp002amitp001', 'January 2025', 31, 42000.00, 12600.00, 0.00, 54600.00, 5040.00, 409.50, 2100.00, 47050.50, 'Paid', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000', '2025-02-01 10:00:00.000'),
('clpay003jan003', 'clemp003surem001', 'January 2025', 31, 85000.00, 25500.00, 3375.00, 113875.00, 10200.00, 854.06, 8500.00, 94320.94, 'Paid', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000', '2025-02-01 10:00:00.000'),
('clpay004jan004', 'clemp009sunilk001', 'January 2025', 31, 22000.00, 6600.00, 0.00, 28600.00, 2640.00, 214.50, 500.00, 25245.50, 'Pending', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('clpay005jan005', 'clemp010mohans001', 'January 2025', 31, 25000.00, 7500.00, 4500.00, 37000.00, 3000.00, 277.50, 750.00, 32972.50, 'Pending', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000');

-- ============================================================================
-- Work Permits (5 records)
-- ============================================================================
INSERT INTO WorkPermit (id, permitNo, type, location, issuedTo, expiry, status, description, precautions, createdAt, updatedAt) VALUES
('clwp001hw001', 'WP-2025-0001', 'Hot Work', 'Boiler Area - Unit 5, Level +15m', 'EMP-010 Mohan Singh', '2025-01-15 18:00', 'Active', 'Welding on boiler header pipe flange connections', 'Fire extinguisher nearby, Remove combustibles within 11m radius, Fire watch for 30 min post-work, Gas testing before start', '2025-01-15 06:00:00.000', '2025-01-15 06:00:00.000'),
('clwp002loto001', 'WP-2025-0002', 'LOTO', 'Turbine Hall - HP Heater isolation', 'EMP-009 Sunil Kumar', '2025-01-16 14:00', 'Active', 'Isolation of HP Heater-3 for maintenance work', 'Verify zero energy state, Try-operate check, Hang DO NOT OPERATE tags, Inform control room', '2025-01-15 07:00:00.000', '2025-01-15 07:00:00.000'),
('clwp003ht001', 'WP-2025-0003', 'Height Work', 'Chimney - 220m level scaffolding', 'EMP-012 Dinesh Yadav', '2025-01-17 18:00', 'Active', 'Inspection of chimney lining and lightning arrestor', 'Full body harness required, 100% tie-off, Buddy system, Rescue plan in place, Weather check before start', '2025-01-15 08:00:00.000', '2025-01-15 08:00:00.000'),
('clwp004cs001', 'WP-2025-0004', 'Confined Space', 'Condenser water box - Unit 4', 'EMP-013 Suresh Babu', '2025-01-15 16:00', 'Active', 'Tube leak inspection and plug installation', 'Gas testing (O2 >19.5%, H2S <10ppm), Standby person outside, Rescue harness ready, Continuous ventilation, Communication checked', '2025-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clwp005exc001', 'WP-2025-0005', 'Excavation', 'Switchyard cable trench - Bay 7', 'EMP-011 Arjun Prasad', '2025-01-20 18:00', 'Active', 'Cable trench excavation for 220kV feeder cable laying', 'Barricading with warning signs, Shoring for depths >1.5m, Locate underground utilities, Competent person supervision, Daily inspection before work', '2025-01-15 10:00:00.000', '2025-01-15 10:00:00.000');

-- ============================================================================
-- Incidents (5 records)
-- ============================================================================
INSERT INTO Incident (id, refNo, date, site, type, severity, person, status, description, action, createdAt, updatedAt) VALUES
('clinc001nm001', 'INC-2025-0001', '2025-01-10', 'VCKPL Kalisindh, Jhalawar', 'Near Miss', 'Low', 'EMP-009 Sunil Kumar', 'Closed', 'Scaffolding sway noticed near boiler area due to high wind. Worker was not on scaffold at the time.', 'Scaffolding anchored with additional guy wires. Wind speed monitoring protocol added to daily toolbox talk.', '2025-01-10 14:00:00.000', '2025-01-10 14:00:00.000'),
('clinc002fa001', 'INC-2025-0002', '2025-01-12', 'Adani Mundra TPP, Kutch', 'First Aid', 'Low', 'EMP-010 Mohan Singh', 'Closed', 'Minor burn on left forearm during welding - grinder spark contact. Treated with first aid at site dispensary.', 'PPE audit conducted. All welders briefed on proper PPE usage. Anti-spark sleeves added to PPE kit.', '2025-01-12 11:00:00.000', '2025-01-12 11:00:00.000'),
('clinc003pd001', 'INC-2025-0003', '2025-01-08', 'Tata Trombay Thermal, Mumbai', 'Property Damage', 'Medium', 'EMP-012 Dinesh Yadav', 'Investigating', 'Mobile crane wire rope snapped during material lifting. No injuries. Load fell on designated drop zone.', 'Crane taken out of service. Wire rope inspected by third party. All crane operators re-briefed on load limits and pre-use checks.', '2025-01-08 16:30:00.000', '2025-01-08 16:30:00.000'),
('clinc004lti001', 'INC-2025-0004', '2025-01-05', 'NTPC Khargone Super Thermal', 'LTI', 'High', 'Arjun Mehta (Subcontractor)', 'Investigating', 'Worker slipped from scaffolding at +25m level during structural steel erection. Fracture in right leg. Hospitalized.', 'Area cordoned off. Scaffolding inspection ordered for entire site. Incident investigation team formed. Root cause analysis in progress.', '2025-01-05 09:30:00.000', '2025-01-05 09:30:00.000'),
('clinc005hz001', 'INC-2025-0005', '2025-01-14', 'NLC Neyveli Lignite, Cuddalore', 'Hazard ID', 'Low', 'EMP-004 Karthik Rajan', 'Closed', 'Gas leak detected near fuel oil storage tank during routine patrol. Area secured immediately.', 'Leak traced to valve gasket failure. Valve replaced, pressure tested. Buffer zone marked. Gas detection system calibrated.', '2025-01-14 08:00:00.000', '2025-01-14 08:00:00.000');

-- ============================================================================
-- Equipment (6 records)
-- ============================================================================
INSERT INTO Equipment (id, name, eqId, site, status, lastPM, nextPM, issue, downSince, etaRepair, assignedTo, utilization, createdAt, updatedAt) VALUES
('clequip001crane001', 'Tower Crane TC-7035', 'EQ-01-TC01', 'VCKPL Kalisindh, Jhalawar', 'Operational', '2025-01-01', '2025-02-01', NULL, NULL, NULL, 'EMP-001 Rajesh Kumar Sharma', 78, '2024-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clequip002gen001', 'Diesel Generator 500KVA', 'EQ-02-DG01', 'Adani Mundra TPP, Kutch', 'Operational', '2025-01-05', '2025-02-05', NULL, NULL, NULL, 'EMP-002 Amit Patel', 45, '2024-02-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clequip003weld001', 'Welding Machine Lincoln S350', 'EQ-03-WM01', 'NTPC Khargone Super Thermal', 'Under Maintenance', '2024-12-20', '2025-01-20', 'Wire feeder malfunction - intermittent feed', '2025-01-13', '2025-01-18', 'EMP-010 Mohan Singh', 0, '2024-05-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clequip004excav001', 'Hydraulic Excavator CAT 320D', 'EQ-04-EX01', 'NTPC Khargone Super Thermal', 'Operational', '2025-01-10', '2025-02-10', NULL, NULL, NULL, 'EMP-011 Arjun Prasad', 65, '2024-05-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clequip005crane002', 'Mobile Crane Liebherr LTM 1100', 'EQ-05-MC01', 'Tata Trombay Thermal, Mumbai', 'Breakdown', '2024-12-15', '2025-01-15', 'Wire rope snapped during lifting operation - replacement needed', '2025-01-08', '2025-01-20', 'EMP-012 Dinesh Yadav', 0, '2024-03-10 09:00:00.000', '2025-01-15 09:00:00.000'),
('clequip006ndt001', 'Ultrasonic Testing Equipment', 'EQ-06-ND01', 'NTPC Khargone Super Thermal', 'Operational', '2025-01-08', '2025-04-08', NULL, NULL, NULL, 'EMP-014 Anand Deshmukh', 30, '2024-05-01 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Expenses (5 records)
-- ============================================================================
INSERT INTO Expense (id, claimNo, empId, category, amount, project, date, status, createdAt, updatedAt) VALUES
('clexp001clm001', 'EXP-0001', 'clemp001rajsh001', 'Travel & Accommodation', 12500.00, 'PRJ-001', '2025-01-10', 'Pending', '2025-01-10 10:00:00.000', '2025-01-10 10:00:00.000'),
('clexp002clm002', 'EXP-0002', 'clemp003surem001', 'Travel & Accommodation', 28000.00, 'PRJ-003', '2025-01-05', 'Approved', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000', '2025-01-08 16:00:00.000'),
('clexp003clm003', 'EXP-0003', 'clemp009sunilk001', 'Tools & Consumables', 4500.00, 'PRJ-001', '2025-01-12', 'Pending', '2025-01-12 11:30:00.000', '2025-01-12 11:30:00.000'),
('clexp004clm004', 'EXP-0004', 'clemp004kartk001', 'Medical', 3200.00, 'PRJ-004', '2025-01-08', 'Approved', '2025-01-08 09:00:00.000', '2025-01-08 09:00:00.000', '2025-01-09 14:00:00.000'),
('clexp005clm005', 'EXP-0005', 'clemp011arjunp001', 'Transport', 8500.00, 'PRJ-005', '2025-01-14', 'Rejected', '2025-01-14 10:00:00.000', '2025-01-14 10:00:00.000', '2025-01-15 12:00:00.000');

-- ============================================================================
-- Purchase Orders (5 records)
-- ============================================================================
INSERT INTO PurchaseOrder (id, poNo, vendor, item, amount, project, delivery, grn, status, createdAt, updatedAt) VALUES
('clpo001ord001', 'PO-0001', 'Siemens India Ltd', '33kV VCB Panel (4 nos)', 1850000.00, 'PRJ-001', '2025-02-28', 'Awaited', 'Open', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000'),
('clpo002ord002', 'PO-0002', 'BHEL', 'HP Heater Tube Bundle Assembly', 4200000.00, 'PRJ-003', '2025-03-15', 'Awaited', 'Open', '2025-01-08 10:00:00.000', '2025-01-08 10:00:00.000'),
('clpo003ord003', 'PO-0003', '3M India Safety Division', 'Safety Harness (50 nos), Helmet (100 nos), Safety Shoes (80 pairs)', 285000.00, 'PRJ-005', '2025-01-25', 'Received', 'Closed', '2024-12-20 09:00:00.000', '2024-12-20 09:00:00.000', '2025-01-22 14:00:00.000'),
('clpo004ord004', 'PO-0004', 'Larsen & Toubro', 'Structural Steel ISMB-250 (45 MT)', 3375000.00, 'PRJ-001', '2025-02-15', 'Partial', 'Open', '2025-01-02 11:00:00.000', '2025-01-02 11:00:00.000'),
('clpo005ord005', 'PO-0005', 'Crompton Greaves', 'HT Cable 3cx300sqmm (2000 m)', 1600000.00, 'PRJ-004', '2025-03-01', 'Awaited', 'Open', '2025-01-10 09:30:00.000', '2025-01-10 09:30:00.000');

-- ============================================================================
-- Invoices (4 records)
-- ============================================================================
INSERT INTO Invoice (id, invNo, client, project, amount, date, dueDate, status, createdAt, updatedAt) VALUES
('clinv001b001', 'INV-0001', 'RVUNL', 'PRJ-001', '₹42,50,00,000', '2025-01-01', '2025-02-28', 'Under Review', '2025-01-01 09:00:00.000', '2025-01-01 09:00:00.000'),
('clinv002b002', 'INV-0002', 'Adani Power Ltd', 'PRJ-002', '₹12,80,00,000', '2025-01-05', '2025-02-05', 'Paid', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000', '2025-02-03 16:00:00.000'),
('clinv003b003', 'INV-0003', 'Tata Power', 'PRJ-003', '₹28,50,00,000', '2024-12-15', '2025-01-15', 'Partially Paid', '2024-12-15 09:00:00.000', '2024-12-15 09:00:00.000', '2025-01-10 12:00:00.000'),
('clinv004b004', 'INV-0004', 'NTPC Ltd', 'PRJ-005', '₹18,90,00,000', '2024-12-20', '2025-01-20', 'Overdue', '2024-12-20 09:00:00.000', '2024-12-20 09:00:00.000', '2025-01-21 09:00:00.000');

-- ============================================================================
-- Subcontractors (4 records)
-- ============================================================================
INSERT INTO Subcontractor (id, name, trade, workers, site, pfReg, esiReg, labourLic, compliance, createdAt, updatedAt) VALUES
('clsub001sc001', 'Shree Sai Welding Works', 'Welding', 18, 'NTPC Khargone Super Thermal', 'Registered', 'Registered', 'Registered', 'Compliant', '2024-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clsub002sc002', 'Patel Civil Contractors', 'Civil', 25, 'VCKPL Kalisindh, Jhalawar', 'Registered', 'Pending', 'Registered', 'Partially Compliant', '2024-03-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clsub003sc003', 'KR Electrical Services', 'Electrical', 12, 'Tata Trombay Thermal, Mumbai', 'Pending', 'Registered', 'Pending', 'Non-Compliant', '2024-08-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clsub004sc004', 'Sky High Scaffolding Pvt Ltd', 'Scaffolding', 20, 'NTPC Khargone Super Thermal', 'Registered', 'Registered', 'Registered', 'Compliant', '2024-05-20 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Job Openings (5 records)
-- ============================================================================
INSERT INTO JobOpening (id, position, site, openings, applications, priority, status, createdAt, updatedAt) VALUES
('cljob001op001', 'Site Engineer - Electrical', 'NTPC Khargone Super Thermal', 3, 12, 'High', 'Open', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000'),
('cljob002op002', 'QA/QC Inspector - Welding', 'VCKPL Kalisindh, Jhalawar', 2, 8, 'Medium', 'Open', '2025-01-08 09:00:00.000', '2025-01-08 09:00:00.000'),
('cljob003op003', 'Safety Officer - NEBOSH', 'Adani Mundra TPP, Kutch', 1, 15, 'Urgent', 'Open', '2024-12-20 09:00:00.000', '2024-12-20 09:00:00.000'),
('cljob004op004', 'Instrumentation Technician', 'NLC Neyveli Lignite, Cuddalore', 2, 6, 'Medium', 'Shortlisting', '2025-01-02 09:00:00.000', '2025-01-02 09:00:00.000'),
('cljob005op005', 'Procurement Executive', 'Mumbai HQ', 1, 22, 'Low', 'Open', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000');

-- ============================================================================
-- Shift Schedules (12 records) - Week of 2025-01-13
-- ============================================================================
INSERT INTO ShiftSchedule (id, empId, employeeName, site, shift, weekStart, createdAt, updatedAt) VALUES
('clshift001sch001', 'EMP-001', 'Rajesh Kumar Sharma', 'VCKPL Kalisindh, Jhalawar', 'Day A', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift002sch002', 'EMP-002', 'Amit Patel', 'Adani Mundra TPP, Kutch', 'Day B', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift003sch003', 'EMP-003', 'Suresh Menon', 'Tata Trombay Thermal, Mumbai', 'General', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift004sch004', 'EMP-004', 'Karthik Rajan', 'NLC Neyveli Lignite, Cuddalore', 'Day A', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift005sch005', 'EMP-005', 'Vikram Singh Tomar', 'NTPC Khargone Super Thermal', 'Day A', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift006sch006', 'EMP-009', 'Sunil Kumar', 'VCKPL Kalisindh, Jhalawar', 'Day A', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift007sch007', 'EMP-010', 'Mohan Singh', 'Adani Mundra TPP, Kutch', 'Day A', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift008sch008', 'EMP-011', 'Arjun Prasad', 'NTPC Khargone Super Thermal', 'Night B', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift009sch009', 'EMP-012', 'Dinesh Yadav', 'Tata Trombay Thermal, Mumbai', 'Day B', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift010sch010', 'EMP-013', 'Suresh Babu', 'NLC Neyveli Lignite, Cuddalore', 'Day A', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift011sch011', 'EMP-014', 'Anand Deshmukh', 'NTPC Khargone Super Thermal', 'General', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000'),
('clshift012sch012', 'EMP-006', 'Ramesh Gowda', 'KPCL Raichur Thermal, Raichur', 'Day A', '2025-01-13', '2025-01-13 00:00:00.000', '2025-01-13 00:00:00.000');

-- ============================================================================
-- Certifications (10 records)
-- ============================================================================
INSERT INTO Certification (id, empId, employeeName, name, issuedBy, issueDate, expiryDate, status, createdAt, updatedAt) VALUES
('clcert001cer001', 'EMP-001', 'Rajesh Kumar Sharma', 'PMP Certification', 'PMI USA', '2023-06-15', '2026-06-15', 'Valid', '2023-06-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert002cer002', 'EMP-004', 'Karthik Rajan', 'NEBOSH IGC', 'NEBOSH UK', '2023-03-20', '2025-03-20', 'Expiring', '2023-03-20 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert003cer003', 'EMP-004', 'Karthik Rajan', 'IOSH Managing Safely', 'IOSH UK', '2023-09-10', '2025-09-10', 'Valid', '2023-09-10 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert004cer004', 'EMP-010', 'Mohan Singh', 'AWS Certified Welding Inspector', 'AWS USA', '2022-11-01', '2024-11-01', 'Expired', '2022-11-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert005cer005', 'EMP-014', 'Anand Deshmukh', 'ASNT Level II - UT/RT/MT/PT', 'ASNT USA', '2024-02-15', '2027-02-15', 'Valid', '2024-02-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert006cer006', 'EMP-005', 'Vikram Singh Tomar', 'PMP Certification', 'PMI USA', '2022-08-01', '2025-08-01', 'Valid', '2022-08-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert007cer007', 'EMP-009', 'Sunil Kumar', 'National Electrician Certificate', 'DGET India', '2023-06-01', '2026-06-01', 'Valid', '2023-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert008cer008', 'EMP-012', 'Dinesh Yadav', 'Advanced Rigger Certificate', 'NABL India', '2023-11-01', '2025-11-01', 'Valid', '2023-11-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert009cer009', 'EMP-003', 'Suresh Menon', 'Six Sigma Black Belt', 'ASQ USA', '2023-01-15', '2026-01-15', 'Valid', '2023-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcert010cer010', 'EMP-002', 'Amit Patel', 'Certificate of Competency as Boiler Operator', 'IBR India', '2022-09-01', '2025-09-01', 'Valid', '2022-09-01 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Training Sessions (6 records)
-- ============================================================================
INSERT INTO TrainingSession (id, title, site, trainer, date, duration, attendees, status, createdAt, updatedAt) VALUES
('cltrain001ses001', 'Fire Safety & Emergency Evacuation Drill', 'VCKPL Kalisindh, Jhalawar', 'Ramesh Gupta (HSE Manager)', '2025-01-10', '3 hours', 45, 'Completed', '2025-01-05 09:00:00.000', '2025-01-10 12:00:00.000'),
('cltrain002ses002', 'LOTO Awareness & Procedure Training', 'NTPC Khargone Super Thermal', 'Karthik Rajan (HSE Officer)', '2025-01-14', '2 hours', 38, 'Completed', '2025-01-08 09:00:00.000', '2025-01-14 11:00:00.000'),
('cltrain003ses003', 'Working at Heights - Fall Prevention', 'Tata Trombay Thermal, Mumbai', 'SafeTech Training Solutions', '2025-01-20', '4 hours', 30, 'Scheduled', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000'),
('cltrain004ses004', 'First Aid & CPR Training', 'Adani Mundra TPP, Kutch', 'Red Cross India', '2025-01-25', '6 hours', 25, 'Scheduled', '2025-01-12 09:00:00.000', '2025-01-12 09:00:00.000'),
('cltrain005ses005', 'Confined Space Entry & Rescue', 'NLC Neyveli Lignite, Cuddalore', 'Ramesh Gupta (HSE Manager)', '2025-02-01', '4 hours', 20, 'Scheduled', '2025-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('cltrain006ses006', 'Electrical Safety & Arc Flash Awareness', 'NTPC Khargone Super Thermal', 'Siemens Safety Division', '2024-12-15', '3 hours', 42, 'Completed', '2024-12-10 09:00:00.000', '2024-12-15 12:00:00.000');

-- ============================================================================
-- Inventory Items (8 records)
-- ============================================================================
INSERT INTO InventoryItem (id, itemCode, name, category, unit, currentStock, minStock, maxStock, unitCost, warehouse, status, createdAt, updatedAt) VALUES
('clinven001it001', 'RM-001', 'ISMB-250 Structural Steel', 'Raw Materials', 'MT', 45, 20, 100, 75000.00, 'Central Warehouse - Site A', 'In Stock', '2024-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clinven002it002', 'RM-002', 'SA 516 Gr.70 Boiler Plates (12mm)', 'Raw Materials', 'MT', 30, 15, 80, 85000.00, 'Central Warehouse - Site A', 'In Stock', '2024-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clinven003it003', 'EL-001', 'HT Cable 3cx300sqmm XLPE', 'Electrical', 'Meters', 1500, 500, 3000, 800.00, 'Electrical Store - Site B', 'In Stock', '2024-07-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clinven004it004', 'CO-001', 'E6013 Welding Electrodes 3.2mm', 'Consumables', 'Kg', 200, 100, 500, 125.00, 'Welding Store - Site A', 'In Stock', '2024-06-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clinven005it005', 'SF-001', 'Safety Helmet (ISI Marked)', 'Safety', 'Nos', 85, 50, 200, 450.00, 'PPE Store - Site A', 'In Stock', '2024-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clinven006it006', 'SF-002', 'Full Body Harness (10mm)', 'Safety', 'Nos', 12, 20, 50, 3200.00, 'PPE Store - Site A', 'Low Stock', '2024-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clinven007it007', 'MC-001', 'Bearing 6310-2RS SKF (for motors)', 'Mechanical', 'Nos', 8, 5, 30, 4500.00, 'Mechanical Store - Site B', 'In Stock', '2024-08-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clinven008it008', 'CI-001', 'OPC 53 Grade Cement (Ultratech)', 'Civil', 'Bags', 500, 200, 1000, 390.00, 'Civil Store - Site C', 'In Stock', '2024-07-15 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Stock Movements (5 records)
-- ============================================================================
INSERT INTO StockMovement (id, itemCode, itemName, type, quantity, fromWarehouse, toWarehouse, reference, date, remarks, createdAt, updatedAt) VALUES
('clstockmv001mv001', 'RM-001', 'ISMB-250 Structural Steel', 'Inward', 25, 'Supplier - SAIL', 'Central Warehouse - Site A', 'PO-0004/L&T', '2025-01-08', 'L&T supply as per PO-0004 partial delivery', '2025-01-08 14:00:00.000', '2025-01-08 14:00:00.000'),
('clstockmv002mv002', 'SF-001', 'Safety Helmet (ISI Marked)', 'Issue', 15, 'PPE Store - Site A', NULL, 'MR-2025-0012', '2025-01-10', 'Issued for new batch of workers - Site A', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000'),
('clstockmv003mv003', 'EL-001', 'HT Cable 3cx300sqmm XLPE', 'Transfer', 200, 'Electrical Store - Site B', 'NTPC Khargone Site Store', 'TR-2025-0003', '2025-01-12', 'Transfer for cable laying work at NTPC Khargone', '2025-01-12 11:00:00.000', '2025-01-12 11:00:00.000'),
('clstockmv004mv004', 'CO-001', 'E6013 Welding Electrodes 3.2mm', 'Issue', 50, 'Welding Store - Site A', NULL, 'MR-2025-0018', '2025-01-14', 'Issued for boiler header welding - Unit 5', '2025-01-14 08:00:00.000', '2025-01-14 08:00:00.000'),
('clstockmv005mv005', 'SF-002', 'Full Body Harness (10mm)', 'Inward', 10, 'Supplier - 3M India', 'PPE Store - Site A', 'PO-0003/3M', '2025-01-22', 'Received against PO-0003 - fresh stock', '2025-01-22 10:00:00.000', '2025-01-22 10:00:00.000');

-- ============================================================================
-- Customers (5 records)
-- ============================================================================
INSERT INTO Customer (id, code, name, contactPerson, email, phone, address, gst, city, state, totalOrders, totalRevenue, status, createdAt, updatedAt) VALUES
('clcust001cust001', 'CUST-001', 'Adani Power Ltd', 'Hiren Shah', 'hiren.shah@adani.com', '079-25671234', 'Shantigram, SG Highway, Ahmedabad, Gujarat - 382421', '07AABCA1234F1Z5', 'Ahmedabad', 'Gujarat', 3, 485000000.00, 'Active', '2024-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcust002cust002', 'CUST-002', 'Tata Power Company Ltd', 'Ananya Desai', 'ananya.desai@tatapower.com', '022-24367890', 'Bombay House, Homi Mody Street, Mumbai, Maharashtra - 400001', '27AABCT1234F1Z7', 'Mumbai', 'Maharashtra', 2, 320000000.00, 'Active', '2024-03-10 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcust003cust003', 'CUST-003', 'NTPC Ltd', 'Manoj Kumar', 'manoj.kumar@ntpc.co.in', '011-24360100', 'NTPC Bhawan, Scope Complex, New Delhi - 110003', '07AABCN1234F1Z9', 'New Delhi', 'Delhi', 4, 1250000000.00, 'Active', '2024-05-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcust004cust004', 'CUST-004', 'NLC India Ltd', 'Ravi Krishnan', 'ravi.krishnan@nlcindia.in', '04142-234567', 'Block-1, Neyveli, Cuddalore District, Tamil Nadu - 607801', '33AABCL1234F1Z1', 'Cuddalore', 'Tamil Nadu', 1, 180000000.00, 'Active', '2024-04-20 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcust005cust005', 'CUST-005', 'RVUNL (Rajasthan Vidyut Utpadan Nigam)', 'OP Gupta', 'op.gupta@rvunl.com', '0141-2226789', 'Shakti Bhawan, Jaipur, Rajasthan - 302005', '08AABCR5678G1Z3', 'Jaipur', 'Rajasthan', 2, 620000000.00, 'Active', '2024-01-15 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Sales Orders (5 records)
-- ============================================================================
INSERT INTO SalesOrder (id, soNo, customer, project, item, quantity, unitPrice, amount, orderDate, deliveryDate, status, createdAt, updatedAt) VALUES
('clso001ord001', 'SO-00001', 'Adani Power Ltd', 'PRJ-002', 'Boiler Spare Parts Kit (HP Heater)', 4, 125000.00, 500000.00, '2025-01-05', '2025-02-15', 'In Progress', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000'),
('clso002ord002', 'SO-00002', 'NTPC Ltd', 'PRJ-005', 'Structural Steel Fabrication Package', 1, 3500000.00, 3500000.00, '2024-12-20', '2025-03-01', 'Pending', '2024-12-20 09:00:00.000', '2024-12-20 09:00:00.000'),
('clso003ord003', 'SO-00003', 'Tata Power Company Ltd', 'PRJ-003', 'HT Cable Jointing Kit (33kV)', 20, 8500.00, 170000.00, '2025-01-10', '2025-02-01', 'Completed', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000', '2025-01-28 10:00:00.000'),
('clso004ord004', 'SO-00004', 'RVUNL', 'PRJ-001', 'Control Panel Relay Module (ABB)', 12, 45000.00, 540000.00, '2025-01-08', '2025-02-20', 'In Progress', '2025-01-08 09:00:00.000', '2025-01-08 09:00:00.000'),
('clso005ord005', 'SO-00005', 'NLC India Ltd', 'PRJ-004', 'Fire Hydrant System Components', 1, 875000.00, 875000.00, '2025-01-12', '2025-03-15', 'Pending', '2025-01-12 09:00:00.000', '2025-01-12 09:00:00.000');

-- ============================================================================
-- CRM Contacts (6 records)
-- ============================================================================
INSERT INTO CrmContact (id, name, company, designation, email, phone, source, stage, value, lastContact, notes, status, createdAt, updatedAt) VALUES
('clcrm001con001', 'Vikram Malhotra', 'JSW Energy Ltd', 'VP - Projects', 'vikram.malhotra@jsw.in', '022-67891234', 'Industry Event', 'Proposal', 25000000.00, '2025-01-10', 'Discussed upcoming 800MW Unit at Vijayanagar. Interested in our boiler EPC track record. Proposal sent on Jan 10.', 'Active', '2024-10-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcrm002con002', 'Sanjay Mishra', 'NHPC Ltd', 'Chief Engineer', 'sanjay.mishra@nhpc.nic.in', '011-23456789', 'Referral', 'Lead', 15000000.00, '2025-01-08', 'Inquiry for hydro mechanical equipment at Subansiri project. Referred by Suresh Menon.', 'Active', '2024-11-20 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcrm003con003', 'Deepa Iyer', 'Torrent Power', 'Manager - Procurement', 'deepa.iyer@torrentpower.com', '079-26871234', 'Website', 'Qualification', 8000000.00, '2025-01-05', 'Visited our website. Interested in O&M services for their Surat gas plant. Qualification call scheduled.', 'Active', '2024-12-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcrm004con004', 'Rajendra Prasad', 'Gujarat State Electricity Corp', 'Director Technical', 'rajendra.prasad@gsel.in', '079-25541234', 'Existing Client', 'Client', 42000000.00, '2025-01-14', 'Long-term O&M client. Currently discussing renewal for Gandhinagar plant. Contract worth ₹42 Cr.', 'Active', '2023-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcrm005con005', 'Arun Nair', 'Kerala State Electricity Board', 'Additional Chief Engineer', 'arun.nair@kseb.in', '0471-2551234', 'Cold Outreach', 'Lead', 12000000.00, '2024-12-20', 'Cold outreach for potential coal handling plant modernization at Kayamkulam. Awaiting response.', 'Active', '2024-12-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clcrm006con006', 'Pooja Sharma', 'Reliance Power', 'Senior Manager', 'pooja.sharma@reliancepower.com', '022-35671234', 'Industry Event', 'Negotiation', 65000000.00, '2025-01-13', 'Met at PowerGen India 2024 conference. Final negotiations for Samalkot plant retrofit project. ₹65 Cr deal.', 'Active', '2024-09-10 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Support Tickets (5 records)
-- ============================================================================
INSERT INTO SupportTicket (id, ticketNo, title, raisedBy, category, priority, status, assignedTo, description, resolution, createdAt, updatedAt) VALUES
('cltick001tk001', 'TKT-00001', 'Attendance app showing wrong shift timing', 'Sunil Kumar (EMP-009)', 'Technical', 'Medium', 'Open', NULL, 'Day A shift showing 07:00-15:00 instead of configured 06:00-14:00. Shift timings changed in settings but app not reflecting.', NULL, '2025-01-14 09:30:00.000', '2025-01-14 09:30:00.000'),
('cltick002tk002', 'TKT-00002', 'Salary slip download returns blank PDF', 'Deepak Joshi (EMP-008)', 'Finance', 'High', 'In Progress', 'IT Support Team', 'When downloading January 2025 salary slip from the portal, the generated PDF is completely blank. Checked for 3 employees - same issue.', NULL, '2025-01-13 14:00:00.000', '2025-01-13 14:00:00.000'),
('cltick003tk003', 'TKT-00003', 'Leave balance not updating after approval', 'Priya Nair (EMP-007)', 'HR', 'High', 'In Progress', 'HR Admin Team', 'Approved CL on Jan 10-11 for Rajesh Kumar but his leave balance still shows 10/10. Leave history shows approved but balance not deducted.', NULL, '2025-01-12 10:15:00.000', '2025-01-12 10:15:00.000'),
('cltick004tk004', 'TKT-00004', 'Equipment dashboard not loading on mobile', 'Amit Patel (EMP-002)', 'Technical', 'Low', 'Resolved', 'IT Support Team', 'Equipment module page shows loading spinner indefinitely on mobile browsers. Works fine on desktop Chrome.', 'Fixed - responsive CSS breakpoint issue. Deployed hotfix v2.3.1.', '2025-01-10 08:45:00.000', '2025-01-10 08:45:00.000', '2025-01-11 16:30:00.000'),
('cltick005tk005', 'TKT-00005', 'Request for new report: Monthly subcontractor compliance', 'Manish Agarwal (EMP-015)', 'Feature Request', 'Medium', 'Open', NULL, 'Need a monthly report showing subcontractor-wise PF/ESI/Labour Licence compliance status. Should be exportable to PDF/Excel with auto-email feature.', NULL, '2025-01-11 11:00:00.000', '2025-01-11 11:00:00.000');

-- ============================================================================
-- KB Articles (6 records)
-- ============================================================================
INSERT INTO KBArticle (id, title, category, content, author, tags, views, helpful, status, createdAt, updatedAt) VALUES
('clkba001art001', 'Hot Work Permit - Step by Step Procedure', 'Safety & HSE', 'This article covers the complete procedure for obtaining and executing a Hot Work Permit at VoltCore sites.\n\n1. Submit Hot Work Request Form (available at site safety office)\n2. Safety Officer conducts area inspection\n3. Gas testing mandatory before permit issue\n4. Fire extinguisher placement within 5m radius\n5. Remove all combustibles within 11m radius\n6. Fire watch person deployment mandatory\n7. Post-work monitoring: 30 min minimum\n8. Permit closure by issuing authority\n\nKey Documents Required:\n- Hot Work Request Form\n- Gas Test Report\n- Toolbox Talk Attendance Sheet\n- PPE Compliance Checklist', 'Ramesh Gupta', 'hot-work,permit,safety,fire,procedure', 156, 24, 'Published', '2024-08-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clkba002art002', 'Leave Policy Guide - Earned, Sick, Casual & Maternity', 'HR & Leave', 'VoltCore Engineering provides the following leave benefits to all permanent staff employees:\n\nEarned Leave (EL):\n- 15 days per year (1.25 days/month)\n- Accumulates up to 30 days\n- Encashable at end of service\n- Requires 7 days advance notice\n\nSick Leave (SL):\n- 12 days per year\n- Cannot be encashed\n- Medical certificate required for 3+ consecutive days\n- No advance notice required\n\nCasual Leave (CL):\n- 10 days per year\n- Cannot be carried forward\n- Maximum 3 consecutive days\n- Requires 2 days advance notice\n\nMaternity Leave (ML):\n- 26 weeks as per Maternity Benefit Act 2017\n- Applicable for first two children\n- Full pay during leave period\n\nCompensatory Off:\n- 1 day for each working holiday\n- Must be availed within 60 days\n\nApproval Workflow:\n1. Employee applies through ERP portal\n2. Reporting Supervisor approval\n3. HR verification\n4. Final approval/rejection notification', 'Priya Nair', 'leave,policy,el,sl,cl,maternity,holiday', 289, 45, 'Published', '2024-06-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clkba003art003', 'Purchase Order Processing Guide', 'Procurement', 'Complete guide for processing Purchase Orders at VoltCore Engineering.\n\nSteps to Create a PO:\n1. Material requisition raised by site engineer\n2. Approved by Site Incharge\n3. Procurement team obtains minimum 3 vendor quotations\n4. Comparative statement prepared\n5. Approval hierarchy: Procurement Mgr → Project Mgr → Finance\n6. PO generated with unique PO number\n7. Vendor acknowledgment obtained\n8. Material delivery tracking\n9. GRN (Goods Receipt Note) generation on delivery\n10. Invoice matching and payment processing\n\nKey Turnaround Times:\n- Standard items: 5-7 working days\n- Custom/engineered items: 15-30 working days\n- Import items: 45-90 working days\n\nThresholds:\n- Up to ₹50,000: Site Incharge approval\n- ₹50,000 - ₹5,00,000: Procurement Manager + Project Manager\n- Above ₹5,00,000: Procurement Manager + Project Manager + Finance Head', 'Manish Agarwal', 'purchase-order,procurement,vendor,quotation,GRN', 132, 18, 'Published', '2024-09-10 09:00:00.000', '2025-01-15 09:00:00.000'),
('clkba004art004', 'Monthly Payroll Processing - Finance Team SOP', 'Finance', 'Standard Operating Procedure for monthly payroll processing at VoltCore Engineering.\n\nPayroll Cycle (Monthly):\n1. Day 1-3: HR provides attendance data and leave records\n2. Day 3-5: OT hours compiled from site registers\n3. Day 5-7: Payroll data preparation (basic, HRA, OT)\n4. Day 7-10: Calculation of deductions (PF 12%, ESI 0.75%, TDS)\n5. Day 10-12: Internal review and reconciliation\n6. Day 12-13: Management approval\n7. Day 13-15: Salary disbursement via bank transfer\n8. Day 15-20: Salary slip generation and distribution\n\nPayroll Components:\n- Basic: 50-60% of CTC\n- HRA: 30% of Basic\n- OT: Actual hours × hourly rate\n- Gross: Basic + HRA + OT\n- PF: 12% of Basic (Employee contribution)\n- ESI: 0.75% of Gross (if Gross ≤ ₹21,000)\n- TDS: As per income tax slab\n- Net Pay: Gross - PF - ESI - TDS\n\nImportant Notes:\n- Arrears processed separately with prior approval\n- LOP (Loss of Pay) calculated on per-day basic basis\n- Bank holidays do not affect salary processing date', 'Deepak Joshi', 'payroll,salary,PF,ESI,TDS,HR,finance,monthly', 98, 12, 'Published', '2024-07-20 09:00:00.000', '2025-01-15 09:00:00.000'),
('clkba005art005', 'Incident Reporting & Investigation Protocol', 'Safety & HSE', 'Detailed protocol for incident reporting and investigation at VoltCore project sites.\n\nIncident Categories:\n1. Fatality\n2. Lost Time Injury (LTI)\n3. Restricted Work Case (RWC)\n4. Medical Treatment Case (MTC)\n5. First Aid Case (FAC)\n6. Near Miss\n7. Property Damage\n8. Environmental Release\n9. Hazard Identification\n\nReporting Timeline:\n- Fatality/LTI: Within 1 hour to HSE Manager + Project Director\n- FAC/Near Miss: Within 4 hours via ERP portal\n- All others: Within shift end\n\nInvestigation Process:\n1. Secure the scene\n2. Collect evidence (photos, witness statements)\n3. Form investigation team (min 3 members)\n4. Root Cause Analysis using 5-Why methodology\n5. Identify corrective actions (SMART criteria)\n6. Prepare investigation report (within 48 hours for serious)\n7. Management review meeting\n8. Implementation tracking of corrective actions\n9. Lessons learned sharing across all sites', 'Karthik Rajan', 'incident,safety,LTI,near-miss,investigation,reporting', 203, 31, 'Published', '2024-08-25 09:00:00.000', '2025-01-15 09:00:00.000'),
('clkba006art006', 'ERP Portal - User Guide for Site Engineers', 'General', 'Complete user guide for the VoltCore ERP portal for site engineers.\n\nModule-wise Quick Reference:\n\nDashboard:\n- View daily site KPIs at a glance\n- Track pending actions (leave approvals, expense claims)\n- View project progress and safety alerts\n\nAttendance:\n- Mark attendance via portal or mobile\n- View personal attendance history\n- OT claims submission\n\nProjects:\n- View assigned project details and progress\n- Upload site photographs and reports\n- Track milestone completion\n\nExpenses:\n- Submit expense claims with receipts\n- Track claim status (Pending/Approved/Rejected)\n- Download approved claim reports\n\nPermits:\n- Apply for work permits online\n- Track permit status and expiry\n- View active permits at your site\n\nEquipment:\n- Log equipment usage hours\n- Report equipment issues\n- View maintenance schedule\n\nReports:\n- Generate manpower, attendance, HSE reports\n- Download in PDF/Excel format\n- Schedule automated report delivery', 'IT Support Team', 'erp,user-guide,portal,attendance,expenses,projects', 445, 67, 'Published', '2024-05-01 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Ledger Accounts (12 records)
-- ============================================================================
INSERT INTO LedgerAccount (id, accountCode, name, `group`, type, balance, status, createdAt, updatedAt) VALUES
('clledger001acc001', '1001', 'Cash & Cash Equivalents', 'Current Assets', 'Asset', 2580000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger002acc002', '1002', 'Accounts Receivable (Trade)', 'Current Assets', 'Asset', 425000000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger003acc003', '1003', 'Inventory - Raw Materials', 'Current Assets', 'Asset', 18500000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger004acc004', '1004', 'Work-in-Progress', 'Current Assets', 'Asset', 185000000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger005acc005', '2001', 'Accounts Payable (Trade)', 'Current Liabilities', 'Liability', 125000000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger006acc006', '2002', 'Statutory Dues - PF & ESI', 'Current Liabilities', 'Liability', 8500000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger007acc007', '2003', 'TDS Payable', 'Current Liabilities', 'Liability', 6200000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger008acc008', '2004', 'GST Payable', 'Current Liabilities', 'Liability', 4800000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger009acc009', '3001', 'Share Capital', 'Equity', 'Equity', 500000000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger010acc010', '3002', 'Retained Earnings', 'Equity', 'Equity', 185000000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger011acc011', '4001', 'Project Revenue', 'Income', 'Income', 625000000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clledger012acc012', '5001', 'Employee Costs (Salaries & Wages)', 'Expense', 'Expense', 148000000.00, 'Active', '2024-01-01 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Accounts Payable (5 records)
-- ============================================================================
INSERT INTO AccountsPayable (id, billNo, vendor, description, amount, dueDate, paidDate, status, createdAt, updatedAt) VALUES
('clap001bil001', 'AP-2025-0001', 'Siemens India Ltd', '33kV VCB Panel supply - 50% advance as per PO-0001', 925000.00, '2025-01-25', NULL, 'Pending', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000'),
('clap002bil002', 'AP-2025-0002', 'Larsen & Toubro', 'Structural Steel ISMB-250 - 1st lot delivery', 1125000.00, '2025-01-20', '2025-01-18', 'Paid', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000', '2025-01-18 16:00:00.000'),
('clap003bil003', 'AP-2025-0003', 'Shree Sai Welding Works', 'January 2025 - Welding subcontractor billing (18 workers × 26 days)', 468000.00, '2025-02-10', NULL, 'Pending', '2025-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clap004bil004', 'AP-2025-0004', 'BHEL', 'HP Heater Tube Bundle - 30% advance as per PO-0002', 1260000.00, '2025-02-15', NULL, 'Pending', '2025-01-08 10:00:00.000', '2025-01-08 10:00:00.000'),
('clap005bil005', 'AP-2025-0005', 'Patel Civil Contractors', 'December 2024 - Civil work billing (foundation & civil works)', 1450000.00, '2025-01-15', '2025-01-14', 'Paid', '2024-12-30 09:00:00.000', '2024-12-30 09:00:00.000', '2025-01-14 15:00:00.000');

-- ============================================================================
-- Accounts Receivable (5 records)
-- ============================================================================
INSERT INTO AccountsReceivable (id, invoiceNo, client, description, amount, dueDate, receivedDate, status, createdAt, updatedAt) VALUES
('clar001inv001', 'AR-2025-0001', 'RVUNL', 'PRJ-001 Milestone 3 billing - Boiler structural work completion', 425000000.00, '2025-02-28', NULL, 'Pending', '2025-01-01 09:00:00.000', '2025-01-01 09:00:00.000'),
('clar002inv002', 'AR-2025-0002', 'Adani Power Ltd', 'PRJ-002 December 2024 O&M billing', 128000000.00, '2025-02-05', '2025-02-03', 'Received', '2025-01-05 09:00:00.000', '2025-01-05 09:00:00.000', '2025-02-03 14:00:00.000'),
('clar003inv003', 'AR-2025-0003', 'Tata Power', 'PRJ-003 Milestone 2 billing - BoP piping work', 285000000.00, '2025-01-15', '2025-01-10', 'Partially Received', '2024-12-15 09:00:00.000', '2024-12-15 09:00:00.000', '2025-01-10 12:00:00.000'),
('clar004inv004', 'AR-2025-0004', 'NTPC Ltd', 'PRJ-005 Milestone 1 billing - Site mobilization & foundation', 189000000.00, '2025-01-20', NULL, 'Overdue', '2024-12-20 09:00:00.000', '2024-12-20 09:00:00.000'),
('clar005inv005', 'AR-2025-0005', 'NLC India Ltd', 'PRJ-004 Advance billing - Civil work commencement', 45000000.00, '2025-02-20', NULL, 'Pending', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000');

-- ============================================================================
-- Journal Entries (15 records)
-- ============================================================================
INSERT INTO JournalEntry (id, entryNo, date, account, debit, credit, description, reference, status, createdAt, updatedAt) VALUES
('clje001ent001', 'JE-2025-0001', '2025-01-15', '1001 - Cash & Cash Equivalents', 128000000.00, 0.00, 'Receipt from Adani Power - O&M December billing', 'AR-2025-0002', 'Posted', '2025-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clje002ent002', 'JE-2025-0002', '2025-01-15', '1002 - Accounts Receivable', 0.00, 128000000.00, 'Receipt from Adani Power - O&M December billing', 'AR-2025-0002', 'Posted', '2025-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clje003ent003', 'JE-2025-0003', '2025-01-14', '2001 - Accounts Payable', 1450000.00, 0.00, 'Payment to Patel Civil Contractors - December billing', 'AP-2025-0005', 'Posted', '2025-01-14 10:00:00.000', '2025-01-14 10:00:00.000'),
('clje004ent004', 'JE-2025-0004', '2025-01-14', '1001 - Cash & Cash Equivalents', 0.00, 1450000.00, 'Payment to Patel Civil Contractors - December billing', 'AP-2025-0005', 'Posted', '2025-01-14 10:00:00.000', '2025-01-14 10:00:00.000'),
('clje005ent005', 'JE-2025-0005', '2025-01-31', '5001 - Employee Costs', 2874165.88, 0.00, 'January 2025 payroll processing - gross salaries', 'PAY-JAN-2025', 'Posted', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('clje006ent006', 'JE-2025-0006', '2025-01-31', '2002 - PF & ESI Payable', 28095.19, 0.00, 'January 2025 - Employee PF contribution', 'PAY-JAN-2025', 'Posted', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('clje007ent007', 'JE-2025-0007', '2025-01-31', '2003 - TDS Payable', 15350.00, 0.00, 'January 2025 - Employee TDS deduction', 'PAY-JAN-2025', 'Posted', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('clje008ent008', 'JE-2025-0008', '2025-01-31', '1001 - Cash & Cash Equivalents', 0.00, 2917611.07, 'January 2025 payroll - net salary disbursed via bank', 'PAY-JAN-2025', 'Posted', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('clje009ent009', 'JE-2025-0009', '2025-01-10', '1003 - Inventory - Raw Materials', 4375000.00, 0.00, 'Receipt of 25 MT ISMB-250 from L&T against PO-0004', 'PO-0004/GRN', 'Posted', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000'),
('clje010ent010', 'JE-2025-0010', '2025-01-10', '2001 - Accounts Payable', 0.00, 4375000.00, 'Receipt of 25 MT ISMB-250 from L&T against PO-0004', 'PO-0004/GRN', 'Posted', '2025-01-10 09:00:00.000', '2025-01-10 09:00:00.000'),
('clje011ent011', 'JE-2025-0011', '2025-01-18', '2001 - Accounts Payable', 1125000.00, 0.00, 'Payment to L&T for 1st lot steel delivery', 'AP-2025-0002', 'Posted', '2025-01-18 10:00:00.000', '2025-01-18 10:00:00.000'),
('clje012ent012', 'JE-2025-0012', '2025-01-18', '1001 - Cash & Cash Equivalents', 0.00, 1125000.00, 'Payment to L&T for 1st lot steel delivery', 'AP-2025-0002', 'Posted', '2025-01-18 10:00:00.000', '2025-01-18 10:00:00.000'),
('clje013ent013', 'JE-2025-0013', '2025-01-01', '1002 - Accounts Receivable', 425000000.00, 0.00, 'RVUNL Milestone 3 billing raised', 'INV-0001', 'Posted', '2025-01-01 09:00:00.000', '2025-01-01 09:00:00.000'),
('clje014ent014', 'JE-2025-0014', '2025-01-01', '4001 - Project Revenue', 0.00, 425000000.00, 'RVUNL Milestone 3 billing recognized', 'INV-0001', 'Posted', '2025-01-01 09:00:00.000', '2025-01-01 09:00:00.000'),
('clje015ent015', 'JE-2025-0015', '2025-01-08', '1003 - Inventory - Raw Materials', 3375000.00, 0.00, 'Receipt of safety equipment from 3M India against PO-0003', 'PO-0003/GRN', 'Posted', '2025-01-08 09:00:00.000', '2025-01-08 09:00:00.000');

-- ============================================================================
-- Bank Accounts (4 records)
-- ============================================================================
INSERT INTO BankAccount (id, accountName, bankName, accountNo, type, balance, status, createdAt, updatedAt) VALUES
('clbank001acc001', 'VoltCore Engineering - Main Account', 'State Bank of India', 'SBI-3912456718', 'Current', 42500000.00, 'Active', '2021-01-10 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbank002acc002', 'VoltCore Engineering - Salary Account', 'HDFC Bank', 'HDFC-501004567890', 'Current', 8500000.00, 'Active', '2022-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbank003acc003', 'VoltCore Engineering - Tax Account', 'ICICI Bank', 'ICICI-021501234567', 'Current', 3200000.00, 'Active', '2023-01-15 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbank004acc004', 'VoltCore Engineering - FD Account', 'Punjab National Bank', 'PNB-018200456732', 'Fixed Deposit', 15000000.00, 'Active', '2024-06-01 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- Tax Records (5 records)
-- ============================================================================
INSERT INTO TaxRecord (id, taxType, period, amount, dueDate, paidDate, status, createdAt, updatedAt) VALUES
('cltax001rec001', 'GST', 'January 2025', 4800000.00, '2025-02-20', NULL, 'Pending', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('cltax002rec002', 'TDS', 'January 2025', 6200000.00, '2025-02-07', '2025-02-05', 'Paid', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000', '2025-02-05 14:00:00.000'),
('cltax003rec003', 'PF', 'January 2025', 8500000.00, '2025-02-15', NULL, 'Pending', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('cltax004rec004', 'ESI', 'January 2025', 1250000.00, '2025-02-15', NULL, 'Pending', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000'),
('cltax005rec005', 'Professional Tax', 'January 2025', 15000.00, '2025-01-31', '2025-01-30', 'Paid', '2025-01-31 09:00:00.000', '2025-01-31 09:00:00.000', '2025-01-30 16:00:00.000');

-- ============================================================================
-- Budget Items (8 records)
-- ============================================================================
INSERT INTO BudgetItem (id, category, description, planned, actual, period, status, createdAt, updatedAt) VALUES
('clbud001it001', 'Engineering', 'Design & Engineering Services', 12000000.00, 10800000.00, 'FY 2024-25', 'On Track', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbud002it002', 'HR & Manpower', 'Salaries, Wages & Benefits', 180000000.00, 148000000.00, 'FY 2024-25', 'On Track', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbud003it003', 'Safety & HSE', 'Safety Equipment, Training & Compliance', 5000000.00, 6200000.00, 'FY 2024-25', 'Over Budget', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbud004it004', 'Procurement', 'Raw Materials & Equipment Purchase', 250000000.00, 195000000.00, 'FY 2024-25', 'On Track', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbud005it005', 'Subcontracting', 'Subcontractor Labor & Services', 85000000.00, 72000000.00, 'FY 2024-25', 'On Track', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbud006it006', 'Travel & Transport', 'Site Travel, Logistics & Transportation', 8000000.00, 9500000.00, 'FY 2024-25', 'Over Budget', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbud007it007', 'QA/QC', 'Testing, Inspection & Quality Assurance', 6000000.00, 4800000.00, 'FY 2024-25', 'On Track', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000'),
('clbud008it008', 'Admin & Overheads', 'Office Rent, Utilities, IT & Communication', 15000000.00, 11200000.00, 'FY 2024-25', 'On Track', '2024-04-01 09:00:00.000', '2025-01-15 09:00:00.000');

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
-- VoltCore ERP Database Setup Complete
-- 34 Tables | 200+ Mock Records | Indian Power Plant EPC Contractor Data
-- ============================================================================
