-- ============================================================================
-- MODULE 01: DDL Base & Company Settings
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor (India)
-- Database: voltcore_erp
-- Charset : utf8mb4 / utf8mb4_unicode_ci
-- Engine  : InnoDB
-- ============================================================================
-- NOTE:
--   DROP DATABASE / CREATE DATABASE / USE statements are intentionally omitted.
--   They will be prepended by the merge script (00_ddl_base.sql) during final
--   assembly. This module contains only the CompanySettings table and its seed
--   data.
--
-- TABLE: CompanySettings
--   Stores global configuration key-value pairs for the organisation.
--   Covers statutory registrations (PAN, GST, PF, ESI, CIN), leave policies,
--   shift rosters, and corporate address — all in one centralised settings
--   store used across HRMS, Payroll, Attendance, and compliance modules.
-- ============================================================================

-- ============================================================================
-- TABLE: CompanySettings
-- ============================================================================
CREATE TABLE CompanySettings (
  id        VARCHAR(25)  NOT NULL PRIMARY KEY,
  `key`     VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique setting identifier (e.g. company_name, pan)',
  value     TEXT         NOT NULL COMMENT 'Setting value — plain text or JSON',
  label     VARCHAR(255) NOT NULL COMMENT 'Human-readable label for UI display',
  createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA: CompanySettings (11 records)
-- ============================================================================
-- Context-specific notes:
--   VoltCore Engineering Pvt Ltd is an Indian industrial plant maintenance
--   contractor operating across 6 major sites (refineries, steel plants,
--   thermal power stations, cement plants).  Employees work in three 8-hour
--   shifts to match 24/7 plant operations.  Statutory compliance includes
--   PAN, GST (Maharashtra — 27 prefix), PF (Maharashtra — MHBAN), ESI,
--   and CIN registration under the Companies Act 2013.
-- ============================================================================

-- 1. Legal company name
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0001', 'company_name', 'VoltCore Engineering Pvt Ltd', 'Company Name');

-- 2. Permanent Account Number (Income Tax Dept.)
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0002', 'pan', 'AABCV1234K', 'PAN (Permanent Account Number)');

-- 3. Goods & Services Tax — Maharashtra state code 27
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0003', 'gst', '27AABCV1234K1Z5', 'GSTIN (Goods & Services Tax Identification Number)');

-- 4. Employees'' Provident Fund — Regional Office, Mumbai (MH-BAN)
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0004', 'pf_reg', 'MHBAN0012345000', 'PF Registration Number');

-- 5. Employees'' State Insurance — Maharashtra region
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0005', 'esi_reg', '31000123456789', 'ESI Registration Number');

-- 6. Corporate Identification Number — MCA / Companies Act 2013
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0006', 'cin', 'U74999MH2020PTC345678', 'CIN (Corporate Identification Number)');

-- 7. Registered / Head Office address — Mumbai, Maharashtra
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0007', 'address', 'VoltCore Engineering Pvt Ltd, Plot No. 42, TTC MIDC, Pawane Village, Navi Mumbai, Thane, Maharashtra 400703, India', 'Registered Office Address');

-- 8. Earned Leave (EL) — 15 days/year as per Factories Act 1948
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0008', 'leave_el', '15', 'Earned Leave (EL) — days per year');

-- 9. Sick Leave (SL) — 12 days/year
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0009', 'leave_sl', '12', 'Sick Leave (SL) — days per year');

-- 10. Casual Leave (CL) — 10 days/year
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0010', 'leave_cl', '10', 'Casual Leave (CL) — days per year');

-- 11. Shift configuration — three 8-hour rotating shifts for 24/7 plant coverage
INSERT INTO CompanySettings (id, `key`, value, label) VALUES
('sett_0011', 'shift_config', '{
  "shifts": [
    {"name": "General", "code": "GS", "start": "06:00", "end": "14:00", "hours": 8, "color": "#2196F3"},
    {"name": "Second",  "code": "SS", "start": "14:00", "end": "22:00", "hours": 8, "color": "#FF9800"},
    {"name": "Night",   "code": "NS", "start": "22:00", "end": "06:00", "hours": 8, "color": "#673AB7"}
  ],
  "rotationCycle": "Weekly",
  "nightShiftAllowance": 150,
  "otThreshold": 8
}', 'Shift Configuration — 3 Shifts (General / Second / Night)');
