-- ============================================================================
-- MODULE 13: Sales — Quotations & Orders
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : Customer, Quotation, QuotationItem, SalesOrder, SalesOrderItem
-- Context : Manages customer master, sales quotations for industrial services
--           (AMC, shutdown, preventive maintenance, O&M, manpower supply),
--           and sales order lifecycle from confirmation to delivery.
-- ============================================================================

-- ============================================================================
-- TABLE: Customer
-- ============================================================================
-- Master table for all VoltCore clients — major Indian industrial houses.
-- Tracks credit limits, payment terms, and cumulative revenue metrics.
-- ============================================================================
CREATE TABLE Customer (
    id            VARCHAR(25)    NOT NULL,
    code          VARCHAR(50)    NOT NULL,
    name          VARCHAR(255)   NOT NULL,
    contactPerson VARCHAR(255)   DEFAULT NULL,
    email         VARCHAR(255)   DEFAULT NULL,
    phone         VARCHAR(50)    DEFAULT NULL,
    address       TEXT           DEFAULT NULL,
    city          VARCHAR(100)   DEFAULT NULL,
    state         VARCHAR(100)   DEFAULT NULL,
    gst           VARCHAR(50)    DEFAULT NULL,
    pan           VARCHAR(20)    DEFAULT NULL,
    creditLimit   DOUBLE         DEFAULT 0,
    creditPeriod  INT            DEFAULT 30,
    totalOrders   INT            DEFAULT 0,
    totalRevenue  DOUBLE         DEFAULT 0,
    status        VARCHAR(50)    DEFAULT 'Active',
    createdAt     DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt     DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_customer_code (code),
    INDEX idx_customer_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Quotation
-- ============================================================================
-- Sales quotations submitted to customers for industrial maintenance services.
-- Tracks lifecycle: Draft → Sent → Accepted/Rejected/Expired/Converted.
-- Linked to customers; converted quotations reference a sales order.
-- ============================================================================
CREATE TABLE Quotation (
    id           VARCHAR(25)    NOT NULL,
    quoteNo      VARCHAR(50)    NOT NULL,
    customer     VARCHAR(25)    NOT NULL,
    project      VARCHAR(255)   DEFAULT NULL,
    date         DATE           NOT NULL,
    validUntil   DATE           NOT NULL,
    subtotal     DOUBLE         DEFAULT 0,
    tax          DOUBLE         DEFAULT 0,
    totalAmount  DOUBLE         DEFAULT 0,
    terms        VARCHAR(255)   DEFAULT NULL,
    status       VARCHAR(50)    DEFAULT 'Draft',
    preparedBy   VARCHAR(255)   DEFAULT NULL,
    remarks      TEXT           DEFAULT NULL,
    createdAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_quotation_no (quoteNo),
    INDEX idx_quotation_customer (customer),
    INDEX idx_quotation_status (status),
    CONSTRAINT fk_quotation_customer FOREIGN KEY (customer) REFERENCES Customer(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: QuotationItem
-- ============================================================================
-- Line items for each quotation — AMC charges, shutdown services, manpower,
-- equipment rental, inspection services, etc. Amounts calculated as:
-- amount = quantity × unitPrice × (1 – discount%)
-- Tax computed per line at taxPercent rate.
-- ============================================================================
CREATE TABLE QuotationItem (
    id           VARCHAR(25)    NOT NULL,
    quotationId  VARCHAR(25)    NOT NULL,
    slNo         INT            DEFAULT NULL,
    itemCode     VARCHAR(100)   DEFAULT NULL,
    itemName     VARCHAR(255)   NOT NULL,
    description  TEXT           DEFAULT NULL,
    quantity     INT            NOT NULL,
    unit         VARCHAR(50)    DEFAULT NULL,
    unitPrice    DOUBLE         NOT NULL,
    discount     DOUBLE         DEFAULT 0,
    taxPercent   DOUBLE         DEFAULT 18,
    amount       DOUBLE         NOT NULL,
    remarks      TEXT           DEFAULT NULL,
    createdAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_quotation_item_quotation (quotationId),
    CONSTRAINT fk_quotationitem_quotation FOREIGN KEY (quotationId) REFERENCES Quotation(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: SalesOrder
-- ============================================================================
-- Confirmed orders placed by customers — may originate from a quotation or
-- be placed directly. Lifecycle: Pending → Confirmed → In Progress →
-- Delivered / Cancelled.
-- ============================================================================
CREATE TABLE SalesOrder (
    id           VARCHAR(25)    NOT NULL,
    soNo         VARCHAR(50)    NOT NULL,
    customer     VARCHAR(25)    NOT NULL,
    quotation    VARCHAR(25)    DEFAULT NULL,
    project      VARCHAR(255)   DEFAULT NULL,
    date         DATE           NOT NULL,
    deliveryDate DATE           DEFAULT NULL,
    subtotal     DOUBLE         DEFAULT 0,
    tax          DOUBLE         DEFAULT 0,
    totalAmount  DOUBLE         DEFAULT 0,
    terms        VARCHAR(255)   DEFAULT NULL,
    status       VARCHAR(50)    DEFAULT 'Pending',
    preparedBy   VARCHAR(255)   DEFAULT NULL,
    remarks      TEXT           DEFAULT NULL,
    createdAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_so_no (soNo),
    INDEX idx_so_customer (customer),
    INDEX idx_so_status (status),
    CONSTRAINT fk_so_customer FOREIGN KEY (customer) REFERENCES Customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_so_quotation FOREIGN KEY (quotation) REFERENCES Quotation(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: SalesOrderItem
-- ============================================================================
-- Line items for each sales order. Tracks quantity ordered vs delivered.
-- Delivered quantity enables partial delivery tracking and invoicing.
-- ============================================================================
CREATE TABLE SalesOrderItem (
    id           VARCHAR(25)    NOT NULL,
    soId         VARCHAR(25)    NOT NULL,
    itemCode     VARCHAR(100)   DEFAULT NULL,
    itemName     VARCHAR(255)   NOT NULL,
    quantity     INT            NOT NULL,
    unit         VARCHAR(50)    DEFAULT NULL,
    unitPrice    DOUBLE         NOT NULL,
    amount       DOUBLE         NOT NULL,
    deliveredQty INT            DEFAULT 0,
    remarks      TEXT           DEFAULT NULL,
    createdAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt    DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_so_item_so (soId),
    CONSTRAINT fk_soitem_salesorder FOREIGN KEY (soId) REFERENCES SalesOrder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ############################################################################
-- INSERT DATA
-- ############################################################################


-- ============================================================================
-- 8 CUSTOMERS (matching Section 2.7 of design-reference.md)
-- ============================================================================
-- Indian industrial majors — refiners, steelmakers, power utilities, cement
-- and metals companies that are typical clients for a plant maintenance
-- contractor like VoltCore Engineering.
-- ============================================================================

INSERT INTO Customer (id, code, name, contactPerson, email, phone, address, city, state, gst, pan, creditLimit, creditPeriod, totalOrders, totalRevenue, status) VALUES
('cust_001', 'CUST-001', 'Reliance Industries Ltd',
    'Alok Tripathi', 'alok.tripathi@ril.com', '+91-2988-251000',
    'Reliance Corporate Park, Jamnagar Export Processing Zone',
    'Jamnagar', 'Gujarat',
    '27AABCR5033B1Z5', 'AABCR5033B',
    50000000, 45, 1, 8431100, 'Active'),

('cust_002', 'CUST-002', 'Tata Steel Ltd',
    'Sanjay Choudhary', 's.choudhary@tatasteel.com', '+91-657-2421171',
    'Tata Steel Works, Jamshedpur - 831001',
    'Jamshedpur', 'Jharkhand',
    '20AABCT3293Q1Z5', 'AABCT3293Q',
    60000000, 30, 1, 18750200, 'Active'),

('cust_003', 'CUST-003', 'NTPC Ltd',
    'R.K. Sharma', 'rk.sharma@ntpc.co.in', '+91-11-24360100',
    'NTPC Bhawan, SCOPE Complex, Core-7, Lodhi Road',
    'New Delhi', 'Delhi',
    '07AAACN5250D1Z6', 'AAACN5250D',
    25000000, 30, 1, 3469200, 'Active'),

('cust_004', 'CUST-004', 'UltraTech Cement Ltd',
    'K.V. Raman', 'kv.raman@ultratechcement.com', '+91-22-66528100',
    'Godrej One, Pirojshanagar, Eastern Express Highway, Vikhroli',
    'Mumbai', 'Maharashtra',
    '27AABCU2125L1Z8', 'AABCU2125L',
    20000000, 30, 1, 3016080, 'Active'),

('cust_005', 'CUST-005', 'Indian Oil Corporation Ltd',
    'Deepak Agarwal', 'd.agarwal@iocl.com', '+91-11-23201249',
    'IOCL Bhawan, 3076-3091, Janpath, Vasant Vihar',
    'New Delhi', 'Delhi',
    '07AAACI1606G1Z2', 'AAACI1606G',
    75000000, 45, 1, 9794000, 'Active'),

('cust_006', 'CUST-006', 'JSW Steel Ltd',
    'M. Srinivas Rao', 'ms.rao@jsw.in', '+91-22-66698000',
    'JSW Centre, BKC, Bandra Kurla Complex',
    'Mumbai', 'Maharashtra',
    '27AABCJ6252H1Z3', 'AABCJ6252H',
    35000000, 30, 1, 4956000, 'Active'),

('cust_007', 'CUST-007', 'Adani Power Ltd',
    'Pranav Adani', 'p.adani@adani.com', '+91-79-26581111',
    'Adani Corporate House, Nr. Mithakhali Six Roads, Navrangpura',
    'Ahmedabad', 'Gujarat',
    '24AABCA4532F1Z1', 'AABCA4532F',
    30000000, 45, 1, 6549000, 'Active'),

('cust_008', 'CUST-008', 'Hindalco Industries Ltd',
    'Satish Pai', 's.pai@hindalco.com', '+91-22-66526666',
    'Hindalco House, Laxmi Nagar, Worli',
    'Mumbai', 'Maharashtra',
    '27AABCH5105B1Z9', 'AABCH5105B',
    20000000, 30, 1, 6230400, 'Active');


-- ============================================================================
-- 6 QUOTATIONS (QTN-2025-001 to QTN-2025-006)
-- ============================================================================
-- Covering the core services VoltCore offers: AMC charges, shutdown
-- services, preventive maintenance, O&M contracts, turnaround planning,
-- manpower supply, equipment rental, and specialized inspection.
-- ============================================================================

INSERT INTO Quotation (id, quoteNo, customer, project, date, validUntil, subtotal, tax, totalAmount, terms, status, preparedBy, remarks) VALUES
-- QTN-001: Reliance — Annual Maintenance Contract (Accepted → Converted to SO)
('qt_001', 'QTN-2025-001', 'cust_001', 'Reliance Jamnagar AMC',
    '2025-01-15', '2025-03-15',
    7145000, 1286100, 8431100,
    'Net 45 days', 'Converted',
    'Rajesh Mehta',
    'Annual contract for boiler & turbine maintenance at Jamnagar refinery complex. Includes 24x7 emergency support.'),

-- QTN-002: Tata Steel — Blast Furnace-3 Shutdown (Accepted → Converted to SO)
('qt_002', 'QTN-2025-002', 'cust_002', 'Tata Steel BF-3 Shutdown',
    '2025-02-01', '2025-04-01',
    15890000, 2860200, 18750200,
    'Net 30 days', 'Converted',
    'Sanjay Kumar Singh',
    'Major shutdown scope covering blast furnace relining, gas cleaning plant overhaul, and hot blast stove repair.'),

-- QTN-003: NTPC Singrauli — Operation & Maintenance (Accepted → Converted to SO)
('qt_003', 'QTN-2025-003', 'cust_003', 'NTPC Singrauli O&M',
    '2025-01-20', '2025-02-28',
    2940000, 529200, 3469200,
    'Net 30 days', 'Converted',
    'Vikram Pandey',
    'O&M contract for 500 MW unit. Includes quarterly boiler and electrical maintenance schedules.'),

-- QTN-004: UltraTech — Preventive Maintenance (Sent, awaiting approval)
('qt_004', 'QTN-2025-004', 'cust_004', 'UltraTech Kiln PM',
    '2025-03-01', '2025-04-30',
    2556000, 460080, 3016080,
    'Net 30 days', 'Accepted',
    'Nagarjuna Reddy',
    'Quarterly preventive maintenance for rotary kiln, raw mill, and conveyor systems at Tadipatri plant.'),

-- QTN-005: IOCL Panipat — CDU Turnaround (Draft, under internal review)
('qt_005', 'QTN-2025-005', 'cust_005', 'IOCL Panipat CDU Turnaround',
    '2025-04-01', '2025-06-30',
    15900000, 2862000, 18762000,
    'Net 45 days', 'Sent',
    'Arun Sharma',
    'Crude distillation unit turnaround — scope includes mechanical, piping, instrumentation, and civil works. 45-day timeline.'),

-- QTN-006: JSW Steel — Hot Strip Mill AMC (Accepted → Converted to SO)
('qt_006', 'QTN-2025-006', 'cust_006', 'JSW Hot Strip Mill Maintenance',
    '2025-02-15', '2025-04-15',
    4200000, 756000, 4956000,
    'Net 30 days', 'Converted',
    'Pradeep Rao',
    'Annual maintenance contract for hot strip mill at Vijayanagar works. Includes crane maintenance and hydraulic services.');


-- ============================================================================
-- 18 QUOTATION ITEMS (2-4 items per quotation)
-- ============================================================================
-- Services include AMC charges, shutdown execution, manpower supply,
-- equipment rental, scaffolding, lubrication, inspection, and calibration.
-- amount = ROUND(quantity × unitPrice × (1 – discount/100), 2)
-- ============================================================================

-- QTN-2025-001: Reliance Jamnagar AMC (3 items)
INSERT INTO QuotationItem (id, quotationId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, discount, taxPercent, amount, remarks) VALUES
('qi_001', 'qt_001', 1, 'SVC-AMC-BT', 'Annual Maintenance Contract — Boiler & Turbine',
    'Comprehensive annual maintenance for 2×250 MW boiler-turbine units including routine inspections, overhauls, and performance testing.',
    1, 'Lot', 4500000, 5, 18, 4275000,
    'Includes quarterly inspections and one major overhaul per year'),

('qi_002', 'qt_001', 2, 'SVC-EBR', 'Emergency Breakdown Response Services',
    '24x7 emergency breakdown response with guaranteed 4-hour mobilization. Covers all rotating and static equipment.',
    12, 'Month', 1250000, 0, 18, 1250000,
    'Dedicated 6-member emergency team stationed at site'),

('qi_003', 'qt_001', 3, 'SVC-SPS', 'Spare Parts Supply & Management',
    'Supply and management of critical spares — bearings, seals, gaskets, coupling elements. Includes inventory management at site store.',
    1, 'Lot', 1800000, 10, 18, 1620000,
    'Min stock levels to be maintained for 150 critical items');

-- QTN-2025-002: Tata Steel BF-3 Shutdown (4 items)
INSERT INTO QuotationItem (id, quotationId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, discount, taxPercent, amount, remarks) VALUES
('qi_004', 'qt_002', 1, 'SVC-SHD-BF', 'Blast Furnace-3 Shutdown Mechanical Works',
    'Complete mechanical scope for BF-3 relining shutdown — furnace shell repair, tuyere replacement, cast house refractory, and gas cleaning plant overhaul.',
    1, 'Lot', 8500000, 0, 18, 8500000,
    '30-day shutdown window, 350-member workforce'),

('qi_005', 'qt_002', 2, 'SVC-MPS', 'Manpower Supply — Fitters & Welders',
    'Supply of skilled fitters, welders, riggers, and helpers for shutdown execution. Includes site supervision.',
    30, 'Days', 60000, 0, 18, 1800000,
    '50 persons: 20 fitters, 15 welders, 5 riggers, 10 helpers'),

('qi_006', 'qt_002', 3, 'SVC-SCF', 'Scaffolding Erection & Dismantling',
    'Complete scaffolding works for blast furnace and allied areas — erection, modification, and dismantling as per shutdown sequence.',
    1, 'Lot', 2200000, 5, 18, 2090000,
    'Includes all scaffolding materials and certified scaffolders'),

('qi_007', 'qt_002', 4, 'SVC-EQR', 'Heavy Equipment Rental (Cranes & Welding Machines)',
    'Rental of 100T mobile crane, welding machines, gas cutting sets, grinding tools, and NDT equipment for shutdown duration.',
    30, 'Days', 116667, 0, 18, 3500000,
    '1×100T crane, 20×welding machines, 10×gas cutting sets');

-- QTN-2025-003: NTPC Singrauli O&M (3 items)
INSERT INTO QuotationItem (id, quotationId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, discount, taxPercent, amount, remarks) VALUES
('qi_008', 'qt_003', 1, 'SVC-OM-MN', 'Operation & Maintenance Charges — Monthly',
    'Monthly retainer for O&M services covering 500 MW Unit-6. Includes 24x7 plant supervision and routine maintenance activities.',
    12, 'Month', 950000, 0, 18, 950000,
    'Covers manpower cost, consumables, and supervision'),

('qi_009', 'qt_003', 2, 'SVC-BOI', 'Boiler Maintenance & Inspection Services',
    'Quarterly boiler maintenance including header inspection, tube leakage detection, soot blowing system, and burner maintenance.',
    4, 'Quarter', 300000, 5, 18, 1140000,
    'Includes drone inspection of boiler furnace and duct area'),

('qi_010', 'qt_003', 3, 'SVC-ELM', 'Electrical System Maintenance',
    'Quarterly maintenance of HT/LT switchgear, transformers, motors, cable trays, and protection relay testing.',
    4, 'Quarter', 212500, 0, 18, 850000,
    'Includes thermography scan and vibration analysis of motors');

-- QTN-2025-004: UltraTech Kiln PM (3 items)
INSERT INTO QuotationItem (id, quotationId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, discount, taxPercent, amount, remarks) VALUES
('qi_011', 'qt_004', 1, 'SVC-KPM', 'Kiln Preventive Maintenance Services',
    'Quarterly preventive maintenance of rotary kiln — alignment check, tyre roller adjustment, girth gear inspection, and refractory condition assessment.',
    4, 'Quarter', 375000, 0, 18, 1500000,
    'Includes laser alignment and shell deformation survey'),

('qi_012', 'qt_004', 2, 'SVC-CNM', 'Conveyor System Maintenance',
    'Bi-annual maintenance of raw material and clinker conveyors — belt alignment, idler replacement, gearbox oil change, and chute liner inspection.',
    6, 'Month', 100000, 0, 18, 600000,
    'Covers 12 conveyor systems across the plant'),

('qi_013', 'qt_004', 3, 'SVC-ICM', 'Routine Inspection & Condition Monitoring',
    'Monthly inspection and condition monitoring of critical rotating equipment — fans, pumps, compressors using vibration analysis and oil analysis.',
    12, 'Month', 40000, 5, 18, 456000,
    'Online vibration monitoring for 30 critical machines');

-- QTN-2025-005: IOCL Panipat Turnaround (2 items)
INSERT INTO QuotationItem (id, quotationId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, discount, taxPercent, amount, remarks) VALUES
('qi_014', 'qt_005', 1, 'SVC-TAR-CDU', 'CDU Turnaround Planning & Execution',
    'Complete turnaround planning and execution for Crude Distillation Unit — mechanical, piping, static equipment, and heat exchanger cleaning.',
    1, 'Lot', 12000000, 5, 18, 11400000,
    '45-day turnaround with 600-member peak workforce. Includes hydrotesting and NDT.'),

('qi_015', 'qt_005', 2, 'SVC-MPD', 'Skilled Manpower Deployment',
    'Deployment of 80 skilled workers — mechanical fitters, welders (SMAW/GTAW), riggers, scaffolders, and helpers for turnaround execution.',
    45, 'Days', 100000, 0, 18, 4500000,
    '30 fitters, 20 welders, 10 scaffolders, 20 riggers/helpers');

-- QTN-2025-006: JSW Hot Strip Mill AMC (3 items)
INSERT INTO QuotationItem (id, quotationId, slNo, itemCode, itemName, description, quantity, unit, unitPrice, discount, taxPercent, amount, remarks) VALUES
('qi_016', 'qt_006', 1, 'SVC-AMC-HSM', 'Hot Strip Mill AMC — Mechanical',
    'Annual maintenance contract for hot strip mill mechanical systems — rolling stands, crop shear, coiler, run-out table, and cooling system.',
    1, 'Year', 3200000, 5, 18, 3040000,
    'Includes 2 scheduled shutdowns per year plus breakdown support'),

('qi_017', 'qt_006', 2, 'SVC-CRN', 'EOT Crane Maintenance & Certification',
    'Quarterly maintenance and annual third-party certification of EOT cranes — 8 cranes ranging from 30T to 80T capacity.',
    4, 'Quarter', 200000, 0, 18, 800000,
    'Includes load testing, wire rope replacement, and brake testing'),

('qi_018', 'qt_006', 3, 'SVC-LHY', 'Lubrication & Hydraulic Services',
    'Monthly lubrication services and hydraulic system maintenance for mill stands, AGC systems, and coiler hydraulic units.',
    12, 'Month', 30000, 0, 18, 360000,
    'Includes oil analysis, filter replacement, and hydraulic hose audit');


-- ============================================================================
-- 8 SALES ORDERS (SO-2025-001 to SO-2025-008)
-- ============================================================================
-- SO-001 to SO-004 and SO-006 linked to accepted/converted quotations.
-- SO-005, SO-007, SO-008 are direct orders (no preceding quotation).
-- Status distribution: Delivered(1), In Progress(2), Confirmed(3), Pending(2)
-- ============================================================================
INSERT INTO SalesOrder (id, soNo, customer, quotation, project, date, deliveryDate, subtotal, tax, totalAmount, terms, status, preparedBy, remarks) VALUES
-- SO-001: Reliance — from QTN-001 (Confirmed, delivery in progress)
('so_001', 'SO-2025-001', 'cust_001', 'qt_001', 'Reliance Jamnagar AMC',
    '2025-01-25', '2025-12-31',
    7145000, 1286100, 8431100,
    'Net 45 days', 'Confirmed',
    'Rajesh Mehta',
    'Annual AMC contract confirmed. Work commenced Feb 2025.'),

-- SO-002: Tata Steel — from QTN-002 (In Progress, shutdown execution ongoing)
('so_002', 'SO-2025-002', 'cust_002', 'qt_002', 'Tata Steel BF-3 Shutdown',
    '2025-02-10', '2025-05-15',
    15890000, 2860200, 18750200,
    'Net 30 days', 'In Progress',
    'Sanjay Kumar Singh',
    'BF-3 shutdown in progress. Day 18 of 30. Mechanical works 60% complete.'),

-- SO-003: NTPC Singrauli — from QTN-003 (Confirmed)
('so_003', 'SO-2025-003', 'cust_003', 'qt_003', 'NTPC Singrauli O&M',
    '2025-01-30', '2026-01-31',
    2940000, 529200, 3469200,
    'Net 30 days', 'Confirmed',
    'Vikram Pandey',
    'O&M contract activated from February 2025. Monthly billing cycle.'),

-- SO-004: UltraTech — from QTN-004 (In Progress)
('so_004', 'SO-2025-004', 'cust_004', 'qt_004', 'UltraTech Kiln PM',
    '2025-03-10', '2026-03-31',
    2556000, 460080, 3016080,
    'Net 30 days', 'In Progress',
    'Nagarjuna Reddy',
    'First quarterly PM completed. Next scheduled for June 2025.'),

-- SO-005: IOCL — direct order, not linked to quotation (Pending)
('so_005', 'SO-2025-005', 'cust_005', NULL, 'IOCL Panipat CDU Turnaround',
    '2025-04-15', '2025-09-30',
    8300000, 1494000, 9794000,
    'Net 45 days', 'Pending',
    'Arun Sharma',
    'Direct work order for CDU maintenance — partial scope before main turnaround.'),

-- SO-006: JSW Steel — from QTN-006 (Delivered — first AMC cycle complete)
('so_006', 'SO-2025-006', 'cust_006', 'qt_006', 'JSW Hot Strip Mill Maintenance',
    '2025-02-20', '2025-05-31',
    4200000, 756000, 4956000,
    'Net 30 days', 'Delivered',
    'Pradeep Rao',
    'First quarterly cycle delivered. Crane certification completed for all 8 cranes.'),

-- SO-007: Adani Power — direct order (Confirmed)
('so_007', 'SO-2025-007', 'cust_007', NULL, 'Adani Mundra Power Plant',
    '2025-03-05', '2025-08-31',
    5550000, 999000, 6549000,
    'Net 45 days', 'Confirmed',
    'Amit Joshi',
    'Direct order for turbine overhaul and control valve calibration at Mundra TPP.'),

-- SO-008: Hindalco — direct order (Pending)
('so_008', 'SO-2025-008', 'cust_008', NULL, 'Hindalco Hirakud Smelter',
    '2025-03-20', '2025-12-31',
    5280000, 950400, 6230400,
    'Net 30 days', 'Pending',
    'Suresh Patel',
    'Quoted for aluminium smelter maintenance and electrical panel annual servicing.');


-- ============================================================================
-- 23 SALES ORDER ITEMS (2-4 items per order)
-- ============================================================================
-- Amounts mirror their quotation counterparts where applicable; direct
-- orders have independent pricing. deliveredQty tracks partial fulfillment.
-- ============================================================================

-- SO-2025-001: Reliance AMC (3 items) — confirmed, no deliveries yet
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_001', 'so_001', 'SVC-AMC-BT', 'Annual Maintenance Contract — Boiler & Turbine', 1, 'Lot', 4275000, 4275000, 0, 'First quarter inspection completed'),
('soi_002', 'so_001', 'SVC-EBR', 'Emergency Breakdown Response Services', 12, 'Month', 104167, 1250000, 2, 'Feb-Mar 2025 delivered'),
('soi_003', 'so_001', 'SVC-SPS', 'Spare Parts Supply & Management', 1, 'Lot', 1620000, 1620000, 0, 'Initial stock deployment pending');

-- SO-2025-002: Tata Steel BF-3 Shutdown (4 items) — in progress, partial delivery
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_004', 'so_002', 'SVC-SHD-BF', 'Blast Furnace-3 Shutdown Mechanical Works', 1, 'Lot', 8500000, 8500000, 0, '60% mechanical works complete'),
('soi_005', 'so_002', 'SVC-MPS', 'Manpower Supply — Fitters & Welders', 30, 'Days', 60000, 1800000, 18, 'Day 1-18 deployed'),
('soi_006', 'so_002', 'SVC-SCF', 'Scaffolding Erection & Dismantling', 1, 'Lot', 2090000, 2090000, 1, 'Complete — all scaffolding erected'),
('soi_007', 'so_002', 'SVC-EQR', 'Heavy Equipment Rental (Cranes & Welding Machines)', 30, 'Days', 116667, 3500000, 18, 'Equipment on site since Day 1');

-- SO-2025-003: NTPC O&M (3 items) — confirmed, monthly billing
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_008', 'so_003', 'SVC-OM-MN', 'Operation & Maintenance Charges — Monthly', 12, 'Month', 79167, 950000, 2, 'Feb-Mar 2025 delivered'),
('soi_009', 'so_003', 'SVC-BOI', 'Boiler Maintenance & Inspection Services', 4, 'Quarter', 285000, 1140000, 0, 'Q1 inspection pending'),
('soi_010', 'so_003', 'SVC-ELM', 'Electrical System Maintenance', 4, 'Quarter', 212500, 850000, 0, 'Q1 maintenance scheduled April 2025');

-- SO-2025-004: UltraTech Kiln PM (3 items) — in progress
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_011', 'so_004', 'SVC-KPM', 'Kiln Preventive Maintenance Services', 4, 'Quarter', 375000, 1500000, 1, 'Q1 PM completed March 2025'),
('soi_012', 'so_004', 'SVC-CNM', 'Conveyor System Maintenance', 6, 'Month', 100000, 600000, 2, 'Feb-Mar 2025 delivered'),
('soi_013', 'so_004', 'SVC-ICM', 'Routine Inspection & Condition Monitoring', 12, 'Month', 38000, 456000, 2, 'Feb-Mar 2025 delivered');

-- SO-2025-005: IOCL Direct Order (2 items) — pending
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_014', 'so_005', 'SVC-CDU-MNT', 'Crude Distillation Unit Maintenance', 1, 'Lot', 6500000, 6500000, 0, 'Scope under discussion with IOCL planning team'),
('soi_015', 'so_005', 'SVC-PPL-INSP', 'Pipeline Inspection Services', 10, 'KM', 180000, 1800000, 0, 'In-line inspection using smart pigs');

-- SO-2025-006: JSW Steel AMC (3 items) — delivered (first cycle complete)
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_016', 'so_006', 'SVC-AMC-HSM', 'Hot Strip Mill AMC — Mechanical', 1, 'Year', 3040000, 3040000, 1, 'First quarterly shutdown completed'),
('soi_017', 'so_006', 'SVC-CRN', 'EOT Crane Maintenance & Certification', 4, 'Quarter', 200000, 800000, 1, 'Q1 maintenance and certification done'),
('soi_018', 'so_006', 'SVC-LHY', 'Lubrication & Hydraulic Services', 12, 'Month', 30000, 360000, 3, 'Jan-Mar 2025 delivered');

-- SO-2025-007: Adani Power Direct Order (2 items) — confirmed
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_019', 'so_007', 'SVC-TRB-OVR', 'Turbine Overhaul Services', 1, 'Lot', 4800000, 4800000, 0, 'Overhaul planned for May 2025 unit shutdown'),
('soi_020', 'so_007', 'SVC-CTL-CAL', 'Control Valve Calibration', 50, 'Nos', 15000, 750000, 0, 'Calibration to be done during turbine outage');

-- SO-2025-008: Hindalco Direct Order (3 items) — pending
INSERT INTO SalesOrderItem (id, soId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
('soi_021', 'so_008', 'SVC-SMR-MNT', 'Aluminium Smelter Maintenance', 1, 'Lot', 3600000, 3600000, 0, 'Awaiting plant shutdown window for execution'),
('soi_022', 'so_008', 'SVC-PTR-INSP', 'Pot Room Inspection Services', 1, 'Lot', 1200000, 1200000, 0, 'Thermographic inspection of 200 pot cells'),
('soi_023', 'so_008', 'SVC-ELC-PNL', 'Electrical Panel Maintenance', 12, 'Month', 40000, 480000, 0, 'Monthly servicing of HT/LT panels and VFDs')
