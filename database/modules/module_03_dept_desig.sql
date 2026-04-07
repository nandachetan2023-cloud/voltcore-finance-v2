-- ============================================================================
-- MODULE 03: Department & Designation
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- This module defines the organisational structure — departments and
-- designations. Departments support a self-referencing hierarchy via parentId
-- for sub-departments. Designations are linked to departments and carry
-- salary-band information aligned to Indian industrial maintenance pay scales.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: Department
-- ----------------------------------------------------------------------------
-- Stores the company's departments. parentId allows nesting sub-departments
-- under a parent department (e.g., Electrical under Engineering).
-- employeeCount is a cached denormalised count maintained at the application
-- layer for quick reporting.
-- ----------------------------------------------------------------------------

CREATE TABLE Department (
    id            VARCHAR(25)  NOT NULL,
    code          VARCHAR(50)  NOT NULL,
    name          VARCHAR(255) NOT NULL,
    head          VARCHAR(255) DEFAULT NULL,
    location      VARCHAR(255) NOT NULL,
    parentId      VARCHAR(25)  DEFAULT NULL,
    employeeCount INT          DEFAULT 0,
    status        VARCHAR(50)  DEFAULT 'Active',
    createdAt     DATETIME(3)  DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt     DATETIME(3)  DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uk_department_code (code),
    UNIQUE KEY uk_department_name (name),
    INDEX idx_department_parentId (parentId),

    CONSTRAINT fk_department_parent
        FOREIGN KEY (parentId) REFERENCES Department (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: Designation
-- ----------------------------------------------------------------------------
-- Job titles / roles tied to a department. The level field (L1–L5) aligns
-- with the salary-band hierarchy used across VoltCore's workforce.
-- L1 = Senior Leadership, L5 = Field Technicians / Labour.
-- ----------------------------------------------------------------------------

CREATE TABLE Designation (
    id          VARCHAR(25)  NOT NULL,
    title       VARCHAR(255) NOT NULL,
    department  VARCHAR(25)  NOT NULL,
    level       VARCHAR(50)  DEFAULT NULL,
    minSalary   DOUBLE       DEFAULT 0,
    maxSalary   DOUBLE       DEFAULT 0,
    status      VARCHAR(50)  DEFAULT 'Active',
    createdAt   DATETIME(3)  DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)  DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    INDEX idx_designation_department (department),

    CONSTRAINT fk_designation_department
        FOREIGN KEY (department) REFERENCES Department (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT DATA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Departments (8 records)
-- ----------------------------------------------------------------------------
-- All 8 departments are top-level (parentId = NULL). Employee counts are
-- derived from the master employee roster (see Module 04).
-- ----------------------------------------------------------------------------

INSERT INTO Department (id, code, name, head, location, parentId, employeeCount, status) VALUES
    ('dept_001', 'ENG',  'Engineering',         'Rajesh Mehta',   'Mumbai HQ', NULL, 5, 'Active'),
    ('dept_002', 'MP',   'Maintenance Planning', 'Anil Gupta',      'Mumbai HQ', NULL, 2, 'Active'),
    ('dept_003', 'HSE',  'Safety & HSE',         'Deepak Verma',    'Mumbai HQ', NULL, 2, 'Active'),
    ('dept_004', 'FIN',  'Finance',              'Rahul Deshmukh',  'Mumbai HQ', NULL, 2, 'Active'),
    ('dept_005', 'HR',   'Human Resources',      'Kavita Reddy',    'Mumbai HQ', NULL, 2, 'Active'),
    ('dept_006', 'PROC', 'Procurement',          'Ravi Tiwari',     'Mumbai HQ', NULL, 2, 'Active'),
    ('dept_007', 'QC',   'QA/QC',                'Senthil Kumar',   'Mumbai HQ', NULL, 1, 'Active'),
    ('dept_008', 'OPS',  'Operations',           'Vikram Pandey',   'Mumbai HQ', NULL, 9, 'Active');

-- ----------------------------------------------------------------------------
-- Designations (12 records)
-- ----------------------------------------------------------------------------
-- Salary bands in INR per month (gross), aligned to Indian industrial
-- maintenance contractor norms:
--   L1 — Senior Leadership   : ₹1,50,000 – ₹2,00,000
--   L2 — General Management  : ₹1,00,000 – ₹1,50,000
--   L3 — Middle Management   :   ₹60,000 – ₹1,00,000
--   L4 — Professional Staff  :   ₹35,000 –   ₹60,000
--   L5 — Technicians / Field :   ₹18,000 –   ₹30,000
-- ----------------------------------------------------------------------------

INSERT INTO Designation (id, title, department, level, minSalary, maxSalary, status) VALUES
    ('desig_001', 'Managing Director',  'dept_001', 'L1', 150000, 200000, 'Active'),
    ('desig_002', 'General Manager',    'dept_001', 'L2', 100000, 150000, 'Active'),
    ('desig_003', 'Project Manager',    'dept_001', 'L3',  60000, 100000, 'Active'),
    ('desig_004', 'Senior Engineer',    'dept_001', 'L3',  60000, 100000, 'Active'),
    ('desig_005', 'Engineer',           'dept_001', 'L4',  35000,  60000, 'Active'),
    ('desig_006', 'Site Supervisor',    'dept_008', 'L4',  35000,  60000, 'Active'),
    ('desig_007', 'Planning Engineer',  'dept_002', 'L4',  35000,  60000, 'Active'),
    ('desig_008', 'Safety Officer',     'dept_003', 'L4',  35000,  60000, 'Active'),
    ('desig_009', 'QA/QC Inspector',    'dept_007', 'L4',  35000,  60000, 'Active'),
    ('desig_010', 'Technician',         'dept_008', 'L5',  18000,  30000, 'Active'),
    ('desig_011', 'HR Executive',       'dept_005', 'L4',  35000,  60000, 'Active'),
    ('desig_012', 'Accounts Executive', 'dept_004', 'L4',  35000,  60000, 'Active')
