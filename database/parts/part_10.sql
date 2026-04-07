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
