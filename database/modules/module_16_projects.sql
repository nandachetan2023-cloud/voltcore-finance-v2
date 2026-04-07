-- ============================================================================
-- MODULE 16: Project Management
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor (India)
-- ============================================================================
-- Tables  : Project, Task, Milestone, ProjectResource
-- Context : Manages industrial maintenance projects including AMC contracts,
--           shutdowns, turnarounds, O&M, and preventive maintenance jobs
--           across petrochemical, steel, power, and cement plants in India.
-- ============================================================================

-- ============================================================================
-- TABLE: Project
-- Master table for all VoltCore projects — AMC, Shutdown, Turnaround, O&M, PM
-- Each project is tied to a client site with contract values in crores (₹).
-- ============================================================================
CREATE TABLE Project (
    id              VARCHAR(25)     NOT NULL,
    code            VARCHAR(50)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    client          VARCHAR(255)    NOT NULL,
    type            VARCHAR(50)     NOT NULL COMMENT 'AMC / O&M / Shutdown / Preventive / Turnaround / Emergency / Project',
    contractValue   DOUBLE          NOT NULL COMMENT 'Contract value in crores (INR)',
    startDate       DATE            NOT NULL,
    endDate         DATE,
    progress        INT             DEFAULT 0 COMMENT 'Overall project progress 0-100',
    people          INT             DEFAULT 0 COMMENT 'Total headcount deployed',
    budget          DOUBLE          COMMENT 'Budget allocation in crores',
    spent           DOUBLE          DEFAULT 0 COMMENT 'Amount spent in crores',
    status          VARCHAR(50)     DEFAULT 'Planning' COMMENT 'Planning / In Progress / On Hold / Completed / Delayed',
    site            VARCHAR(255)    NOT NULL,
    projectManager  VARCHAR(255),
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_project_code (code),
    INDEX idx_project_status (status),
    INDEX idx_project_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Task
-- Granular work items within a project. Supports parent-child subtask hierarchy.
-- Tasks are assigned to field employees and tracked with hours & progress.
-- ============================================================================
CREATE TABLE Task (
    id              VARCHAR(25)     NOT NULL,
    projectId       VARCHAR(25)     NOT NULL,
    parentTask      VARCHAR(25)     COMMENT 'Self-FK for subtask nesting',
    title           VARCHAR(255)    NOT NULL,
    description     TEXT,
    assignedTo      VARCHAR(25)     COMMENT 'Employee ID from Employee table',
    startDate       DATE,
    dueDate         DATE,
    priority        VARCHAR(50)     COMMENT 'Critical / High / Medium / Low',
    status          VARCHAR(50)     DEFAULT 'To Do' COMMENT 'To Do / In Progress / Review / Done / Blocked / Cancelled',
    progress        INT             DEFAULT 0 COMMENT 'Task progress 0-100',
    estimatedHours  DOUBLE          DEFAULT 0,
    actualHours     DOUBLE          DEFAULT 0,
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_task_project (projectId),
    INDEX idx_task_assigned (assignedTo),
    INDEX idx_task_status (status),
    CONSTRAINT fk_task_project FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_parent FOREIGN KEY (parentTask) REFERENCES Task(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Milestone
-- Key project milestones used for tracking delivery timelines and billing gates.
-- Each milestone has a target date, actual completion date, and % weight.
-- ============================================================================
CREATE TABLE Milestone (
    id              VARCHAR(25)     NOT NULL,
    projectId       VARCHAR(25)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    targetDate      DATE            NOT NULL,
    actualDate      DATE,
    status          VARCHAR(50)     DEFAULT 'Upcoming' COMMENT 'Upcoming / In Progress / Completed / Delayed',
    percentage      DOUBLE          DEFAULT 0 COMMENT 'Milestone weight as % of total project',
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_milestone_project (projectId),
    CONSTRAINT fk_milestone_project FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: ProjectResource
-- Maps employees to projects with role, allocation %, dates, and billing rate.
-- Supports partial allocation (e.g., engineer shared across two sites).
-- ============================================================================
CREATE TABLE ProjectResource (
    id              VARCHAR(25)     NOT NULL,
    projectId       VARCHAR(25)     NOT NULL,
    empId           VARCHAR(25)     COMMENT 'Employee ID from Employee table',
    role            VARCHAR(255)    NOT NULL COMMENT 'Role on the project (Lead Engineer, Supervisor, Fitter, etc.)',
    allocation      INT             DEFAULT 100 COMMENT 'Allocation percentage (e.g., 50 = half-time)',
    startDate       DATE            NOT NULL,
    endDate         DATE,
    rate            DOUBLE          DEFAULT 0 COMMENT 'Billing rate per month in INR',
    status          VARCHAR(50)     DEFAULT 'Active' COMMENT 'Active / Released / Transferred',
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_pr_project (projectId),
    INDEX idx_pr_emp (empId),
    CONSTRAINT fk_pr_project FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- INSERT DATA: Project (6 records)
-- Using exact data from design reference Section 2.3
-- Contract values in crores (₹); sites mapped from Section 2.2
-- ============================================================================
INSERT INTO Project (id, code, name, description, client, type, contractValue, startDate, endDate, progress, people, budget, spent, status, site, projectManager) VALUES
('proj_001', 'AMC-001', 'Reliance Jamnagar AMC',
 'Annual Maintenance Contract for rotating equipment, static equipment, and piping systems at Reliance Jamnagar Refinery complex. Covers quarterly preventive maintenance, breakdown response, and emergency call-out services.',
 'Reliance Industries', 'AMC', 12.50,
 '2024-04-01', '2025-03-31', 65, 18, 10.00, 6.80,
 'In Progress', 'Reliance Jamnagar Refinery', 'Rajesh Mehta'),

('proj_002', 'SHD-001', 'Tata Steel BF-3 Shutdown',
 'Blast Furnace No.3 scheduled shutdown for refractory repair, tuyere replacement, and cooling system overhaul at Tata Steel Jamshedpur. 45-day turnaround with 120+ workforce deployment.',
 'Tata Steel', 'Shutdown', 28.75,
 '2024-12-01', '2025-01-15', 35, 120, 25.00, 8.50,
 'In Progress', 'Tata Steel Plant, Jamshedpur', 'Sanjay Kumar Singh'),

('proj_003', 'AMC-002', 'NTPC Singrauli O&M',
 'Operation & Maintenance contract for boiler, turbine, and auxiliary systems at NTPC Singrauli Super Thermal Power Station. Includes 24x7 monitoring, preventive schedules, and spare management.',
 'NTPC Ltd', 'O&M', 18.00,
 '2024-01-01', '2026-12-31', 48, 45, 16.00, 7.90,
 'In Progress', 'NTPC Singrauli Super Thermal', 'Vikram Pandey'),

('proj_004', 'PM-001', 'UltraTech Kiln PM',
 'Preventive maintenance of cement kiln, raw mill, and clinker cooler at UltraTech Tadipatri plant. Includes roller alignment, gearbox overhaul, and refractory inspection.',
 'UltraTech Cement', 'Preventive', 5.60,
 '2024-10-01', '2025-03-31', 55, 22, 4.50, 2.70,
 'In Progress', 'UltraTech Cement, Tadipatri', 'Nagarjuna Reddy'),

('proj_005', 'SHD-002', 'IOCL Panipat CDU Turnaround',
 'Crude Distillation Unit turnaround at IOCL Panipat Refinery involving column internal inspection, heat exchanger cleaning, re-tubing of condensers, and catalyst handling. Large-scale 60-day turnaround.',
 'IOCL', 'Turnaround', 42.00,
 '2025-04-01', '2025-05-31', 0, 0, 38.00, 0,
 'Planning', 'IOCL Panipat Refinery', 'Arun Sharma'),

('proj_006', 'AMC-003', 'JSW Hot Strip Mill Maintenance',
 'Annual Maintenance Contract for JSW Steel Vijayanagar Hot Strip Mill covering roll stand maintenance, coiler servicing, cooling system upkeep, and electrical drive maintenance.',
 'JSW Steel', 'AMC', 8.40,
 '2024-07-01', '2025-06-30', 42, 15, 7.00, 3.10,
 'In Progress', 'JSW Steel Plant, Vijayanagar', 'Pradeep Rao');


-- ============================================================================
-- INSERT DATA: Task (28 records)
-- Spread across all 6 projects with realistic industrial maintenance activities
-- ============================================================================
INSERT INTO Task (id, projectId, parentTask, title, description, assignedTo, startDate, dueDate, priority, status, progress, estimatedHours, actualHours) VALUES

-- === proj_001: Reliance Jamnagar AMC (5 tasks) ===
('task_001', 'proj_001', NULL, 'Pre-maintenance checks and permit review',
 'Review work permits, safety clearances, and isolation certificates before starting quarterly maintenance cycle on refining units.',
 'emp_0001', '2025-01-06', '2025-01-08', 'High', 'In Progress', 70, 16, 11),

('task_002', 'proj_001', NULL, 'Equipment inspection — Mechanical rotating',
 'Vibration analysis, alignment check, and visual inspection of centrifugal pumps, compressors, and motor bearings across Units 100-300.',
 'emp_0008', '2025-01-09', '2025-01-18', 'Medium', 'Done', 100, 48, 44),

('task_003', 'proj_001', NULL, 'Electrical system inspection and thermography',
 'Thermographic survey of MV/LV switchgear, transformer oil sampling, and cable insulation resistance testing.',
 'emp_0007', '2025-01-10', '2025-01-20', 'Medium', 'In Progress', 45, 56, 24),

('task_004', 'proj_001', NULL, 'Bearing replacement — Compressor A (K-301)',
 'Replace drive-end and non-drive-end bearings on K-301 centrifugal compressor. Requires coupling alignment post-replacement.',
 'emp_0015', '2025-01-22', '2025-01-25', 'High', 'To Do', 0, 24, 0),

('task_005', 'proj_001', NULL, 'Documentation and client handover',
 'Compile inspection reports, NDT certificates, alignment records, and submit maintenance completion report to Reliance operations team.',
 'emp_0001', '2025-01-27', '2025-01-31', 'Low', 'To Do', 0, 12, 0),

-- === proj_002: Tata Steel BF-3 Shutdown (5 tasks) ===
('task_006', 'proj_002', NULL, 'Vessel opening and internal inspection',
 'Open blast furnace hearth and stack manholes. Conduct internal visual inspection and thickness survey of shell plates.',
 'emp_0002', '2024-12-02', '2024-12-08', 'Critical', 'Done', 100, 80, 72),

('task_007', 'proj_002', NULL, 'Refractory repair — Hearth and bosh area',
 'Gunning and casting of refractory in hearth pad, bosh, and belly region. Includes formwork erection, material mixing, and curing.',
 'emp_0010', '2024-12-09', '2024-12-25', 'Critical', 'In Progress', 55, 320, 180),

('task_008', 'proj_002', NULL, 'Hydro testing of stave cooling system',
 'Pressure test all copper staves and cast iron staves at 1.5x design pressure. Identify and plug leaking stave panels.',
 'emp_0002', '2024-12-15', '2024-12-22', 'High', 'In Progress', 30, 96, 28),

('task_009', 'proj_002', NULL, 'Reassembly of tuyeres and blowpipe connections',
 'Install 20 new tuyeres with castable protection. Connect blowpipes, check water cooling circuits, and torque fasteners to spec.',
 'emp_0016', '2024-12-26', '2025-01-05', 'High', 'To Do', 0, 120, 0),

('task_010', 'proj_002', NULL, 'Commissioning and BF blow-in support',
 'Assist Tata Steel operations team during blow-in sequence. Monitor furnace temperature profiles and tuyere conditions for first 48 hours.',
 'emp_0002', '2025-01-08', '2025-01-15', 'Critical', 'To Do', 0, 64, 0),

-- === proj_003: NTPC Singrauli O&M (5 tasks) ===
('task_011', 'proj_003', NULL, 'Boiler tube inspection and thickness survey',
 'UT thickness measurement of water wall tubes, superheater coils, and economiser tubes. Identify tubes below minimum retirement thickness.',
 'emp_0003', '2025-01-05', '2025-01-20', 'High', 'In Progress', 40, 120, 48),

('task_012', 'proj_003', NULL, 'Turbine vibration analysis and alignment',
 'Conduct proximity probe vibration readings on HP, IP, and LP turbines. Perform laser alignment check of turbine-generator coupling.',
 'emp_0003', '2025-01-10', '2025-01-18', 'High', 'Review', 80, 48, 40),

('task_013', 'proj_003', NULL, 'Safety audit — Boiler island compliance',
 'Verify safety valve calibrations, emergency trip systems, fire protection, and confined space entry compliance as per IBR regulations.',
 'emp_0009', '2025-01-06', '2025-01-12', 'Medium', 'Done', 100, 40, 36),

('task_014', 'proj_003', NULL, 'Coal handling plant conveyor maintenance',
 'Inspect and replace worn idler rollers, belt splicing, and gearbox oil change for CHP conveyors C-1 through C-7.',
 'emp_0018', '2025-01-08', '2025-01-25', 'Medium', 'In Progress', 25, 160, 40),

('task_015', 'proj_003', NULL, 'Monthly plant availability and O&M report',
 'Compile equipment availability data, breakdown history, and spare consumption report for monthly review with NTPC station management.',
 'emp_0003', '2025-01-26', '2025-01-31', 'Low', 'To Do', 0, 16, 0),

-- === proj_004: UltraTech Kiln PM (4 tasks) ===
('task_016', 'proj_004', NULL, 'Kiln roller shaft alignment check',
 'Check and correct alignment of all 7 kiln supporting rollers using optical theodolite. Adjust thrust roller position as required.',
 'emp_0019', '2025-01-02', '2025-01-10', 'High', 'In Progress', 60, 64, 40),

('task_017', 'proj_004', NULL, 'Gearbox oil change and girth gear inspection',
 'Drain and replace gearbox lube oil. Inspect girth gear and pinion for pitting, spalling, and backlash. Record tooth wear profile.',
 'emp_0019', '2025-01-12', '2025-01-18', 'Medium', 'To Do', 0, 40, 0),

('task_018', 'proj_004', NULL, 'Reconditioning of thrust roller and bearing',
 'Disassemble thrust roller assembly, inspect bearing housing, replace thrust pads, and reassemble with correct preload settings.',
 'emp_0004', '2025-01-06', '2025-01-15', 'High', 'In Progress', 35, 80, 28),

('task_019', 'proj_004', NULL, 'QC inspection and client sign-off',
 'QA/QC inspection of all completed maintenance activities. Verify alignment reports, NDT results, and submit clearance certificate to UltraTech.',
 'emp_0004', '2025-01-20', '2025-01-25', 'Medium', 'To Do', 0, 24, 0),

-- === proj_005: IOCL Panipat CDU Turnaround (5 tasks) ===
('task_020', 'proj_005', NULL, 'CDU column inspection planning and scaffold build',
 'Prepare detailed inspection plan for atmospheric column internals. Erect scaffolding inside column for tray and packing removal.',
 'emp_0005', '2025-04-01', '2025-04-10', 'Critical', 'To Do', 0, 120, 0),

('task_021', 'proj_005', NULL, 'Heat exchanger bundle pulling and cleaning',
 'Pull bundles from 12 shell-and-tube heat exchangers. Hydro-jet clean tubes, inspect for fouling and corrosion, and re-install.',
 'emp_0021', '2025-04-11', '2025-04-25', 'High', 'To Do', 0, 240, 0),

('task_022', 'proj_005', NULL, 'Safety permit preparation and tool box talks',
 'Prepare hot work, confined space, and height work permits for all turnaround activities. Conduct daily toolbox talks and HSE briefing.',
 'emp_0005', '2025-03-25', '2025-04-05', 'High', 'To Do', 0, 48, 0),

('task_023', 'proj_005', NULL, 'Procurement of critical spares — condenser tubes',
 'Procure seamless SS 316L condenser tubes (25.4mm OD x 2.11mm WT x 6000mm), tray valves, and gaskets from approved vendors.',
 'emp_0005', '2025-02-01', '2025-03-20', 'High', 'To Do', 0, 80, 0),

('task_024', 'proj_005', NULL, 'Resource mobilization and site camp setup',
 'Arrange workforce mobilization, temporary site office, welding and cutting equipment, and scaffolding material deployment at IOCL Panipat.',
 'emp_0005', '2025-03-15', '2025-03-31', 'Medium', 'To Do', 0, 64, 0),

-- === proj_006: JSW Hot Strip Mill Maintenance (4 tasks) ===
('task_025', 'proj_006', NULL, 'Roll stand inspection — R2 and finishing mill',
 'Inspect backup roll bearings, chock condition, and hydraulic gap adjustment cylinders on R2 rougher and F1-F7 finishing stands.',
 'emp_0006', '2025-01-05', '2025-01-15', 'High', 'In Progress', 50, 80, 40),

('task_026', 'proj_006', NULL, 'Cooling spray nozzle replacement and header cleaning',
 'Replace worn spray nozzles on run-out table cooling headers. Clean header piping and recalibrate water flow distribution.',
 'emp_0022', '2025-01-08', '2025-01-18', 'Medium', 'In Progress', 30, 64, 20),

('task_027', 'proj_006', NULL, 'Hydraulic system overhaul — coiler and looper',
 'Overhaul coiler mandrel hydraulic cylinders and looper tension control system. Replace seals, check accumulator pre-charge pressure.',
 'emp_0006', '2025-01-20', '2025-02-05', 'High', 'To Do', 0, 120, 0),

('task_028', 'proj_006', NULL, 'Performance benchmarking and AMC review meeting',
 'Compile HSM maintenance KPIs — MTBF, MTTR, breakdown hours, and spare consumption. Present AMC performance review to JSW management.',
 'emp_0006', '2025-01-28', '2025-01-31', 'Low', 'To Do', 0, 16, 0);


-- ============================================================================
-- INSERT DATA: Milestone (12 records — 2 per project)
-- Milestones are billing gates and delivery checkpoints
-- ============================================================================
INSERT INTO Milestone (id, projectId, name, description, targetDate, actualDate, status, percentage) VALUES

-- proj_001: Reliance Jamnagar AMC
('mile_001', 'proj_001', 'Q3 Quarterly Maintenance Cycle Completion',
 'Complete all scheduled preventive maintenance, inspections, and breakdown rectification for Oct-Dec 2024 quarter at Reliance Jamnagar.',
 '2024-12-31', '2024-12-29', 'Completed', 25),

('mile_002', 'proj_001', 'Q4 Safety Compliance Audit',
 'Annual safety audit by Reliance HSE team covering VoltCore work practices, PPE compliance, permit-to-work procedures, and incident records.',
 '2025-03-15', NULL, 'In Progress', 25),

-- proj_002: Tata Steel BF-3 Shutdown
('mile_003', 'proj_002', 'BF-3 Vessel Ready for Reassembly',
 'Complete all internal repairs — refractory gunning, stave testing, and tuyere removal. Vessel clear for reassembly sequence to begin.',
 '2024-12-28', '2024-12-30', 'Completed', 40),

('mile_004', 'proj_002', 'BF-3 Blow-in Readiness Certification',
 'All mechanical, refractory, and cooling system work complete. Certified ready for Tata Steel to begin blow-in and commissioning.',
 '2025-01-10', NULL, 'In Progress', 60),

-- proj_003: NTPC Singrauli O&M
('mile_005', 'proj_003', 'Boiler Annual Inspection Clearance',
 'Complete annual boiler inspection as per IBR regulations. Obtain clearance certificate from NTPC engineering and third-party inspector.',
 '2025-02-28', NULL, 'In Progress', 30),

('mile_006', 'proj_003', 'Plant Availability Target Achievement (92%)',
 'Achieve and sustain 92%+ plant availability factor for the calendar year 2025 through proactive maintenance and quick breakdown response.',
 '2025-12-31', NULL, 'Upcoming', 70),

-- proj_004: UltraTech Kiln PM
('mile_007', 'proj_004', 'Kiln Mechanical Overhaul Complete',
 'Finish roller alignment, gearbox service, thrust roller reconditioning, and all associated mechanical work on the cement kiln.',
 '2025-02-15', NULL, 'In Progress', 60),

('mile_008', 'proj_004', 'Kiln Commissioning and Production Handover',
 'Kiln hot-run completed, all parameters stable, and plant handed back to UltraTech operations for normal production.',
 '2025-03-31', NULL, 'Upcoming', 40),

-- proj_005: IOCL Panipat CDU Turnaround
('mile_009', 'proj_005', 'IOCL Safety and Permit Approvals',
 'All turnaround work permits, hot work certificates, and confined space entries approved by IOCL HSE. Safety mock-drill completed.',
 '2025-03-28', NULL, 'Upcoming', 15),

('mile_010', 'proj_005', 'CDU Column Reassembly and Hydro-test',
 'Column internals reinstalled (trays, packing, demisters), manways closed, and successful hydro-test at 1.1x MAWP completed.',
 '2025-05-20', NULL, 'Upcoming', 50),

-- proj_006: JSW Hot Strip Mill Maintenance
('mile_011', 'proj_006', 'HSM Roll Change Campaign Completion',
 'Complete work roll and backup roll change campaign on R2 rougher and all finishing stands within the planned 5-day window.',
 '2025-02-10', NULL, 'Upcoming', 35),

('mile_012', 'proj_006', 'Annual AMC Performance Review Meeting',
 'Present yearly maintenance performance data — MTBF improvement, breakdown reduction, spare cost analysis — to JSW Steel management.',
 '2025-06-15', NULL, 'Upcoming', 65);


-- ============================================================================
-- INSERT DATA: ProjectResource (15 records)
-- Links employees to projects with role, allocation %, and billing rate
-- Allocation < 100 indicates employee is shared across multiple projects
-- ============================================================================
INSERT INTO ProjectResource (id, projectId, empId, role, allocation, startDate, endDate, rate, status) VALUES

-- proj_001: Reliance Jamnagar AMC
('pr_001', 'proj_001', 'emp_0001', 'Project Lead — Mechanical', 100,
 '2024-04-01', '2025-03-31', 95000, 'Active'),

('pr_002', 'proj_001', 'emp_0008', 'Mechanical Engineer', 80,
 '2024-04-01', '2025-03-31', 72000, 'Active'),

('pr_003', 'proj_001', 'emp_0007', 'Electrical Engineer', 60,
 '2024-04-01', '2025-03-31', 68000, 'Active'),

-- proj_002: Tata Steel BF-3 Shutdown
('pr_004', 'proj_002', 'emp_0002', 'Site Supervisor — Shutdown Lead', 100,
 '2024-12-01', '2025-01-15', 85000, 'Active'),

('pr_005', 'proj_002', 'emp_0010', 'Welding Supervisor', 100,
 '2024-12-01', '2025-01-15', 55000, 'Active'),

('pr_006', 'proj_002', 'emp_0016', 'Welder — Specialized', 100,
 '2024-12-01', '2025-01-15', 35000, 'Active'),

-- proj_003: NTPC Singrauli O&M
('pr_007', 'proj_003', 'emp_0003', 'Site Incharge — O&M Lead', 100,
 '2024-01-01', '2026-12-31', 90000, 'Active'),

('pr_008', 'proj_003', 'emp_0009', 'Safety Officer', 50,
 '2024-01-01', '2026-12-31', 65000, 'Active'),

('pr_009', 'proj_003', 'emp_0018', 'Electrician — Maintenance', 100,
 '2024-01-01', '2026-12-31', 32000, 'Active'),

-- proj_004: UltraTech Kiln PM
('pr_010', 'proj_004', 'emp_0019', 'Mechanical Engineer — Kiln Specialist', 80,
 '2024-10-01', '2025-03-31', 70000, 'Active'),

('pr_011', 'proj_004', 'emp_0004', 'Planning Engineer', 50,
 '2024-10-01', '2025-03-31', 75000, 'Active'),

-- proj_005: IOCL Panipat CDU Turnaround
('pr_012', 'proj_005', 'emp_0005', 'Project Engineer — Turnaround Lead', 100,
 '2025-04-01', '2025-05-31', 88000, 'Active'),

('pr_013', 'proj_005', 'emp_0021', 'Fitter — Mechanical', 100,
 '2025-04-01', '2025-05-31', 33000, 'Active'),

-- proj_006: JSW Hot Strip Mill Maintenance
('pr_014', 'proj_006', 'emp_0006', 'Site Supervisor — Mill Maintenance', 100,
 '2024-07-01', '2025-06-30', 82000, 'Active'),

('pr_015', 'proj_006', 'emp_0022', 'Electrician — Drives & Automation', 100,
 '2024-07-01', '2025-06-30', 34000, 'Active')