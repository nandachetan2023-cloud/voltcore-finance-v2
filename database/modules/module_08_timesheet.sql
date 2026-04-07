-- ============================================================================
-- MODULE 08: Timesheet
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor (India)
-- ============================================================================
-- Tables  : Timesheet, TimesheetEntry
-- Context : Weekly timesheet tracking for site technicians and engineers
--           working across plant maintenance projects (AMC, Shutdown, O&M).
--           Includes normal hours, OT (night shift), and project-level
--           activity breakdown (Mon-Fri daily entries).
-- ============================================================================

-- ============================================================================
-- TABLE: Timesheet
-- ============================================================================
-- Tracks weekly timesheets submitted by employees for site/project work.
-- Normal shift = 8 hrs/day (40 hrs/week). Anything beyond is OT hours.
-- Status workflow: Draft → Submitted → Approved / Rejected
-- ============================================================================
CREATE TABLE Timesheet (
  id          VARCHAR(25)  NOT NULL PRIMARY KEY,
  empId       VARCHAR(25)  NOT NULL,
  weekStart   DATE         NOT NULL,
  weekEnd     DATE         NOT NULL,
  totalHours  DOUBLE       NOT NULL DEFAULT 0,
  otHours     DOUBLE       NOT NULL DEFAULT 0,
  normalHours DOUBLE       NOT NULL DEFAULT 0,
  status      VARCHAR(50)  NOT NULL DEFAULT 'Draft',
  approvedBy  VARCHAR(255) DEFAULT NULL,
  submittedAt DATETIME     DEFAULT NULL,
  remarks     TEXT         DEFAULT NULL,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_timesheet_empId (empId),
  INDEX idx_timesheet_weekStart (weekStart),
  INDEX idx_timesheet_status (status),
  CONSTRAINT fk_timesheet_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: TimesheetEntry
-- ============================================================================
-- Individual daily entries within a timesheet. Each row represents one day
-- of work logged against a specific project and activity type.
-- project references Project IDs: proj_001 to proj_006.
-- ============================================================================
CREATE TABLE TimesheetEntry (
  id           VARCHAR(25)  NOT NULL PRIMARY KEY,
  timesheetId  VARCHAR(25)  NOT NULL,
  date         DATE         NOT NULL,
  project      VARCHAR(25)  DEFAULT NULL,
  activity     VARCHAR(255) NOT NULL,
  hours        DOUBLE       NOT NULL,
  description  TEXT         DEFAULT NULL,
  status       VARCHAR(50)  NOT NULL DEFAULT 'Approved',
  createdAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_timesheetEntry_timesheetId (timesheetId),
  CONSTRAINT fk_timesheetEntry_timesheet FOREIGN KEY (timesheetId) REFERENCES Timesheet (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DATA: Timesheet (10 records)
-- ============================================================================
-- Week 2025-01-06 to 2025-01-10 across multiple sites and projects.
-- Status mix: Approved (5), Submitted (2), Draft (2), Rejected (1)
-- Employees chosen from various sites: Jamnagar, Singrauli, Jamshedpur,
-- Panipat, Vijayanagar — reflecting the multi-site nature of the business.
-- ============================================================================
INSERT INTO Timesheet (id, empId, weekStart, weekEnd, totalHours, otHours, normalHours, status, approvedBy, submittedAt, remarks, createdAt, updatedAt) VALUES
-- 1. Rajesh Mehta (emp_0001) — Senior Engineer, Mechanical, site_001 (Jamnagar), proj_001 AMC
('ts_0001', 'emp_0001', '2025-01-06', '2025-01-10', 42.0, 2.0, 40.0, 'Approved', 'VC-002',
 '2025-01-11 09:15:00', 'Routine AMC work at Reliance Jamnagar Refinery. Minor OT on Monday alignment job.',
 '2025-01-06 07:00:00.000', '2025-01-12 14:30:00.000'),

-- 2. Vikram Pandey (emp_0003) — Site Incharge, Electrical, site_003 (Singrauli), proj_003 O&M
('ts_0002', 'emp_0003', '2025-01-06', '2025-01-10', 45.0, 5.0, 40.0, 'Approved', 'VC-001',
 '2025-01-11 08:45:00', 'NTPC Singrauli O&M — electrical maintenance and emergency breakdown calls. Night shift OT on Mon & Thu.',
 '2025-01-06 06:30:00.000', '2025-01-12 11:00:00.000'),

-- 3. Amit Joshi (emp_0007) — Engineer, Electrical, site_001 (Jamnagar), proj_001 AMC
('ts_0003', 'emp_0007', '2025-01-06', '2025-01-10', 41.0, 1.0, 40.0, 'Submitted', NULL,
 '2025-01-11 10:00:00', 'Electrical maintenance at Jamnagar refinery. 1 hr OT on Wednesday breakdown call.',
 '2025-01-06 07:00:00.000', '2025-01-11 10:00:00.000'),

-- 4. Suresh Patel (emp_0008) — Engineer, Mechanical, site_001 (Jamnagar), proj_001 AMC
('ts_0004', 'emp_0008', '2025-01-06', '2025-01-10', 44.0, 4.0, 40.0, 'Approved', 'VC-002',
 '2025-01-11 09:30:00', 'Mechanical AMC work including alignment checks and piping jobs. Night OT on Tue & Thu.',
 '2025-01-06 07:00:00.000', '2025-01-12 15:45:00.000'),

-- 5. Mahesh Kumar (emp_0010) — Supervisor, Welding, site_002 (Jamshedpur), proj_002 Shutdown
('ts_0005', 'emp_0010', '2025-01-06', '2025-01-10', 47.0, 7.0, 40.0, 'Approved', 'VC-001',
 '2025-01-11 08:00:00', 'Tata Steel BF-3 Shutdown — intensive welding work across all 5 days. Double OT on Mon-Tue night shifts.',
 '2025-01-06 06:00:00.000', '2025-01-12 09:00:00.000'),

-- 6. Mohan Lal (emp_0015) — Technician, Fitter, site_001 (Jamnagar), proj_001 AMC
('ts_0006', 'emp_0015', '2025-01-06', '2025-01-10', 41.0, 1.0, 40.0, 'Submitted', NULL,
 '2025-01-11 11:30:00', 'Fitting and piping work at Jamnagar. Minor OT on Thursday pipeline joint work.',
 '2025-01-06 07:00:00.000', '2025-01-11 11:30:00.000'),

-- 7. Raju Yadav (emp_0016) — Technician, Welder, site_002 (Jamshedpur), proj_002 Shutdown
('ts_0007', 'emp_0016', '2025-01-06', '2025-01-10', 47.0, 7.0, 40.0, 'Approved', 'VC-001',
 '2025-01-11 08:30:00', 'BF-3 Shutdown welding crew — heavy welding and repair work. Night shift OT Mon-Tue-Thu.',
 '2025-01-06 06:00:00.000', '2025-01-12 10:30:00.000'),

-- 8. Suresh M (emp_0018) — Technician, Electrician, site_003 (Singrauli), proj_003 O&M
('ts_0008', 'emp_0018', '2025-01-06', '2025-01-10', 43.0, 3.0, 40.0, 'Draft', NULL,
 NULL, 'Draft — NTPC Singrauli electrical maintenance week. Includes breakdown repair on Tuesday night.',
 '2025-01-06 06:30:00.000', '2025-01-10 18:00:00.000'),

-- 9. Manoj Singh (emp_0021) — Technician, Fitter, site_005 (Panipat), proj_005 Turnaround
('ts_0009', 'emp_0021', '2025-01-06', '2025-01-10', 47.0, 7.0, 40.0, 'Rejected', 'VC-002',
 '2025-01-11 09:00:00', 'IOCL Panipat CDU Turnaround — fitter work. REJECTED: OT hours not pre-approved by site incharge.',
 '2025-01-06 06:00:00.000', '2025-01-13 16:00:00.000'),

-- 10. Dilip Das (emp_0022) — Technician, Electrician, site_006 (Vijayanagar), proj_006 AMC
('ts_0010', 'emp_0022', '2025-01-06', '2025-01-10', 41.0, 1.0, 40.0, 'Draft', NULL,
 NULL, 'Draft — JSW Hot Strip Mill electrical maintenance. 1 hr OT on Wednesday breakdown call.',
 '2025-01-06 07:00:00.000', '2025-01-10 17:30:00.000');

-- ============================================================================
-- DATA: TimesheetEntry (50 records — 5 entries per timesheet, Mon–Fri)
-- ============================================================================
-- Week of 2025-01-06 (Mon) to 2025-01-10 (Fri)
-- Each entry maps to a specific project, activity, and hours worked.
-- Activities reflect real plant maintenance tasks performed on-site.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Timesheet ts_0001: Rajesh Mehta (emp_0001) — proj_001 (Reliance Jamnagar AMC)
-- Monday 2025-01-06 through Friday 2025-01-10
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0001', 'ts_0001', '2025-01-06', 'proj_001', 'Preventive Maintenance', 9.0,
 'Routine PM of centrifugal pump CP-101 in Crude Unit. Vibration check and bearing greasing. 1 hr OT for alignment correction.',
 'Approved', '2025-01-06 17:00:00.000', '2025-01-12 14:30:00.000'),
('tse_0002', 'ts_0001', '2025-01-07', 'proj_001', 'Equipment Inspection', 8.0,
 'Inspection of cooling tower fan assembly FT-205. Checked blade pitch and motor mounting bolts.',
 'Approved', '2025-01-07 17:00:00.000', '2025-01-12 14:30:00.000'),
('tse_0003', 'ts_0001', '2025-01-08', 'proj_001', 'Alignment Check', 9.0,
 'Laser alignment of motor-gearbox coupling on HSD pump P-302. Required shimming work — extended hours.',
 'Approved', '2025-01-08 18:00:00.000', '2025-01-12 14:30:00.000'),
('tse_0004', 'ts_0001', '2025-01-09', 'proj_001', 'Preventive Maintenance', 8.0,
 'PM of air compressor AC-401 in utility area. Filter change, oil top-up, belt tension check.',
 'Approved', '2025-01-09 17:00:00.000', '2025-01-12 14:30:00.000'),
('tse_0005', 'ts_0001', '2025-01-10', 'proj_001', 'Piping Work', 8.0,
 'Replacement of 4" SS flange gasket on cooling water return line CW-310. Hydro-tested to 6 kg/cm².',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-12 14:30:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0002: Vikram Pandey (emp_0003) — proj_003 (NTPC Singrauli O&M)
-- Tuesday night OT and Thursday night OT (breakdown calls)
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0006', 'ts_0002', '2025-01-06', 'proj_003', 'Electrical Maintenance', 10.0,
 'Overhaul of LT panel feeder breaker 33-B in Unit-5. Cable termination and megger testing. Night shift OT.',
 'Approved', '2025-01-06 20:00:00.000', '2025-01-12 11:00:00.000'),
('tse_0007', 'ts_0002', '2025-01-07', 'proj_003', 'Equipment Inspection', 9.0,
 'Thermal imaging of Unit-5 switchyard CT/PT connections. Identified hot spot on 220kV bus coupler. 1 hr OT for report.',
 'Approved', '2025-01-07 18:00:00.000', '2025-01-12 11:00:00.000'),
('tse_0008', 'ts_0002', '2025-01-08', 'proj_003', 'Electrical Maintenance', 8.0,
 'Replacement of 6.6kV motor bearings for induced draft fan IDF-5A. Motor meggered and run-tested.',
 'Approved', '2025-01-08 17:00:00.000', '2025-01-12 11:00:00.000'),
('tse_0009', 'ts_0002', '2025-01-09', 'proj_003', 'Breakdown Repair', 10.0,
 'Emergency repair of Unit-5 boiler feed pump motor. Winding fault identified, rewound on-site. Night shift.',
 'Approved', '2025-01-09 22:00:00.000', '2025-01-12 11:00:00.000'),
('tse_0010', 'ts_0002', '2025-01-10', 'proj_003', 'Equipment Inspection', 8.0,
 'Routine inspection of DG set control panels. Checked battery voltage, charger output, and ATS function.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-12 11:00:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0003: Amit Joshi (emp_0007) — proj_001 (Reliance Jamnagar AMC)
-- Electrical maintenance, 1 hr OT on Wednesday
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0011', 'ts_0003', '2025-01-06', 'proj_001', 'Electrical Maintenance', 8.0,
 'Inspection and tightening of MV drive panel connections in CDU area. IR value checked — all OK.',
 'Approved', '2025-01-06 17:00:00.000', '2025-01-11 10:00:00.000'),
('tse_0012', 'ts_0003', '2025-01-07', 'proj_001', 'Equipment Inspection', 8.0,
 'Condition monitoring of HV motors in FCC unit. Vibration and current signature analysis performed.',
 'Approved', '2025-01-07 17:00:00.000', '2025-01-11 10:00:00.000'),
('tse_0013', 'ts_0003', '2025-01-08', 'proj_001', 'Breakdown Repair', 9.0,
 'Breakdown repair of naphtha pump motor P-510. Failed starter contactor replaced. 1 hr OT.',
 'Approved', '2025-01-08 18:00:00.000', '2025-01-11 10:00:00.000'),
('tse_0014', 'ts_0003', '2025-01-09', 'proj_001', 'Electrical Maintenance', 8.0,
 'Preventive maintenance of lighting distribution boards in tank farm area. MCB and ELCB testing.',
 'Approved', '2025-01-09 17:00:00.000', '2025-01-11 10:00:00.000'),
('tse_0015', 'ts_0003', '2025-01-10', 'proj_001', 'Safety Audit', 8.0,
 'Electrical safety audit of temporary power connections in construction area. Identified 3 non-compliances.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-11 10:00:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0004: Suresh Patel (emp_0008) — proj_001 (Reliance Jamnagar AMC)
-- Mechanical work, night OT on Tue & Thu
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0016', 'ts_0004', '2025-01-06', 'proj_001', 'Preventive Maintenance', 9.0,
 'PM of heat exchanger E-201 bundle cleaning. Gasket replacement and hydro-test. 1 hr OT for re-assembly.',
 'Approved', '2025-01-06 18:00:00.000', '2025-01-12 15:45:00.000'),
('tse_0017', 'ts_0004', '2025-01-07', 'proj_001', 'Alignment Check', 10.0,
 'Full alignment of steam turbine driven boiler feed pump BFP-301. Optical laser alignment. Night shift OT.',
 'Approved', '2025-01-07 20:00:00.000', '2025-01-12 15:45:00.000'),
('tse_0018', 'ts_0004', '2025-01-08', 'proj_001', 'Piping Work', 8.0,
 'Fabrication and installation of 3" bypass line for level control valve LCV-402 in VDU area.',
 'Approved', '2025-01-08 17:00:00.000', '2025-01-12 15:45:00.000'),
('tse_0019', 'ts_0004', '2025-01-09', 'proj_001', 'Breakdown Repair', 9.0,
 'Emergency repair of flue gas damper actuator in furnace F-101. Linkage replaced and calibrated. Night OT.',
 'Approved', '2025-01-09 19:00:00.000', '2025-01-12 15:45:00.000'),
('tse_0020', 'ts_0004', '2025-01-10', 'proj_001', 'Preventive Maintenance', 8.0,
 'PM of reciprocating compressor C-501 in LPG area. Valve plate inspection and packing replacement.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-12 15:45:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0005: Mahesh Kumar (emp_0010) — proj_002 (Tata Steel BF-3 Shutdown)
-- Heavy welding work during shutdown, multiple OT days
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0021', 'ts_0005', '2025-01-06', 'proj_002', 'Welding Work', 10.0,
 'SMAW welding of BF-3 bustle pipe supports. E7018 electrodes, 3G position. Night shift OT.',
 'Approved', '2025-01-06 20:00:00.000', '2025-01-12 09:00:00.000'),
('tse_0022', 'ts_0005', '2025-01-07', 'proj_002', 'Welding Work', 10.0,
 'GTAW root + SMAW fill of 12" cooling water pipe on blast furnace. Full penetration weld. Night shift OT.',
 'Approved', '2025-01-07 20:00:00.000', '2025-01-12 09:00:00.000'),
('tse_0023', 'ts_0005', '2025-01-08', 'proj_002', 'Welding Work', 10.0,
 'Repair welding of tap hole launder crack. Special wear-resistant overlay. Night shift OT.',
 'Approved', '2025-01-08 20:00:00.000', '2025-01-12 09:00:00.000'),
('tse_0024', 'ts_0005', '2025-01-09', 'proj_002', 'Welding Work', 9.0,
 'Welding of dust catcher shell patch plates. Gouging and re-welding of eroded areas. 1 hr OT.',
 'Approved', '2025-01-09 18:00:00.000', '2025-01-12 09:00:00.000'),
('tse_0025', 'ts_0005', '2025-01-10', 'proj_002', 'Equipment Inspection', 8.0,
 'Visual and MPI inspection of all weld joints completed during the week. Documentation and NDT reports.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-12 09:00:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0006: Mohan Lal (emp_0015) — proj_001 (Reliance Jamnagar AMC)
-- Fitter work, 1 hr OT on Thursday
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0026', 'ts_0006', '2025-01-06', 'proj_001', 'Preventive Maintenance', 8.0,
 'PM of API pump P-601 in hydrogen plant. Mechanical seal replacement and impeller clearance check.',
 'Approved', '2025-01-06 17:00:00.000', '2025-01-11 11:30:00.000'),
('tse_0027', 'ts_0006', '2025-01-07', 'proj_001', 'Piping Work', 8.0,
 'Installation of 2" carbon steel drain line from condensate pot CP-205 to oily drain collection.',
 'Approved', '2025-01-07 17:00:00.000', '2025-01-11 11:30:00.000'),
('tse_0028', 'ts_0006', '2025-01-08', 'proj_001', 'Alignment Check', 8.0,
 'Dial gauge alignment of agitator motor-gearbox in sulphuric acid storage tank area.',
 'Approved', '2025-01-08 17:00:00.000', '2025-01-11 11:30:00.000'),
('tse_0029', 'ts_0006', '2025-01-09', 'proj_001', 'Piping Work', 9.0,
 'Hydro-test of new 6" steam trap station bypass line. Leaked flange re-torqued. 1 hr OT.',
 'Approved', '2025-01-09 18:00:00.000', '2025-01-11 11:30:00.000'),
('tse_0030', 'ts_0006', '2025-01-10', 'proj_001', 'Preventive Maintenance', 8.0,
 'PM of strainers in cooling water circuit. Basket cleaning and gasket renewal of 6 strainers.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-11 11:30:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0007: Raju Yadav (emp_0016) — proj_002 (Tata Steel BF-3 Shutdown)
-- Welder during shutdown, heavy OT Mon-Tue-Thu
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0031', 'ts_0007', '2025-01-06', 'proj_002', 'Welding Work', 10.0,
 'Root run welding of 16" hot blast main expansion joint. GTAW with ER70S-2 filler. Night shift OT.',
 'Approved', '2025-01-06 20:00:00.000', '2025-01-12 10:30:00.000'),
('tse_0032', 'ts_0007', '2025-01-07', 'proj_002', 'Breakdown Repair', 10.0,
 'Emergency repair of crack on skip car rail support beam.碳 arc gouging and SMAW repair. Night shift OT.',
 'Approved', '2025-01-07 20:00:00.000', '2025-01-12 10:30:00.000'),
('tse_0033', 'ts_0007', '2025-01-08', 'proj_002', 'Welding Work', 9.0,
 'Fill and cap welding of bustle pipe support gussets. E7018 4.0mm electrodes. 1 hr OT for overhead passes.',
 'Approved', '2025-01-08 18:00:00.000', '2025-01-12 10:30:00.000'),
('tse_0034', 'ts_0007', '2025-01-09', 'proj_002', 'Welding Work', 10.0,
 'Welding of cast house trough lining anchor plates. Hard-facing overlay on tap hole protector. Night shift OT.',
 'Approved', '2025-01-09 20:00:00.000', '2025-01-12 10:30:00.000'),
('tse_0035', 'ts_0007', '2025-01-10', 'proj_002', 'Equipment Inspection', 8.0,
 'Final visual inspection and touch-up welding of all completed joints. Grinding and cleaning for NDT.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-12 10:30:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0008: Suresh M (emp_0018) — proj_003 (NTPC Singrauli O&M)
-- Electrician, draft status — not yet submitted
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0036', 'ts_0008', '2025-01-06', 'proj_003', 'Electrical Maintenance', 9.0,
 'Replacement of faulty contactor in coal feeder drive panel 11-A. Motor tested OK. 1 hr OT.',
 'Approved', '2025-01-06 18:00:00.000', '2025-01-10 18:00:00.000'),
('tse_0037', 'ts_0008', '2025-01-07', 'proj_003', 'Breakdown Repair', 10.0,
 'Emergency repair of ash handling plant PLC input module. Wiring corrected and bypass panel erected. Night OT.',
 'Approved', '2025-01-07 20:00:00.000', '2025-01-10 18:00:00.000'),
('tse_0038', 'ts_0008', '2025-01-08', 'proj_003', 'Electrical Maintenance', 8.0,
 'PM of unit-6 ESP rapping motor cables and insulation resistance check. All 12 motors OK.',
 'Approved', '2025-01-08 17:00:00.000', '2025-01-10 18:00:00.000'),
('tse_0039', 'ts_0008', '2025-01-09', 'proj_003', 'Equipment Inspection', 8.0,
 'Monthly inspection of fire water pump house electrical panels. Checked pump duty/standby changeover logic.',
 'Approved', '2025-01-09 17:00:00.000', '2025-01-10 18:00:00.000'),
('tse_0040', 'ts_0008', '2025-01-10', 'proj_003', 'Electrical Maintenance', 8.0,
 'Cleaning and greasing of isolator contacts in 220kV switchyard. IR testing of CT secondary wiring.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-10 18:00:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0009: Manoj Singh (emp_0021) — proj_005 (IOCL Panipat Turnaround)
-- Fitter work at turnaround, REJECTED due to unapproved OT
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0041', 'ts_0009', '2025-01-06', 'proj_005', 'Preventive Maintenance', 10.0,
 'PM of CDU overhead condenser shell and tube bundle extraction. Bolting and gasket removal. Night OT.',
 'Approved', '2025-01-06 20:00:00.000', '2025-01-13 16:00:00.000'),
('tse_0042', 'ts_0009', '2025-01-07', 'proj_005', 'Piping Work', 10.0,
 'Installation of temporary bypass spool for CDU furnace outlet 10" line. Fit-up and bolting. Night OT.',
 'Approved', '2025-01-07 20:00:00.000', '2025-01-13 16:00:00.000'),
('tse_0043', 'ts_0009', '2025-01-08', 'proj_005', 'Alignment Check', 9.0,
 'Alignment of re-boiler pump P-210 motor with gearbox. Soft foot correction and shimming. 1 hr OT.',
 'Approved', '2025-01-08 18:00:00.000', '2025-01-13 16:00:00.000'),
('tse_0044', 'ts_0009', '2025-01-09', 'proj_005', 'Piping Work', 10.0,
 'Erection of new 8" process pipe spool in VDU area. Fit-up, alignment, and tack welding for welder. Night OT.',
 'Approved', '2025-01-09 20:00:00.000', '2025-01-13 16:00:00.000'),
('tse_0045', 'ts_0009', '2025-01-10', 'proj_005', 'Preventive Maintenance', 8.0,
 'PM of naphtha splitter tower manhole gasket renewal. Hydro-test and box-up. Normal shift.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-13 16:00:00.000');

-- ---------------------------------------------------------------------------
-- Timesheet ts_0010: Dilip Das (emp_0022) — proj_006 (JSW Hot Strip Mill AMC)
-- Electrician, draft — not yet submitted
-- ---------------------------------------------------------------------------
INSERT INTO TimesheetEntry (id, timesheetId, date, project, activity, hours, description, status, createdAt, updatedAt) VALUES
('tse_0046', 'ts_0010', '2025-01-06', 'proj_006', 'Electrical Maintenance', 8.0,
 'PM of finishing stand drive motor R3. Brush holder inspection, commutator cleaning, IR testing.',
 'Approved', '2025-01-06 17:00:00.000', '2025-01-10 17:30:00.000'),
('tse_0047', 'ts_0010', '2025-01-07', 'proj_006', 'Equipment Inspection', 8.0,
 'Inspection of coil handling crane power cable reeling drum. Cable guide roller replaced.',
 'Approved', '2025-01-07 17:00:00.000', '2025-01-10 17:30:00.000'),
('tse_0048', 'ts_0010', '2025-01-08', 'proj_006', 'Breakdown Repair', 9.0,
 'Breakdown repair of run-out table conveyor drive. Failed VFD replaced and parameter set. 1 hr OT.',
 'Approved', '2025-01-08 18:00:00.000', '2025-01-10 17:30:00.000'),
('tse_0049', 'ts_0010', '2025-01-09', 'proj_006', 'Electrical Maintenance', 8.0,
 'PM of down-coiler pinch roll drive motors. Changed carbon brushes and checked commutator profile.',
 'Approved', '2025-01-09 17:00:00.000', '2025-01-10 17:30:00.000'),
('tse_0050', 'ts_0010', '2025-01-10', 'proj_006', 'Safety Audit', 8.0,
 'Electrical safety check of all temporary power boards in mill area. Earth continuity and ELCB trip test.',
 'Approved', '2025-01-10 17:00:00.000', '2025-01-10 17:30:00.000');