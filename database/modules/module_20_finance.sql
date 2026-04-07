-- ============================================================================
-- MODULE 20: Finance & Accounting
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : LedgerAccount, JournalEntry, AccountsPayable, AccountsReceivable,
--           BankAccount, BankTransaction, TaxRecord, BudgetItem
-- ============================================================================

-- ============================================================================
-- TABLE: LedgerAccount
-- Standard Indian chart of accounts for industrial maintenance contractor
-- Groups: Assets (1xxx), Liabilities (2xxx), Income (3xxx), Expense (4xxx)
-- ============================================================================
CREATE TABLE LedgerAccount (
    id VARCHAR(25) NOT NULL,
    accountCode VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    `group` VARCHAR(100) DEFAULT NULL,
    type VARCHAR(50) DEFAULT NULL,
    parentAccount VARCHAR(50) DEFAULT NULL,
    balance DOUBLE DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_ledger_account_code (accountCode),
    INDEX idx_ledger_account_code (accountCode),
    INDEX idx_ledger_group (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: JournalEntry
-- Double-entry bookkeeping: each financial transaction recorded as debit/credit pair
-- Voucher types: Payment (money out), Receipt (money in), Journal (adjustments), Contra (internal transfers)
-- ============================================================================
CREATE TABLE JournalEntry (
    id VARCHAR(25) NOT NULL,
    entryNo VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    account VARCHAR(50) NOT NULL,
    accountName VARCHAR(255) DEFAULT NULL,
    debit DOUBLE DEFAULT 0,
    credit DOUBLE DEFAULT 0,
    description TEXT,
    reference VARCHAR(255) DEFAULT NULL,
    voucherType VARCHAR(50) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Posted',
    createdBy VARCHAR(255) DEFAULT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_je_entry_no (entryNo),
    INDEX idx_je_entry_no (entryNo),
    INDEX idx_je_date (date),
    INDEX idx_je_account (account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: AccountsPayable
-- Vendor bills and purchase invoices awaiting payment
-- Tracked for timely settlement and cash flow planning
-- ============================================================================
CREATE TABLE AccountsPayable (
    id VARCHAR(25) NOT NULL,
    billNo VARCHAR(50) NOT NULL,
    vendor VARCHAR(255) NOT NULL,
    vendorCode VARCHAR(50) DEFAULT NULL,
    invoiceRef VARCHAR(100) DEFAULT NULL,
    description TEXT,
    amount DOUBLE NOT NULL,
    tax DOUBLE DEFAULT 0,
    totalAmount DOUBLE DEFAULT 0,
    dueDate DATE NOT NULL,
    paidDate DATE DEFAULT NULL,
    paymentMethod VARCHAR(50) DEFAULT NULL,
    paymentRef VARCHAR(100) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_ap_bill_no (billNo),
    INDEX idx_ap_bill_no (billNo),
    INDEX idx_ap_vendor (vendor),
    INDEX idx_ap_status (status),
    INDEX idx_ap_due_date (dueDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: AccountsReceivable
-- Customer invoices for AMC contracts, shutdown jobs, and O&M services
-- Critical for tracking revenue collection from industrial clients
-- ============================================================================
CREATE TABLE AccountsReceivable (
    id VARCHAR(25) NOT NULL,
    invoiceNo VARCHAR(50) NOT NULL,
    client VARCHAR(255) NOT NULL,
    clientCode VARCHAR(50) DEFAULT NULL,
    invoiceRef VARCHAR(100) DEFAULT NULL,
    description TEXT,
    amount DOUBLE NOT NULL,
    tax DOUBLE DEFAULT 0,
    totalAmount DOUBLE DEFAULT 0,
    dueDate DATE NOT NULL,
    receivedDate DATE DEFAULT NULL,
    paymentMethod VARCHAR(50) DEFAULT NULL,
    paymentRef VARCHAR(100) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_ar_invoice_no (invoiceNo),
    INDEX idx_ar_invoice_no (invoiceNo),
    INDEX idx_ar_client (client),
    INDEX idx_ar_status (status),
    INDEX idx_ar_due_date (dueDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: BankAccount
-- Company bank accounts for operations — primary SBI account for payroll & vendor payments
-- HDFC for project-specific collections, SBI Savings for reserves
-- ============================================================================
CREATE TABLE BankAccount (
    id VARCHAR(25) NOT NULL,
    accountName VARCHAR(255) NOT NULL,
    bankName VARCHAR(255) NOT NULL,
    branch VARCHAR(255) DEFAULT NULL,
    accountNo VARCHAR(50) NOT NULL,
    ifsc VARCHAR(20) DEFAULT NULL,
    type VARCHAR(50) DEFAULT 'Current',
    balance DOUBLE DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'Active',
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_bank_account_no (accountNo),
    INDEX idx_bank_account_no (accountNo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: BankTransaction
-- All bank passbook entries — salary disbursements, vendor payments, customer receipts
-- Reconciliation flag for matching with ledger entries during month-end closing
-- ============================================================================
CREATE TABLE BankTransaction (
    id VARCHAR(25) NOT NULL,
    bankAccountId VARCHAR(25) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(20) DEFAULT NULL,
    amount DOUBLE NOT NULL,
    balance DOUBLE DEFAULT 0,
    reference VARCHAR(255) DEFAULT NULL,
    party VARCHAR(255) DEFAULT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Completed',
    reconciled BOOLEAN DEFAULT FALSE,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_bt_bank_account_id (bankAccountId),
    INDEX idx_bt_date (date),
    INDEX idx_bt_type (type),
    CONSTRAINT fk_bank_txn_account FOREIGN KEY (bankAccountId) REFERENCES BankAccount(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: TaxRecord
-- Statutory compliance — GST, TDS, PF, ESI, Professional Tax, Advance Tax
-- Tracked per period for timely filing and penalty avoidance
-- ============================================================================
CREATE TABLE TaxRecord (
    id VARCHAR(25) NOT NULL,
    taxType VARCHAR(50) NOT NULL,
    period VARCHAR(50) NOT NULL,
    amount DOUBLE NOT NULL,
    dueDate DATE NOT NULL,
    paidDate DATE DEFAULT NULL,
    paymentRef VARCHAR(100) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_tr_tax_type (taxType),
    INDEX idx_tr_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: BudgetItem
-- Annual departmental budget tracking — planned vs actual with variance analysis
-- Used by management for cost control across manpower, materials, subcontractors
-- ============================================================================
CREATE TABLE BudgetItem (
    id VARCHAR(25) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    planned DOUBLE NOT NULL,
    actual DOUBLE DEFAULT 0,
    variance DOUBLE DEFAULT 0,
    period VARCHAR(50) NOT NULL,
    month VARCHAR(20) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'On Track',
    remarks TEXT,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_bi_category (category),
    INDEX idx_bi_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT DATA: LedgerAccount
-- Standard Indian chart of accounts for industrial maintenance contractor
-- Asset accounts carry debit balances, liability/income accounts carry credit balances
-- ============================================================================
INSERT INTO LedgerAccount (id, accountCode, name, `group`, type, parentAccount, balance, status) VALUES
('la_001', '1001', 'Cash', 'Assets', 'Debit', '1000', 250000.00, 'Active'),
('la_002', '1002', 'Bank - SBI Current', 'Assets', 'Debit', '1000', 18500000.00, 'Active'),
('la_003', '1003', 'Bank - HDFC Current', 'Assets', 'Debit', '1000', 5200000.00, 'Active'),
('la_004', '1004', 'Accounts Receivable', 'Assets', 'Debit', '1000', 32000000.00, 'Active'),
('la_005', '1005', 'Inventory', 'Assets', 'Debit', '1000', 8500000.00, 'Active'),
('la_006', '2001', 'Accounts Payable', 'Liabilities', 'Credit', '2000', 12000000.00, 'Active'),
('la_007', '2002', 'PF Payable', 'Liabilities', 'Credit', '2000', 480000.00, 'Active'),
('la_008', '2003', 'ESI Payable', 'Liabilities', 'Credit', '2000', 210000.00, 'Active'),
('la_009', '2004', 'GST Payable', 'Liabilities', 'Credit', '2000', 750000.00, 'Active'),
('la_010', '2005', 'TDS Payable', 'Liabilities', 'Credit', '2000', 320000.00, 'Active'),
('la_011', '3001', 'Sales Revenue', 'Income', 'Credit', '3000', 45000000.00, 'Active'),
('la_012', '3002', 'Service Income', 'Income', 'Credit', '3000', 18000000.00, 'Active'),
('la_013', '4001', 'Salaries', 'Expense', 'Debit', '4000', 12000000.00, 'Active'),
('la_014', '4002', 'Materials', 'Expense', 'Debit', '4000', 8500000.00, 'Active'),
('la_015', '4003', 'Subcontractor', 'Expense', 'Debit', '4000', 6200000.00, 'Active'),
('la_016', '4004', 'Travel', 'Expense', 'Debit', '4000', 1800000.00, 'Active'),
('la_017', '4005', 'Admin', 'Expense', 'Debit', '4000', 2100000.00, 'Active'),
('la_018', '4006', 'Depreciation', 'Expense', 'Debit', '4000', 950000.00, 'Active');

-- ============================================================================
-- INSERT DATA: JournalEntry
-- 20 entries forming 10 balanced double-entry transactions
-- Each pair (debit + credit) must sum to zero for the accounting equation
-- Voucher types: Payment, Receipt, Journal, Contra
-- ============================================================================
INSERT INTO JournalEntry (id, entryNo, date, account, accountName, debit, credit, description, reference, voucherType, status, createdBy) VALUES
-- JE-1: Salary payment for Jan 2025 (Payment voucher)
('je_001', 'JE-2025-0001', '2025-01-31', '4001', 'Salaries', 1850000.00, 0.00, 'Staff salaries for January 2025 — 25 employees including site supervisors and engineers', 'PAY-JAN-001', 'Payment', 'Posted', 'VC-024'),
('je_002', 'JE-2025-0001', '2025-01-31', '1002', 'Bank - SBI Current', 0.00, 1850000.00, 'Salary disbursed via NEFT from SBI current account', 'PAY-JAN-001', 'Payment', 'Posted', 'VC-024'),

-- JE-2: Vendor payment to Bharat Engineering Supplies (Payment voucher)
('je_003', 'JE-2025-0002', '2025-01-15', '2001', 'Accounts Payable', 500000.00, 0.00, 'Payment against bill BP-2025-001 for bearings and seals supplied to Jamnagar site', 'NEFT-50000123', 'Payment', 'Posted', 'VC-012'),
('je_004', 'JE-2025-0002', '2025-01-15', '1002', 'Bank - SBI Current', 0.00, 500000.00, 'NEFT transfer to Bharat Engineering Supplies — Mumbai', 'NEFT-50000123', 'Payment', 'Posted', 'VC-012'),

-- JE-3: AMC revenue from Reliance Industries (Receipt voucher)
('je_005', 'JE-2025-0003', '2025-01-10', '1002', 'Bank - SBI Current', 7500000.00, 0.00, 'Q1 FY25 AMC retainer received from Reliance Industries Ltd — Jamnagar Refinery maintenance contract', 'NEFT-RIL-7890', 'Receipt', 'Posted', 'VC-024'),
('je_006', 'JE-2025-0003', '2025-01-10', '3001', 'Sales Revenue', 0.00, 7500000.00, 'AMC contract revenue — Reliance Jamnagar Refinery quarterly billing', 'INV-2025-001', 'Receipt', 'Posted', 'VC-024'),

-- JE-4: Material purchase from SKF India (Journal voucher)
('je_007', 'JE-2025-0004', '2025-01-20', '4002', 'Materials', 850000.00, 0.00, 'SKF spherical roller bearings and plummer blocks procured for Tata Steel BF-3 shutdown', 'PO-2025-003', 'Journal', 'Posted', 'VC-012'),
('je_008', 'JE-2025-0004', '2025-01-20', '2001', 'Accounts Payable', 0.00, 850000.00, 'Creditor entry for SKF India Ltd — Pune supply of bearings', 'PO-2025-003', 'Journal', 'Posted', 'VC-012'),

-- JE-5: Service income from NTPC Singrauli O&M (Receipt voucher)
('je_009', 'JE-2025-0005', '2025-01-05', '1003', 'Bank - HDFC Current', 5000000.00, 0.00, 'Monthly O&M service fee received — NTPC Singrauli Super Thermal Power Station', 'RTGS-NTPC-4567', 'Receipt', 'Posted', 'VC-024'),
('je_010', 'JE-2025-0005', '2025-01-05', '3002', 'Service Income', 0.00, 5000000.00, 'O&M monthly billing — NTPC Singrauli boiler and turbine maintenance services', 'INV-2025-003', 'Receipt', 'Posted', 'VC-024'),

-- JE-6: GST payment to government (Payment voucher)
('je_011', 'JE-2025-0006', '2025-01-20', '2004', 'GST Payable', 450000.00, 0.00, 'GST liability settled for Dec 2024 — CGST and SGST via DRC-03', 'GST-DEC24-001', 'Payment', 'Posted', 'VC-012'),
('je_012', 'JE-2025-0006', '2025-01-20', '1002', 'Bank - SBI Current', 0.00, 450000.00, 'GST remittance from SBI current account — net tax liability after input credit', 'GST-DEC24-001', 'Payment', 'Posted', 'VC-012'),

-- JE-7: Subcontractor payment — welding crew for IOCL Panipat (Payment voucher)
('je_013', 'JE-2025-0007', '2025-01-25', '4003', 'Subcontractor', 2500000.00, 0.00, 'Subcontractor billing — M/s Weld Tech Solutions for CDU turnaround welding manpower at IOCL Panipat', 'PO-2025-007', 'Payment', 'Posted', 'VC-024'),
('je_014', 'JE-2025-0007', '2025-01-25', '1002', 'Bank - SBI Current', 0.00, 2500000.00, 'RTGS payment to Weld Tech Solutions — IOCL Panipat shutdown advance', 'RTGS-WTS-8901', 'Payment', 'Posted', 'VC-024'),

-- JE-8: Bank transfer from SBI to HDFC for project expenses (Contra voucher)
('je_015', 'JE-2025-0008', '2025-01-12', '1003', 'Bank - HDFC Current', 2000000.00, 0.00, 'Internal fund transfer from SBI to HDFC for NTPC Singrauli project operations', 'TRF-2025-001', 'Contra', 'Posted', 'VC-024'),
('je_016', 'JE-2025-0008', '2025-01-12', '1002', 'Bank - SBI Current', 0.00, 2000000.00, 'NEFT transfer from SBI main account to HDFC project account', 'NEFT-HDFC-2345', 'Contra', 'Posted', 'VC-024'),

-- JE-9: Siemens equipment purchase for UltraTech Kiln PM (Journal voucher)
('je_017', 'JE-2025-0009', '2025-01-22', '4002', 'Materials', 1500000.00, 0.00, 'VFD drives and PLC panels procured from Siemens India for UltraTech Cement kiln preventive maintenance', 'PO-2025-005', 'Journal', 'Posted', 'VC-013'),
('je_018', 'JE-2025-0009', '2025-01-22', '2001', 'Accounts Payable', 0.00, 1500000.00, 'Creditor entry for Siemens India — motor control centre and automation equipment', 'PO-2025-005', 'Journal', 'Posted', 'VC-013'),

-- JE-10: TDS deposit for Dec 2024 deductions (Payment voucher)
('je_019', 'JE-2025-0010', '2025-01-07', '2005', 'TDS Payable', 185000.00, 0.00, 'TDS deposited for Dec 2024 — Section 194C (contractor) and 194J (professional fees)', 'CHALLAN-281-D15', 'Payment', 'Posted', 'VC-024'),
('je_020', 'JE-2025-0010', '2025-01-07', '1002', 'Bank - SBI Current', 0.00, 185000.00, 'TDS remitted via online challan on NSDL-TIN portal', 'CHALLAN-281-D15', 'Payment', 'Posted', 'VC-024');

-- ============================================================================
-- INSERT DATA: AccountsPayable
-- Vendor bills from VoltCore's approved vendor list (ref: Section 2.6)
-- Amounts range from ₹50,000 to ₹25,00,000 as per industrial supply norms
-- ============================================================================
INSERT INTO AccountsPayable (id, billNo, vendor, vendorCode, invoiceRef, description, amount, tax, totalAmount, dueDate, paidDate, paymentMethod, paymentRef, status, remarks) VALUES
('ap_001', 'BP-2025-001', 'Bharat Engineering Supplies', 'VND-001', 'BES-INV-4821', 'Supply of SKF 22220 spherical roller bearings, mechanical seals, and gasket sets for Jamnagar site store replenishment', 424000.00, 76320.00, 500320.00, '2025-02-15', '2025-01-15', 'NEFT', 'NEFT-50000123', 'Paid', 'Urgent replenishment for shutdown spares inventory'),

('ap_002', 'BP-2025-002', 'SKF India Ltd', 'VND-002', 'SKF-INV-90145', 'Plummer block housings SNL 520, CARB toroidal bearings, and lubrication units for Tata Steel BF-3 shutdown job', 719491.00, 129509.00, 849000.00, '2025-02-28', NULL, NULL, NULL, 'Pending', 'PO-2025-003 linked — delivery expected by Feb 10'),

('ap_003', 'BP-2025-003', 'Siemens India', 'VND-003', 'SIEM-INV-77230', 'VFD drives (15 kW and 22 kW), PLC S7-1200 panels, and HMI panels for UltraTech Cement kiln drive modernisation', 1271186.00, 228814.00, 1500000.00, '2025-03-15', NULL, NULL, NULL, 'Pending', 'Critical path item for Kiln PM — advance payment done'),

('ap_004', 'BP-2025-004', 'ABB India Ltd', 'VND-004', 'ABB-INV-55012', 'Low voltage switchgear panels, ACB 630A, and power distribution boards for NTPC Singrauli TG hall electrical upgrade', 1694915.00, 305085.00, 2000000.00, '2025-03-31', NULL, NULL, NULL, 'Pending', 'Long delivery item — 8 weeks lead time from Bengaluru factory'),

('ap_005', 'BP-2025-005', 'Indian Oil Petrochemicals', 'VND-005', 'IOP-INV-33089', 'Industrial lubricants — HYDRAULIC oil 68, GREASE MP-3, and transformer oil for Jamshedpur and Jamnagar sites', 212000.00, 38160.00, 250160.00, '2025-02-10', '2025-01-20', 'NEFT', 'NEFT-IOP-6789', 'Paid', 'Monthly lubricant supply contract'),

('ap_006', 'BP-2025-006', 'Timken India', 'VND-006', 'TIMKEN-INV-22100', 'Tapered roller bearings and adapter sleeves for JSW Steel Hot Strip Mill stand roll maintenance', 550000.00, 99000.00, 649000.00, '2025-03-10', NULL, NULL, NULL, 'Pending', 'JSW Vijayanagar AMC monthly supply'),

('ap_007', 'BP-2025-007', 'Godrej & Boyce', 'VND-007', 'G&B-INV-44521', 'Safety equipment — harnesses, helmets, gas detectors, fire extinguishers, and fall arrest systems for all 6 sites', 850000.00, 153000.00, 1003000.00, '2025-02-20', NULL, NULL, NULL, 'Partially Paid', 'HSE department annual procurement — partial advance released'),

('ap_008', 'BP-2025-008', 'L&T Valves', 'VND-008', 'LTV-INV-88034', 'Gate valves, globe valves, and check valves (CS & SS) for IOCL Panipat CDU turnaround valve replacement scope', 2118644.00, 381356.00, 2500000.00, '2025-04-15', NULL, NULL, NULL, 'Pending', 'Large order for Panipat turnaround — LC being arranged'),

('ap_009', 'BP-2025-009', 'Bharat Engineering Supplies', 'VND-001', 'BES-INV-4855', 'Welding electrodes (E7018, E6013), grinding discs, and cutting nozzles for IOCL Panipat and NTPC Singrauli shutdown preparation', 350000.00, 63000.00, 413000.00, '2025-02-25', NULL, NULL, NULL, 'Pending', 'Consumables stock for upcoming shutdowns'),

('ap_010', 'BP-2025-010', 'SKF India Ltd', 'VND-002', 'SKF-INV-90210', 'Condition monitoring sensors, alignment tools, and predictive maintenance kits for all AMC sites', 600000.00, 108000.00, 708000.00, '2025-03-20', NULL, NULL, NULL, 'Overdue', 'PO raised in Nov 2024 — delivery delayed, follow-up required');

-- ============================================================================
-- INSERT DATA: AccountsReceivable
-- Customer invoices for AMC, shutdown, and O&M services
-- Amounts range from ₹5,00,000 to ₹2,00,00,000 reflecting industrial project scale
-- ============================================================================
INSERT INTO AccountsReceivable (id, invoiceNo, client, clientCode, invoiceRef, description, amount, tax, totalAmount, dueDate, receivedDate, paymentMethod, paymentRef, status, remarks) VALUES
('ar_001', 'AR-INV-2025-001', 'Reliance Industries Ltd', 'CUST-001', 'RI-PO-AMC-Q1', 'Q1 FY25 AMC retainer — monthly maintenance of rotating equipment and structural checks at Jamnagar Refinery', 6355932.00, 1144068.00, 7500000.00, '2025-02-10', '2025-01-10', 'NEFT', 'NEFT-RIL-7890', 'Received', 'Quarterly AMC billing — paid on time per contract terms'),

('ar_002', 'AR-INV-2025-002', 'Tata Steel Ltd', 'CUST-002', 'TS-PO-SHD-BF3', 'BF-3 Shutdown mobilisation advance and first milestone billing — mechanical and electrical work at Jamshedpur plant', 8474576.00, 1525424.00, 10000000.00, '2025-03-15', NULL, NULL, NULL, 'Pending', 'Shutdown in progress — milestone 1 achieved, invoice raised'),

('ar_003', 'AR-INV-2025-003', 'NTPC Ltd', 'CUST-003', 'NTPC-PO-OM-JAN', 'January 2025 O&M monthly billing — boiler maintenance, turbine overhaul support, and coal handling plant maintenance at Singrauli', 4237288.00, 762712.00, 5000000.00, '2025-02-28', '2025-01-05', 'RTGS', 'RTGS-NTPC-4567', 'Received', 'O&M monthly invoice — received early as advance payment arrangement'),

('ar_004', 'AR-INV-2025-004', 'UltraTech Cement Ltd', 'CUST-004', 'UT-PO-KILN-PM', 'Kiln preventive maintenance — drive system inspection, refractory condition assessment, and roller alignment at Tadipatri plant', 3389831.00, 610169.00, 4000000.00, '2025-03-10', NULL, NULL, NULL, 'Pending', 'Annual PM contract — first visit completed, invoicing raised'),

('ar_005', 'AR-INV-2025-005', 'Indian Oil Corporation Ltd', 'CUST-005', 'IOCL-PO-CDU-TA', 'CDU Turnaround planning and engineering services — scope finalisation, P&ID review, and material take-off for Panipat Refinery', 16949153.00, 3050847.00, 20000000.00, '2025-04-30', NULL, NULL, NULL, 'Pending', 'Large turnaround project — mobilisation phase, 20% advance invoiced'),

('ar_006', 'AR-INV-2025-006', 'JSW Steel Ltd', 'CUST-006', 'JSW-PO-HSM-AMC', 'Hot Strip Mill AMC monthly retainer — roll stand maintenance, coolant system upkeep, and electrical panel maintenance at Vijayanagar', 2118644.00, 381356.00, 2500000.00, '2025-02-15', NULL, NULL, NULL, 'Overdue', 'December 2024 billing — payment delayed, escalation sent'),

('ar_007', 'AR-INV-2025-007', 'Adani Power Ltd', 'CUST-007', 'APL-PO-BTN-AMC', 'Boiler turbine maintenance AMC — monthly inspection and minor repair services at Ahmedabad power plant', 1694915.00, 305085.00, 2000000.00, '2025-03-05', NULL, NULL, NULL, 'Pending', 'New AMC contract signed Dec 2024 — first billing cycle'),

('ar_008', 'AR-INV-2025-008', 'Hindalco Industries', 'CUST-008', 'HND-PO-SMTR-001', 'Smelter maintenance services — pot room crane inspection, anode handling equipment maintenance at Hirakud smelter', 4237288.00, 762712.00, 5000000.00, '2025-02-20', '2025-02-18', 'NEFT', 'NEFT-HNDL-3344', 'Received', 'One-time maintenance job — completed and invoiced, payment received'),

('ar_009', 'AR-INV-2025-009', 'Reliance Industries Ltd', 'CUST-001', 'RI-PO-SAF-AUD', 'Safety audit and HSE compliance review — comprehensive safety audit across 3 units at Jamnagar Refinery', 1271186.00, 228814.00, 1500000.00, '2025-02-25', NULL, NULL, NULL, 'Partially Received', 'Specialized HSE audit — 50% advance received, balance post report submission'),

('ar_010', 'AR-INV-2025-010', 'NTPC Ltd', 'CUST-003', 'NTPC-PO-TRN-OVH', 'Turbine overhaul additional scope — HP turbine casing repair and governor system calibration at Singrauli Unit-5', 8474576.00, 1525424.00, 10000000.00, '2025-04-15', NULL, NULL, NULL, 'Pending', 'Additional scope during annual overhaul — change order approved by NTPC');

-- ============================================================================
-- INSERT DATA: BankAccount
-- Operational bank accounts for VoltCore Engineering Pvt Ltd
-- SBI Current is the primary account for all major transactions
-- ============================================================================
INSERT INTO BankAccount (id, accountName, bankName, branch, accountNo, ifsc, type, balance, currency, status) VALUES
('ba_001', 'VoltCore SBI Current Account', 'State Bank of India', 'Fort Branch, Mumbai', '33210567890', 'SBIN0000300', 'Current', 18500000.00, 'INR', 'Active'),
('ba_002', 'VoltCore HDFC Current Account', 'HDFC Bank Ltd', 'BKC Branch, Mumbai', '50100123456789', 'HDFC0000123', 'Current', 5200000.00, 'INR', 'Active'),
('ba_003', 'VoltCore SBI Savings Account', 'State Bank of India', 'Fort Branch, Mumbai', '33210987654', 'SBIN0000300', 'Savings', 2500000.00, 'INR', 'Active');

-- ============================================================================
-- INSERT DATA: BankTransaction
-- 15 transactions across bank accounts — salary credits, vendor debits,
-- customer receipts, tax payments, and internal transfers
-- ============================================================================
INSERT INTO BankTransaction (id, bankAccountId, date, type, amount, balance, reference, party, description, category, status, reconciled) VALUES
-- SBI Current Account transactions
('bt_001', 'ba_001', '2025-01-05', 'Credit', 7500000.00, 24500000.00, 'NEFT-RIL-7890', 'Reliance Industries Ltd', 'AMC Q1 FY25 retainer received from Reliance Industries Ltd', 'Sales', 'Completed', TRUE),
('bt_002', 'ba_001', '2025-01-07', 'Debit', 185000.00, 24315000.00, 'CHALLAN-281-D15', 'Income Tax Department', 'TDS deposit for Dec 2024 — contractor and professional fees', 'Tax', 'Completed', TRUE),
('bt_003', 'ba_001', '2025-01-10', 'Debit', 450000.00, 23865000.00, 'GST-DEC24-001', 'GST Portal', 'GST remittance for Dec 2024 — net liability after ITC', 'Tax', 'Completed', TRUE),
('bt_004', 'ba_001', '2025-01-12', 'Debit', 2000000.00, 21865000.00, 'NEFT-HDFC-2345', 'VoltCore HDFC Account', 'Internal fund transfer to HDFC for NTPC Singrauli project operations', 'Transfer', 'Completed', TRUE),
('bt_005', 'ba_001', '2025-01-15', 'Debit', 500000.00, 21365000.00, 'NEFT-50000123', 'Bharat Engineering Supplies', 'Payment against bill BP-2025-001 — bearings and seals', 'Purchase', 'Completed', TRUE),
('bt_006', 'ba_001', '2025-01-20', 'Debit', 250160.00, 21114840.00, 'NEFT-IOP-6789', 'Indian Oil Petrochemicals', 'Monthly lubricant supply payment — hydraulic oil and grease', 'Purchase', 'Completed', FALSE),
('bt_007', 'ba_001', '2025-01-25', 'Debit', 2500000.00, 18614840.00, 'RTGS-WTS-8901', 'Weld Tech Solutions', 'Subcontractor payment — IOCL Panipat CDU turnaround welding manpower', 'Purchase', 'Completed', FALSE),
('bt_008', 'ba_001', '2025-01-31', 'Debit', 1850000.00, 16764840.00, 'PAY-JAN-001', 'Staff Salaries', 'January 2025 salary disbursal — 25 employees via NEFT', 'Salary', 'Completed', FALSE),

-- HDFC Current Account transactions
('bt_009', 'ba_002', '2025-01-05', 'Credit', 5000000.00, 9500000.00, 'RTGS-NTPC-4567', 'NTPC Ltd', 'January 2025 O&M monthly billing — NTPC Singrauli', 'Sales', 'Completed', TRUE),
('bt_010', 'ba_002', '2025-01-12', 'Credit', 2000000.00, 11500000.00, 'NEFT-HDFC-2345', 'VoltCore SBI Account', 'Internal fund transfer received from SBI main account', 'Transfer', 'Completed', TRUE),
('bt_011', 'ba_002', '2025-01-15', 'Debit', 750000.00, 10750000.00, 'RTGS-G&B-5566', 'Godrej & Boyce', 'Partial advance payment for safety equipment — all sites', 'Purchase', 'Completed', FALSE),
('bt_012', 'ba_002', '2025-01-18', 'Credit', 2000000.00, 12750000.00, 'NEFT-HNDL-3344', 'Hindalco Industries', 'Payment received for smelter maintenance services at Hirakud', 'Sales', 'Completed', TRUE),
('bt_013', 'ba_002', '2025-01-22', 'Debit', 180000.00, 12570000.00, 'NEFT-TRVL-7890', 'MakeMyTrip Corporate', 'Flight and hotel bookings — site visit to Jamshedpur and Panipat', 'Travel', 'Completed', FALSE),

-- SBI Savings Account transactions
('bt_014', 'ba_003', '2025-01-15', 'Credit', 500000.00, 3000000.00, 'TRF-RES-001', 'VoltCore SBI Current', 'Quarterly reserve fund transfer from current account', 'Transfer', 'Completed', TRUE),
('bt_015', 'ba_003', '2025-01-25', 'Credit', 750000.00, 3750000.00, 'NEFT-RI-ADV-002', 'Reliance Industries Ltd', 'Safety audit 50% advance received — Jamnagar Refinery', 'Sales', 'Completed', TRUE);

-- ============================================================================
-- INSERT DATA: TaxRecord
-- Statutory tax compliance for Jan 2025 and prior periods
-- GST (monthly), TDS (monthly), PF (monthly), ESI (half-yearly),
-- Professional Tax (monthly), Advance Tax (quarterly)
-- ============================================================================
INSERT INTO TaxRecord (id, taxType, period, amount, dueDate, paidDate, paymentRef, status, remarks) VALUES
('tx_001', 'GST', 'Jan 2025', 520000.00, '2025-02-20', NULL, NULL, 'Pending', 'Jan 2025 GST liability — GSTR-3B to be filed by Feb 20, includes output GST less input credit'),
('tx_002', 'TDS', 'Jan 2025', 195000.00, '2025-02-07', NULL, NULL, 'Pending', 'Jan 2025 TDS deductions — Sec 194C contractor payments and Sec 194J professional fees, challan due by Feb 7'),
('tx_003', 'PF', 'Jan 2025', 480000.00, '2025-02-15', NULL, NULL, 'Pending', 'EPF contribution for 25 employees — 12% employer + 12% employee, remittance via TRRN'),
('tx_004', 'ESI', 'H2-2024', 210000.00, '2025-01-12', '2025-01-10', 'ESI-CHLN-H22024', 'Filed', 'ESI half-yearly return for Jul-Dec 2024 filed, contribution deposited for employees below ₹21,000 gross'),
('tx_005', 'Professional Tax', 'Jan 2025', 2500.00, '2025-02-28', NULL, NULL, 'Pending', 'Maharashtra Professional Tax — employer deduction and remittance for eligible staff at Mumbai HQ'),
('tx_006', 'Advance Tax', 'Q3 FY25', 1250000.00, '2025-12-15', '2024-12-13', 'ADV-TAX-Q3-CHLN', 'Filed', 'Advance tax instalment 3 (Nov 15 due) — 75% of estimated annual tax liability for FY 2024-25, paid via challan 280');

-- ============================================================================
-- INSERT DATA: BudgetItem
-- FY 2024-25 departmental budget — tracked monthly for cost control
-- Manpower is the largest category for a labour-intensive maintenance contractor
-- ============================================================================
INSERT INTO BudgetItem (id, category, description, planned, actual, variance, period, month, status, remarks) VALUES
('bi_001', 'Manpower', 'Staff salaries, wages, overtime, and site allowances for 25 employees across 6 sites', 15000000.00, 13200000.00, 1800000.00, 'FY 2024-25', 'Jan 2025', 'On Track', 'Under budget due to 2 positions yet to be filled — Welder and Electrician for Panipat'),

('bi_002', 'Materials', 'Maintenance spares — bearings, seals, valves, belts, lubricants, consumables for all project sites', 10000000.00, 9350000.00, 650000.00, 'FY 2024-25', 'Jan 2025', 'On Track', 'Spending within limits; major SKF and Siemens orders in pipeline for Q4'),

('bi_003', 'Subcontractors', 'Welding, scaffolding, NDT, and civil subcontractor bills for shutdown and AMC work', 8000000.00, 7100000.00, 900000.00, 'FY 2024-25', 'Jan 2025', 'On Track', 'IOCL Panipat turnaround subcontractor costs expected to spike in Feb-Mar'),

('bi_004', 'Equipment', 'Power tools, heavy equipment hire, calibration, and asset maintenance costs', 2000000.00, 2150000.00, -150000.00, 'FY 2024-25', 'Jan 2025', 'Over Budget', 'Exceeded due to emergency hire of 25T crane at Jamshedpur and new VFD at UltraTech'),

('bi_005', 'Travel', 'Flights, train, hotel, and local transport for site visits, client meetings, and audit travel', 2500000.00, 1920000.00, 580000.00, 'FY 2024-25', 'Jan 2025', 'On Track', 'Travel curtailed via virtual meetings; major travel expected for Panipat mobilisation'),

('bi_006', 'Training', 'Safety certifications, technical skill training, and vendor-specific equipment training programs', 1000000.00, 450000.00, 550000.00, 'FY 2024-25', 'Jan 2025', 'Under Budget', 'Confined space and working at height training planned for Feb batch of 15 technicians'),

('bi_007', 'Safety', 'PPE, gas detectors, fire safety equipment, safety audits, and HSE compliance costs', 1500000.00, 1380000.00, 120000.00, 'FY 2024-25', 'Jan 2025', 'On Track', 'Annual safety equipment procurement from Godrej & Boyce in progress'),

('bi_008', 'Admin Overhead', 'Office rent, utilities, IT infrastructure, insurance, legal, and misc administrative costs', 3000000.00, 2650000.00, 350000.00, 'FY 2024-25', 'Jan 2025', 'On Track', 'Includes ₹8L annual insurance renewal in March; ERP software subscription renewed in Jan')