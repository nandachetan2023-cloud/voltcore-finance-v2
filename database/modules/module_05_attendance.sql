-- ============================================================================
-- MODULE 05: Attendance & Punch Log
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor (India)
-- ============================================================================
-- Tables  :
--   1. Attendance — Daily attendance summary per employee (time-in/out, OT, shift)
--   2. PunchLog   — Raw biometric/device punch events (face, thumb, RFID, manual)
-- ============================================================================
-- FK       : empId → Employee(id) ON DELETE CASCADE
-- Data     : 30 attendance records, 20 punch-log records
-- Date span: 2025-01-01 to 2025-01-15
-- Context  : Plant maintenance crews working General / Second / Night shifts
--            across six industrial sites. Weekly Off on Sundays (Jan 5, 12).
--            Jan 14 = Makar Sankranti / Pongal holiday.
-- ============================================================================

-- ============================================================================
-- 1. TABLE: Attendance
--    Consolidated daily attendance record per employee.
--    site stores the plant name (VARCHAR 255) matching the employee's site.
--    punchSource tracks how the attendance was captured.
--    shift: General (06:00-14:00), Second (14:00-22:00), Night (22:00-06:00)
--    status: Present / Absent / Half Day / Leave / Holiday / Weekly Off
-- ============================================================================

CREATE TABLE Attendance (
  id          VARCHAR(25)   NOT NULL PRIMARY KEY,
  empId       VARCHAR(25)   NOT NULL,
  site        VARCHAR(255)  NOT NULL,
  date        DATE          NOT NULL,
  timeIn      TIME          DEFAULT NULL,
  timeOut     TIME          DEFAULT NULL,
  otHours     DOUBLE        NOT NULL DEFAULT 0,
  shift       VARCHAR(50)   DEFAULT NULL,
  punchSource VARCHAR(50)   DEFAULT NULL,
  status      VARCHAR(50)   NOT NULL DEFAULT 'Present',
  createdAt   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_attendance_empId (empId),
  INDEX idx_attendance_date  (date),
  INDEX idx_attendance_site  (site),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. TABLE: PunchLog
--    Individual punch events from biometric devices at site entry/exit gates.
--    Each swipe (In or Out) is a separate row.
--    deviceId  — hardware identifier of the biometric terminal
--    location  — physical gate or zone where the device is installed
--    syncStatus — whether the device has uploaded the event to the ERP server
-- ============================================================================

CREATE TABLE PunchLog (
  id          VARCHAR(25)   NOT NULL PRIMARY KEY,
  empId       VARCHAR(25)   NOT NULL,
  punchTime   DATETIME      NOT NULL,
  direction   VARCHAR(10)   DEFAULT NULL,
  source      VARCHAR(50)   DEFAULT NULL,
  deviceId    VARCHAR(100)  DEFAULT NULL,
  location    VARCHAR(255)  DEFAULT NULL,
  syncStatus  VARCHAR(20)   NOT NULL DEFAULT 'Synced',
  createdAt   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_punchlog_empId    (empId),
  INDEX idx_punchlog_punchTime (punchTime),
  CONSTRAINT fk_punchlog_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 3. INSERT: Attendance (30 records)
-- ============================================================================
-- Distribution across employees, sites, shifts, and statuses:
--   Present   : 22 records — regular working days with varied OT
--   Weekly Off: 4 records  — Sundays Jan 5 and Jan 12
--   Holiday   : 1 record   — Jan 14 (Makar Sankranti / Pongal)
--   Half Day  : 1 record   — employee checked out at noon
--   Leave     : 1 record   — approved leave (Sick / Casual)
--   Absent    : 1 record   — un-notified absence
-- ============================================================================

INSERT INTO Attendance (id, empId, site, date, timeIn, timeOut, otHours, shift, punchSource, status, createdAt, updatedAt) VALUES
-- ---------------------------------------------------------------------------
-- emp_0001 — Rajesh Mehta | Senior Engineer | Reliance Jamnagar Refinery
-- General shift, present all three days with varying OT
-- ---------------------------------------------------------------------------
('att_00001', 'emp_0001', 'Reliance Jamnagar Refinery', '2025-01-01', '08:00:00', '17:30:00', 1.5, 'General', 'Face Recognition', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 17:30:00.000'),
('att_00002', 'emp_0001', 'Reliance Jamnagar Refinery', '2025-01-02', '08:00:00', '17:00:00', 0.0, 'General', 'RFID Card', 'Present', '2025-01-02 08:00:00.000', '2025-01-02 17:00:00.000'),
('att_00003', 'emp_0001', 'Reliance Jamnagar Refinery', '2025-01-03', '08:00:00', '19:00:00', 3.0, 'General', 'Face Recognition', 'Present', '2025-01-03 08:00:00.000', '2025-01-03 19:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0002 — Sanjay Kumar Singh | Site Supervisor | Tata Steel, Jamshedpur
-- Jan 1: General | Jan 2: Night shift rotation
-- ---------------------------------------------------------------------------
('att_00004', 'emp_0002', 'Tata Steel Plant, Jamshedpur', '2025-01-01', '07:30:00', '16:30:00', 0.0, 'General', 'Thumb Impression', 'Present', '2025-01-01 07:30:00.000', '2025-01-01 16:30:00.000'),
('att_00005', 'emp_0002', 'Tata Steel Plant, Jamshedpur', '2025-01-02', '22:00:00', '06:00:00', 0.0, 'Night', 'RFID Card', 'Present', '2025-01-02 22:00:00.000', '2025-01-03 06:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0003 — Vikram Pandey | Site Incharge | NTPC Singrauli
-- Second shift (14:00-22:00); Jan 5 Sunday = Weekly Off
-- ---------------------------------------------------------------------------
('att_00006', 'emp_0003', 'NTPC Singrauli Super Thermal', '2025-01-01', '14:00:00', '22:00:00', 0.0, 'Second', 'Face Recognition', 'Present', '2025-01-01 14:00:00.000', '2025-01-01 22:00:00.000'),
('att_00007', 'emp_0003', 'NTPC Singrauli Super Thermal', '2025-01-02', '14:00:00', '22:30:00', 0.5, 'Second', 'Face Recognition', 'Present', '2025-01-02 14:00:00.000', '2025-01-02 22:30:00.000'),
('att_00008', 'emp_0003', 'NTPC Singrauli Super Thermal', '2025-01-05', NULL, NULL, 0.0, 'General', 'Manual', 'Weekly Off', '2025-01-05 00:00:00.000', '2025-01-05 00:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0004 — Nagarjuna Reddy | Planning Engineer | UltraTech Cement
-- Jan 2 half-day (personal work)
-- ---------------------------------------------------------------------------
('att_00009', 'emp_0004', 'UltraTech Cement, Tadipatri', '2025-01-01', '08:00:00', '17:00:00', 0.0, 'General', 'Thumb Impression', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 17:00:00.000'),
('att_00010', 'emp_0004', 'UltraTech Cement, Tadipatri', '2025-01-02', '08:00:00', '13:00:00', 0.0, 'General', 'Thumb Impression', 'Half Day', '2025-01-02 08:00:00.000', '2025-01-02 13:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0005 — Arun Sharma | Project Engineer | IOCL Panipat Refinery
-- Jan 3: Night shift with 1 hr OT for emergency inspection
-- ---------------------------------------------------------------------------
('att_00011', 'emp_0005', 'IOCL Panipat Refinery', '2025-01-01', '08:30:00', '17:30:00', 0.0, 'General', 'RFID Card', 'Present', '2025-01-01 08:30:00.000', '2025-01-01 17:30:00.000'),
('att_00012', 'emp_0005', 'IOCL Panipat Refinery', '2025-01-03', '22:00:00', '07:00:00', 1.0, 'Night', 'RFID Card', 'Present', '2025-01-03 22:00:00.000', '2025-01-04 07:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0006 — Pradeep Rao | Site Supervisor | JSW Steel, Vijayanagar
-- Jan 1: Present | Jan 2: Absent (un-notified)
-- ---------------------------------------------------------------------------
('att_00013', 'emp_0006', 'JSW Steel Plant, Vijayanagar', '2025-01-01', '08:00:00', '17:00:00', 0.0, 'General', 'Face Recognition', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 17:00:00.000'),
('att_00014', 'emp_0006', 'JSW Steel Plant, Vijayanagar', '2025-01-02', NULL, NULL, 0.0, 'General', 'Manual', 'Absent', '2025-01-02 00:00:00.000', '2025-01-02 23:59:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0007 — Amit Joshi | Engineer | Reliance Jamnagar
-- Regular General shift
-- ---------------------------------------------------------------------------
('att_00015', 'emp_0007', 'Reliance Jamnagar Refinery', '2025-01-01', '08:00:00', '17:00:00', 0.0, 'General', 'Face Recognition', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 17:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0008 — Suresh Patel | Engineer | Reliance Jamnagar
-- Jan 1: 2 hrs OT (pump alignment work) | Jan 5: Sunday Weekly Off
-- ---------------------------------------------------------------------------
('att_00016', 'emp_0008', 'Reliance Jamnagar Refinery', '2025-01-01', '08:00:00', '18:30:00', 2.0, 'General', 'Thumb Impression', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 18:30:00.000'),
('att_00017', 'emp_0008', 'Reliance Jamnagar Refinery', '2025-01-05', NULL, NULL, 0.0, 'General', 'Manual', 'Weekly Off', '2025-01-05 00:00:00.000', '2025-01-05 00:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0009 — Deepak Verma | Safety Officer | NTPC Singrauli
-- Jan 1: full day | Jan 2: short day (safety audit completed early)
-- ---------------------------------------------------------------------------
('att_00018', 'emp_0009', 'NTPC Singrauli Super Thermal', '2025-01-01', '08:00:00', '17:00:00', 0.0, 'General', 'Face Recognition', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 17:00:00.000'),
('att_00019', 'emp_0009', 'NTPC Singrauli Super Thermal', '2025-01-02', '08:00:00', '16:00:00', 0.0, 'General', 'Thumb Impression', 'Present', '2025-01-02 08:00:00.000', '2025-01-02 16:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0010 — Mahesh Kumar | Supervisor | Tata Steel, Jamshedpur
-- Jan 1: 1 hr OT (shutdown prep) | Jan 5: Sunday Weekly Off
-- ---------------------------------------------------------------------------
('att_00020', 'emp_0010', 'Tata Steel Plant, Jamshedpur', '2025-01-01', '07:30:00', '17:30:00', 1.0, 'General', 'Thumb Impression', 'Present', '2025-01-01 07:30:00.000', '2025-01-01 17:30:00.000'),
('att_00021', 'emp_0010', 'Tata Steel Plant, Jamshedpur', '2025-01-05', NULL, NULL, 0.0, 'General', 'Manual', 'Weekly Off', '2025-01-05 00:00:00.000', '2025-01-05 00:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0015 — Mohan Lal | Technician (Fitter) | Reliance Jamnagar
-- Night shift (22:00-06:00), 0.5 OT on Jan 1
-- ---------------------------------------------------------------------------
('att_00022', 'emp_0015', 'Reliance Jamnagar Refinery', '2025-01-01', '22:00:00', '06:30:00', 0.5, 'Night', 'RFID Card', 'Present', '2025-01-01 22:00:00.000', '2025-01-02 06:30:00.000'),
('att_00023', 'emp_0015', 'Reliance Jamnagar Refinery', '2025-01-02', '22:00:00', '06:00:00', 0.0, 'Night', 'RFID Card', 'Present', '2025-01-02 22:00:00.000', '2025-01-03 06:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0016 — Raju Yadav | Technician (Welder) | Tata Steel, Jamshedpur
-- Jan 1: Present | Jan 14: Makar Sankranti holiday
-- ---------------------------------------------------------------------------
('att_00024', 'emp_0016', 'Tata Steel Plant, Jamshedpur', '2025-01-01', '07:30:00', '16:30:00', 0.0, 'General', 'Thumb Impression', 'Present', '2025-01-01 07:30:00.000', '2025-01-01 16:30:00.000'),
('att_00025', 'emp_0016', 'Tata Steel Plant, Jamshedpur', '2025-01-14', NULL, NULL, 0.0, 'General', 'Manual', 'Holiday', '2025-01-14 00:00:00.000', '2025-01-14 00:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0018 — Suresh M | Technician (Electrician) | NTPC Singrauli
-- Jan 1: On approved sick leave
-- ---------------------------------------------------------------------------
('att_00026', 'emp_0018', 'NTPC Singrauli Super Thermal', '2025-01-01', NULL, NULL, 0.0, 'General', 'Manual', 'Leave', '2025-01-01 00:00:00.000', '2025-01-01 09:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0020 — Ashok Pandit | Safety Officer | Reliance Jamnagar
-- Jan 1: 1 hr OT (New Year safety rounds)
-- ---------------------------------------------------------------------------
('att_00027', 'emp_0020', 'Reliance Jamnagar Refinery', '2025-01-01', '08:00:00', '18:00:00', 1.0, 'General', 'Face Recognition', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 18:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0021 — Manoj Singh | Technician (Fitter) | IOCL Panipat
-- Regular General shift
-- ---------------------------------------------------------------------------
('att_00028', 'emp_0021', 'IOCL Panipat Refinery', '2025-01-01', '08:00:00', '17:00:00', 0.0, 'General', 'RFID Card', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 17:00:00.000'),

-- ---------------------------------------------------------------------------
-- emp_0022 — Dilip Das | Technician (Electrician) | JSW Steel
-- Jan 1: Present | Jan 12: Sunday Weekly Off
-- ---------------------------------------------------------------------------
('att_00029', 'emp_0022', 'JSW Steel Plant, Vijayanagar', '2025-01-01', '08:00:00', '17:00:00', 0.0, 'General', 'Face Recognition', 'Present', '2025-01-01 08:00:00.000', '2025-01-01 17:00:00.000'),
('att_00030', 'emp_0022', 'JSW Steel Plant, Vijayanagar', '2025-01-12', NULL, NULL, 0.0, 'General', 'Manual', 'Weekly Off', '2025-01-12 00:00:00.000', '2025-01-12 00:00:00.000');


-- ============================================================================
-- 4. INSERT: PunchLog (20 records — 10 In/Out pairs)
-- ============================================================================
-- Source distribution:
--   Face Recognition : 8 punches (pairs 1,3,7,9)
--   Thumb Impression : 6 punches (pairs 2,5,6)
--   RFID Card        : 4 punches (pairs 4,8)
--   Manual           : 2 punches (pair 10 — device offline, supervisor keyed in)
-- syncStatus:
--   Synced  : 18 punches
--   Pending : 1 punch  (manual entry awaiting device reconciliation)
--   Failed  : 1 punch  (device communication error)
-- ============================================================================

INSERT INTO PunchLog (id, empId, punchTime, direction, source, deviceId, location, syncStatus, createdAt, updatedAt) VALUES
-- ---------------------------------------------------------------------------
-- Pair 1: emp_0001 — Rajesh Mehta | Face Recognition | Reliance Jamnagar Main Gate
-- ---------------------------------------------------------------------------
('plog_00001', 'emp_0001', '2025-01-01 08:00:00', 'In', 'Face Recognition', 'DEV-FR-001', 'Main Gate - Reliance Jamnagar', 'Synced', '2025-01-01 08:00:05.000', '2025-01-01 08:00:05.000'),
('plog_00002', 'emp_0001', '2025-01-01 17:30:00', 'Out', 'Face Recognition', 'DEV-FR-001', 'Main Gate - Reliance Jamnagar', 'Synced', '2025-01-01 17:30:03.000', '2025-01-01 17:30:03.000'),

-- ---------------------------------------------------------------------------
-- Pair 2: emp_0002 — Sanjay Kumar Singh | Thumb Impression | Tata Steel Gate A
-- ---------------------------------------------------------------------------
('plog_00003', 'emp_0002', '2025-01-01 07:30:00', 'In', 'Thumb Impression', 'DEV-TI-002', 'Gate A - Tata Steel Jamshedpur', 'Synced', '2025-01-01 07:30:08.000', '2025-01-01 07:30:08.000'),
('plog_00004', 'emp_0002', '2025-01-01 16:30:00', 'Out', 'Thumb Impression', 'DEV-TI-002', 'Gate A - Tata Steel Jamshedpur', 'Synced', '2025-01-01 16:30:04.000', '2025-01-01 16:30:04.000'),

-- ---------------------------------------------------------------------------
-- Pair 3: emp_0003 — Vikram Pandey | Face Recognition | NTPC Control Room Entry
-- ---------------------------------------------------------------------------
('plog_00005', 'emp_0003', '2025-01-01 14:00:00', 'In', 'Face Recognition', 'DEV-FR-003', 'Control Room - NTPC Singrauli', 'Synced', '2025-01-01 14:00:06.000', '2025-01-01 14:00:06.000'),
('plog_00006', 'emp_0003', '2025-01-01 22:00:00', 'Out', 'Face Recognition', 'DEV-FR-003', 'Control Room - NTPC Singrauli', 'Synced', '2025-01-01 22:00:02.000', '2025-01-01 22:00:02.000'),

-- ---------------------------------------------------------------------------
-- Pair 4: emp_0005 — Arun Sharma | RFID Card | IOCL Panipat Entry Point
-- Night shift spanning midnight — punch-out on Jan 4
-- ---------------------------------------------------------------------------
('plog_00007', 'emp_0005', '2025-01-03 22:00:00', 'In', 'RFID Card', 'DEV-RF-005', 'Main Entry - IOCL Panipat', 'Synced', '2025-01-03 22:00:10.000', '2025-01-03 22:00:10.000'),
('plog_00008', 'emp_0005', '2025-01-04 07:00:00', 'Out', 'RFID Card', 'DEV-RF-005', 'Main Entry - IOCL Panipat', 'Synced', '2025-01-04 07:00:07.000', '2025-01-04 07:00:07.000'),

-- ---------------------------------------------------------------------------
-- Pair 5: emp_0006 — Pradeep Rao | Manual entry | JSW Main Gate
-- Biometric device offline — supervisor entered punches manually (Pending sync)
-- ---------------------------------------------------------------------------
('plog_00009', 'emp_0006', '2025-01-01 08:00:00', 'In', 'Manual', NULL, 'JSW Main Gate - Vijayanagar', 'Pending', '2025-01-01 09:15:00.000', '2025-01-01 09:15:00.000'),
('plog_00010', 'emp_0006', '2025-01-01 17:00:00', 'Out', 'Manual', NULL, 'JSW Main Gate - Vijayanagar', 'Pending', '2025-01-01 18:00:00.000', '2025-01-01 18:00:00.000'),

-- ---------------------------------------------------------------------------
-- Pair 6: emp_0008 — Suresh Patel | Thumb Impression | Reliance Workshop Area
-- ---------------------------------------------------------------------------
('plog_00011', 'emp_0008', '2025-01-01 08:00:00', 'In', 'Thumb Impression', 'DEV-TI-001', 'Workshop Block - Reliance Jamnagar', 'Synced', '2025-01-01 08:00:12.000', '2025-01-01 08:00:12.000'),
('plog_00012', 'emp_0008', '2025-01-01 18:30:00', 'Out', 'Thumb Impression', 'DEV-TI-001', 'Workshop Block - Reliance Jamnagar', 'Synced', '2025-01-01 18:30:05.000', '2025-01-01 18:30:05.000'),

-- ---------------------------------------------------------------------------
-- Pair 7: emp_0010 — Mahesh Kumar | Thumb Impression | Tata Steel Workshop
-- ---------------------------------------------------------------------------
('plog_00013', 'emp_0010', '2025-01-01 07:30:00', 'In', 'Thumb Impression', 'DEV-TI-002', 'Workshop - Tata Steel Jamshedpur', 'Synced', '2025-01-01 07:30:09.000', '2025-01-01 07:30:09.000'),
('plog_00014', 'emp_0010', '2025-01-01 17:30:00', 'Out', 'Thumb Impression', 'DEV-TI-002', 'Workshop - Tata Steel Jamshedpur', 'Synced', '2025-01-01 17:30:03.000', '2025-01-01 17:30:03.000'),

-- ---------------------------------------------------------------------------
-- Pair 8: emp_0015 — Mohan Lal | RFID Card | Reliance Main Gate
-- Night shift — punch-in Jan 1 22:00, punch-out Jan 2 06:30
-- ---------------------------------------------------------------------------
('plog_00015', 'emp_0015', '2025-01-01 22:00:00', 'In', 'RFID Card', 'DEV-RF-001', 'Main Gate - Reliance Jamnagar', 'Synced', '2025-01-01 22:00:11.000', '2025-01-01 22:00:11.000'),
('plog_00016', 'emp_0015', '2025-01-02 06:30:00', 'Out', 'RFID Card', 'DEV-RF-001', 'Main Gate - Reliance Jamnagar', 'Synced', '2025-01-02 06:30:06.000', '2025-01-02 06:30:06.000'),

-- ---------------------------------------------------------------------------
-- Pair 9: emp_0020 — Ashok Pandit | Face Recognition | Reliance Safety Office
-- ---------------------------------------------------------------------------
('plog_00017', 'emp_0020', '2025-01-01 08:00:00', 'In', 'Face Recognition', 'DEV-FR-001', 'Safety Office - Reliance Jamnagar', 'Synced', '2025-01-01 08:00:07.000', '2025-01-01 08:00:07.000'),
('plog_00018', 'emp_0020', '2025-01-01 18:00:00', 'Out', 'Face Recognition', 'DEV-FR-001', 'Safety Office - Reliance Jamnagar', 'Synced', '2025-01-01 18:00:04.000', '2025-01-01 18:00:04.000'),

-- ---------------------------------------------------------------------------
-- Pair 10: emp_0022 — Dilip Das | Face Recognition | JSW Plant Entry
-- Punch-out failed to sync (device network error during upload)
-- ---------------------------------------------------------------------------
('plog_00019', 'emp_0022', '2025-01-01 08:00:00', 'In', 'Face Recognition', 'DEV-FR-006', 'Plant Entry - JSW Vijayanagar', 'Synced', '2025-01-01 08:00:08.000', '2025-01-01 08:00:08.000'),
('plog_00020', 'emp_0022', '2025-01-01 17:00:00', 'Out', 'Face Recognition', 'DEV-FR-006', 'Plant Entry - JSW Vijayanagar', 'Failed', '2025-01-01 17:00:03.000', '2025-01-01 17:00:03.000')
