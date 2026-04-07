-- ============================================================================
-- MODULE 06: Leave Management
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : LeaveRequest, LeaveBalance
-- Context : Manages employee leave applications (EL, SL, CL, Compensatory Off,
--           Maternity, Paternity) and tracks annual leave balances for all
--           staff across plant sites and HQ. Leave approvals are routed through
--           site supervisors and HR managers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: LeaveRequest
-- ----------------------------------------------------------------------------
-- Stores individual leave applications submitted by employees.
-- Status flow: Pending → Approved / Rejected / Cancelled
-- Applied for past and future dates; approvedBy stores the approver's empId.
-- ----------------------------------------------------------------------------

CREATE TABLE LeaveRequest (
    id          VARCHAR(25)     NOT NULL,
    empId       VARCHAR(25)     NOT NULL,
    type        VARCHAR(50)     NOT NULL COMMENT 'EL, SL, CL, Compensatory Off, Maternity, Paternity',
    fromDate    DATE            NOT NULL,
    toDate      DATE            NOT NULL,
    days        INT             NOT NULL,
    reason      TEXT            DEFAULT NULL,
    status      VARCHAR(50)     NOT NULL DEFAULT 'Pending' COMMENT 'Pending, Approved, Rejected, Cancelled',
    approvedBy  VARCHAR(25)     DEFAULT NULL COMMENT 'Employee ID of the approver',
    appliedDate DATE            NOT NULL,
    createdAt   DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_leaverequest_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE,
    INDEX idx_leaverequest_empid (empId),
    INDEX idx_leaverequest_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLE: LeaveBalance
-- ----------------------------------------------------------------------------
-- Annual leave allocation and consumption tracker per employee.
-- Each employee gets one row per leave type per year (typically EL, SL, CL).
-- balance = total - used; updated as leaves are approved or cancelled.
-- ----------------------------------------------------------------------------

CREATE TABLE LeaveBalance (
    id        VARCHAR(25)     NOT NULL,
    empId     VARCHAR(25)     NOT NULL,
    type      VARCHAR(50)     NOT NULL COMMENT 'EL, SL, CL, Compensatory Off, Maternity, Paternity',
    total     INT             NOT NULL,
    used      INT             NOT NULL DEFAULT 0,
    balance   INT             NOT NULL,
    year      VARCHAR(10)     NOT NULL,
    createdAt DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_leavebalance_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE,
    UNIQUE KEY uk_leavebalance_emp_type_year (empId, type, year),
    INDEX idx_leavebalance_empid (empId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA: LeaveRequest (15 records)
-- ============================================================================
-- Mix of Approved (7), Pending (5), Rejected (2), Cancelled (1) requests
-- spanning 2024–2025. Includes various leave types across plant sites and HQ.
-- Approvers are typically supervisors or HR managers (emp_0025 Kavita Reddy).
-- ============================================================================

INSERT INTO LeaveRequest (id, empId, type, fromDate, toDate, days, reason, status, approvedBy, appliedDate) VALUES
-- Approved leave requests (7)
('lvreq_001', 'emp_0001', 'EL', '2025-01-15', '2025-01-17', 3, 'Personal work — property registration in Mumbai', 'Approved', 'emp_0025', '2025-01-10'),
('lvreq_002', 'emp_0002', 'SL', '2025-02-10', '2025-02-11', 2, 'Fever and viral infection', 'Approved', 'emp_0001', '2025-02-09'),
('lvreq_003', 'emp_0003', 'CL', '2025-03-05', '2025-03-05', 1, 'Family function — sister wedding', 'Approved', 'emp_0002', '2025-03-01'),
('lvreq_004', 'emp_0005', 'CL', '2025-01-26', '2025-01-26', 1, 'Bank work and document submission', 'Approved', 'emp_0001', '2025-01-24'),
('lvreq_005', 'emp_0008', 'Compensatory Off', '2025-02-15', '2025-02-15', 1, 'Comp-off for Reliance shutdown weekend work on 02-Feb', 'Approved', 'emp_0001', '2025-02-12'),
('lvreq_006', 'emp_0010', 'SL', '2024-12-20', '2024-12-22', 3, 'Back pain — doctor advised rest', 'Approved', 'emp_0002', '2024-12-19'),
('lvreq_007', 'emp_0012', 'Maternity', '2025-03-01', '2025-06-28', 120, 'Maternity leave as per company policy', 'Approved', 'emp_0025', '2025-02-15'),

-- Pending leave requests (5)
('lvreq_008', 'emp_0004', 'EL', '2025-04-14', '2025-04-20', 5, 'Planned vacation — visiting hometown in Andhra Pradesh', 'Pending', NULL, '2025-04-01'),
('lvreq_009', 'emp_0007', 'EL', '2025-05-01', '2025-05-10', 8, 'Long leave — attending cousin marriage in Pune', 'Pending', NULL, '2025-04-20'),
('lvreq_010', 'emp_0009', 'CL', '2025-06-10', '2025-06-10', 1, 'Personal errand — vehicle registration renewal', 'Pending', NULL, '2025-06-05'),
('lvreq_011', 'emp_0011', 'EL', '2025-07-14', '2025-07-25', 10, 'Annual vacation with family to Kerala', 'Pending', NULL, '2025-07-01'),
('lvreq_012', 'emp_0015', 'CL', '2025-08-05', '2025-08-06', 2, 'Local festival — Ganesh Chaturthi at home', 'Pending', NULL, '2025-07-28'),

-- Rejected leave requests (2)
('lvreq_013', 'emp_0006', 'SL', '2025-03-20', '2025-03-22', 3, 'General fatigue — no medical certificate provided', 'Rejected', 'emp_0003', '2025-03-19'),
('lvreq_014', 'emp_0014', 'SL', '2025-05-12', '2025-05-13', 2, 'Headache — applied after absence without prior intimation', 'Rejected', 'emp_0003', '2025-05-14'),

-- Cancelled leave request (1)
('lvreq_015', 'emp_0013', 'CL', '2025-04-05', '2025-04-05', 1, 'Cancel — urgent vendor meeting scheduled', 'Cancelled', NULL, '2025-04-04');

-- ============================================================================
-- SEED DATA: LeaveBalance (75 records)
-- ============================================================================
-- 25 employees × 3 leave types (EL, SL, CL) = 75 records for year 2025.
-- EL (Earned Leave): Total 15, used varies 2–10
-- SL (Sick Leave):   Total 12, used varies 1–8
-- CL (Casual Leave):  Total 10, used varies 2–7
-- Balance = Total - Used; realistic consumption based on plant work schedules.
-- ============================================================================

INSERT INTO LeaveBalance (id, empId, type, total, used, balance, year) VALUES
-- emp_0001 (Rajesh Mehta — Senior Engineer, Reliance Jamnagar)
('lvbal_001', 'emp_0001', 'EL', 15, 5, 10, '2025'),
('lvbal_002', 'emp_0001', 'SL', 12, 3, 9, '2025'),
('lvbal_003', 'emp_0001', 'CL', 10, 4, 6, '2025'),
-- emp_0002 (Sanjay Kumar Singh — Site Supervisor, Tata Steel)
('lvbal_004', 'emp_0002', 'EL', 15, 6, 9, '2025'),
('lvbal_005', 'emp_0002', 'SL', 12, 4, 8, '2025'),
('lvbal_006', 'emp_0002', 'CL', 10, 5, 5, '2025'),
-- emp_0003 (Vikram Pandey — Site Incharge, NTPC Singrauli)
('lvbal_007', 'emp_0003', 'EL', 15, 4, 11, '2025'),
('lvbal_008', 'emp_0003', 'SL', 12, 2, 10, '2025'),
('lvbal_009', 'emp_0003', 'CL', 10, 3, 7, '2025'),
-- emp_0004 (Nagarjuna Reddy — Planning Engineer, UltraTech)
('lvbal_010', 'emp_0004', 'EL', 15, 7, 8, '2025'),
('lvbal_011', 'emp_0004', 'SL', 12, 5, 7, '2025'),
('lvbal_012', 'emp_0004', 'CL', 10, 6, 4, '2025'),
-- emp_0005 (Arun Sharma — Project Engineer, IOCL Panipat)
('lvbal_013', 'emp_0005', 'EL', 15, 3, 12, '2025'),
('lvbal_014', 'emp_0005', 'SL', 12, 1, 11, '2025'),
('lvbal_015', 'emp_0005', 'CL', 10, 2, 8, '2025'),
-- emp_0006 (Pradeep Rao — Site Supervisor, JSW Vijayanagar)
('lvbal_016', 'emp_0006', 'EL', 15, 8, 7, '2025'),
('lvbal_017', 'emp_0006', 'SL', 12, 6, 6, '2025'),
('lvbal_018', 'emp_0006', 'CL', 10, 5, 5, '2025'),
-- emp_0007 (Amit Joshi — Engineer, Reliance Jamnagar)
('lvbal_019', 'emp_0007', 'EL', 15, 4, 11, '2025'),
('lvbal_020', 'emp_0007', 'SL', 12, 2, 10, '2025'),
('lvbal_021', 'emp_0007', 'CL', 10, 3, 7, '2025'),
-- emp_0008 (Suresh Patel — Engineer, Reliance Jamnagar)
('lvbal_022', 'emp_0008', 'EL', 15, 6, 9, '2025'),
('lvbal_023', 'emp_0008', 'SL', 12, 3, 9, '2025'),
('lvbal_024', 'emp_0008', 'CL', 10, 4, 6, '2025'),
-- emp_0009 (Deepak Verma — Safety Officer, NTPC Singrauli)
('lvbal_025', 'emp_0009', 'EL', 15, 5, 10, '2025'),
('lvbal_026', 'emp_0009', 'SL', 12, 2, 10, '2025'),
('lvbal_027', 'emp_0009', 'CL', 10, 3, 7, '2025'),
-- emp_0010 (Mahesh Kumar — Supervisor, Tata Steel)
('lvbal_028', 'emp_0010', 'EL', 15, 7, 8, '2025'),
('lvbal_029', 'emp_0010', 'SL', 12, 5, 7, '2025'),
('lvbal_030', 'emp_0010', 'CL', 10, 6, 4, '2025'),
-- emp_0011 (Kiran Nair — HR Executive, Jamnagar)
('lvbal_031', 'emp_0011', 'EL', 15, 3, 12, '2025'),
('lvbal_032', 'emp_0011', 'SL', 12, 1, 11, '2025'),
('lvbal_033', 'emp_0011', 'CL', 10, 2, 8, '2025'),
-- emp_0012 (Priya Sharma — Accounts Executive, HQ)
('lvbal_034', 'emp_0012', 'EL', 15, 10, 5, '2025'),
('lvbal_035', 'emp_0012', 'SL', 12, 4, 8, '2025'),
('lvbal_036', 'emp_0012', 'CL', 10, 7, 3, '2025'),
-- emp_0013 (Ravi Tiwari — Procurement Officer, HQ)
('lvbal_037', 'emp_0013', 'EL', 15, 5, 10, '2025'),
('lvbal_038', 'emp_0013', 'SL', 12, 3, 9, '2025'),
('lvbal_039', 'emp_0013', 'CL', 10, 4, 6, '2025'),
-- emp_0014 (Senthil Kumar — QA/QC Inspector, NTPC Singrauli)
('lvbal_040', 'emp_0014', 'EL', 15, 6, 9, '2025'),
('lvbal_041', 'emp_0014', 'SL', 12, 8, 4, '2025'),
('lvbal_042', 'emp_0014', 'CL', 10, 5, 5, '2025'),
-- emp_0015 (Mohan Lal — Technician/Fitter, Reliance Jamnagar)
('lvbal_043', 'emp_0015', 'EL', 15, 4, 11, '2025'),
('lvbal_044', 'emp_0015', 'SL', 12, 2, 10, '2025'),
('lvbal_045', 'emp_0015', 'CL', 10, 3, 7, '2025'),
-- emp_0016 (Raju Yadav — Technician/Welder, Tata Steel)
('lvbal_046', 'emp_0016', 'EL', 15, 7, 8, '2025'),
('lvbal_047', 'emp_0016', 'SL', 12, 5, 7, '2025'),
('lvbal_048', 'emp_0016', 'CL', 10, 4, 6, '2025'),
-- emp_0017 (Anil Gupta — Planner, HQ)
('lvbal_049', 'emp_0017', 'EL', 15, 3, 12, '2025'),
('lvbal_050', 'emp_0017', 'SL', 12, 2, 10, '2025'),
('lvbal_051', 'emp_0017', 'CL', 10, 2, 8, '2025'),
-- emp_0018 (Suresh M — Technician/Electrician, NTPC Singrauli)
('lvbal_052', 'emp_0018', 'EL', 15, 8, 7, '2025'),
('lvbal_053', 'emp_0018', 'SL', 12, 6, 6, '2025'),
('lvbal_054', 'emp_0018', 'CL', 10, 5, 5, '2025'),
-- emp_0019 (Venkat Rao — Engineer, UltraTech Tadipatri)
('lvbal_055', 'emp_0019', 'EL', 15, 5, 10, '2025'),
('lvbal_056', 'emp_0019', 'SL', 12, 3, 9, '2025'),
('lvbal_057', 'emp_0019', 'CL', 10, 4, 6, '2025'),
-- emp_0020 (Ashok Pandit — Safety Officer, Reliance Jamnagar)
('lvbal_058', 'emp_0020', 'EL', 15, 6, 9, '2025'),
('lvbal_059', 'emp_0020', 'SL', 12, 4, 8, '2025'),
('lvbal_060', 'emp_0020', 'CL', 10, 5, 5, '2025'),
-- emp_0021 (Manoj Singh — Technician/Fitter, IOCL Panipat)
('lvbal_061', 'emp_0021', 'EL', 15, 9, 6, '2025'),
('lvbal_062', 'emp_0021', 'SL', 12, 7, 5, '2025'),
('lvbal_063', 'emp_0021', 'CL', 10, 6, 4, '2025'),
-- emp_0022 (Dilip Das — Technician/Electrician, JSW Vijayanagar)
('lvbal_064', 'emp_0022', 'EL', 15, 5, 10, '2025'),
('lvbal_065', 'emp_0022', 'SL', 12, 3, 9, '2025'),
('lvbal_066', 'emp_0022', 'CL', 10, 4, 6, '2025'),
-- emp_0023 (Ganesh Patil — Store Keeper, Reliance Jamnagar)
('lvbal_067', 'emp_0023', 'EL', 15, 4, 11, '2025'),
('lvbal_068', 'emp_0023', 'SL', 12, 2, 10, '2025'),
('lvbal_069', 'emp_0023', 'CL', 10, 3, 7, '2025'),
-- emp_0024 (Rahul Deshmukh — Finance Manager, HQ)
('lvbal_070', 'emp_0024', 'EL', 15, 3, 12, '2025'),
('lvbal_071', 'emp_0024', 'SL', 12, 1, 11, '2025'),
('lvbal_072', 'emp_0024', 'CL', 10, 2, 8, '2025'),
-- emp_0025 (Kavita Reddy — HR Manager, HQ)
('lvbal_073', 'emp_0025', 'EL', 15, 4, 11, '2025'),
('lvbal_074', 'emp_0025', 'SL', 12, 2, 10, '2025'),
('lvbal_075', 'emp_0025', 'CL', 10, 3, 7, '2025')