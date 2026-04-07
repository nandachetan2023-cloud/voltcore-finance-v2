-- ============================================================================
-- MODULE 07: Payroll
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : Payroll
-- Context : Manages monthly salary processing for all employees — staff and
--           labour — across plant sites and HQ. Salary structure follows Indian
--           statutory norms: Basic + HRA (40%) + DA + OT + Allowances = Gross;
--           Deductions include PF (12% of basic), ESI (0.75% of gross, only if
--           gross < 21000), TDS, Professional Tax (₹200), and other deductions.
--           Status flow: Pending → Processed → Paid / Held
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: Payroll
-- ----------------------------------------------------------------------------
-- Stores monthly payroll records for every employee.
-- One record per employee per month. gross = basic + hra + da + ot + allowances;
-- netPay = gross - pf - esi - tds - pt - deductions.
-- Payment is marked Paid only after bank transfer with a reference number.
-- ----------------------------------------------------------------------------

CREATE TABLE Payroll (
    id          VARCHAR(25)     NOT NULL,
    empId       VARCHAR(25)     NOT NULL,
    month       VARCHAR(20)     NOT NULL COMMENT 'Format: Jan 2025',
    year        VARCHAR(10)     NOT NULL,
    daysWorked  INT             NOT NULL,
    basic       DOUBLE          NOT NULL,
    hra         DOUBLE          NOT NULL COMMENT '40% of basic',
    da          DOUBLE          NOT NULL DEFAULT 0 COMMENT 'Dearness Allowance',
    ot          DOUBLE          NOT NULL DEFAULT 0 COMMENT 'Overtime pay',
    allowances  DOUBLE          NOT NULL DEFAULT 0 COMMENT 'Transport, food, site allowances',
    gross       DOUBLE          NOT NULL COMMENT 'basic + hra + da + ot + allowances',
    pf          DOUBLE          NOT NULL COMMENT '12% of basic — Provident Fund',
    esi         DOUBLE          NOT NULL DEFAULT 0 COMMENT '0.75% of gross if gross < 21000',
    tds         DOUBLE          NOT NULL DEFAULT 0 COMMENT 'Tax Deducted at Source',
    pt          DOUBLE          NOT NULL DEFAULT 200 COMMENT 'Professional Tax',
    deductions  DOUBLE          NOT NULL DEFAULT 0 COMMENT 'Other deductions (advance, loan, etc.)',
    netPay      DOUBLE          NOT NULL COMMENT 'gross - pf - esi - tds - pt - deductions',
    paymentDate DATE            DEFAULT NULL COMMENT 'Date salary credited to bank',
    status      VARCHAR(50)     NOT NULL DEFAULT 'Pending' COMMENT 'Pending, Processed, Paid, Held',
    bankRef     VARCHAR(100)    DEFAULT NULL COMMENT 'NEFT/RTGS/UPI transaction reference',
    createdAt   DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_payroll_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE,
    INDEX idx_payroll_empid (empId),
    INDEX idx_payroll_month (month),
    INDEX idx_payroll_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA: Payroll (25 records — January 2025)
-- ============================================================================
-- All 25 employees processed for Jan 2025.
-- Salary structure:
--   Staff  : basic ₹25,000–₹80,000  | HRA = 40% of basic | allowances vary by role
--   Labour : basic ₹18,000–₹22,000  | HRA = 40% of basic | OT for shutdown/site work
-- Statutory: PF = 12% of basic; ESI = 0 (all gross values exceed ₹21,000 threshold)
--            PT = ₹200 (Maharashtra standard)
-- Status mix: 15 Paid, 8 Processed, 2 Pending
-- Paid on: 2025-01-31 via NEFT with bank reference numbers
-- Days worked: 25–27 (Jan 2025 had ~26 working days Mon–Sat)
-- ============================================================================

INSERT INTO Payroll (id, empId, month, year, daysWorked, basic, hra, da, ot, allowances, gross, pf, esi, tds, pt, deductions, netPay, paymentDate, status, bankRef) VALUES
-- ============================================================================
-- PAID (15 records) — Salary credited on 2025-01-31 via NEFT
-- ============================================================================
-- emp_0001: Rajesh Mehta — Senior Engineer, Reliance Jamnagar
('pay_0001', 'emp_0001', 'Jan 2025', '2025', 26, 75000, 30000, 0, 0, 5000, 110000, 9000, 0, 5000, 200, 0, 95800, '2025-01-31', 'Paid', 'NEFT-VC001-JAN25-00001'),
-- emp_0002: Sanjay Kumar Singh — Site Supervisor, Tata Steel Jamshedpur
('pay_0002', 'emp_0002', 'Jan 2025', '2025', 26, 45000, 18000, 0, 2500, 2000, 67500, 5400, 0, 1500, 200, 0, 60400, '2025-01-31', 'Paid', 'NEFT-VC002-JAN25-00002'),
-- emp_0003: Vikram Pandey — Site Incharge, NTPC Singrauli
('pay_0003', 'emp_0003', 'Jan 2025', '2025', 27, 65000, 26000, 0, 3000, 5000, 99000, 7800, 0, 3500, 200, 0, 87500, '2025-01-31', 'Paid', 'NEFT-VC003-JAN25-00003'),
-- emp_0004: Nagarjuna Reddy — Planning Engineer, UltraTech Tadipatri
('pay_0004', 'emp_0004', 'Jan 2025', '2025', 26, 55000, 22000, 0, 1500, 3000, 81500, 6600, 0, 2500, 200, 0, 72200, '2025-01-31', 'Paid', 'NEFT-VC004-JAN25-00004'),
-- emp_0005: Arun Sharma — Project Engineer, IOCL Panipat
('pay_0005', 'emp_0005', 'Jan 2025', '2025', 25, 50000, 20000, 0, 2000, 3000, 75000, 6000, 0, 2000, 200, 0, 66800, '2025-01-31', 'Paid', 'NEFT-VC005-JAN25-00005'),
-- emp_0006: Pradeep Rao — Site Supervisor, JSW Vijayanagar
('pay_0006', 'emp_0006', 'Jan 2025', '2025', 26, 42000, 16800, 0, 3500, 2000, 64300, 5040, 0, 1200, 200, 0, 57860, '2025-01-31', 'Paid', 'NEFT-VC006-JAN25-00006'),
-- emp_0007: Amit Joshi — Engineer, Reliance Jamnagar
('pay_0007', 'emp_0007', 'Jan 2025', '2025', 27, 40000, 16000, 0, 1000, 2000, 59000, 4800, 0, 800, 200, 0, 53200, '2025-01-31', 'Paid', 'NEFT-VC007-JAN25-00007'),
-- emp_0008: Suresh Patel — Engineer, Reliance Jamnagar
('pay_0008', 'emp_0008', 'Jan 2025', '2025', 26, 38000, 15200, 0, 2000, 1500, 56700, 4560, 0, 600, 200, 0, 51340, '2025-01-31', 'Paid', 'NEFT-VC008-JAN25-00008'),
-- emp_0009: Deepak Verma — Safety Officer, NTPC Singrauli
('pay_0009', 'emp_0009', 'Jan 2025', '2025', 25, 48000, 19200, 0, 1500, 3000, 71700, 5760, 0, 1800, 200, 0, 63940, '2025-01-31', 'Paid', 'NEFT-VC009-JAN25-00009'),
-- emp_0010: Mahesh Kumar — Supervisor, Tata Steel Jamshedpur
('pay_0010', 'emp_0010', 'Jan 2025', '2025', 26, 35000, 14000, 0, 3000, 2000, 54000, 4200, 0, 500, 200, 0, 49100, '2025-01-31', 'Paid', 'NEFT-VC010-JAN25-00010'),
-- emp_0011: Kiran Nair — HR Executive, Reliance Jamnagar
('pay_0011', 'emp_0011', 'Jan 2025', '2025', 26, 32000, 12800, 0, 0, 2500, 47300, 3840, 0, 300, 200, 0, 42960, '2025-01-31', 'Paid', 'NEFT-VC011-JAN25-00011'),
-- emp_0012: Priya Sharma — Accounts Executive, Mumbai HQ
('pay_0012', 'emp_0012', 'Jan 2025', '2025', 26, 30000, 12000, 0, 0, 2000, 44000, 3600, 0, 200, 200, 0, 40000, '2025-01-31', 'Paid', 'NEFT-VC012-JAN25-00012'),
-- emp_0013: Ravi Tiwari — Procurement Officer, Mumbai HQ
('pay_0013', 'emp_0013', 'Jan 2025', '2025', 27, 35000, 14000, 0, 500, 2500, 52000, 4200, 0, 500, 200, 0, 47100, '2025-01-31', 'Paid', 'NEFT-VC013-JAN25-00013'),
-- emp_0014: Senthil Kumar — QA/QC Inspector, NTPC Singrauli
('pay_0014', 'emp_0014', 'Jan 2025', '2025', 26, 38000, 15200, 0, 2000, 2000, 57200, 4560, 0, 600, 200, 0, 51840, '2025-01-31', 'Paid', 'NEFT-VC014-JAN25-00014'),
-- emp_0015: Mohan Lal — Technician/Fitter (Labour), Reliance Jamnagar
('pay_0015', 'emp_0015', 'Jan 2025', '2025', 25, 20000, 8000, 0, 3000, 1000, 32000, 2400, 0, 0, 200, 0, 29400, '2025-01-31', 'Paid', 'NEFT-VC015-JAN25-00015'),

-- ============================================================================
-- PROCESSED (8 records) — Approved but awaiting bank transfer
-- ============================================================================
-- emp_0016: Raju Yadav — Technician/Welder (Labour), Tata Steel Jamshedpur
('pay_0016', 'emp_0016', 'Jan 2025', '2025', 26, 22000, 8800, 0, 4500, 1000, 36300, 2640, 0, 0, 200, 0, 33460, NULL, 'Processed', NULL),
-- emp_0017: Anil Gupta — Planner, Mumbai HQ
('pay_0017', 'emp_0017', 'Jan 2025', '2025', 26, 38000, 15200, 0, 1000, 2000, 56200, 4560, 0, 600, 200, 0, 50840, NULL, 'Processed', NULL),
-- emp_0018: Suresh M — Technician/Electrician (Labour), NTPC Singrauli
('pay_0018', 'emp_0018', 'Jan 2025', '2025', 25, 18000, 7200, 0, 2500, 500, 28200, 2160, 0, 0, 200, 0, 25840, NULL, 'Processed', NULL),
-- emp_0019: Venkat Rao — Engineer, UltraTech Tadipatri
('pay_0019', 'emp_0019', 'Jan 2025', '2025', 27, 40000, 16000, 0, 1500, 2500, 60000, 4800, 0, 800, 200, 0, 54200, NULL, 'Processed', NULL),
-- emp_0020: Ashok Pandit — Safety Officer, Reliance Jamnagar
('pay_0020', 'emp_0020', 'Jan 2025', '2025', 26, 45000, 18000, 0, 2000, 3000, 68000, 5400, 0, 1500, 200, 0, 60900, NULL, 'Processed', NULL),
-- emp_0021: Manoj Singh — Technician/Fitter (Labour), IOCL Panipat
('pay_0021', 'emp_0021', 'Jan 2025', '2025', 26, 19000, 7600, 0, 3500, 500, 30600, 2280, 0, 0, 200, 0, 28120, NULL, 'Processed', NULL),
-- emp_0022: Dilip Das — Technician/Electrician (Labour), JSW Vijayanagar
('pay_0022', 'emp_0022', 'Jan 2025', '2025', 25, 21000, 8400, 0, 2000, 1000, 32400, 2520, 0, 0, 200, 0, 29680, NULL, 'Processed', NULL),
-- emp_0023: Ganesh Patil — Store Keeper, Reliance Jamnagar
('pay_0023', 'emp_0023', 'Jan 2025', '2025', 26, 25000, 10000, 0, 1000, 1500, 37500, 3000, 0, 0, 200, 0, 34300, NULL, 'Processed', NULL),

-- ============================================================================
-- PENDING (2 records) — Awaiting approval (HQ management payroll)
-- ============================================================================
-- emp_0024: Rahul Deshmukh — Finance Manager, Mumbai HQ
('pay_0024', 'emp_0024', 'Jan 2025', '2025', 26, 80000, 32000, 0, 0, 5000, 117000, 9600, 0, 8000, 200, 0, 99200, NULL, 'Pending', NULL),
-- emp_0025: Kavita Reddy — HR Manager, Mumbai HQ
('pay_0025', 'emp_0025', 'Jan 2025', '2025', 26, 70000, 28000, 0, 0, 5000, 103000, 8400, 0, 6000, 200, 0, 88400, NULL, 'Pending', NULL)