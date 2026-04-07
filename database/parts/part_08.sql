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
