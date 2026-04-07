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
