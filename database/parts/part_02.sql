-- ============================================================================
-- VoltCore ERP - Part 02: Department, Designation & Employee Seed Data
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- Version : 1.0.0
-- ============================================================================
-- Contents:
--   1. Department  (8 records)  - Core departments for plant maintenance ops
--   2. Designation (12 records) - Job roles with salary bands per level
--   3. Employee    (20 records) - Staff with exact IDs (clemp001–clemp020)
--      NOTE: These employee IDs are referenced as FKs in Attendance,
--            LeaveRequest, Payroll, Expense, ShiftSchedule, Certification
--            and other dependent tables — do NOT alter IDs.
-- ============================================================================

USE voltcore_erp;

-- ============================================================================
-- 1. DEPARTMENT (8 records)
-- ============================================================================
-- Locations: Mumbai HQ + major site cities where VoltCore has ongoing work

INSERT INTO Department (id, name, head, location, employeeCount, status, createdAt, updatedAt) VALUES
-- HQ-based departments
('dept_eng',     'Engineering',          'Mahesh Patel',          'Mumbai HQ',                           12, 'Active', NOW(), NOW()),
('dept_mp',      'Maintenance Planning', 'Sanjay Mishra',         'Mumbai HQ',                            6, 'Active', NOW(), NOW()),
('dept_hse',     'Safety & HSE',         'Rajesh Kumar Das',      'Mumbai HQ',                            5, 'Active', NOW(), NOW()),
('dept_finance', 'Finance',              'Accounts Executive',    'Mumbai HQ',                            4, 'Active', NOW(), NOW()),
('dept_hr',      'Human Resources',      'HR Manager',            'Mumbai HQ',                            3, 'Active', NOW(), NOW()),
('dept_proc',    'Procurement',          'Procurement Officer',   'Mumbai HQ',                            3, 'Active', NOW(), NOW()),
('dept_qc',      'QA/QC',                'Satvik Sharma',         'Mumbai HQ',                            4, 'Active', NOW(), NOW()),
-- Field operations — based at the largest active site
('dept_ops',     'Operations',           'Vikram Singh Tomar',    'NTPC Singrauli Super Thermal, MP',    18, 'Active', NOW(), NOW());


-- ============================================================================
-- 2. DESIGNATION (12 records)
-- ============================================================================
-- Salary bands reflect Indian plant-maintenance contractor market rates (INR)
-- Level L2 = Helper/Trainee  |  L3 = Technician/Executive  |  L4 = Officer/Sr. Tech
--        L5 = Engineer/Manager  |  L6 = Senior Manager/Head

INSERT INTO Designation (id, title, department, level, minSalary, maxSalary, status, createdAt, updatedAt) VALUES
-- Engineering & Maintenance Leadership
('des_mm',  'Maintenance Manager',    'Engineering',          'L6', 80000, 150000, 'Active', NOW(), NOW()),
('des_pe',  'Planning Engineer',      'Maintenance Planning', 'L5', 45000,  75000, 'Active', NOW(), NOW()),
('des_sc',  'Shutdown Coordinator',   'Engineering',          'L5', 60000, 100000, 'Active', NOW(), NOW()),

-- Technical Trades
('des_mt',  'Mechanical Technician',  'Engineering',          'L3', 22000,  38000, 'Active', NOW(), NOW()),
('des_et',  'Electrical Technician',  'Engineering',          'L3', 22000,  38000, 'Active', NOW(), NOW()),
('des_it',  'Instrumentation Technician', 'Engineering',      'L3', 25000,  42000, 'Active', NOW(), NOW()),

-- HSE
('des_so',  'Safety Officer',         'Safety & HSE',         'L4', 30000,  55000, 'Active', NOW(), NOW()),

-- Support Functions
('des_hrm', 'HR Manager',             'Human Resources',      'L5', 50000,  80000, 'Active', NOW(), NOW()),
('des_ae',  'Accounts Executive',     'Finance',              'L3', 25000,  40000, 'Active', NOW(), NOW()),
('des_po',  'Procurement Officer',    'Procurement',          'L4', 30000,  50000, 'Active', NOW(), NOW()),

-- Quality
('des_qi',  'QA/QC Inspector',        'QA/QC',                'L4', 30000,  50000, 'Active', NOW(), NOW()),

-- Skilled Trades
('des_wf',  'Welder/Fitter',          'Engineering',          'L2', 18000,  32000, 'Active', NOW(), NOW());


-- ============================================================================
-- 3. EMPLOYEE (20 records)
-- ============================================================================
-- ID format  : clemp001 – clemp020  (referenced as FKs in other tables)
-- empId      : EMP-001 – EMP-020     (human-readable employee codes)
-- type       : All 'Staff'
-- status     : All 'Active'
-- email      : firstname@voltcore.in
-- phone      : 98765432xx (unique last two digits per employee)
-- joiningDate: Spread across 2021-2023
-- sites      : Aligned to VoltCore's active project locations

INSERT INTO Employee (id, empId, name, email, phone, trade, role, site, type, status, joiningDate, certifications, createdAt, updatedAt) VALUES
-- -----------------------------------------------------------------------
-- Senior Management & Engineers (clemp001 – clemp006)
-- -----------------------------------------------------------------------

-- clemp001 | Maintenance Manager | Reliance Jamnagar Refinery, Gujarat
('clemp001mahp001', 'EMP-001', 'Mahesh Patel',
 'mahesh@voltcore.in',     '9876543201',
 'Mechanical Engineer',    'Maintenance Manager',
 'Reliance Jamnagar Refinery, Gujarat',
 'Staff', 'Active', '2021-01-15',
 'B.E. Mechanical, BOE',
 NOW(), NOW()),

-- clemp002 | Shutdown Coordinator | Tata Steel Plant, Jamshedpur, Jharkhand
('clemp002sunv001', 'EMP-002', 'Sunil Verma',
 'sunil@voltcore.in',      '9876543202',
 'Mechanical Engineer',    'Shutdown Coordinator',
 'Tata Steel Plant, Jamshedpur, Jharkhand',
 'Staff', 'Active', '2021-03-20',
 'B.E. Mechanical, PMP',
 NOW(), NOW()),

-- clemp003 | Maintenance Manager | NTPC Singrauli Super Thermal, MP
('clemp003vikst001', 'EMP-003', 'Vikram Singh Tomar',
 'vikram@voltcore.in',     '9876543203',
 'Mechanical Engineer',    'Maintenance Manager',
 'NTPC Singrauli Super Thermal, MP',
 'Staff', 'Active', '2021-02-10',
 'B.E. Mechanical, PMP',
 NOW(), NOW()),

-- clemp004 | Planning Engineer | UltraTech Cement, Andhra Pradesh
('clemp004ravsr001', 'EMP-004', 'Ravi Shankar Reddy',
 'ravi@voltcore.in',       '9876543204',
 'Mechanical Engineer',    'Planning Engineer',
 'UltraTech Cement, Andhra Pradesh',
 'Staff', 'Active', '2022-04-05',
 'B.E. Mechanical',
 NOW(), NOW()),

-- clemp005 | Site Engineer | IOCL Panipat Refinery, Haryana
('clemp005amitm001', 'EMP-005', 'Amit Mehta',
 'amit@voltcore.in',       '9876543205',
 'Electrical Engineer',    'Site Engineer',
 'IOCL Panipat Refinery, Haryana',
 'Staff', 'Active', '2022-06-18',
 'B.E. Electrical',
 NOW(), NOW()),

-- clemp006 | Maintenance Manager | JSW Steel, Vijayanagar, Karnataka
('clemp006ramgo001', 'EMP-006', 'Ramesh Gowda',
 'ramesh@voltcore.in',     '9876543206',
 'Mechanical Engineer',    'Maintenance Manager',
 'JSW Steel, Vijayanagar, Karnataka',
 'Staff', 'Active', '2021-07-01',
 'B.E. Mechanical, AWS CWI',
 NOW(), NOW()),

-- -----------------------------------------------------------------------
-- Supervisors & Technicians (clemp007 – clemp010)
-- -----------------------------------------------------------------------

-- clemp007 | Supervisor | Tata Steel Plant, Jamshedpur, Jharkhand
('clemp007anilk001', 'EMP-007', 'Anil Kumar',
 'anil@voltcore.in',       '9876543207',
 'Mechanical Technician',  'Supervisor',
 'Tata Steel Plant, Jamshedpur, Jharkhand',
 'Staff', 'Active', '2021-09-12',
 'ITI Fitter',
 NOW(), NOW()),

-- clemp008 | Electrician | NTPC Singrauli Super Thermal, MP
('clemp008pradj001', 'EMP-008', 'Pradeep Jha',
 'pradeep@voltcore.in',    '9876543208',
 'Electrical Technician',  'Electrician',
 'NTPC Singrauli Super Thermal, MP',
 'Staff', 'Active', '2022-01-25',
 'ITI Electrician',
 NOW(), NOW()),

-- clemp009 | Welder | Reliance Jamnagar Refinery, Gujarat
('clemp009suresh001', 'EMP-009', 'Suresh Kumar',
 'suresh@voltcore.in',     '9876543209',
 'Welder/Fitter',          'Welder',
 'Reliance Jamnagar Refinery, Gujarat',
 'Staff', 'Active', '2021-11-08',
 'AWS CWI, 6G Welding',
 NOW(), NOW()),

-- clemp010 | Instrument Tech | IOCL Panipat Refinery, Haryana
('clemp010mohrk001', 'EMP-010', 'Mohd. Rakesh',
 'rakesh@voltcore.in',     '9876543210',
 'Instrumentation Technician', 'Instrument Tech',
 'IOCL Panipat Refinery, Haryana',
 'Staff', 'Active', '2022-03-14',
 'Diploma Instrumentation',
 NOW(), NOW()),

-- -----------------------------------------------------------------------
-- HSE Officers (clemp011 – clemp012)
-- -----------------------------------------------------------------------

-- clemp011 | HSE Officer | JSW Steel, Vijayanagar, Karnataka
('clemp011rajkd001', 'EMP-011', 'Rajesh Kumar Das',
 'rajesh@voltcore.in',     '9876543211',
 'Safety Officer',         'HSE Officer',
 'JSW Steel, Vijayanagar, Karnataka',
 'Staff', 'Active', '2021-05-22',
 'NEBOSH IGC, IOSH MS',
 NOW(), NOW()),

-- clemp012 | Safety Officer | UltraTech Cement, Andhra Pradesh
('clemp012karth001', 'EMP-012', 'Karthik Rajan',
 'karthik@voltcore.in',    '9876543212',
 'Safety Officer',         'Safety Officer',
 'UltraTech Cement, Andhra Pradesh',
 'Staff', 'Active', '2022-08-30',
 'B.Sc, NEBOSH IGC',
 NOW(), NOW()),

-- -----------------------------------------------------------------------
-- Field Technicians & Tradesmen (clemp013 – clemp020)
-- -----------------------------------------------------------------------

-- clemp013 | Mechanic | NTPC Singrauli Super Thermal, MP
('clemp013deepr001', 'EMP-013', 'Deepak Rawat',
 'deepak@voltcore.in',     '9876543213',
 'Mechanical Technician',  'Mechanic',
 'NTPC Singrauli Super Thermal, MP',
 'Staff', 'Active', '2022-02-07',
 'ITI Mechanic, BOE Certificate',
 NOW(), NOW()),

-- clemp014 | Shutdown Planner | Tata Steel Plant, Jamshedpur, Jharkhand
('clemp014sanjm001', 'EMP-014', 'Sanjay Mishra',
 'sanjay@voltcore.in',     '9876543214',
 'Planning Engineer',      'Shutdown Planner',
 'Tata Steel Plant, Jamshedpur, Jharkhand',
 'Staff', 'Active', '2021-10-15',
 'B.E. Mechanical, PMP',
 NOW(), NOW()),

-- clemp015 | Fitter | Reliance Jamnagar Refinery, Gujarat
('clemp015ajitk001', 'EMP-015', 'Ajit Kumar',
 'ajit@voltcore.in',       '9876543215',
 'Welder/Fitter',          'Fitter',
 'Reliance Jamnagar Refinery, Gujarat',
 'Staff', 'Active', '2023-01-09',
 'ITI Fitter',
 NOW(), NOW()),

-- clemp016 | Electrical Supervisor | UltraTech Cement, Andhra Pradesh
('clemp016prabk001', 'EMP-016', 'Prabhakar Reddy',
 'prabhakar@voltcore.in',  '9876543216',
 'Electrical Technician',  'Electrical Supervisor',
 'UltraTech Cement, Andhra Pradesh',
 'Staff', 'Active', '2022-05-20',
 'Diploma Electrical',
 NOW(), NOW()),

-- clemp017 | Mechanic | IOCL Panipat Refinery, Haryana
('clemp017ramesh001', 'EMP-017', 'Ramesh Chauhan',
 'ramesh.c@voltcore.in',   '9876543217',
 'Mechanical Technician',  'Mechanic',
 'IOCL Panipat Refinery, Haryana',
 'Staff', 'Active', '2023-03-11',
 'ITI Mechanic',
 NOW(), NOW()),

-- clemp018 | QA/QC Inspector | JSW Steel, Vijayanagar, Karnataka
('clemp018satvk001', 'EMP-018', 'Satvik Sharma',
 'satvik@voltcore.in',     '9876543218',
 'QA/QC Inspector',        'QA/QC Inspector',
 'JSW Steel, Vijayanagar, Karnataka',
 'Staff', 'Active', '2022-07-04',
 'ASNT NDT Level-II',
 NOW(), NOW()),

-- clemp019 | Instrument Lead | NTPC Singrauli Super Thermal, MP
('clemp019navin001', 'EMP-019', 'Navin Joseph',
 'navin@voltcore.in',      '9876543219',
 'Instrumentation Technician', 'Instrument Lead',
 'NTPC Singrauli Super Thermal, MP',
 'Staff', 'Active', '2021-12-01',
 'B.E. Electronics',
 NOW(), NOW()),

-- clemp020 | Welder | Tata Steel Plant, Jamshedpur, Jharkhand
('clemp020manoj001', 'EMP-020', 'Manoj Tiwari',
 'manoj@voltcore.in',      '9876543220',
 'Mechanical Technician',  'Welder',
 'Tata Steel Plant, Jamshedpur, Jharkhand',
 'Staff', 'Active', '2023-02-18',
 'ITI Welder, 6G Certified',
 NOW(), NOW());
