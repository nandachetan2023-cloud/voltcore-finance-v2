-- ============================================================================
-- VoltCore Engineering Pvt Ltd - Plant Maintenance Contractor ERP
-- Part 01: Core Configuration, Site & Project Seed Data
-- ============================================================================
-- Contains INSERT statements for:
--   1. CompanySettings (10 records)
--   2. Site             (6 records)
--   3. Project          (6 records)
-- ============================================================================

-- ============================================================================
-- 1. CompanySettings
--    Master configuration key-value store for the organisation.
--    Covers legal identifiers, HQ address, and HR leave policies.
-- ============================================================================

INSERT INTO CompanySettings (id, `key`, value, label, createdAt, updatedAt) VALUES
('cs_cfig0000000001', 'company_name', 'VoltCore Engineering Pvt Ltd',
 'Company Name',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000002', 'pan', 'AABCV1234K',
 'Permanent Account Number (PAN)',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000003', 'gst', '27AABCV1234K1Z5',
 'Goods and Services Tax (GST) Registration',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000004', 'pf_reg', 'MHBAN0012345000',
 'Provident Fund Registration Number',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000005', 'esi_reg', '31000123456789',
 'Employee State Insurance Registration',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000006', 'address',
 'VoltCore Engineering Pvt Ltd, Unit 1205-1208, Trade World Tower, Kamala Mills Compound, Lower Parel, Mumbai – 400013, Maharashtra, India',
 'Registered / Head Office Address',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000007', 'leave_el', '15',
 'Earned Leave (days per year)',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000008', 'leave_sl', '12',
 'Sick Leave (days per year)',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000009', 'leave_cl', '10',
 'Casual Leave (days per year)',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000'),

('cs_cfig0000000010', 'shift_config',
 '{"shifts":[{"name":"General","start":"06:00","end":"14:00"},{"name":"Second","start":"14:00","end":"22:00"},{"name":"Night","start":"22:00","end":"06:00"}],"cycle":"rotational","rotationDays":7}',
 'Shift Configuration (JSON)',
 '2024-01-01 00:00:00.000',
 '2024-01-01 00:00:00.000');


-- ============================================================================
-- 2. Site
--    Industrial plant locations where VoltCore deploys maintenance teams.
--    Each site is linked to a project via the `project` column.
-- ============================================================================

INSERT INTO Site (id, name, state, project, manpower, incharge, status, createdAt, updatedAt) VALUES
-- Site 1: Reliance Jamnagar Refinery (Gujarat) - linked to AMC-001
('st_site0000000001',
 'Reliance Jamnagar Refinery',
 'Gujarat',
 'pj_proj0000000001',
 65,
 'Rajesh Mehta',
 'Active',
 '2023-04-01 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Site 2: Tata Steel Plant, Jamshedpur (Jharkhand) - linked to SHD-001
('st_site0000000002',
 'Tata Steel Plant, Jamshedpur',
 'Jharkhand',
 'pj_proj0000000002',
 48,
 'Sanjay Kumar Singh',
 'Active',
 '2025-02-10 08:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Site 3: NTPC Singrauli Super Thermal Power Station (MP) - linked to AMC-002
('st_site0000000003',
 'NTPC Singrauli Super Thermal Power Station',
 'Madhya Pradesh',
 'pj_proj0000000003',
 82,
 'Vikram Pandey',
 'Active',
 '2022-07-15 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Site 4: UltraTech Cement Plant (Andhra Pradesh) - linked to PM-001
('st_site0000000004',
 'UltraTech Cement Plant, Tadipatri',
 'Andhra Pradesh',
 'pj_proj0000000004',
 35,
 'Nagarjuna Reddy',
 'Active',
 '2024-03-20 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Site 5: IOCL Panipat Refinery (Haryana) - linked to SHD-002
('st_site0000000005',
 'IOCL Panipat Refinery',
 'Haryana',
 'pj_proj0000000005',
 55,
 'Arun Sharma',
 'Planning',
 '2025-05-01 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Site 6: JSW Steel, Vijayanagar (Karnataka) - linked to AMC-003
('st_site0000000006',
 'JSW Steel Plant, Vijayanagar',
 'Karnataka',
 'pj_proj0000000006',
 70,
 'Pradeep Rao',
 'Active',
 '2023-10-01 09:00:00.000',
 '2025-06-15 10:30:00.000');


-- ============================================================================
-- 3. Project
--    Core project master – each record represents a contractual engagement
--    with a client at a specific site.
-- ============================================================================

INSERT INTO Project (id, code, name, client, type, contractValue, startDate, endDate, progress, people, status, site, createdAt, updatedAt) VALUES
-- Project 1: Annual Maintenance Contract – Reliance Jamnagar Refinery
('pj_proj0000000001',
 'AMC-001',
 'Reliance Jamnagar AMC',
 'Reliance Industries',
 'AMC',
 850000000,
 '2023-04-01 00:00:00.000',
 '2026-03-31 23:59:59.000',
 78,
 65,
 'In Progress',
 'st_site0000000001',
 '2023-03-15 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Project 2: Shutdown Overhaul – Tata Steel Blast Furnace 3
('pj_proj0000000002',
 'SHD-001',
 'Tata Steel BF-3 Shutdown Overhaul',
 'Tata Steel',
 'Shutdown',
 420000000,
 '2025-02-10 00:00:00.000',
 '2025-09-30 23:59:59.000',
 35,
 48,
 'In Progress',
 'st_site0000000002',
 '2025-01-20 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Project 3: Operation & Maintenance – NTPC Singrauli Super Thermal
('pj_proj0000000003',
 'AMC-002',
 'NTPC Singrauli O&M',
 'NTPC Ltd',
 'O&M',
 1500000000,
 '2022-07-15 00:00:00.000',
 '2027-07-14 23:59:59.000',
 65,
 82,
 'In Progress',
 'st_site0000000003',
 '2022-06-01 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Project 4: Preventive Maintenance – UltraTech Kiln
('pj_proj0000000004',
 'PM-001',
 'UltraTech Kiln PM',
 'UltraTech Cement',
 'Preventive',
 280000000,
 '2024-03-20 00:00:00.000',
 '2025-12-31 23:59:59.000',
 90,
 35,
 'In Progress',
 'st_site0000000004',
 '2024-02-10 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Project 5: Turnaround – IOCL Panipat Crude Distillation Unit
('pj_proj0000000005',
 'SHD-002',
 'IOCL Panipat CDU Turnaround',
 'IOCL',
 'Turnaround',
 670000000,
 '2025-08-01 00:00:00.000',
 '2026-02-28 23:59:59.000',
 12,
 55,
 'Planning',
 'st_site0000000005',
 '2025-04-15 09:00:00.000',
 '2025-06-15 10:30:00.000'),

-- Project 6: AMC – JSW Vijayanagar Hot Strip Mill
('pj_proj0000000006',
 'AMC-003',
 'JSW Hot Strip Mill Maintenance',
 'JSW Steel',
 'AMC',
 950000000,
 '2023-10-01 00:00:00.000',
 '2026-09-30 23:59:59.000',
 55,
 70,
 'In Progress',
 'st_site0000000006',
 '2023-09-10 09:00:00.000',
 '2025-06-15 10:30:00.000');
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
-- ============================================================================
-- Part 03: Attendance / LeaveRequest / Payroll
-- Plant Maintenance Contractor ERP
-- INSERT statements only
-- ============================================================================

-- ============================================================================
-- 3.1 ATTENDANCE (20 records: 18 Present + 1 Leave + 1 Weekly Off)
-- ============================================================================

INSERT INTO Attendance (id, empId, site, date, timeIn, timeOut, otHours, shift, status, createdAt, updatedAt) VALUES
-- Records 1-5
('att20241201001', 'clemp001mahp001', 'Reliance Jamnagar Refinery, Gujarat',  '2024-12-01', '06:00:00', '14:15:00', 1.25, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-01 06:00:00', '2024-12-01 14:15:00'),
('att20241201002', 'clemp002sunv001', 'Tata Steel Plant, Jamshedpur, Jharkhand', '2024-12-02', '14:00:00', '22:30:00', 2.00, 'Day Shift B (14:00-22:00)',  'Present',    '2024-12-02 14:00:00', '2024-12-02 22:30:00'),
('att20241201003', 'clemp003vikst001', 'NTPC Singrauli Super Thermal, MP',       '2024-12-03', '22:00:00', '06:00:00', 0.00, 'Night Shift (22:00-06:00)',  'Present',    '2024-12-03 22:00:00', '2024-12-04 06:00:00'),
('att20241201004', 'clemp004ravsr001', 'UltraTech Cement, Andhra Pradesh',        '2024-12-04', '06:00:00', '14:00:00', 0.00, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-04 06:00:00', '2024-12-04 14:00:00'),
('att20241201005', 'clemp005amitm001', 'IOCL Panipat Refinery, Haryana',           '2024-12-05', '06:00:00', '15:30:00', 2.50, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-05 06:00:00', '2024-12-05 15:30:00'),

-- Records 6-10
('att20241201006', 'clemp006ramgo001', 'JSW Steel, Vijayanagar, Karnataka',       '2024-12-06', '14:00:00', '22:00:00', 0.00, 'Day Shift B (14:00-22:00)',  'Weekly Off', '2024-12-06 14:00:00', '2024-12-06 22:00:00'),
('att20241201007', 'clemp007anilk001', 'Reliance Jamnagar Refinery, Gujarat',      '2024-12-07', '06:00:00', '14:45:00', 1.75, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-07 06:00:00', '2024-12-07 14:45:00'),
('att20241201008', 'clemp008pradj001', 'Tata Steel Plant, Jamshedpur, Jharkhand',  '2024-12-08', '22:00:00', '07:00:00', 1.00, 'Night Shift (22:00-06:00)',  'Present',    '2024-12-08 22:00:00', '2024-12-09 07:00:00'),
('att20241201009', 'clemp009suresh001', 'NTPC Singrauli Super Thermal, MP',        '2024-12-09', '06:00:00', '14:00:00', 0.00, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-09 06:00:00', '2024-12-09 14:00:00'),
('att20241201010', 'clemp010mohrk001', 'UltraTech Cement, Andhra Pradesh',         '2024-12-10', '14:00:00', '23:00:00', 2.00, 'Day Shift B (14:00-22:00)',  'Present',    '2024-12-10 14:00:00', '2024-12-10 23:00:00'),

-- Records 11-15
('att20241201011', 'clemp011rajkd001', 'IOCL Panipat Refinery, Haryana',           '2024-12-11', '22:00:00', '06:30:00', 1.50, 'Night Shift (22:00-06:00)',  'Present',    '2024-12-11 22:00:00', '2024-12-12 06:30:00'),
('att20241201012', 'clemp012karth001', 'JSW Steel, Vijayanagar, Karnataka',        '2024-12-12', '06:00:00', '14:00:00', 0.00, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-12 06:00:00', '2024-12-12 14:00:00'),
('att20241201013', 'clemp013deepr001', 'Reliance Jamnagar Refinery, Gujarat',      '2024-12-13', '06:00:00', '16:00:00', 3.00, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-13 06:00:00', '2024-12-13 16:00:00'),
('att20241201014', 'clemp014sanjm001', 'Tata Steel Plant, Jamshedpur, Jharkhand',  '2024-12-14', '14:00:00', '22:00:00', 0.00, 'Day Shift B (14:00-22:00)',  'Present',    '2024-12-14 14:00:00', '2024-12-14 22:00:00'),
('att20241201015', 'clemp015ajitk001', 'NTPC Singrauli Super Thermal, MP',         '2024-12-15', '22:00:00', '06:00:00', 0.00, 'Night Shift (22:00-06:00)',  'Present',    '2024-12-15 22:00:00', '2024-12-16 06:00:00'),

-- Records 16-20
('att20241201016', 'clemp016prabk001', 'UltraTech Cement, Andhra Pradesh',         '2024-12-16', '06:00:00', '14:20:00', 1.00, 'Day Shift A (06:00-14:00)',  'Present',    '2024-12-16 06:00:00', '2024-12-16 14:20:00'),
('att20241201017', 'clemp017ramesh001', 'IOCL Panipat Refinery, Haryana',          '2024-12-17', '14:00:00', '22:45:00', 1.75, 'Day Shift B (14:00-22:00)',  'Present',    '2024-12-17 14:00:00', '2024-12-17 22:45:00'),
('att20241201018', 'clemp018satvk001', 'JSW Steel, Vijayanagar, Karnataka',        '2024-12-18', '22:00:00', '06:15:00', 1.25, 'Night Shift (22:00-06:00)',  'Present',    '2024-12-18 22:00:00', '2024-12-19 06:15:00'),
('att20241201019', 'clemp019navin001', 'Reliance Jamnagar Refinery, Gujarat',      '2024-12-19', '06:00:00', '14:00:00', 0.00, 'Day Shift A (06:00-14:00)',  'Leave',      '2024-12-19 06:00:00', '2024-12-19 14:00:00'),
('att20241201020', 'clemp020manoj001', 'Tata Steel Plant, Jamshedpur, Jharkhand',  '2024-12-20', '14:00:00', '22:00:00', 0.00, 'Day Shift B (14:00-22:00)',  'Present',    '2024-12-20 14:00:00', '2024-12-20 22:00:00');


-- ============================================================================
-- 3.2 LEAVE REQUEST (8 records: 3 Approved, 3 Pending, 2 Rejected)
-- ============================================================================

INSERT INTO LeaveRequest (id, empId, site, type, fromDate, toDate, days, reason, status, appliedDate, createdAt, updatedAt) VALUES
-- 3 Approved
('lvr20241001001', 'clemp004ravsr001', 'UltraTech Cement, Andhra Pradesh',       'EL',      '2024-10-10', '2024-10-14', 5,    'Family function at native village',                  'Approved', '2024-10-01 09:30:00', '2024-10-01 09:30:00', '2024-10-02 11:00:00'),
('lvr20241101002', 'clemp009suresh001', 'NTPC Singrauli Super Thermal, MP',      'CL',      '2024-11-05', '2024-11-06', 2,    'Personal work — bank and document verification',       'Approved', '2024-11-01 08:15:00', '2024-11-01 08:15:00', '2024-11-02 10:00:00'),
('lvr20241201003', 'clemp019navin001', 'Reliance Jamnagar Refinery, Gujarat',    'Comp Off', '2024-12-19', '2024-12-19', 1,    'Compensatory off for Diwali shift worked on 01-Nov', 'Approved', '2024-12-15 07:45:00', '2024-12-15 07:45:00', '2024-12-16 09:00:00'),

-- 3 Pending
('lvr20241201004', 'clemp002sunv001', 'Tata Steel Plant, Jamshedpur, Jharkhand', 'SL',      '2024-12-28', '2024-12-29', 2,    'Fever and doctor-recommended rest',                   'Pending',  '2024-12-24 18:00:00', '2024-12-24 18:00:00', '2024-12-24 18:00:00'),
('lvr20241201005', 'clemp013deepr001', 'Reliance Jamnagar Refinery, Gujarat',    'EL',      '2024-12-30', '2025-01-03', 5,    'Year-end travel to hometown for wedding',             'Pending',  '2024-12-20 11:30:00', '2024-12-20 11:30:00', '2024-12-20 11:30:00'),
('lvr20241201006', 'clemp007anilk001', 'Reliance Jamnagar Refinery, Gujarat',    'CL',      '2024-12-31', '2024-12-31', 1,    'New Year eve personal commitment',                    'Pending',  '2024-12-26 09:00:00', '2024-12-26 09:00:00', '2024-12-26 09:00:00'),

-- 2 Rejected
('lvr20241101007', 'clemp016prabk001', 'UltraTech Cement, Andhra Pradesh',       'EL',      '2024-11-20', '2024-11-25', 6,    'Planned tour — insufficient leave balance',           'Rejected', '2024-11-10 10:00:00', '2024-11-10 10:00:00', '2024-11-12 14:30:00'),
('lvr20241001008', 'clemp011rajkd001', 'IOCL Panipat Refinery, Haryana',         'CL',      '2024-10-28', '2024-10-29', 2,    'Overlaps with scheduled shutdown maintenance work',    'Rejected', '2024-10-25 16:00:00', '2024-10-25 16:00:00', '2024-10-26 09:00:00');


-- ============================================================================
-- 3.3 PAYROLL (15 records: 10 Paid, 5 Pending)
-- Month: Nov 2024 | Days: 26-30
-- Formula: hra = 40% of basic, gross = basic + hra + ot,
--          pf = 12% of basic, esi = 0.75% of gross,
--          tds = 0-5000, netPay = gross - pf - esi - tds
-- ============================================================================

INSERT INTO Payroll (id, empId, month, days, basic, hra, ot, gross, pf, esi, tds, netPay, status, createdAt, updatedAt) VALUES
-- ── 10 Paid ──────────────────────────────────────────────────────────────────
--  1. clemp001mahp001  | basic=25000 | hra=10000 | ot=3000  | gross=38000   | pf=3000    | esi=285.00    | tds=1000   | net=33715.00
('pay20241101001', 'clemp001mahp001', 'Nov 2024', 27, 25000.00, 10000.00,  3000.00, 38000.00,  3000.00,   285.00,  1000.00,  33715.00, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  2. clemp003vikst001  | basic=45000 | hra=18000 | ot=6000  | gross=69000   | pf=5400    | esi=517.50    | tds=3500   | net=59582.50
('pay20241101002', 'clemp003vikst001', 'Nov 2024', 27, 45000.00, 18000.00,  6000.00, 69000.00,  5400.00,   517.50,  3500.00,  59582.50, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  3. clemp004ravsr001  | basic=55000 | hra=22000 | ot=4000  | gross=81000   | pf=6600    | esi=607.50    | tds=4000   | net=69792.50
('pay20241101003', 'clemp004ravsr001', 'Nov 2024', 26, 55000.00, 22000.00,  4000.00, 81000.00,  6600.00,   607.50,  4000.00,  69792.50, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  4. clemp005amitm001  | basic=95000 | hra=38000 | ot=8000  | gross=141000  | pf=11400   | esi=1057.50   | tds=5000   | net=123542.50
('pay20241101004', 'clemp005amitm001', 'Nov 2024', 28, 95000.00, 38000.00,  8000.00,141000.00, 11400.00,  1057.50,  5000.00, 123542.50, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  5. clemp007anilk001  | basic=28000 | hra=11200 | ot=3500  | gross=42700   | pf=3360    | esi=320.25    | tds=1500   | net=37519.75
('pay20241101005', 'clemp007anilk001', 'Nov 2024', 26, 28000.00, 11200.00,  3500.00, 42700.00,  3360.00,   320.25,  1500.00,  37519.75, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  6. clemp008pradj001  | basic=40000 | hra=16000 | ot=5500  | gross=61500   | pf=4800    | esi=461.25    | tds=3000   | net=53238.75
('pay20241101006', 'clemp008pradj001', 'Nov 2024', 27, 40000.00, 16000.00,  5500.00, 61500.00,  4800.00,   461.25,  3000.00,  53238.75, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  7. clemp010mohrk001  | basic=60000 | hra=24000 | ot=7000  | gross=91000   | pf=7200    | esi=682.50    | tds=4500   | net=78617.50
('pay20241101007', 'clemp010mohrk001', 'Nov 2024', 28, 60000.00, 24000.00,  7000.00, 91000.00,  7200.00,   682.50,  4500.00,  78617.50, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  8. clemp012karth001  | basic=48000 | hra=19200 | ot=4500  | gross=71700   | pf=5760    | esi=537.75    | tds=3200   | net=62202.25
('pay20241101008', 'clemp012karth001', 'Nov 2024', 26, 48000.00, 19200.00,  4500.00, 71700.00,  5760.00,   537.75,  3200.00,  62202.25, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

--  9. clemp013deepr001  | basic=38000 | hra=15200 | ot=3000  | gross=56200   | pf=4560    | esi=421.50    | tds=2500   | net=48718.50
('pay20241101009', 'clemp013deepr001', 'Nov 2024', 27, 38000.00, 15200.00,  3000.00, 56200.00,  4560.00,   421.50,  2500.00,  48718.50, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

-- 10. clemp015ajitk001  | basic=85000 | hra=34000 | ot=7500  | gross=126500  | pf=10200   | esi=948.75    | tds=5000   | net=110351.25
('pay20241101010', 'clemp015ajitk001', 'Nov 2024', 28, 85000.00, 34000.00,  7500.00,126500.00, 10200.00,   948.75,  5000.00, 110351.25, 'Paid',    '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

-- ── 5 Pending ────────────────────────────────────────────────────────────────
-- 11. clemp006ramgo001  | basic=18000 | hra=7200  | ot=2000  | gross=27200   | pf=2160    | esi=204.00    | tds=0      | net=24836.00
('pay20241101011', 'clemp006ramgo001', 'Nov 2024', 26, 18000.00,  7200.00,  2000.00, 27200.00,  2160.00,   204.00,     0.00,  24836.00, 'Pending', '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

-- 12. clemp009suresh001  | basic=32000 | hra=12800 | ot=4000  | gross=48800   | pf=3840    | esi=366.00    | tds=1800   | net=42794.00
('pay20241101012', 'clemp009suresh001', 'Nov 2024', 27, 32000.00, 12800.00,  4000.00, 48800.00,  3840.00,   366.00,  1800.00,  42794.00, 'Pending', '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

-- 13. clemp011rajkd001  | basic=22000 | hra=8800  | ot=1500  | gross=32300   | pf=2640    | esi=242.25    | tds=500    | net=28917.75
('pay20241101013', 'clemp011rajkd001', 'Nov 2024', 29, 22000.00,  8800.00,  1500.00, 32300.00,  2640.00,   242.25,   500.00,  28917.75, 'Pending', '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

-- 14. clemp014sanjm001  | basic=20000 | hra=8000  | ot=0     | gross=28000   | pf=2400    | esi=210.00    | tds=0      | net=25390.00
('pay20241101014', 'clemp014sanjm001', 'Nov 2024', 26, 20000.00,  8000.00,     0.00, 28000.00,  2400.00,   210.00,     0.00,  25390.00, 'Pending', '2024-11-30 10:00:00', '2024-11-30 10:00:00'),

-- 15. clemp017ramesh001 | basic=52000 | hra=20800 | ot=5500  | gross=78300   | pf=6240    | esi=587.25    | tds=3800   | net=67672.75
('pay20241101015', 'clemp017ramesh001', 'Nov 2024', 30, 52000.00, 20800.00,  5500.00, 78300.00,  6240.00,   587.25,  3800.00,  67672.75, 'Pending', '2024-11-30 10:00:00', '2024-11-30 10:00:00');
-- ============================================================================
-- Part 4: WorkPermit, Incident, Equipment
-- Plant Maintenance Contractor ERP – Seed Data (INSERT only)
-- ============================================================================

-- ============================================================================
-- 1. WorkPermit (10 records)
--    Statuses: 6 Active, 3 Closed, 1 Expired
--    Permit numbers: WP-2024-001 … WP-2024-010
--    Issue dates: December 2024
-- ============================================================================

INSERT INTO WorkPermit (id, permitNo, type, location, issuedTo, expiry, status, description, precautions, createdAt, updatedAt)
VALUES
(1, 'WP-2024-001', 'Hot Work',             'Reliance Jamnagar Refinery, Gujarat',                  'Mahesh Patel',       '2024-12-15 06:00:00', 'Active',  'Welding repair on crude distillation unit flare header',            'Fire blanket mandatory; 2 CO2 extinguishers within 10 m; fire watch for 30 min post-work', '2024-12-01 08:00:00', '2024-12-01 08:00:00'),
(2, 'WP-2024-002', 'Cold Work',            'Tata Steel Plant, Jamshedpur, Jharkhand',                'Sunil Verma',        '2024-12-20 18:00:00', 'Active',  'Bolt tensioning on blast furnace gas cleaning plant structure',       'PPE – hard hat, safety shoes, gloves; barricading below work area; tool lanyard mandatory',     '2024-12-02 07:30:00', '2024-12-02 07:30:00'),
(3, 'WP-2024-003', 'Height Work',          'JSW Steel Works, Vijayanagar, Karnataka',                'Suresh Kumar',       '2024-12-18 17:00:00', 'Active',  'Replacement of scaffolding planks on coke oven battery roof',        'Full body harness with twin lanyard; harness inspected within last 6 months; rescue plan in place','2024-12-03 06:30:00', '2024-12-03 06:30:00'),
(4, 'WP-2024-004', 'Confined Space Entry',  'IOCL Panipat Refinery, Haryana',                        'Mohd. Rakesh',       '2024-12-14 14:00:00', 'Active',  'Inspection of sour water stripper vessel internals',                  'Gas testing – LEL, H2S, O2; continuous monitoring; stand-by person with rescue equipment',       '2024-12-04 09:00:00', '2024-12-04 09:00:00'),
(5, 'WP-2024-005', 'Electrical Isolation',  'NTPC Talcher Power Station, Odisha',                    'Rajesh Kumar Das',   '2024-12-22 22:00:00', 'Active',  'HT cable termination on unit-4 bus duct',                             'PTW signed by electrical supervisor; voltage test with approved tester; earth applied on both ends','2024-12-05 10:00:00', '2024-12-05 10:00:00'),
(6, 'WP-2024-006', 'Radiography',          'UltraTech Cement Plant, Awarpur, Maharashtra',           'Ramesh Chauhan',     '2024-12-16 20:00:00', 'Active',  'Radiographic testing of pressure vessel weld joints – clinker cooler', 'Radiation barricade 30 m radius; dosimeter badges to all personnel; warning sirens before exposure', '2024-12-06 16:00:00', '2024-12-06 16:00:00'),
(7, 'WP-2024-007', 'Excavation',           'Reliance Jamnagar Refinery, Gujarat',                    'Mahesh Patel',       '2024-12-12 18:00:00', 'Closed',  'Trenching for new storm water drain near tank farm area',             'Shoring required for depth > 1.5 m; utility clearance obtained; spoils kept 0.5 m from edge',       '2024-12-02 07:00:00', '2024-12-12 17:45:00'),
(8, 'WP-2024-008', 'Chemical Handling',    'IOCL Panipat Refinery, Haryana',                        'Suresh Kumar',       '2024-12-10 16:00:00', 'Closed',  'Transfer of sulphuric acid from ISO tank to storage tank',            'Chemical-resistant suit, face shield, nitrile gloves; spill kit staged nearby; MSDS reviewed',     '2024-12-01 08:30:00', '2024-12-10 15:20:00'),
(9, 'WP-2024-009', 'Crane/Lifting',        'Tata Steel Plant, Jamshedpur, Jharkhand',                'Rajesh Kumar Das',   '2024-12-13 19:00:00', 'Closed',  'Lifting of 25 T transformer using 50 T mobile crane – new substation', 'Load chart verified; outriggers fully extended; rigging plan approved; wind speed < 20 km/h',    '2024-12-03 06:00:00', '2024-12-13 18:30:00'),
(10,'WP-2024-010', 'LOTO (Lockout/Tagout)', 'JSW Steel Works, Vijayanagar, Karnataka',               'Mohd. Rakesh',       '2024-12-09 14:00:00', 'Expired', 'Lockout of conveyor drive motor for gearbox replacement – RMHP bay',  'Each worker applies personal lock; try-start verification; group lockbox used; shift handover protocol', '2024-12-01 07:00:00', '2024-12-09 14:05:00');


-- ============================================================================
-- 2. Incident (6 records)
--    Statuses: 3 Closed, 2 Investigating, 1 Under Review
--    Ref numbers: INC-2024-001 … INC-2024-006
--    Dates: November–December 2024
-- ============================================================================

INSERT INTO Incident (id, refNo, date, site, type, severity, person, status, description, action, createdAt, updatedAt)
VALUES
(1, 'INC-2024-001', '2024-11-05 14:30:00', 'Reliance Jamnagar Refinery, Gujarat',               'Near Miss',          'Low',     'Mahesh Patel',     'Closed',        'Scaffolding tube slipped from height; no one injured – near miss on CDU platform',                     'Tool-lanyard policy reinforced; toolbox talk conducted for entire scaffolding crew on 06-Nov',                        '2024-11-05 15:00:00', '2024-11-12 10:00:00'),
(2, 'INC-2024-002', '2024-11-18 09:15:00', 'Tata Steel Plant, Jamshedpur, Jharkhand',            'First Aid',          'Medium',  'Sunil Verma',      'Closed',        'Minor hand abrasion while tightening flange bolts on gas cleaning plant; first aid administered on-site', 'Gloves upgraded to cut-resistant Kevlar; safe-work-procedure for bolt tensioning updated',                      '2024-11-18 09:45:00', '2024-11-25 11:30:00'),
(3, 'INC-2024-003', '2024-11-28 16:00:00', 'JSW Steel Works, Vijayanagar, Karnataka',            'Lost Time Injury',   'High',    'Suresh Kumar',     'Closed',        'Worker slipped on oily platform near rolling mill; fractured ankle – 7 days lost time',                    'Anti-slip grating installed; housekeeping audit frequency increased to daily; boot SOP updated',                   '2024-11-28 16:30:00', '2024-12-10 09:00:00'),
(4, 'INC-2024-004', '2024-12-03 11:20:00', 'IOCL Panipat Refinery, Haryana',                     'Property Damage',    'Medium',  'Mohd. Rakesh',     'Investigating', 'Forklift collided with pipe rack support beam near tank farm; beam damaged, no injuries reported',             'Area cordoned off; structural integrity check in progress; forklift operator drug test completed',              '2024-12-03 11:45:00', '2024-12-05 08:00:00'),
(5, 'INC-2024-005', '2024-12-08 22:10:00', 'UltraTech Cement Plant, Awarpur, Maharashtra',        'Fire Incident',      'Critical','Rajesh Kumar Das', 'Investigating', 'Flash fire during welding on clinker cooler casing; contained within 5 min by fire watch team',             'Hot Work Permit procedure under review; fire alarm response drill scheduled; area gas monitoring added',          '2024-12-08 22:30:00', '2024-12-10 07:30:00'),
(6, 'INC-2024-006', '2024-12-10 07:50:00', 'NTPC Talcher Power Station, Odisha',                 'Chemical Spill',     'Medium',  'Ramesh Chauhan',   'Under Review',   'Approx. 200 L of hydrazine leaked from dosing pump connection at water treatment plant',                      'Spill contained with absorbent pads; area ventilated; HAZMAT team deployed; containment bund inspected',            '2024-12-10 08:15:00', '2024-12-11 09:00:00');


-- ============================================================================
-- 3. Equipment (12 records)
--    Sites: NTPC, Tata Steel, Reliance, JSW, IOCL, UltraTech
--    Statuses: Operational(8), Under Maintenance(2), Down(1), Idle(1)
-- ============================================================================

INSERT INTO Equipment (id, name, eqId, site, status, lastPM, nextPM, issue, downSince, etaRepair, assignedTo, utilization, createdAt, updatedAt)
VALUES
( 1, 'Boiler TG-01',          'EQ-NTPC-TG01',    'NTPC Talcher Power Station, Odisha',                     'Operational',       '2024-10-15', '2025-01-15', NULL,                                      NULL,        NULL,         NULL,           85, '2024-01-15 00:00:00', '2024-12-10 06:00:00'),
( 2, 'Steam Turbine ST-500',  'EQ-TATA-ST500',   'Tata Steel Plant, Jamshedpur, Jharkhand',                'Under Maintenance', '2024-11-10', '2025-02-10', 'Bearing vibration high',                '2024-12-05', '2024-12-20', 'Sunil Verma',    72, '2024-01-20 00:00:00', '2024-12-10 06:00:00'),
( 3, 'Centrifugal Pump CP-101','EQ-REL-CP101',   'Reliance Jamnagar Refinery, Gujarat',                    'Operational',       '2024-11-20', '2025-02-20', NULL,                                      NULL,        NULL,         NULL,           90, '2024-02-10 00:00:00', '2024-12-10 06:00:00'),
( 4, 'Air Compressor CM-201', 'EQ-JSW-CM201',    'JSW Steel Works, Vijayanagar, Karnataka',                'Down',              '2024-11-15', '2025-05-15', 'Motor winding burnt',                  '2024-12-01', '2024-12-25', 'Amit Mehta',     0, '2024-03-01 00:00:00', '2024-12-10 06:00:00'),
( 5, 'Heat Exchanger HE-301', 'EQ-IOCL-HE301',   'IOCL Panipat Refinery, Haryana',                         'Operational',       '2024-09-10', '2025-03-10', NULL,                                      NULL,        NULL,         NULL,           78, '2024-04-05 00:00:00', '2024-12-10 06:00:00'),
( 6, 'Cooling Tower Fan CTF-401','EQ-UTC-CTF401','UltraTech Cement Plant, Awarpur, Maharashtra',           'Operational',       '2024-11-01', '2025-05-01', NULL,                                      NULL,        NULL,         NULL,           95, '2024-05-10 00:00:00', '2024-12-10 06:00:00'),
( 7, 'Transformer TR-501',    'EQ-NTPC-TR501',   'NTPC Talcher Power Station, Odisha',                     'Operational',       '2024-10-01', '2025-04-01', NULL,                                      NULL,        NULL,         NULL,           88, '2024-06-01 00:00:00', '2024-12-10 06:00:00'),
( 8, 'DG Set DG-601',         'EQ-REL-DG601',    'Reliance Jamnagar Refinery, Gujarat',                    'Under Maintenance', '2024-11-25', '2025-02-25', 'Radiator leak',                        '2024-12-08', NULL,         'Pradeep Jha',   45, '2024-07-15 00:00:00', '2024-12-10 06:00:00'),
( 9, 'Conveyor Belt CV-701',  'EQ-JSW-CV701',    'JSW Steel Works, Vijayanagar, Karnataka',                'Operational',       '2024-11-15', '2025-05-15', NULL,                                      NULL,        NULL,         NULL,           92, '2024-08-01 00:00:00', '2024-12-10 06:00:00'),
(10, 'Crusher CR-801',        'EQ-UTC-CR801',    'UltraTech Cement Plant, Awarpur, Maharashtra',           'Operational',       '2024-08-20', '2025-02-20', NULL,                                      NULL,        NULL,         NULL,           80, '2024-09-10 00:00:00', '2024-12-10 06:00:00'),
(11, 'Elevator EL-901',       'EQ-IOCL-EL901',   'IOCL Panipat Refinery, Haryana',                         'Operational',       '2024-12-01', '2025-06-01', NULL,                                      NULL,        NULL,         NULL,           65, '2024-10-01 00:00:00', '2024-12-10 06:00:00'),
(12, 'MCC Panel MCC-101',     'EQ-TATA-MCC101',  'Tata Steel Plant, Jamshedpur, Jharkhand',                'Operational',       '2024-11-10', '2025-05-10', NULL,                                      NULL,        NULL,         NULL,           88, '2024-11-01 00:00:00', '2024-12-10 06:00:00');
-- ============================================================================
-- Part 05: Expense, PurchaseOrder, Invoice, Subcontractor
-- ============================================================================
-- VoltCore Engineering Pvt Ltd - Plant Maintenance Contractor ERP
-- MySQL INSERT Statements
-- ============================================================================

USE voltcore_erp;

-- ============================================================================
-- TABLE: Expense (10 records)
-- Columns: id, claimNo, empId, category, amount, project, date, status,
--          createdAt, updatedAt
-- Status distribution: 6 Approved, 3 Pending, 1 Rejected
-- Amounts: Rs.500 - Rs.45,000 | Dates: Nov-Dec 2024
-- ============================================================================

INSERT INTO Expense (id, claimNo, empId, category, amount, project, date, status, createdAt, updatedAt) VALUES
('clexp001trvl001',
 'EXP-2024-001',
 'clemp001mahp001',
 'Travel',
 8500.00,
 'AMC-001',
 '2024-11-05',
 'Approved',
 '2024-11-05 10:15:00.000',
 '2024-11-08 14:30:00.000'),

('clexp002tool001',
 'EXP-2024-002',
 'clemp002sunv001',
 'Tools & Consumables',
 4200.00,
 'SHD-001',
 '2024-11-12',
 'Approved',
 '2024-11-12 09:00:00.000',
 '2024-11-14 11:45:00.000'),

('clexp003ppe001',
 'EXP-2024-003',
 'clemp003vikst001',
 'PPE/Safety Gear',
 6750.00,
 'AMC-002',
 '2024-11-18',
 'Approved',
 '2024-11-18 08:30:00.000',
 '2024-11-20 16:00:00.000'),

('clexp004trns001',
 'EXP-2024-004',
 'clemp005amitm001',
 'Transport',
 3200.00,
 'PM-001',
 '2024-11-25',
 'Pending',
 '2024-11-25 11:00:00.000',
 '2024-11-25 11:00:00.000'),

('clexp005accm001',
 'EXP-2024-005',
 'clemp006ramgo001',
 'Accommodation',
 12000.00,
 'AMC-003',
 '2024-12-01',
 'Approved',
 '2024-12-01 07:45:00.000',
 '2024-12-03 10:20:00.000'),

('clexp006ndt001',
 'EXP-2024-006',
 'clemp007anilk001',
 'Testing/NDT Charges',
 18500.00,
 'SHD-002',
 '2024-12-05',
 'Approved',
 '2024-12-05 09:30:00.000',
 '2024-12-07 15:10:00.000'),

('clexp007mat001',
 'EXP-2024-007',
 'clemp008pradj001',
 'Material Purchase',
 7800.00,
 'SHD-001',
 '2024-12-08',
 'Rejected',
 '2024-12-08 10:00:00.000',
 '2024-12-10 09:45:00.000'),

('clexp008ot001',
 'EXP-2024-008',
 'clemp009suresh001',
 'Overtime Allowance',
 5600.00,
 'AMC-001',
 '2024-12-10',
 'Approved',
 '2024-12-10 13:00:00.000',
 '2024-12-12 11:30:00.000'),

('clexp009prm001',
 'EXP-2024-009',
 'clemp013deepr001',
 'Permits & Licenses',
 2500.00,
 'PM-001',
 '2024-12-14',
 'Pending',
 '2024-12-14 08:15:00.000',
 '2024-12-14 08:15:00.000'),

('clexp010sub001',
 'EXP-2024-010',
 'clemp015ajitk001',
 'Subcontractor Advance',
 45000.00,
 'SHD-002',
 '2024-12-18',
 'Pending',
 '2024-12-18 14:30:00.000',
 '2024-12-18 14:30:00.000');


-- ============================================================================
-- TABLE: PurchaseOrder (8 records)
-- Columns: id, poNo, vendor, item, amount, project, delivery, grn, status,
--          createdAt, updatedAt
-- Spare parts & consumables for plant maintenance projects
-- ============================================================================

INSERT INTO PurchaseOrder (id, poNo, vendor, item, amount, project, delivery, grn, status, createdAt, updatedAt) VALUES
('clpo001skf001',
 'PO-2024-001',
 'SKF India',
 'Bearings (6310 6208)',
 85000.00,
 'AMC-001',
 '2024-12-20',
 'GRN-2024-001',
 'Received',
 '2024-11-20 09:00:00.000',
 '2024-12-20 16:30:00.000'),

('clpo002flx001',
 'PO-2024-002',
 'Flexitallic',
 'Gaskets (Spiral Wound)',
 42000.00,
 'SHD-001',
 '2024-12-15',
 'GRN-2024-002',
 'Received',
 '2024-11-18 10:30:00.000',
 '2024-12-15 14:00:00.000'),

('clpo003ltv001',
 'PO-2024-003',
 'L&T Valves',
 'Gate Valve 6"',
 125000.00,
 'AMC-002',
 '2025-01-10',
 'Awaited',
 'Awaiting',
 '2024-11-25 11:00:00.000',
 '2024-12-18 09:00:00.000'),

('clpo004esb001',
 'PO-2024-004',
 'Esab India',
 'Welding Electrodes E7018',
 38000.00,
 'SHD-001',
 '2024-12-12',
 'GRN-2024-003',
 'Received',
 '2024-11-15 08:45:00.000',
 '2024-12-12 11:20:00.000'),

('clpo005shl001',
 'PO-2024-005',
 'Shell Lubricants',
 'Shell Morlina S2 BL 68',
 55000.00,
 'AMC-003',
 '2024-12-25',
 'In Transit',
 'In Transit',
 '2024-12-01 09:30:00.000',
 '2024-12-18 10:00:00.000'),

('clpo006krm001',
 'PO-2024-006',
 'Karam Safety',
 'Safety Harness',
 28000.00,
 'PM-001',
 '2024-12-18',
 'GRN-2024-004',
 'Received',
 '2024-12-02 14:00:00.000',
 '2024-12-18 15:45:00.000'),

('clpo007oly001',
 'PO-2024-007',
 'Olympus NDT',
 'Ultrasonic Probe Kit',
 185000.00,
 'SHD-002',
 '2025-02-15',
 'Awaited',
 'Ordered',
 '2024-12-05 10:15:00.000',
 '2024-12-18 09:00:00.000'),

('clpo008prk001',
 'PO-2024-008',
 'Parker Hannifin',
 'Hydraulic Hose Assembly',
 67000.00,
 'AMC-001',
 '2024-12-30',
 'Awaited',
 'Awaiting',
 '2024-12-10 11:30:00.000',
 '2024-12-18 09:00:00.000');


-- ============================================================================
-- TABLE: Invoice (8 records)
-- Columns: id, invNo, client, project, amount, date, dueDate, status,
--          createdAt, updatedAt
-- Status distribution: 3 Paid, 2 Under Review, 2 Approved, 1 Overdue
-- Amounts: Rs.15 Lakh - Rs.4.2 Crore | Dates: Sep-Dec 2024
-- ============================================================================

INSERT INTO Invoice (id, invNo, client, project, amount, date, dueDate, status, createdAt, updatedAt) VALUES
('clinv001rel001',
 'INV-2024-001',
 'Reliance Industries',
 'AMC-001',
 '₹18,50,000',
 '2024-09-01',
 '2024-09-30',
 'Paid',
 '2024-09-01 09:00:00.000',
 '2024-09-25 14:30:00.000'),

('clinv002tat001',
 'INV-2024-002',
 'Tata Steel',
 'SHD-001',
 '₹42,00,000',
 '2024-09-15',
 '2024-10-15',
 'Paid',
 '2024-09-15 10:00:00.000',
 '2024-10-10 11:45:00.000'),

('clinv003ntp001',
 'INV-2024-003',
 'NTPC Ltd',
 'AMC-002',
 '₹1,25,00,000',
 '2024-10-01',
 '2024-10-31',
 'Paid',
 '2024-10-01 09:30:00.000',
 '2024-10-28 16:00:00.000'),

('clinv004ult001',
 'INV-2024-004',
 'UltraTech Cement',
 'PM-001',
 '₹85,00,000',
 '2024-10-15',
 '2024-11-15',
 'Under Review',
 '2024-10-15 11:00:00.000',
 '2024-12-18 09:00:00.000'),

('clinv005ioc001',
 'INV-2024-005',
 'IOCL',
 'SHD-002',
 '₹2,10,00,000',
 '2024-11-01',
 '2024-12-01',
 'Overdue',
 '2024-11-01 08:45:00.000',
 '2024-12-18 09:00:00.000'),

('clinv006jsw001',
 'INV-2024-006',
 'JSW Steel',
 'AMC-003',
 '₹15,00,000',
 '2024-11-15',
 '2024-12-15',
 'Approved',
 '2024-11-15 10:30:00.000',
 '2024-12-16 13:00:00.000'),

('clinv007rel002',
 'INV-2024-007',
 'Reliance Industries',
 'AMC-001',
 '₹3,50,00,000',
 '2024-12-01',
 '2024-12-31',
 'Under Review',
 '2024-12-01 09:00:00.000',
 '2024-12-18 09:00:00.000'),

('clinv008tat002',
 'INV-2024-008',
 'Tata Steel',
 'SHD-001',
 '₹4,20,00,000',
 '2024-12-10',
 '2025-01-10',
 'Approved',
 '2024-12-10 11:15:00.000',
 '2024-12-17 15:30:00.000');


-- ============================================================================
-- TABLE: Subcontractor (6 records)
-- Columns: id, name, trade, workers, site, pfReg, esiReg, labourLic,
--          compliance, createdAt, updatedAt
-- Compliance distribution: 4 Compliant, 1 Partially Compliant, 1 Non-Compliant
-- ============================================================================

INSERT INTO Subcontractor (id, name, trade, workers, site, pfReg, esiReg, labourLic, compliance, createdAt, updatedAt) VALUES
('clsub001sai001',
 'Sai Scaffolding Services',
 'Scaffolding',
 25,
 'Tata Steel Plant, Jamshedpur, Jharkhand',
 'PF-MH-2023-4521',
 'ESI-MH-2023-7834',
 'LL-JH-2024-1102',
 'Compliant',
 '2024-03-15 09:00:00.000',
 '2024-12-18 09:00:00.000'),

('clsub002tcr001',
 'TCR Engineering',
 'NDT Inspection',
 8,
 'NTPC Singrauli Super Thermal, MP',
 'PF-MH-2022-3187',
 'ESI-MH-2022-6521',
 'LL-MP-2023-0876',
 'Compliant',
 '2024-01-20 10:30:00.000',
 '2024-12-18 09:00:00.000'),

('clsub003kum001',
 'Kumar Civil Contractors',
 'Civil Works',
 30,
 'IOCL Panipat Refinery, Haryana',
 'PF-HR-2023-5543',
 'Pending',
 'LL-HR-2024-0431',
 'Partially Compliant',
 '2024-06-10 08:45:00.000',
 '2024-12-18 09:00:00.000'),

('clsub004snd001',
 'Sandblast Solutions',
 'Painting/Blasting',
 15,
 'Reliance Jamnagar Refinery, Gujarat',
 'PF-GJ-2023-6721',
 'ESI-GJ-2023-9012',
 'LL-GJ-2024-0655',
 'Compliant',
 '2024-04-05 11:00:00.000',
 '2024-12-18 09:00:00.000'),

('clsub005pwr001',
 'Power Electricals',
 'Electrical Works',
 12,
 'JSW Steel, Vijayanagar, Karnataka',
 'Pending',
 'Pending',
 'Expired',
 'Non-Compliant',
 '2024-07-22 14:15:00.000',
 '2024-12-18 09:00:00.000'),

('clsub006krs001',
 'Krishna Crane Services',
 'Crane & Lifting',
 6,
 'UltraTech Cement, Andhra Pradesh',
 'PF-AP-2023-8834',
 'ESI-AP-2023-1245',
 'LL-AP-2024-0298',
 'Compliant',
 '2024-05-18 09:30:00.000',
 '2024-12-18 09:00:00.000');
-- ============================================================
-- Part 6: Jobs / Shifts / Certifications / Training
-- Plant Maintenance Contractor ERP
-- ============================================================

-- -----------------------------------------------------------
-- 1. JobOpening (6 records)
-- -----------------------------------------------------------
INSERT INTO JobOpening (id, position, site, openings, applications, priority, status, createdAt, updatedAt) VALUES
(1, 'Mechanical Engineer',       'Tata Steel Plant',    3, 12, 'High',     'Open',    NOW(), NOW()),
(2, 'Instrumentation Technician','NTPC Singrauli',      5,  8, 'High',     'Open',    NOW(), NOW()),
(3, 'Shutdown Planner',          'IOCL Panipat',        2,  4, 'Critical', 'Open',    NOW(), NOW()),
(4, 'Welder (6G Certified)',     'Reliance Jamnagar',  10, 22, 'High',     'Open',    NOW(), NOW()),
(5, 'Safety Officer',            'JSW Steel',           1,  6, 'Medium',   'On Hold', NOW(), NOW()),
(6, 'Crane Operator',            'UltraTech Cement',    3, 15, 'Medium',   'Open',    NOW(), NOW());

-- -----------------------------------------------------------
-- 2. ShiftSchedule (15 records)
-- -----------------------------------------------------------
INSERT INTO ShiftSchedule (id, empId, employeeName, site, shift, weekStart, createdAt, updatedAt) VALUES
( 1, 'clemp001mahp001',  'Mahesh Patel',         'Reliance',   'Day Shift A (06:00-14:00)', '2024-12-09', NOW(), NOW()),
( 2, 'clemp002sunv001',  'Sunil Verma',          'Tata Steel', 'Day Shift A (06:00-14:00)', '2024-12-09', NOW(), NOW()),
( 3, 'clemp003vikst001', 'Vikram Singh Tomar',   'NTPC',       'Day Shift A (06:00-14:00)', '2024-12-09', NOW(), NOW()),
( 4, 'clemp005amitm001', 'Amit Mehta',           'IOCL',       'Day Shift B (14:00-22:00)', '2024-12-09', NOW(), NOW()),
( 5, 'clemp007anilk001', 'Anil Kumar',           'Tata Steel', 'Day Shift B (14:00-22:00)', '2024-12-09', NOW(), NOW()),
( 6, 'clemp008pradj001', 'Pradeep Jha',          'NTPC',       'Night Shift (22:00-06:00)', '2024-12-09', NOW(), NOW()),
( 7, 'clemp009suresh001','Suresh Kumar',         'Reliance',   'Day Shift A (06:00-14:00)', '2024-12-09', NOW(), NOW()),
( 8, 'clemp010mohrk001', 'Mohd. Rakesh',         'IOCL',       'Day Shift B (14:00-22:00)', '2024-12-09', NOW(), NOW()),
( 9, 'clemp011rajkd001', 'Rajesh Kumar Das',     'JSW',        'Day Shift A (06:00-14:00)', '2024-12-09', NOW(), NOW()),
(10, 'clemp013deepr001', 'Deepak Rawat',         'NTPC',       'Day Shift B (14:00-22:00)', '2024-12-09', NOW(), NOW()),
(11, 'clemp014sanjm001', 'Sanjay Mishra',        'Tata Steel', 'Day Shift A (06:00-14:00)', '2024-12-09', NOW(), NOW()),
(12, 'clemp015ajitk001', 'Ajit Kumar',           'Reliance',   'Night Shift (22:00-06:00)', '2024-12-09', NOW(), NOW()),
(13, 'clemp016prabk001', 'Prabhakar Reddy',      'UltraTech',  'Day Shift A (06:00-14:00)', '2024-12-09', NOW(), NOW()),
(14, 'clemp018satvk001', 'Satvik Sharma',        'JSW',        'Day Shift B (14:00-22:00)', '2024-12-09', NOW(), NOW()),
(15, 'clemp020manoj001', 'Manoj Tiwari',         'Tata Steel', 'Night Shift (22:00-06:00)', '2024-12-09', NOW(), NOW());

-- -----------------------------------------------------------
-- 3. Certification (12 records)
-- -----------------------------------------------------------
INSERT INTO Certification (id, empId, employeeName, name, issuedBy, issueDate, expiryDate, status, createdAt, updatedAt) VALUES
( 1, 'clemp001mahp001',  'Mahesh Patel',     'BOE Certificate',               'IBR Mumbai',           '2022-06-15', '2027-06-14', 'Valid',        NOW(), NOW()),
( 2, 'clemp006ramgo001', 'Ramesh Gowda',     'AWS CWI',                       'AWS',                  '2023-01-10', '2026-01-09', 'Valid',        NOW(), NOW()),
( 3, 'clemp011rajkd001', 'Rajesh Kumar Das', 'NEBOSH IGC',                    'NEBOSH UK',            '2023-03-20', '2026-03-19', 'Valid',        NOW(), NOW()),
( 4, 'clemp011rajkd001', 'Rajesh Kumar Das', 'IOSH Managing Safely',         'IOSH UK',              '2022-09-01', '2025-08-31', 'Expiring Soon', NOW(), NOW()),
( 5, 'clemp012karth001', 'Karthik Rajan',    'NEBOSH IGC',                    'NEBOSH UK',            '2023-05-15', '2026-05-14', 'Valid',        NOW(), NOW()),
( 6, 'clemp009suresh001','Suresh Kumar',     'AWS 6G Welding',                'AWS',                  '2023-08-10', '2026-08-09', 'Valid',        NOW(), NOW()),
( 7, 'clemp020manoj001', 'Manoj Tiwari',     '6G Welding Certification',      'ISRO',                 '2022-11-20', '2025-11-19', 'Valid',        NOW(), NOW()),
( 8, 'clemp018satvk001', 'Satvik Sharma',    'ASNT NDT Level-II (RT/UT)',     'ASNT',                 '2023-04-01', '2026-03-31', 'Valid',        NOW(), NOW()),
( 9, 'clemp019navin001', 'Navin Joseph',     'Certified Instrumentation Tech','ISA',                  '2022-07-15', '2025-07-14', 'Expiring Soon', NOW(), NOW()),
(10, 'clemp005amitm001', 'Amit Mehta',       'Electrical Supervisor License', 'Maharashtra Govt',     '2021-10-01', '2024-09-30', 'Expired',      NOW(), NOW()),
(11, 'clemp016prabk001', 'Prabhakar Reddy',  'First Aid & CPR',              'St. Johns',            '2024-01-15', '2026-01-14', 'Valid',        NOW(), NOW()),
(12, 'clemp002sunv001',  'Sunil Verma',      'Confined Space Entry',          'VoltCore Training',    '2024-06-01', '2025-05-31', 'Valid',        NOW(), NOW());

-- -----------------------------------------------------------
-- 4. TrainingSession (6 records)
-- -----------------------------------------------------------
INSERT INTO TrainingSession (id, title, site, trainer, date, duration, attendees, status, createdAt, updatedAt) VALUES
(1, 'Confined Space Entry Safety',    'NTPC Singrauli',      'Rajesh Kumar Das', '2024-12-05', '4 hours', 25, 'Completed',  NOW(), NOW()),
(2, 'LOTO Procedures Training',       'IOCL Panipat',         'Ramesh Gupta',     '2024-12-12', '3 hours', 40, 'Scheduled',  NOW(), NOW()),
(3, 'Fire Fighting & Emergency',      'Reliance Jamnagar',    'Mahesh Patel',     '2024-12-15', '2 hours', 30, 'Scheduled',  NOW(), NOW()),
(4, 'Fall Protection Training',       'Tata Steel',           'Sunil Verma',      '2024-11-28', '3 hours', 35, 'Completed',  NOW(), NOW()),
(5, 'Hazardous Material Handling',    'IOCL Panipat',         'Amit Mehta',       '2025-01-10', '4 hours', 20, 'Scheduled',  NOW(), NOW()),
(6, 'First Aid & CPR Refresher',      'JSW Steel',            'Rajesh Kumar Das', '2025-01-15', '1 day',   15, 'Scheduled',  NOW(), NOW());
-- ============================================================================
-- Part 07: Inventory / Stock Movement / Customer / Sales Order
-- VoltCore Engineering Pvt Ltd - Plant Maintenance Contractor ERP
-- ============================================================================
USE voltcore_erp;

-- ============================================================================
-- TABLE: InventoryItem (15 records)
-- ============================================================================
INSERT INTO InventoryItem (id, itemCode, name, category, unit, currentStock, minStock, maxStock, unitCost, warehouse, status, createdAt, updatedAt) VALUES
('INV-ITEM-001', 'BRG-001', 'SKF 6310 Bearing',                     'Bearings',   'Nos',   45,  10, 100, 4500.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-01-15 09:00:00.000', '2024-12-01 10:30:00.000'),
('INV-ITEM-002', 'BRG-002', 'FAG 6208 Bearing',                     'Bearings',   'Nos',   60,  15,  80, 2800.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-01-15 09:05:00.000', '2024-12-01 10:30:00.000'),
('INV-ITEM-003', 'GSK-001', 'Spiral Wound Gasket 4"',               'Gaskets',    'Nos',  120,  20, 200,  850.00, 'Site Store - Jamnagar',     'In Stock',   '2024-02-10 11:00:00.000', '2024-12-02 08:15:00.000'),
('INV-ITEM-004', 'GSK-002', 'Ring Joint Gasket 8"',                 'Gaskets',    'Nos',   30,  10,  50, 3200.00, 'Central Warehouse Mumbai',  'Low Stock',  '2024-02-10 11:05:00.000', '2024-12-05 14:45:00.000'),
('INV-ITEM-005', 'VLV-001', 'Gate Valve 6" 150#',                   'Valves',     'Nos',    8,   5,  20, 18000.00,'Central Warehouse Mumbai',  'In Stock',   '2024-03-01 10:00:00.000', '2024-12-03 09:20:00.000'),
('INV-ITEM-006', 'VLV-002', 'Globe Valve 2" 300#',                  'Valves',     'Nos',   15,   5,  25, 8500.00, 'Site Store - Singrauli',    'In Stock',   '2024-03-01 10:05:00.000', '2024-12-04 11:10:00.000'),
('INV-ITEM-007', 'SEL-001', 'Mechanical Seal ENP-40',               'Seals',      'Nos',    6,   4,  15, 12000.00,'Central Warehouse Mumbai',  'Low Stock',  '2024-04-05 08:30:00.000', '2024-12-06 16:00:00.000'),
('INV-ITEM-008', 'SEL-002', 'O-Ring Kit (Assorted)',                'Seals',      'Sets',  25,  10,  40, 1500.00, 'Site Store - Jamshedpur',   'In Stock',   '2024-04-05 08:35:00.000', '2024-12-02 08:15:00.000'),
('INV-ITEM-009', 'BLT-001', 'V-Belt B-68',                          'Belts',      'Nos',   40,  15,  60,  680.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-05-12 09:15:00.000', '2024-12-07 13:45:00.000'),
('INV-ITEM-010', 'LUB-001', 'Shell Morlina S2 BL 68 (20L)',         'Lubricants', 'Drums', 18,   5,  30, 4500.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-05-12 09:20:00.000', '2024-12-01 10:30:00.000'),
('INV-ITEM-011', 'LUB-002', 'Mobil DTE 25 (20L)',                   'Lubricants', 'Drums', 12,   5,  20, 5200.00, 'Site Store - Vijayanagar',  'Low Stock',  '2024-06-01 10:00:00.000', '2024-12-08 07:30:00.000'),
('INV-ITEM-012', 'WLD-001', 'E7018 3.2mm Electrodes',               'Welding',    'Kg',  500, 100, 800,   85.00, 'Site Store - Jamshedpur',   'In Stock',   '2024-06-15 11:30:00.000', '2024-12-09 12:00:00.000'),
('INV-ITEM-013', 'WLD-002', 'E6013 2.5mm Electrodes',               'Welding',    'Kg',  350,  80, 500,   65.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-06-15 11:35:00.000', '2024-12-10 09:45:00.000'),
('INV-ITEM-014', 'PPE-001', 'Safety Shoes (Allen Cooper)',          'PPE',        'Pairs', 80,  30, 100, 2200.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-07-01 08:00:00.000', '2024-12-11 10:15:00.000'),
('INV-ITEM-015', 'BLT-002', 'HSFG Bolt M20x80 Gr 10.9',            'Fasteners',  'Nos',  200,  50, 300,  180.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-07-01 08:05:00.000', '2024-12-12 11:30:00.000');

-- ============================================================================
-- TABLE: StockMovement (8 records)
-- ============================================================================
INSERT INTO StockMovement (id, itemCode, itemName, type, quantity, fromWarehouse, toWarehouse, reference, date, remarks, createdAt, updatedAt) VALUES
('STK-MOV-001', 'BRG-001', 'SKF 6310 Bearing',            'Issue',   10, 'Central Warehouse Mumbai',  'Site Store - Jamnagar',     'WO/JMN/2024-0891', '2024-12-02', 'Issued for DG Set overhauling at Jamnagar site',    '2024-12-02 09:30:00.000', '2024-12-02 09:30:00.000'),
('STK-MOV-002', 'VLV-001', 'Gate Valve 6" 150#',          'Issue',    4, 'Central Warehouse Mumbai',  'Site Store - Singrauli',    'WO/SGR/2024-0756', '2024-12-03', 'Issued for emergency pipeline valve replacement',   '2024-12-03 07:15:00.000', '2024-12-03 07:15:00.000'),
('STK-MOV-003', 'GSK-002', 'Ring Joint Gasket 8"',        'Receipt', 50, 'Vendor - SKF India Ltd',     'Central Warehouse Mumbai',  'PO/MUM/2024-0342', '2024-12-05', 'Received against PO for Q4 2024 requirement',       '2024-12-05 14:20:00.000', '2024-12-05 14:20:00.000'),
('STK-MOV-004', 'LUB-001', 'Shell Morlina S2 BL 68 (20L)','Transfer', 6, 'Central Warehouse Mumbai',  'Site Store - Vijayanagar',  'TRF/VJP/2024-0018', '2024-12-06', 'Transferred to replenish Vijayanagar site stock',   '2024-12-06 11:00:00.000', '2024-12-06 11:00:00.000'),
('STK-MOV-005', 'WLD-001', 'E7018 3.2mm Electrodes',      'Issue',  120, 'Site Store - Jamshedpur',    'Bay-12 Workshop Area',      'WO/JSD/2024-0634', '2024-12-09', 'Issued for BOF maintenance welding job',            '2024-12-09 06:45:00.000', '2024-12-09 06:45:00.000'),
('STK-MOV-006', 'SEL-002', 'O-Ring Kit (Assorted)',       'Return',   3, 'Site Store - Jamshedpur',    'Central Warehouse Mumbai',  'RTN/JSD/2024-0012', '2024-12-10', 'Returned excess kits after job completion',          '2024-12-10 15:30:00.000', '2024-12-10 15:30:00.000'),
('STK-MOV-007', 'BLT-002', 'HSFG Bolt M20x80 Gr 10.9',   'Issue',   80, 'Central Warehouse Mumbai',  'Site Store - Jamnagar',     'WO/JMN/2024-0897', '2024-12-11', 'Issued for structural steel bolting at refinery',   '2024-12-11 08:00:00.000', '2024-12-11 08:00:00.000'),
('STK-MOV-008', 'PPE-001', 'Safety Shoes (Allen Cooper)', 'Issue',   30, 'Central Warehouse Mumbai',  'Site Store - Singrauli',    'REQ/SGR/2024-0045', '2024-12-12', 'Issued for new batch of technicians onboarding',     '2024-12-12 10:00:00.000', '2024-12-12 10:00:00.000');

-- ============================================================================
-- TABLE: Customer (6 records)
-- ============================================================================
INSERT INTO Customer (id, code, name, contactPerson, email, phone, address, gst, city, state, totalOrders, totalRevenue, status, createdAt, updatedAt) VALUES
('CUST-001', 'CUST-001', 'Reliance Industries Ltd',            'A.K. Gupta',      'ak.gupta@ril.com',       '+91 22 3035 6001', 'Reliance Corporate Park, Ghansoli, Navi Mumbai', '27AABCR1234F1ZV', 'Mumbai',       'Maharashtra', 12, 455000000.00, 'Active', '2022-04-15 10:00:00.000', '2024-12-10 09:30:00.000'),
('CUST-002', 'CUST-002', 'Tata Steel Ltd',                    'S.K. Banerjee',   'sk.banerjee@tatasteel.com','+91 657 664 2001', 'Tata Steel Works, Jamshedpur, Jharkhand',         '20AABCT5678G1Z5', 'Jamshedpur',   'Jharkhand',    8, 321000000.00, 'Active', '2022-06-20 11:00:00.000', '2024-12-08 14:15:00.000'),
('CUST-003', 'CUST-003', 'NTPC Ltd',                          'R.P. Singh',      'rp.singh@ntpc.co.in',     '+91 11 2436 0101', 'NTPC Bhawan, SCOPE Complex, Lodhi Road',          '07AABCN9012H1Z3', 'New Delhi',    'Delhi',       15, 783000000.00, 'Active', '2021-11-10 09:00:00.000', '2024-12-12 16:00:00.000'),
('CUST-004', 'CUST-004', 'UltraTech Cement Ltd',              'K.V. Rao',        'kv.rao@ultratechcement.com','+91 40 2341 8001', 'Aditya Birla Centre, RT Nagar, Hyderabad',        '36AABCU3456I1Z9', 'Hyderabad',    'Telangana',    6, 187000000.00, 'Active', '2023-01-25 14:00:00.000', '2024-11-28 11:45:00.000'),
('CUST-005', 'CUST-005', 'Indian Oil Corporation Ltd',        'V.K. Malhotra',   'vk.malhotra@iocl.com',    '+91 1882 262 001', 'IOCL Refinery, Panipat, Haryana',                  '06AABCI7890J1Z7', 'Panipat',      'Haryana',     10, 428000000.00, 'Active', '2022-08-05 10:30:00.000', '2024-12-05 13:00:00.000'),
('CUST-006', 'CUST-006', 'JSW Steel Ltd',                     'M.R. Krishnan',   'mr.krishnan@jsw.in',      '+91 8392 250 001', 'JSW Steel Works, Vidyanagar, Toranagallu',        '29AABCJ2345K1Z1', 'Vijayanagar',  'Karnataka',    9, 524000000.00, 'Active', '2022-10-12 09:45:00.000', '2024-12-09 10:20:00.000');

-- ============================================================================
-- TABLE: SalesOrder (6 records)
-- ============================================================================
INSERT INTO SalesOrder (id, soNo, customer, project, item, quantity, unitPrice, amount, orderDate, deliveryDate, status, createdAt, updatedAt) VALUES
('SO-001', 'SO-2024-0451', 'Reliance Industries Ltd',      'Annual Mechanical Maintenance Contract - Jamnagar Refinery', 'Mechanical Maintenance Services - Rotating Equipment', 1,  120000000.00, 120000000.00, '2024-10-15', '2024-12-01', 'Delivered',          '2024-10-15 10:00:00.000', '2024-12-01 16:30:00.000'),
('SO-002', 'SO-2024-0468', 'Tata Steel Ltd',               'BOF Vessel Lining Repair - Jamshedpur Works',              'Refractory & Mechanical Repair Works',              1,   85000000.00,  85000000.00, '2024-10-28', '2024-12-15', 'In Progress',        '2024-10-28 11:30:00.000', '2024-12-15 09:00:00.000'),
('SO-003', 'SO-2024-0482', 'NTPC Ltd',                      'Turbine Overhaul - Singrauli Super Thermal Power Station', 'Steam Turbine Overhaul & Alignment',                1,   95000000.00,  95000000.00, '2024-11-10', '2025-02-28', 'In Progress',        '2024-11-10 09:00:00.000', '2024-12-10 14:00:00.000'),
('SO-004', 'SO-2024-0495', 'Indian Oil Corporation Ltd',    'Catalyst Loading & Mechanical Services - Panipat Refinery', 'Catalyst Loading, Scaffolding & Mechanical Works',  1,  120000000.00, 120000000.00, '2024-11-20', '2025-01-31', 'Partially Delivered', '2024-11-20 14:15:00.000', '2024-12-12 11:45:00.000'),
('SO-005', 'SO-2024-0501', 'UltraTech Cement Ltd',          'Kiln Roller Replacement - Tadipatri Plant',                'Kiln Mechanical Overhaul Services',                 1,   32000000.00,  32000000.00, '2024-11-25', '2025-03-15', 'Pending',            '2024-11-25 10:00:00.000', '2024-12-08 08:30:00.000'),
('SO-006', 'SO-2024-0512', 'JSW Steel Ltd',                 'SMS Maintenance - Hot Strip Mill Vijayanagar',             'Rolling Mill Mechanical Maintenance Contract',     1,   2000000.00,   2000000.00, '2024-12-01', '2024-12-20', 'Delivered',          '2024-12-01 09:30:00.000', '2024-12-20 17:00:00.000');
-- =============================================================================
-- Part 08: CRM / Support / Knowledge Base Data
-- Plant Maintenance Contractor ERP
-- =============================================================================
-- Tables populated:
--   1. CrmContact      (8 records)
--   2. SupportTicket   (8 records)
--   3. KBArticle       (5 records)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CrmContact (8 records)
-- Contacts at client plants
-- -----------------------------------------------------------------------------
INSERT INTO CrmContact (id, name, company, designation, email, phone, source, stage, value, lastContact, notes, status, createdAt, updatedAt) VALUES
(1, 'A.K. Gupta',        'Reliance Industries', 'Plant Head',        'agupta@ril.com',              NULL,  'Referral',       'Negotiation', 85000000,  '2024-12-01', 'High-value annual maintenance contract discussion underway',    'Active',   NOW(), NOW()),
(2, 'S.K. Banerjee',     'Tata Steel',          'Maintenance Head',   'skbanerjee@tatasteel.com',     NULL,  'Website',        'Proposal',    42000000,  '2024-11-28', 'Proposal submitted for blast furnace maintenance scope',         'Active',   NOW(), NOW()),
(3, 'R.P. Singh',        'NTPC Ltd',            'GM Maintenance',     'rpsingh@ntpc.co.in',          NULL,  'Reference',      'Qualified',   150000000, '2024-12-05', 'Large power plant boiler maintenance contract opportunity',     'Active',   NOW(), NOW()),
(4, 'K.V. Rao',          'UltraTech Cement',     'Plant Manager',      'kvrao@ultratech.com',          NULL,  'Cold Call',      'Lead',        28000000,  '2024-11-20', 'Initial enquiry for cement plant preventive maintenance',       'Active',   NOW(), NOW()),
(5, 'V.K. Malhotra',     'IOCL',                'Refinery Head',      'vkmalhotra@iocl.com',          NULL,  'Industry Event', 'Negotiation', 67000000,  '2024-12-08', 'Refinery turnaround scope under negotiation',                   'Active',   NOW(), NOW()),
(6, 'M.R. Krishnan',     'JSW Steel',           'Maintenance Head',   'mrkrishnan@jsw.in',            NULL,  'Referral',       'Qualified',   95000000,  '2024-12-03', 'Referred by existing vendor; steel plant maintenance scope',    'Active',   NOW(), NOW()),
(7, 'D. Srinivas',       'HPCL',                'Maintenance Manager', 'dsrinivas@hpcl.in',            NULL,  'Website',        'Lead',        35000000,  '2024-11-15', 'Registered interest through company website contact form',      'Active',   NOW(), NOW()),
(8, 'A. Thomas',         'BPCL',                'Project Engineer',   'athomas@bharatpetroleum.in',    NULL,  'Cold Call',      'Lead',        22000000,  '2024-12-10', 'Follow-up call planned for mid-January 2025',                 'Active',   NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 2. SupportTicket (8 records)
-- Internal support tickets raised across projects
-- -----------------------------------------------------------------------------
INSERT INTO SupportTicket (id, ticketNo, title, raisedBy, category, priority, status, assignedTo, description, resolution, createdAt, updatedAt) VALUES
(1, 'TKT-2024-001', 'Centrifugal Pump Vibration High',               'Mahesh Patel',       'Equipment',   'High',     'In Progress', 'Sunil Verma',     'Pump CP-101 at Reliance showing abnormal vibration levels',                                                    'Bearing replacement scheduled',                                              NOW(), NOW()),
(2, 'TKT-2024-002', 'Urgent: Crane Spare Parts Required',            'Sunil Verma',        'Procurement', 'Critical', 'Open',        'Manish Agarwal',  'Need 10T crane wire rope urgently for BF-3 shutdown',                                                     NULL,                                                                         NOW(), NOW()),
(3, 'TKT-2024-003', 'Confined Space Gas Monitor Calibration Due',    'Rajesh Kumar Das',   'Safety',      'Medium',   'Open',        NULL,              'Gas monitors at JSW site need monthly calibration',                                                      NULL,                                                                         NOW(), NOW()),
(4, 'TKT-2024-004', 'Welding Machine Breakdown',                     'Suresh Kumar',       'Equipment',   'High',     'Closed',      'Anil Kumar',      'Welding machine #3 at Tata Steel site repaired',                                                          'PCB replaced',                                                               NOW(), NOW()),
(5, 'TKT-2024-005', 'Shift Schedule Change for IOCL Shutdown',       'Amit Mehta',         'HR',          'Medium',   'Closed',      'Priya Nair',      'Shift rotation updated for SHD-002 planning phase',                                                       'Shift rotation updated for SHD-002 planning phase',                         NOW(), NOW()),
(6, 'TKT-2024-006', 'Vendor Delay - SKF Bearings',                   'Manish Agarwal',     'Procurement', 'High',     'In Progress', NULL,              'PO-2024-001 delivery delayed by 5 days',                                                                NULL,                                                                         NOW(), NOW()),
(7, 'TKT-2024-007', 'NDT Report Upload Issue',                       'Satvik Sharma',      'IT',          'Low',      'Closed',      NULL,              'Ultrasonic test reports uploaded to client portal',                                                      'Ultrasonic test reports uploaded to client portal',                         NOW(), NOW()),
(8, 'TKT-2024-008', 'Safety Audit Finding - Missing Guard Rails',     'Rajesh Kumar Das',   'Safety',      'Critical', 'In Progress', 'Mahesh Patel',    'Missing guard rails on elevated platform at Reliance site',                                              NULL,                                                                         NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 3. KBArticle (5 records)
-- Knowledge base articles for maintenance and safety reference
-- -----------------------------------------------------------------------------
INSERT INTO KBArticle (id, title, category, content, author, tags, views, helpful, status, createdAt, updatedAt) VALUES
(1, 'Preventive Maintenance Schedule Template',     'Maintenance', 'This document provides a standard PM schedule template for rotating equipment in power plants and refineries. It covers weekly, monthly, quarterly, and annual checklists for pumps, motors, compressors, turbines, and heat exchangers. Frequency intervals are aligned with OEM recommendations and Indian standards (IS/ISO).', 'Rajesh Iyer',       'PM, schedule, template, maintenance', 245, 32, 'Published', NOW(), NOW()),
(2, 'Confined Space Entry Safety Procedures',        'Safety',      'Standard operating procedure for confined space entry including gas testing, rescue plan, and permit requirements. Covers identification of confined spaces, atmospheric monitoring protocols (O2, LEL, H2S, CO), personal protective equipment requirements, communication procedures, and emergency retrieval plans as per OSHA 1910.146 and Indian Factories Act.', 'Rajesh Kumar Das', 'safety, confined space, LOTO, gas testing', 389, 56, 'Published', NOW(), NOW()),
(3, 'LOTO Standard Operating Procedure',             'Safety',      'Lockout/Tagout procedure for equipment isolation during maintenance activities. Details the step-by-step process for equipment shutdown, energy isolation, lock application, tag attachment, verification, and return-to-service. Includes group LOTO provisions, shift transfer procedures, and audit checklists.', 'Rajesh Kumar Das', 'LOTO, isolation, safety, maintenance', 412, 48, 'Published', NOW(), NOW()),
(4, 'Shutdown Planning Best Practices',             'Planning',    'Comprehensive guide for planning and executing plant shutdowns/turnarounds effectively. Covers work scope identification, critical path analysis, resource planning, procurement lead times, safety reviews, pre-shutdown inspections, execution monitoring, and post-shutdown lessons learned. Applicable to refineries, power plants, and steel mills.', 'Sanjay Mishra',   'shutdown, turnaround, planning, execution', 178, 24, 'Published', NOW(), NOW()),
(5, 'Equipment Troubleshooting Guide - Centrifugal Pumps', 'Maintenance', 'Common pump issues and troubleshooting steps: vibration, leakage, low flow, cavitation. Each fault category includes probable causes, diagnostic methods, corrective actions, and preventive recommendations. Includes alignment procedures, impeller clearance checks, seal replacement guidelines, and bearing lubrication schedules.', 'Mahesh Patel',    'pump, troubleshooting, vibration, maintenance', 523, 67, 'Published', NOW(), NOW());

-- =============================================================================
-- End of Part 08: CRM / Support / Knowledge Base Data
-- =============================================================================
-- =============================================================================
-- Part 09: Ledger / Accounts Payable / Accounts Receivable
-- Plant Maintenance Contractor ERP
-- Only INSERT statements
-- =============================================================================

-- -----------------------------------------------------------------------------
-- LedgerAccount (12 records)
-- -----------------------------------------------------------------------------
INSERT INTO LedgerAccount (id, accountCode, name, `group`, type, balance, status, createdAt, updatedAt) VALUES
(1,  '1001', 'Cash',                    'Current Assets',      'Asset',     245000,      'Active', NOW(), NOW()),
(2,  '1002', 'SBI Current Account',     'Bank Accounts',       'Asset',     18500000,    'Active', NOW(), NOW()),
(3,  '1003', 'HDFC Savings Account',    'Bank Accounts',       'Asset',     5200000,     'Active', NOW(), NOW()),
(4,  '1101', 'Accounts Receivable',     'Current Assets',      'Asset',     124500000,   'Active', NOW(), NOW()),
(5,  '2001', 'Accounts Payable',        'Current Liabilities', 'Liability', 38500000,    'Active', NOW(), NOW()),
(6,  '4001', 'Maintenance Revenue',     'Revenue',             'Revenue',   268500000,   'Active', NOW(), NOW()),
(7,  '4002', 'Shutdown Revenue',        'Revenue',             'Revenue',   42000000,    'Active', NOW(), NOW()),
(8,  '5001', 'Employee Salaries',       'Direct Costs',        'Expense',   156000000,   'Active', NOW(), NOW()),
(9,  '5002', 'Subcontractor Payments',  'Direct Costs',        'Expense',   68000000,    'Active', NOW(), NOW()),
(10, '5003', 'Material Costs',          'Direct Costs',        'Expense',   42000000,    'Active', NOW(), NOW()),
(11, '5004', 'PPE & Safety Expenses',   'Indirect Costs',      'Expense',   8500000,     'Active', NOW(), NOW()),
(12, '6001', 'Administrative Overhead', 'Indirect Costs',      'Expense',   22000000,    'Active', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- AccountsPayable (8 records)
-- -----------------------------------------------------------------------------
INSERT INTO AccountsPayable (id, billNo, vendor, description, amount, dueDate, paidDate, status, createdAt, updatedAt) VALUES
(1, 'AP-2024-001', 'SKF India Ltd',             'Bearings supply - PO-2024-001',       85000,   '2024-12-25', NULL,        'Pending',  NOW(), NOW()),
(2, 'AP-2024-002', 'Flexitallic India',          'Gaskets for Tata Steel shutdown',    42000,   '2024-12-15', '2024-12-12','Paid',     NOW(), NOW()),
(3, 'AP-2024-003', 'L&T Valves',                'Gate valves for NTPC',               125000,  '2025-01-20', NULL,        'Pending',  NOW(), NOW()),
(4, 'AP-2024-004', 'Esab India',                 'Welding electrodes',                 38000,   '2024-12-20', '2024-12-18','Paid',     NOW(), NOW()),
(5, 'AP-2024-005', 'Shell Lubricants',           'Lubricants supply',                 55000,   '2025-01-05', NULL,        'Pending',  NOW(), NOW()),
(6, 'AP-2024-006', 'Karam Safety Equipment',     'Safety harness and PPE',             28000,   '2024-12-30', '2024-12-22','Paid',     NOW(), NOW()),
(7, 'AP-2024-007', 'Sai Scaffolding Services',   'Nov scaffolding work',              425000,  '2024-12-10', '2024-12-09','Paid',     NOW(), NOW()),
(8, 'AP-2024-008', 'TCR Engineering',            'NDT inspection charges',            185000,  '2024-12-31', NULL,        'Overdue',  NOW(), NOW());

-- -----------------------------------------------------------------------------
-- AccountsReceivable (8 records)
-- -----------------------------------------------------------------------------
INSERT INTO AccountsReceivable (id, invoiceNo, client, description, amount, dueDate, receivedDate, status, createdAt, updatedAt) VALUES
(1, 'AR-2024-001', 'Reliance Industries',  'AMC Nov billing',              7200000,  '2024-12-15', '2024-12-14','Received', NOW(), NOW()),
(2, 'AR-2024-002', 'NTPC Ltd',             'O&M Nov billing',              12500000, '2024-12-20', NULL,        'Pending',  NOW(), NOW()),
(3, 'AR-2024-003', 'Tata Steel',           'Shutdown mobilization advance',4200000,  '2024-12-10', '2024-12-08','Received', NOW(), NOW()),
(4, 'AR-2024-004', 'JSW Steel',            'AMC Nov billing',              7900000,  '2024-12-25', NULL,        'Pending',  NOW(), NOW()),
(5, 'AR-2024-005', 'UltraTech Cement',     'PM Oct billing',               2350000,  '2024-11-30', '2024-12-05','Received', NOW(), NOW()),
(6, 'AR-2024-006', 'IOCL',                 'Turnaround mobilization',     10000000, '2025-01-15', NULL,        'Pending',  NOW(), NOW()),
(7, 'AR-2024-007', 'NTPC Ltd',             'O&M Oct billing',              12500000, '2024-11-20', '2024-12-20','Received', NOW(), NOW()),
(8, 'AR-2024-008', 'Reliance Industries',  'Emergency repair billing',     850000,   '2024-12-05', NULL,        'Overdue',  NOW(), NOW());
-- =============================================================================
-- Part 10: Journal / Bank / Tax / Budget
-- Plant Maintenance Contractor ERP
-- MySQL INSERT statements only
-- =============================================================================

-- =============================================================================
-- 1. JournalEntry (30 rows — 15 double-entry transactions, each with debit
--    and credit lines)
-- =============================================================================
-- Double-entry bookkeeping: every transaction has matching debit and credit
-- lines.  Columns: id, entryNo, date, account, debit, credit, description,
--                  reference, status, createdAt, updatedAt

INSERT INTO JournalEntry (id, entryNo, date, account, debit, credit, description, reference, status, createdAt, updatedAt) VALUES
-- JE-2024-001: NTPC payment received — SBI Bank debit / AR credit
(101, 'JE-2024-001', '2024-12-01', 'SBI Bank',               12500000.00,       0.00, 'NTPC payment received',           'INV-NTPC-2024-045', 'Posted', NOW(), NOW()),
(102, 'JE-2024-001', '2024-12-01', 'Accounts Receivable',          0.00, 12500000.00, 'NTPC payment received',           'INV-NTPC-2024-045', 'Posted', NOW(), NOW()),

-- JE-2024-002: Reliance AMC billing — AR debit / Maintenance Revenue credit
(103, 'JE-2024-002', '2024-12-01', 'Accounts Receivable',    7200000.00,        0.00, 'Reliance AMC billing',            'INV-REL-2024-089', 'Posted', NOW(), NOW()),
(104, 'JE-2024-002', '2024-12-01', 'Maintenance Revenue',          0.00,  7200000.00, 'Reliance AMC billing',            'INV-REL-2024-089', 'Posted', NOW(), NOW()),

-- JE-2024-003: November salary payout — Employee Salaries debit / SBI Current credit
(105, 'JE-2024-003', '2024-12-03', 'Employee Salaries',     13000000.00,        0.00, 'November salary payout',         'PAY-NOV-2024',    'Posted', NOW(), NOW()),
(106, 'JE-2024-003', '2024-12-03', 'SBI Current Account',          0.00, 13000000.00, 'November salary payout',         'PAY-NOV-2024',    'Posted', NOW(), NOW()),

-- JE-2024-004: Sai Scaffolding subcontractor payment — Subcontractor Payments debit / SBI Current credit
(107, 'JE-2024-004', '2024-12-05', 'Subcontractor Payments',  425000.00,        0.00, 'Sai Scaffolding payment',         'PO-SC-2024-032',  'Posted', NOW(), NOW()),
(108, 'JE-2024-004', '2024-12-05', 'SBI Current Account',          0.00,   425000.00, 'Sai Scaffolding payment',         'PO-SC-2024-032',  'Posted', NOW(), NOW()),

-- JE-2024-005: Flexitallic gaskets on credit — Material Costs debit / Accounts Payable credit
(109, 'JE-2024-005', '2024-12-05', 'Material Costs',          42000.00,        0.00, 'Flexitallic gaskets purchase',    'PO-MAT-2024-118', 'Posted', NOW(), NOW()),
(110, 'JE-2024-005', '2024-12-05', 'Accounts Payable',             0.00,    42000.00, 'Flexitallic gaskets purchase',    'PO-MAT-2024-118', 'Posted', NOW(), NOW()),

-- JE-2024-006: Tata Steel shutdown advance — AR debit / Shutdown Revenue credit
(111, 'JE-2024-006', '2024-12-08', 'Accounts Receivable',    4200000.00,        0.00, 'Tata Steel shutdown advance',     'INV-TS-2024-022', 'Posted', NOW(), NOW()),
(112, 'JE-2024-006', '2024-12-08', 'Shutdown Revenue',             0.00,  4200000.00, 'Tata Steel shutdown advance',     'INV-TS-2024-022', 'Posted', NOW(), NOW()),

-- JE-2024-007: Karam Safety PPE purchase — PPE & Safety Expenses debit / SBI Current credit
(113, 'JE-2024-007', '2024-12-10', 'PPE & Safety Expenses',   28000.00,        0.00, 'Karam Safety PPE purchase',       'PO-PPE-2024-067', 'Posted', NOW(), NOW()),
(114, 'JE-2024-007', '2024-12-10', 'SBI Current Account',          0.00,    28000.00, 'Karam Safety PPE purchase',       'PO-PPE-2024-067', 'Posted', NOW(), NOW()),

-- JE-2024-008: Esab supplier payment — Accounts Payable debit / SBI Current credit
(115, 'JE-2024-008', '2024-12-12', 'Accounts Payable',       38000.00,        0.00, 'Esab payment',                    'PO-WLD-2024-041', 'Posted', NOW(), NOW()),
(116, 'JE-2024-008', '2024-12-12', 'SBI Current Account',          0.00,    38000.00, 'Esab payment',                    'PO-WLD-2024-041', 'Posted', NOW(), NOW()),

-- JE-2024-009: UltraTech billing reversal — Maintenance Revenue debit / AR credit
(117, 'JE-2024-009', '2024-12-12', 'Maintenance Revenue',    2350000.00,        0.00, 'UltraTech billing reversal',      'CR-UT-2024-007',  'Posted', NOW(), NOW()),
(118, 'JE-2024-009', '2024-12-12', 'Accounts Receivable',          0.00,  2350000.00, 'UltraTech billing reversal',      'CR-UT-2024-007',  'Posted', NOW(), NOW()),

-- JE-2024-010: Reliance payment received — SBI Bank debit / AR credit
(119, 'JE-2024-010', '2024-12-14', 'SBI Bank',               7200000.00,        0.00, 'Reliance payment received',       'INV-REL-2024-089', 'Posted', NOW(), NOW()),
(120, 'JE-2024-010', '2024-12-14', 'Accounts Receivable',          0.00,  7200000.00, 'Reliance payment received',       'INV-REL-2024-089', 'Posted', NOW(), NOW()),

-- JE-2024-011: Overtime cash payout — Employee Salaries debit / Cash credit
(121, 'JE-2024-011', '2024-12-15', 'Employee Salaries',       350000.00,        0.00, 'Overtime cash payout',            'PAY-OT-DEC-2024', 'Posted', NOW(), NOW()),
(122, 'JE-2024-011', '2024-12-15', 'Cash',                        0.00,   350000.00, 'Overtime cash payout',            'PAY-OT-DEC-2024', 'Posted', NOW(), NOW()),

-- JE-2024-012: Office rent payment — Administrative Overhead debit / HDFC Savings credit
(123, 'JE-2024-012', '2024-12-18', 'Administrative Overhead', 125000.00,        0.00, 'Office rent payment',             'REN-DEC-2024',    'Posted', NOW(), NOW()),
(124, 'JE-2024-012', '2024-12-18', 'HDFC Savings',                 0.00,   125000.00, 'Office rent payment',             'REN-DEC-2024',    'Posted', NOW(), NOW()),

-- JE-2024-013: NTPC maintenance billing — AR debit / Maintenance Revenue credit
(125, 'JE-2024-013', '2024-12-20', 'Accounts Receivable',   12500000.00,        0.00, 'NTPC maintenance billing',        'INV-NTPC-2024-052','Posted', NOW(), NOW()),
(126, 'JE-2024-013', '2024-12-20', 'Maintenance Revenue',          0.00, 12500000.00, 'NTPC maintenance billing',        'INV-NTPC-2024-052','Posted', NOW(), NOW()),

-- JE-2024-014: SKF bearings on credit — Material Costs debit / Accounts Payable credit
(127, 'JE-2024-014', '2024-12-22', 'Material Costs',          85000.00,        0.00, 'SKF bearings purchase',           'PO-MAT-2024-124', 'Posted', NOW(), NOW()),
(128, 'JE-2024-014', '2024-12-22', 'Accounts Payable',             0.00,    85000.00, 'SKF bearings purchase',           'PO-MAT-2024-124', 'Posted', NOW(), NOW()),

-- JE-2024-015: JSW maintenance billing — AR debit / Maintenance Revenue credit
(129, 'JE-2024-015', '2024-12-25', 'Accounts Receivable',    7900000.00,        0.00, 'JSW maintenance billing',         'INV-JSW-2024-038', 'Posted', NOW(), NOW()),
(130, 'JE-2024-015', '2024-12-25', 'Maintenance Revenue',          0.00,  7900000.00, 'JSW maintenance billing',         'INV-JSW-2024-038', 'Posted', NOW(), NOW());


-- =============================================================================
-- 2. BankAccount (3 records)
-- =============================================================================
-- Columns: id, accountName, bankName, accountNo, type, balance, status,
--          createdAt, updatedAt

INSERT INTO BankAccount (id, accountName, bankName, accountNo, type, balance, status, createdAt, updatedAt) VALUES
(1, 'VoltCore Operations A/c', 'State Bank of India', 3324567890123, 'Current',      18500000.00, 'Active', NOW(), NOW()),
(2, 'VoltCore Savings A/c',    'HDFC Bank',          50100123456789,'Savings',       5200000.00, 'Active', NOW(), NOW()),
(3, 'VoltCore FD A/c',         'ICICI Bank',         000601234567,  'Term Deposit', 25000000.00, 'Active', NOW(), NOW());


-- =============================================================================
-- 3. TaxRecord (6 records)
-- =============================================================================
-- Columns: id, taxType, period, amount, dueDate, paidDate, status,
--          createdAt, updatedAt

INSERT INTO TaxRecord (id, taxType, period, amount, dueDate, paidDate, status, createdAt, updatedAt) VALUES
(1, 'GST',             'Nov 2024',   425000.00,  '2024-12-20', '2024-12-18', 'Paid',    NOW(), NOW()),
(2, 'TDS',             'Nov 2024',   380000.00,  '2024-12-07', '2024-12-05', 'Paid',    NOW(), NOW()),
(3, 'PF',              'Nov 2024',  1872000.00,  '2024-12-15', '2024-12-13', 'Paid',    NOW(), NOW()),
(4, 'ESI',             'H2-2024',    125000.00,  '2025-01-12', NULL,         'Pending', NOW(), NOW()),
(5, 'Professional Tax','Nov 2024',    26000.00,  '2024-12-31', NULL,         'Pending', NOW(), NOW()),
(6, 'Advance Tax',     'Q3 FY25',   8500000.00,  '2024-12-15', '2024-12-12', 'Paid',    NOW(), NOW());


-- =============================================================================
-- 4. BudgetItem (8 records)
-- =============================================================================
-- Columns: id, category, description, planned, actual, period, status,
--          createdAt, updatedAt

INSERT INTO BudgetItem (id, category, description, planned, actual, period, status, createdAt, updatedAt) VALUES
(1, 'Manpower',       'Employee salaries and wages',   180000000.00, 156000000.00, 'FY 2024-25', 'On Track', NOW(), NOW()),
(2, 'Materials',      'Spare parts and consumables',    50000000.00,  42000000.00, 'FY 2024-25', 'On Track', NOW(), NOW()),
(3, 'Subcontractors', 'Subcontractor engagement costs',  75000000.00,  68000000.00, 'FY 2024-25', 'On Track', NOW(), NOW()),
(4, 'Equipment',      'Tools and equipment costs',      15000000.00,  12500000.00, 'FY 2024-25', 'On Track', NOW(), NOW()),
(5, 'Travel',         'Site travel and transport',       8000000.00,   7200000.00, 'FY 2024-25', 'On Track', NOW(), NOW()),
(6, 'Training',       'Safety and skill training',       3000000.00,   2800000.00, 'FY 2024-25', 'On Track', NOW(), NOW()),
(7, 'Safety',         'PPE and safety equipment',       10000000.00,   8500000.00, 'FY 2024-25', 'On Track', NOW(), NOW()),
(8, 'Admin Overhead', 'Office and administrative costs', 25000000.00,  22000000.00, 'FY 2024-25', 'On Track', NOW(), NOW());
