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
