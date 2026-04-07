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
