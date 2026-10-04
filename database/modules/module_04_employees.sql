-- ============================================================================
-- MODULE 04: Employee Master
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- This module manages the complete employee lifecycle including personal,
-- professional, and compliance details. Employees are assigned to departments,
-- sites, and trades relevant to industrial plant maintenance operations such
-- as refinery AMC, shutdowns, O&M contracts, and turnarounds.
-- ============================================================================

-- ============================================================================
-- TABLE: Employee
-- ============================================================================
-- Stores all employee master data referenced by Attendance, Payroll, Leave,
-- Timesheet, Performance, Project Resource, Asset Allocation, and other modules.
-- The empId (VC-xxx) is a human-readable code used across the organisation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `Employee` (
    `id` VARCHAR(25) NOT NULL,
    `empId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) DEFAULT NULL,
    `phone` VARCHAR(50) DEFAULT NULL,
    `department` VARCHAR(25) NOT NULL,
    `designation` VARCHAR(255) NOT NULL,
    `site` VARCHAR(255) NOT NULL,
    `trade` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) DEFAULT 'Staff',
    `status` VARCHAR(50) DEFAULT 'Active',
    `dateOfBirth` DATE DEFAULT NULL,
    `joiningDate` DATE NOT NULL,
    `certifications` VARCHAR(500) DEFAULT '',
    `bankAccount` VARCHAR(50) DEFAULT NULL,
    `aadhaar` VARCHAR(20) DEFAULT NULL,
    `pan` VARCHAR(20) DEFAULT NULL,
    `bloodGroup` VARCHAR(10) DEFAULT NULL,
    `emergencyContact` VARCHAR(255) DEFAULT NULL,
    `createdAt` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_employee_empId` (`empId`),
    INDEX `idx_employee_empId` (`empId`),
    INDEX `idx_employee_department` (`department`),
    INDEX `idx_employee_site` (`site`),
    INDEX `idx_employee_status` (`status`),
    CONSTRAINT `fk_employee_department` FOREIGN KEY (`department`) REFERENCES `Department` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT: Employee Master Data (25 records)
-- ============================================================================
-- IDs: emp_0001 through emp_0025 — used as FK targets across many modules.
-- Sites match the 6 plant locations in Section 2.2 of the design reference.
-- HQ-based employees use 'Mumbai HQ' as their site value.
-- Certifications are realistic for Indian industrial plant maintenance:
--   NEBOSH IGC, BOSIET, HUET, IWPS, CSWIP, ASNT NDT Level II, CCO,
--   First Aid, Fire Fighting, Confined Space Entry, Working at Height,
--   ISO 45001 LA, OSHA 30-Hr, Rigging & Slinging
-- ============================================================================

INSERT INTO `Employee` (`id`, `empId`, `name`, `email`, `phone`, `department`, `designation`, `site`, `trade`, `type`, `status`, `dateOfBirth`, `joiningDate`, `certifications`, `bankAccount`, `aadhaar`, `pan`, `bloodGroup`, `emergencyContact`, `createdAt`, `updatedAt`) VALUES
('emp_0001', 'VC-001', 'Rajesh Mehta', 'rajesh.mehta@voltcore.in', '9876501234', 'dept_001', 'Senior Engineer', 'Reliance Jamnagar Refinery', 'Mechanical', 'Staff', 'Active', '1975-03-15', '2020-01-10', 'NEBOSH IGC, BOSIET, HUET, Certified Plant Engineer', '33210150001234', '234567890123', 'BMHPM5678L', 'B+', 'Sunita Mehta — 9876501235', '2020-01-10 09:00:00.000', '2020-01-10 09:00:00.000'),

('emp_0002', 'VC-002', 'Sanjay Kumar Singh', 'sanjay.singh@voltcore.in', '9786512345', 'dept_008', 'Site Supervisor', 'Tata Steel Plant, Jamshedpur', 'Mechanical', 'Staff', 'Active', '1978-07-22', '2020-04-15', 'IWPS, Confined Space Entry, Working at Height, First Aid', '11050210003456', '345678901234', 'SKSPK2345A', 'O+', 'Manju Devi — 9786512346', '2020-04-15 09:00:00.000', '2020-04-15 09:00:00.000'),

('emp_0003', 'VC-003', 'Vikram Pandey', 'vikram.pandey@voltcore.in', '9987612345', 'dept_008', 'Site Incharge', 'NTPC Singrauli Super Thermal', 'Electrical', 'Staff', 'Active', '1972-11-05', '2020-02-20', 'NEBOSH IGC, BOSIET, ISO 45001 LA, Certified Electrical Supervisor', '22340150005678', '456789012345', 'VPPPK3456B', 'A+', 'Rekha Pandey — 9987612346', '2020-02-20 09:00:00.000', '2020-02-20 09:00:00.000'),

('emp_0004', 'VC-004', 'Nagarjuna Reddy', 'nagarjuna.reddy@voltcore.in', '9843216789', 'dept_002', 'Planning Engineer', 'UltraTech Cement, Tadipatri', 'Mechanical', 'Staff', 'Active', '1985-01-18', '2021-06-01', 'NEBOSH IGC, Primavera P6 Certified, IWPS', '50010120007890', '567890123456', 'ANRPK4567C', 'B-', 'Lakshmi Reddy — 9843216790', '2021-06-01 09:00:00.000', '2021-06-01 09:00:00.000'),

('emp_0005', 'VC-005', 'Arun Sharma', 'arun.sharma@voltcore.in', '9765432109', 'dept_001', 'Project Engineer', 'IOCL Panipat Refinery', 'Instrumentation', 'Staff', 'Active', '1988-09-30', '2021-09-15', 'BOSIET, HUET, Certified Instrumentation Engineer, OSHA 30-Hr', '26050150009012', '678901234567', 'ARSPK5678D', 'AB+', 'Meena Sharma — 9765432110', '2021-09-15 09:00:00.000', '2021-09-15 09:00:00.000'),

('emp_0006', 'VC-006', 'Pradeep Rao', 'pradeep.rao@voltcore.in', '9685432198', 'dept_008', 'Site Supervisor', 'JSW Steel Plant, Vijayanagar', 'Electrical', 'Staff', 'Active', '1980-05-12', '2020-11-01', 'IWPS, Confined Space Entry, Certified Electrical Supervisor, First Aid', '56020210001234', '789012345678', 'PRRPK6789E', 'O-', 'Bharathi Rao — 9685432199', '2020-11-01 09:00:00.000', '2020-11-01 09:00:00.000'),

('emp_0007', 'VC-007', 'Amit Joshi', 'amit.joshi@voltcore.in', '9898765432', 'dept_001', 'Engineer', 'Reliance Jamnagar Refinery', 'Electrical', 'Staff', 'Active', '1990-12-08', '2022-01-15', 'BOSIET, HUET, Fire Fighting, Working at Height', '36850150003456', '890123456789', 'AMJPM7890F', 'A-', 'Swati Joshi — 9898765433', '2022-01-15 09:00:00.000', '2022-01-15 09:00:00.000'),

('emp_0008', 'VC-008', 'Suresh Patel', 'suresh.patel@voltcore.in', '9723456789', 'dept_001', 'Engineer', 'Reliance Jamnagar Refinery', 'Mechanical', 'Staff', 'Active', '1991-04-25', '2022-03-01', 'IWPS, Confined Space Entry, Rigging & Slinging, NEBOSH IGC', '38020150005678', '901234567890', 'SUPPK8901G', 'B+', 'Renuka Patel — 9723456790', '2022-03-01 09:00:00.000', '2022-03-01 09:00:00.000'),

('emp_0009', 'VC-009', 'Deepak Verma', 'deepak.verma@voltcore.in', '9556781234', 'dept_003', 'Safety Officer', 'NTPC Singrauli Super Thermal', 'HSE', 'Staff', 'Active', '1983-08-14', '2020-07-01', 'NEBOSH IGC, ISO 45001 Lead Auditor, Fire Fighting, First Aid, OSHA 30-Hr', '22450150007890', '012345678901', 'DPVPM9012H', 'A+', 'Saroj Verma — 9556781235', '2020-07-01 09:00:00.000', '2020-07-01 09:00:00.000'),

('emp_0010', 'VC-010', 'Mahesh Kumar', 'mahesh.kumar@voltcore.in', '9415678234', 'dept_008', 'Supervisor', 'Tata Steel Plant, Jamshedpur', 'Welding', 'Staff', 'Active', '1979-06-20', '2020-09-10', 'CSWIP 3.1, IWPS, ASNT NDT Level II, Confined Space Entry', '33110210009012', '123456789012', 'MHKKM0123I', 'O+', 'Geeta Devi — 9415678235', '2020-09-10 09:00:00.000', '2020-09-10 09:00:00.000'),

('emp_0011', 'VC-011', 'Kiran Nair', 'kiran.nair@voltcore.in', '9845678912', 'dept_005', 'HR Executive', 'Reliance Jamnagar Refinery', 'HR', 'Staff', 'Active', '1992-02-14', '2021-04-01', 'First Aid, Fire Fighting, ISO 45001 Awareness', '38060220001234', '234567890123', 'KRNNM1234J', 'AB+', 'Sunitha Nair — 9845678913', '2021-04-01 09:00:00.000', '2021-04-01 09:00:00.000'),

('emp_0012', 'VC-012', 'Priya Sharma', 'priya.sharma@voltcore.in', '9923456780', 'dept_004', 'Accounts Executive', 'Mumbai HQ', 'Finance', 'Staff', 'Active', '1994-10-05', '2022-07-15', 'Tally Prime Certified, GST Practitioner', '40020215003456', '345678901234', 'PRSPM2345K', 'A-', 'Rakesh Sharma — 9923456781', '2022-07-15 09:00:00.000', '2022-07-15 09:00:00.000'),

('emp_0013', 'VC-013', 'Ravi Tiwari', 'ravi.tiwari@voltcore.in', '9871234567', 'dept_006', 'Procurement Officer', 'Mumbai HQ', 'Procurement', 'Staff', 'Active', '1986-04-30', '2021-01-10', 'First Aid, Fire Fighting, SAP MM Module', '40050130005678', '456789012345', 'RVTIM3456L', 'B+', 'Sushma Tiwari — 9871234568', '2021-01-10 09:00:00.000', '2021-01-10 09:00:00.000'),

('emp_0014', 'VC-014', 'Senthil Kumar', 'senthil.kumar@voltcore.in', '9782345671', 'dept_007', 'QA/QC Inspector', 'NTPC Singrauli Super Thermal', 'QA/QC', 'Staff', 'Active', '1984-01-10', '2020-05-20', 'ASNT NDT Level II (RT, UT, MT, PT), CSWIP 3.1, AWS CWI, IWPS', '62250210007890', '567890123456', 'SNKPK4567M', 'O-', 'Lakshmi Senthil — 9782345672', '2020-05-20 09:00:00.000', '2020-05-20 09:00:00.000'),

('emp_0015', 'VC-015', 'Mohan Lal', 'mohan.lal@voltcore.in', '9681122334', 'dept_008', 'Technician', 'Reliance Jamnagar Refinery', 'Fitter', 'Labour', 'Active', '1995-07-18', '2022-05-01', 'IWPS, Confined Space Entry, Working at Height, Fire Fighting', '38060150009012', '678901234567', 'MLHPK5678N', 'B-', 'Kamla Devi — 9681122335', '2022-05-01 09:00:00.000', '2022-05-01 09:00:00.000'),

('emp_0016', 'VC-016', 'Raju Yadav', 'raju.yadav@voltcore.in', '9433344556', 'dept_008', 'Technician', 'Tata Steel Plant, Jamshedpur', 'Welder', 'Labour', 'Active', '1993-11-25', '2022-02-10', 'IWPS, Confined Space Entry, CSWIP 3.0, Fire Fighting', '83100150001234', '789012345678', 'RJYPD6789P', 'A+', 'Sunita Yadav — 9433344557', '2022-02-10 09:00:00.000', '2022-02-10 09:00:00.000'),

('emp_0017', 'VC-017', 'Anil Gupta', 'anil.gupta@voltcore.in', '9934455678', 'dept_002', 'Planner', 'Mumbai HQ', 'Planning', 'Staff', 'Active', '1987-03-08', '2021-02-20', 'Primavera P6 Certified, MS Project, NEBOSH IGC', '40010120003456', '890123456789', 'ANGPK7890Q', 'AB-', 'Anita Gupta — 9934455679', '2021-02-20 09:00:00.000', '2021-02-20 09:00:00.000'),

('emp_0018', 'VC-018', 'Suresh M', 'suresh.m@voltcore.in', '9745566778', 'dept_008', 'Technician', 'NTPC Singrauli Super Thermal', 'Electrician', 'Labour', 'Active', '1996-09-12', '2023-01-05', 'IWPS, Confined Space Entry, Working at Height, Certified Electrician', '22430150005678', '901234567890', 'SRMPM8901R', 'O+', 'Devi Suresh — 9745566779', '2023-01-05 09:00:00.000', '2023-01-05 09:00:00.000'),

('emp_0019', 'VC-019', 'Venkat Rao', 'venkat.rao@voltcore.in', '9856677889', 'dept_001', 'Engineer', 'UltraTech Cement, Tadipatri', 'Mechanical', 'Staff', 'Active', '1990-05-20', '2022-08-01', 'BOSIET, HUET, IWPS, NEBOSH IGC, Confined Space Entry', '51530120007890', '012345678901', 'VNRPK0123S', 'B+', 'Padma Rao — 9856677890', '2022-08-01 09:00:00.000', '2022-08-01 09:00:00.000'),

('emp_0020', 'VC-020', 'Ashok Pandit', 'ashok.pandit@voltcore.in', '9917788990', 'dept_003', 'Safety Officer', 'Reliance Jamnagar Refinery', 'HSE', 'Staff', 'Active', '1981-12-02', '2020-08-15', 'NEBOSH IGC, NEBOSH Diploma, ISO 45001 Lead Auditor, Fire Fighting, First Aid, OSHA 30-Hr', '38020130009012', '123456789012', 'ASPPM1234T', 'A+', 'Mangala Pandit — 9917788991', '2020-08-15 09:00:00.000', '2020-08-15 09:00:00.000'),

('emp_0021', 'VC-021', 'Manoj Singh', 'manoj.singh@voltcore.in', '9698899001', 'dept_008', 'Technician', 'IOCL Panipat Refinery', 'Fitter', 'Labour', 'Active', '1997-02-28', '2023-06-01', 'IWPS, Confined Space Entry, Working at Height, Rigging & Slinging', '13200150001234', '234567890123', 'MNSPK2345U', 'B-', 'Seema Singh — 9698899002', '2023-06-01 09:00:00.000', '2023-06-01 09:00:00.000'),

('emp_0022', 'VC-022', 'Dilip Das', 'dilip.das@voltcore.in', '9779900112', 'dept_008', 'Technician', 'JSW Steel Plant, Vijayanagar', 'Electrician', 'Labour', 'Active', '1998-06-15', '2023-09-01', 'IWPS, Confined Space Entry, Certified Electrician, Fire Fighting', '56030210003456', '345678901234', 'DLPDK3456V', 'O-', 'Runu Das — 9779900113', '2023-09-01 09:00:00.000', '2023-09-01 09:00:00.000'),

('emp_0023', 'VC-023', 'Ganesh Patil', 'ganesh.patil@voltcore.in', '9861011223', 'dept_006', 'Store Keeper', 'Reliance Jamnagar Refinery', 'Stores', 'Staff', 'Active', '1989-08-10', '2021-11-01', 'First Aid, Fire Fighting, SAP MM Module Awareness, Forklift Operator', '38050215005678', '456789012345', 'GNPPK4567W', 'A-', 'Ashwini Patil — 9861011224', '2021-11-01 09:00:00.000', '2021-11-01 09:00:00.000'),

('emp_0024', 'VC-024', 'Rahul Deshmukh', 'rahul.deshmukh@voltcore.in', '9922133345', 'dept_004', 'Finance Manager', 'Mumbai HQ', 'Finance', 'Staff', 'Active', '1976-10-22', '2020-03-01', 'CA, First Aid, Fire Fighting', '40040215007890', '567890123456', 'RDPDM5678X', 'AB+', 'Swati Deshmukh — 9922133346', '2020-03-01 09:00:00.000', '2020-03-01 09:00:00.000'),

('emp_0025', 'VC-025', 'Kavita Reddy', 'kavita.reddy@voltcore.in', '9833244556', 'dept_005', 'HR Manager', 'Mumbai HQ', 'HR', 'Staff', 'Active', '1979-04-05', '2020-02-01', 'MBA-HR, NEBOSH IGC, First Aid, Fire Fighting, ISO 45001 Awareness', '50020215009012', '678901234567', 'KVRRP6789Y', 'B+', 'Srinivas Reddy — 9833244557', '2020-02-01 09:00:00.000', '2020-02-01 09:00:00.000')
