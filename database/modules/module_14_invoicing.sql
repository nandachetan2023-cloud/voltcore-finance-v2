-- ============================================================================
-- MODULE 14: Invoicing & Payments
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor (India)
-- ============================================================================
-- Tables  : Invoice, InvoiceItem, Payment
-- Context : Manages customer invoicing with GST tax breakdown (CGST/SGST/IGST)
--           and payment tracking for plant maintenance services
-- ============================================================================

-- ============================================================================
-- TABLE: Invoice
-- Master table for all customer invoices. Supports both intra-state (CGST+SGST)
-- and inter-state (IGST) GST computation. Linked to Customer and optionally
-- to SalesOrder from the sales pipeline.
-- ============================================================================
CREATE TABLE Invoice (
    id          VARCHAR(25)    NOT NULL,
    invNo       VARCHAR(50)    NOT NULL,
    customer    VARCHAR(25)    DEFAULT NULL,
    salesOrder  VARCHAR(25)    DEFAULT NULL,
    project     VARCHAR(255)   DEFAULT NULL,
    date        DATE           NOT NULL,
    dueDate     DATE           NOT NULL,
    subtotal    DOUBLE         DEFAULT 0,
    cgst        DOUBLE         DEFAULT 0,
    sgst        DOUBLE         DEFAULT 0,
    igst        DOUBLE         DEFAULT 0,
    totalTax    DOUBLE         DEFAULT 0,
    totalAmount DOUBLE         NOT NULL,
    paymentTerms VARCHAR(100)  DEFAULT NULL,
    status      VARCHAR(50)    DEFAULT 'Draft',
    remarks     TEXT           DEFAULT NULL,
    createdAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uk_invoice_invNo (invNo),
    INDEX idx_invoice_customer (customer),
    INDEX idx_invoice_status (status),
    INDEX idx_invoice_dueDate (dueDate),

    -- FK: Customer reference (module 13)
    CONSTRAINT fk_invoice_customer
        FOREIGN KEY (customer) REFERENCES Customer(id) ON DELETE CASCADE,
    -- FK: SalesOrder reference (module 13)
    CONSTRAINT fk_invoice_salesOrder
        FOREIGN KEY (salesOrder) REFERENCES SalesOrder(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: InvoiceItem
-- Line items for each invoice. Each item tracks its own tax amount so that
-- the item-level taxes sum up to the invoice-level tax totals.
-- ============================================================================
CREATE TABLE InvoiceItem (
    id          VARCHAR(25)    NOT NULL,
    invoiceId   VARCHAR(25)    NOT NULL,
    slNo        INT            DEFAULT NULL,
    itemCode    VARCHAR(100)   DEFAULT NULL,
    itemName    VARCHAR(255)   NOT NULL,
    description TEXT           DEFAULT NULL,
    quantity    INT            NOT NULL,
    unit        VARCHAR(50)    DEFAULT NULL,
    unitPrice   DOUBLE         NOT NULL,
    taxPercent  DOUBLE         DEFAULT 18,
    taxAmount   DOUBLE         DEFAULT 0,
    amount      DOUBLE         NOT NULL,
    remarks     TEXT           DEFAULT NULL,
    createdAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    INDEX idx_invoiceItem_invoiceId (invoiceId),

    -- FK: Invoice reference (this module)
    CONSTRAINT fk_invoiceItem_invoice
        FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Payment
-- Records payments received from customers against invoices. Supports multiple
-- payment methods common in Indian B2B transactions (NEFT/RTGS/Cheque/Cash/UPI).
-- A single invoice may receive multiple partial payments.
-- ============================================================================
CREATE TABLE Payment (
    id          VARCHAR(25)    NOT NULL,
    paymentNo   VARCHAR(50)    NOT NULL,
    customer    VARCHAR(25)    DEFAULT NULL,
    invoice     VARCHAR(25)    DEFAULT NULL,
    amount      DOUBLE         NOT NULL,
    method      VARCHAR(50)    DEFAULT NULL,
    reference   VARCHAR(100)   DEFAULT NULL,
    bank        VARCHAR(100)   DEFAULT NULL,
    date        DATE           NOT NULL,
    status      VARCHAR(50)    DEFAULT 'Received',
    remarks     TEXT           DEFAULT NULL,
    createdAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_paymentNo (paymentNo),
    INDEX idx_payment_customer (customer),
    INDEX idx_payment_invoice (invoice),

    -- FK: Customer reference (module 13)
    CONSTRAINT fk_payment_customer
        FOREIGN KEY (customer) REFERENCES Customer(id) ON DELETE CASCADE,
    -- FK: Invoice reference (this module)
    CONSTRAINT fk_payment_invoice
        FOREIGN KEY (invoice) REFERENCES Invoice(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ############################################################################
-- INSERT DATA
-- ############################################################################

-- ============================================================================
-- INVOICES (10 records: INV-2025-001 to INV-2025-010)
-- ============================================================================
-- GST Logic:
--   Intra-state (same as VoltCore HQ, Maharashtra): CGST 9% + SGST 9%
--   Inter-state: IGST 18%
-- Customers in Maharashtra (intra-state): cust_004 (UltraTech), cust_006 (JSW), cust_008 (Hindalco)
-- All other customers: inter-state (IGST 18%)
-- ============================================================================
-- Status distribution: 4 Paid, 2 Partially Paid, 2 Sent, 1 Overdue, 1 Draft
-- ============================================================================

-- INV-2025-001: Reliance Jamnagar AMC — Inter-state (Gujarat), Paid
-- Subtotal: 27,00,000 | IGST 18%: 4,86,000 | Total: 31,86,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_001', 'INV-2025-001', 'cust_001', 'so_001', 'proj_001', '2024-12-15', '2025-01-14',
        2700000, 0, 0, 486000, 486000, 3186000, 'Net 30 Days', 'Paid',
        'Monthly AMC billing for Reliance Jamnagar Refinery — December 2024');

-- INV-2025-002: Tata Steel BF-3 Shutdown — Inter-state (Jharkhand), Paid
-- Subtotal: 1,50,00,000 | IGST 18%: 27,00,000 | Total: 1,77,00,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_002', 'INV-2025-002', 'cust_002', 'so_002', 'proj_002', '2024-12-20', '2025-01-19',
        15000000, 0, 0, 2700000, 2700000, 17700000, 'Net 30 Days', 'Paid',
        'Blast Furnace-3 shutdown service billing — mechanical, manpower & consumables');

-- INV-2025-003: NTPC Singrauli O&M — Inter-state (Delhi/Madhya Pradesh), Paid
-- Subtotal: 48,00,000 | IGST 18%: 8,64,000 | Total: 56,64,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_003', 'INV-2025-003', 'cust_003', 'so_003', 'proj_003', '2025-01-05', '2025-02-04',
        4800000, 0, 0, 864000, 864000, 5664000, 'Net 30 Days', 'Paid',
        'O&M monthly service charges including safety audit — January 2025');

-- INV-2025-004: UltraTech Kiln PM — Intra-state (Maharashtra), Partially Paid
-- Subtotal: 88,00,000 | CGST 9%: 7,92,000 | SGST 9%: 7,92,000 | Total: 1,03,84,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_004', 'INV-2025-004', 'cust_004', 'so_004', 'proj_004', '2025-01-10', '2025-02-09',
        8800000, 792000, 792000, 0, 1584000, 10384000, 'Net 30 Days', 'Partially Paid',
        'Kiln preventive maintenance — spare parts supply and alignment services');

-- INV-2025-005: IOCL Panipat CDU Turnaround — Inter-state (Delhi), Sent
-- Subtotal: 2,00,00,000 | IGST 18%: 36,00,000 | Total: 2,36,00,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_005', 'INV-2025-005', 'cust_005', 'so_005', 'proj_005', '2025-01-15', '2025-02-14',
        20000000, 0, 0, 3600000, 3600000, 23600000, 'Milestone Based', 'Sent',
        'CDU Turnaround planning & mobilization advance — largest invoice of the quarter');

-- INV-2025-006: JSW Hot Strip Mill AMC — Intra-state (Maharashtra), Paid
-- Subtotal: 37,00,000 | CGST 9%: 3,33,000 | SGST 9%: 3,33,000 | Total: 43,66,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_006', 'INV-2025-006', 'cust_006', 'so_006', 'proj_006', '2025-01-20', '2025-02-19',
        3700000, 333000, 333000, 0, 666000, 4366000, 'Net 30 Days', 'Paid',
        'Quarterly AMC billing for Hot Strip Mill — includes condition monitoring');

-- INV-2025-007: Adani Power Manpower Supply — Inter-state (Gujarat), Partially Paid
-- Subtotal: 18,00,000 | IGST 18%: 3,24,000 | Total: 21,24,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_007', 'INV-2025-007', 'cust_007', NULL, 'Manpower Supply — Adani Power, Ahmedabad', '2025-01-25', '2025-02-24',
        1800000, 0, 0, 324000, 324000, 2124000, 'Net 30 Days', 'Partially Paid',
        'Monthly manpower deployment billing — 50 technicians + PPE supply');

-- INV-2025-008: Reliance Jamnagar Emergency Shutdown — Inter-state (Gujarat), Sent
-- Subtotal: 73,00,000 | IGST 18%: 13,14,000 | Total: 86,14,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_008', 'INV-2025-008', 'cust_001', 'so_007', 'proj_001', '2025-02-01', '2025-03-03',
        7300000, 0, 0, 1314000, 1314000, 8614000, 'Net 30 Days', 'Sent',
        'Emergency shutdown support — crane rental and welding services for VDU unit');

-- INV-2025-009: Hindalco Material Supply — Intra-state (Maharashtra), Overdue
-- Subtotal: 16,50,000 | CGST 9%: 1,48,500 | SGST 9%: 1,48,500 | Total: 19,47,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_009', 'INV-2025-009', 'cust_008', 'so_008', 'Material Supply — Hindalco Smelter, Hirakud', '2024-12-05', '2025-01-04',
        1650000, 148500, 148500, 0, 297000, 1947000, 'Net 30 Days', 'Overdue',
        'Structural steel, welding consumables and erection support — payment overdue by 45+ days');

-- INV-2025-010: NTPC Equipment Rental — Inter-state (Delhi), Draft
-- Subtotal: 8,50,000 | IGST 18%: 1,53,000 | Total: 10,03,000
INSERT INTO Invoice (id, invNo, customer, salesOrder, project, date, dueDate, subtotal, cgst, sgst, igst, totalTax, totalAmount, paymentTerms, status, remarks)
VALUES ('inv_010', 'INV-2025-010', 'cust_003', NULL, 'Equipment Rental — NTPC Singrauli', '2025-02-10', '2025-03-12',
        850000, 0, 0, 153000, 153000, 1003000, 'Net 30 Days', 'Draft',
        'Heavy equipment rental with operators — pending internal approval before dispatch');


-- ============================================================================
-- INVOICE ITEMS (27 records across 10 invoices)
-- ============================================================================

-- ---------- INV-2025-001: Reliance Jamnagar AMC (3 items, IGST 18%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_001', 'inv_001', 1, 'AMC-RET', 'AMC Monthly Retainer',
        'Comprehensive annual maintenance contract retainer — mechanical & electrical coverage for refinery units', 1, 'Lump Sum', 2000000, 18, 360000, 2000000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_002', 'inv_001', 2, 'INS-RMN', 'Routine Inspection & Monitoring',
        'Weekly inspection rounds for rotating equipment, piping, and structural integrity monitoring', 1, 'Lump Sum', 500000, 18, 90000, 500000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_003', 'inv_001', 3, 'CAL-VC', 'Vibration Analysis & Calibration',
        'Monthly vibration analysis on critical pumps and motors, plus instrument calibration services', 1, 'Lump Sum', 200000, 18, 36000, 200000);

-- ---------- INV-2025-002: Tata Steel BF-3 Shutdown (3 items, IGST 18%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_004', 'inv_002', 1, 'SHD-SVC', 'Shutdown Service Charges — Mechanical',
        'Complete blast furnace-3 shutdown execution — hot tap, trough repair, cooling system overhaul', 1, 'Lump Sum', 10000000, 18, 1800000, 10000000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_005', 'inv_002', 2, 'MP-DEP', 'Manpower Deployment',
        'Deployment of 100 skilled technicians (fitters, welders, electricians) for 15-day shutdown period', 1, 'Lump Sum', 3500000, 18, 630000, 3500000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_006', 'inv_002', 3, 'CON-TOOL', 'Consumables & Tools Supply',
        'Welding electrodes, cutting tools, grinding discs, scaffolding material, and specialty consumables', 1, 'Lump Sum', 1500000, 18, 270000, 1500000);

-- ---------- INV-2025-003: NTPC Singrauli O&M (3 items, IGST 18%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_007', 'inv_003', 1, 'OM-MON', 'O&M Monthly Service Charges',
        'Operation and maintenance of coal handling plant, ash handling system, and auxiliary equipment', 1, 'Lump Sum', 3500000, 18, 630000, 3500000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_008', 'inv_003', 2, 'EMR-SVC', 'Emergency Repair Services',
        'On-call emergency breakdown services for boiler, turbine, and conveyor systems — January 2025', 1, 'Lump Sum', 1000000, 18, 180000, 1000000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_009', 'inv_003', 3, 'SAF-AUD', 'Safety Compliance Audit',
        'Quarterly safety audit — fire safety, confined space, electrical safety, and fall protection compliance', 1, 'Lump Sum', 300000, 18, 54000, 300000);

-- ---------- INV-2025-004: UltraTech Kiln PM (3 items, CGST+SGST 9%+9%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_010', 'inv_004', 1, 'PM-KILN', 'Preventive Maintenance Charges — Kiln',
        'Scheduled preventive maintenance of cement kiln — rotary kiln alignment, roller inspection, refractory assessment', 1, 'Lump Sum', 6000000, 18, 1080000, 6000000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_011', 'inv_004', 2, 'SP-PART', 'Spare Parts Supply',
        'Supply of kiln roller bearings, seals, gaskets, and coupling elements as per BOM', 1, 'Lump Sum', 2000000, 18, 360000, 2000000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_012', 'inv_004', 3, 'ALN-BAL', 'Alignment & Balancing Services',
        'Laser alignment of kiln drive system and dynamic balancing of ID fan rotor', 1, 'Lump Sum', 800000, 18, 144000, 800000);

-- ---------- INV-2025-005: IOCL Panipat CDU Turnaround (2 items, IGST 18%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_013', 'inv_005', 1, 'TRN-PLN', 'Turnaround Planning & Engineering',
        'Detailed turnaround planning — job cards, scaffolding plan, SPAD management, critical path scheduling for CDU', 1, 'Lump Sum', 12000000, 18, 2160000, 12000000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_014', 'inv_005', 2, 'MOB-ADV', 'Mobilization Advance',
        'Advance mobilization payment — site setup, temporary facilities, equipment transport to Panipat refinery', 1, 'Lump Sum', 8000000, 18, 1440000, 8000000);

-- ---------- INV-2025-006: JSW Hot Strip Mill AMC (3 items, CGST+SGST 9%+9%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_015', 'inv_006', 1, 'AMC-QTR', 'AMC Quarterly Billing',
        'Quarterly AMC charges for hot strip mill — rolling mill, coiler, and run-out table maintenance coverage', 1, 'Lump Sum', 2800000, 18, 504000, 2800000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_016', 'inv_006', 2, 'LUB-SUP', 'Lubricant & Grease Supply',
        'Supply of EP-2 grease, hydraulic oil ISO 68, gear oil ISO 220 for mill stand lubrication system', 1, 'Lump Sum', 700000, 18, 126000, 700000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_017', 'inv_006', 3, 'CM-REP', 'Condition Monitoring Report',
        'Monthly condition monitoring with oil analysis, thermography, and ultrasonic thickness measurement', 1, 'Lump Sum', 200000, 18, 36000, 200000);

-- ---------- INV-2025-007: Adani Power Manpower (2 items, IGST 18%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_018', 'inv_007', 1, 'MP-BILL', 'Manpower Billing',
        '50 deployed technicians — fitters, electricians, and operators for Adani Power plant maintenance crew', 1, 'Lump Sum', 1200000, 18, 216000, 1200000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_019', 'inv_007', 2, 'PPE-SUP', 'PPE & Safety Equipment Supply',
        'Supply of safety helmets, goggles, fire-retardant coveralls, safety shoes, and fall arrest harnesses', 1, 'Lump Sum', 600000, 18, 108000, 600000);

-- ---------- INV-2025-008: Reliance Emergency Shutdown (3 items, IGST 18%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_020', 'inv_008', 1, 'EMR-SHD', 'Emergency Shutdown Support',
        'Emergency shutdown support for VDU-5 unit — 48-hour turnaround with crew of 30 technicians', 1, 'Lump Sum', 5000000, 18, 900000, 5000000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_021', 'inv_008', 2, 'CRN-REN', 'Crane & Equipment Rental',
        '200T mobile crane, man-lift, and generator rental for shutdown execution period', 1, 'Lump Sum', 1500000, 18, 270000, 1500000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_022', 'inv_008', 3, 'WLD-SVC', 'Welding Services',
        'Specialized welding — GTAW, SMAW for stainless and carbon steel piping repairs and spool replacement', 1, 'Lump Sum', 800000, 18, 144000, 800000);

-- ---------- INV-2025-009: Hindalco Material Supply (3 items, CGST+SGST 9%+9%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_023', 'inv_009', 1, 'STL-SUP', 'Structural Steel Supply',
        'Supply of ISMC channels, MS plates (12mm/16mm), angles, and built-up sections for smelter modification', 1, 'Lump Sum', 850000, 18, 153000, 850000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_024', 'inv_009', 2, 'WLD-CON', 'Welding Consumables',
        'E7018 electrodes, ER70S-6 MIG wire, argon gas cylinders, and flux-cored wire supply', 1, 'Lump Sum', 350000, 18, 63000, 350000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_025', 'inv_009', 3, 'ERC-SUP', 'Erection Support Services',
        'Structural erection support — rigging, alignment, and bolting for pot room modification', 1, 'Lump Sum', 450000, 18, 81000, 450000);

-- ---------- INV-2025-010: NTPC Equipment Rental (2 items, IGST 18%) ----------
INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_026', 'inv_010', 1, 'EQP-REN', 'Heavy Equipment Rental',
        'Excavator (CAT 320D) and pedestal crane rental for coal handling plant maintenance work', 1, 'Month', 600000, 18, 108000, 600000);

INSERT INTO InvoiceItem (id, invoiceId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, taxPercent, taxAmount, amount)
VALUES ('inv_item_027', 'inv_010', 2, 'OPR-CHG', 'Equipment Operator Charges',
        'Skilled operators for excavator and crane — includes fuel and basic maintenance of hired equipment', 1, 'Month', 250000, 18, 45000, 250000);


-- ============================================================================
-- PAYMENTS (8 records: PAY-2025-001 to PAY-2025-008)
-- ============================================================================
-- Payment methods: NEFT (5), RTGS (2), Cheque (1)
-- Status: Received (4), Realized (3), Pending (1)
-- ============================================================================

-- PAY-2025-001: Full payment for INV-2025-001 (Reliance AMC)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_001', 'PAY-2025-001', 'cust_001', 'inv_001', 3186000, 'NEFT', 'NEFT-RELI-20250110-001', 'HDFC Bank', '2025-01-10', 'Received',
        'Full payment against INV-2025-001 — Reliance Jamnagar AMC December 2024');

-- PAY-2025-002: First partial payment for INV-2025-002 (Tata Steel Shutdown)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_002', 'PAY-2025-002', 'cust_002', 'inv_002', 10000000, 'RTGS', 'RTGS-TATA-20250120-7891', 'SBI Corporate Banking', '2025-01-20', 'Realized',
        'First installment — 56% of total against BF-3 shutdown invoice');

-- PAY-2025-003: Balance payment for INV-2025-002 (Tata Steel Shutdown)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_003', 'PAY-2025-003', 'cust_002', 'inv_002', 7700000, 'RTGS', 'RTGS-TATA-20250205-4523', 'SBI Corporate Banking', '2025-02-05', 'Received',
        'Balance payment — remaining 44% against BF-3 shutdown invoice');

-- PAY-2025-004: Full payment for INV-2025-003 (NTPC O&M)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_004', 'PAY-2025-004', 'cust_003', 'inv_003', 5664000, 'NEFT', 'NEFT-NTPC-20250210-0034', 'Bank of Baroda', '2025-02-10', 'Realized',
        'Full payment against INV-2025-003 — NTPC Singrauli O&M January 2025');

-- PAY-2025-005: Partial payment for INV-2025-004 (UltraTech Kiln PM)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_005', 'PAY-2025-005', 'cust_004', 'inv_004', 5000000, 'NEFT', 'NEFT-UTCH-20250215-0112', 'ICICI Bank', '2025-02-15', 'Received',
        'Partial payment — 48% of total against kiln PM invoice, balance pending PO approval');

-- PAY-2025-006: Full payment for INV-2025-006 (JSW AMC)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_006', 'PAY-2025-006', 'cust_006', 'inv_006', 4366000, 'RTGS', 'RTGS-JSW-20250220-6789', 'Axis Bank', '2025-02-20', 'Realized',
        'Full payment against INV-2025-006 — JSW Hot Strip Mill AMC Q4 billing');

-- PAY-2025-007: First partial payment for INV-2025-007 (Adani Manpower)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_007', 'PAY-2025-007', 'cust_007', 'inv_007', 1000000, 'NEFT', 'NEFT-ADANI-20250225-0567', 'Kotak Mahindra Bank', '2025-02-25', 'Received',
        'Partial payment — 47% of total, second installment expected by March 10');

-- PAY-2025-008: Partial payment (cheque) for INV-2025-009 (Hindalco — overdue)
INSERT INTO Payment (id, paymentNo, customer, invoice, amount, method, reference, bank, date, status, remarks)
VALUES ('pay_008', 'PAY-2025-008', 'cust_008', 'inv_009', 500000, 'Cheque', 'CHQ-HNDL-890234', 'Union Bank of India', '2025-01-20', 'Pending',
        'Partial payment via cheque — deposited but yet to be realized; invoice already overdue');
