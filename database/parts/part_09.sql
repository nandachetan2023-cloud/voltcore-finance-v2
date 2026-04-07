-- =============================================================================
-- Part 09: Ledger / Accounts Payable / Accounts Receivable
-- Plant Maintenance Contractor ERP
-- Only INSERT statements
-- =============================================================================

-- -----------------------------------------------------------------------------
-- LedgerAccount (12 records)
-- -----------------------------------------------------------------------------
INSERT INTO LedgerAccount (id, accountCode, name, `group`, type, balance, status, createdAt, updatedAt) VALUES
(1,  '1001', 'Cash',                    'Current Assets',      'Asset',     245000,      'Active', NOW(), NOW()),
(2,  '1002', 'SBI Current Account',     'Bank Accounts',       'Asset',     18500000,    'Active', NOW(), NOW()),
(3,  '1003', 'HDFC Savings Account',    'Bank Accounts',       'Asset',     5200000,     'Active', NOW(), NOW()),
(4,  '1101', 'Accounts Receivable',     'Current Assets',      'Asset',     124500000,   'Active', NOW(), NOW()),
(5,  '2001', 'Accounts Payable',        'Current Liabilities', 'Liability', 38500000,    'Active', NOW(), NOW()),
(6,  '4001', 'Maintenance Revenue',     'Revenue',             'Revenue',   268500000,   'Active', NOW(), NOW()),
(7,  '4002', 'Shutdown Revenue',        'Revenue',             'Revenue',   42000000,    'Active', NOW(), NOW()),
(8,  '5001', 'Employee Salaries',       'Direct Costs',        'Expense',   156000000,   'Active', NOW(), NOW()),
(9,  '5002', 'Subcontractor Payments',  'Direct Costs',        'Expense',   68000000,    'Active', NOW(), NOW()),
(10, '5003', 'Material Costs',          'Direct Costs',        'Expense',   42000000,    'Active', NOW(), NOW()),
(11, '5004', 'PPE & Safety Expenses',   'Indirect Costs',      'Expense',   8500000,     'Active', NOW(), NOW()),
(12, '6001', 'Administrative Overhead', 'Indirect Costs',      'Expense',   22000000,    'Active', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- AccountsPayable (8 records)
-- -----------------------------------------------------------------------------
INSERT INTO AccountsPayable (id, billNo, vendor, description, amount, dueDate, paidDate, status, createdAt, updatedAt) VALUES
(1, 'AP-2024-001', 'SKF India Ltd',             'Bearings supply - PO-2024-001',       85000,   '2024-12-25', NULL,        'Pending',  NOW(), NOW()),
(2, 'AP-2024-002', 'Flexitallic India',          'Gaskets for Tata Steel shutdown',    42000,   '2024-12-15', '2024-12-12','Paid',     NOW(), NOW()),
(3, 'AP-2024-003', 'L&T Valves',                'Gate valves for NTPC',               125000,  '2025-01-20', NULL,        'Pending',  NOW(), NOW()),
(4, 'AP-2024-004', 'Esab India',                 'Welding electrodes',                 38000,   '2024-12-20', '2024-12-18','Paid',     NOW(), NOW()),
(5, 'AP-2024-005', 'Shell Lubricants',           'Lubricants supply',                 55000,   '2025-01-05', NULL,        'Pending',  NOW(), NOW()),
(6, 'AP-2024-006', 'Karam Safety Equipment',     'Safety harness and PPE',             28000,   '2024-12-30', '2024-12-22','Paid',     NOW(), NOW()),
(7, 'AP-2024-007', 'Sai Scaffolding Services',   'Nov scaffolding work',              425000,  '2024-12-10', '2024-12-09','Paid',     NOW(), NOW()),
(8, 'AP-2024-008', 'TCR Engineering',            'NDT inspection charges',            185000,  '2024-12-31', NULL,        'Overdue',  NOW(), NOW());

-- -----------------------------------------------------------------------------
-- AccountsReceivable (8 records)
-- -----------------------------------------------------------------------------
INSERT INTO AccountsReceivable (id, invoiceNo, client, description, amount, dueDate, receivedDate, status, createdAt, updatedAt) VALUES
(1, 'AR-2024-001', 'Reliance Industries',  'AMC Nov billing',              7200000,  '2024-12-15', '2024-12-14','Received', NOW(), NOW()),
(2, 'AR-2024-002', 'NTPC Ltd',             'O&M Nov billing',              12500000, '2024-12-20', NULL,        'Pending',  NOW(), NOW()),
(3, 'AR-2024-003', 'Tata Steel',           'Shutdown mobilization advance',4200000,  '2024-12-10', '2024-12-08','Received', NOW(), NOW()),
(4, 'AR-2024-004', 'JSW Steel',            'AMC Nov billing',              7900000,  '2024-12-25', NULL,        'Pending',  NOW(), NOW()),
(5, 'AR-2024-005', 'UltraTech Cement',     'PM Oct billing',               2350000,  '2024-11-30', '2024-12-05','Received', NOW(), NOW()),
(6, 'AR-2024-006', 'IOCL',                 'Turnaround mobilization',     10000000, '2025-01-15', NULL,        'Pending',  NOW(), NOW()),
(7, 'AR-2024-007', 'NTPC Ltd',             'O&M Oct billing',              12500000, '2024-11-20', '2024-12-20','Received', NOW(), NOW()),
(8, 'AR-2024-008', 'Reliance Industries',  'Emergency repair billing',     850000,   '2024-12-05', NULL,        'Overdue',  NOW(), NOW());
