-- ============================================================================
-- MODULE 12: Purchase Management
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor (India)
-- Tables  : Vendor, PurchaseOrder, PurchaseOrderItem, GoodsReceipt
-- ============================================================================

-- ============================================================================
-- TABLE: Vendor
-- Master list of suppliers/vendors for industrial spares and consumables
-- ============================================================================

CREATE TABLE Vendor (
    id              VARCHAR(25)     NOT NULL,
    code            VARCHAR(50)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    contactPerson   VARCHAR(255)    DEFAULT NULL,
    email           VARCHAR(255)    DEFAULT NULL,
    phone           VARCHAR(50)     DEFAULT NULL,
    address         TEXT            DEFAULT NULL,
    city            VARCHAR(100)    DEFAULT NULL,
    state           VARCHAR(100)    DEFAULT NULL,
    gst             VARCHAR(50)     DEFAULT NULL,
    pan             VARCHAR(20)     DEFAULT NULL,
    rating          DECIMAL(3,1)    DEFAULT 0,
    paymentTerms    VARCHAR(100)    DEFAULT NULL,
    bankDetails     TEXT            DEFAULT NULL,
    status          VARCHAR(50)     DEFAULT 'Active',
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_vendor_code (code),
    INDEX idx_vendor_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: PurchaseOrder
-- Tracks purchase orders raised against vendors for project requirements
-- PO lifecycle: Draft → Submitted → Approved → In Progress → Delivered / Cancelled
-- ============================================================================

CREATE TABLE PurchaseOrder (
    id              VARCHAR(25)     NOT NULL,
    poNo            VARCHAR(50)     NOT NULL,
    vendor          VARCHAR(25)     NOT NULL,
    project         VARCHAR(25)     DEFAULT NULL,
    requisitionRef  VARCHAR(50)     DEFAULT NULL,
    date            DATE            NOT NULL,
    deliveryDate    DATE            DEFAULT NULL,
    subtotal        DOUBLE          DEFAULT 0,
    tax             DOUBLE          DEFAULT 0,
    totalAmount     DOUBLE          DEFAULT 0,
    currency        VARCHAR(10)     DEFAULT 'INR',
    paymentTerms    VARCHAR(100)    DEFAULT NULL,
    status          VARCHAR(50)     DEFAULT 'Draft',
    approvedBy      VARCHAR(255)    DEFAULT NULL,
    remarks         TEXT            DEFAULT NULL,
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_po_no (poNo),
    INDEX idx_po_vendor (vendor),
    INDEX idx_po_status (status),
    CONSTRAINT fk_po_vendor FOREIGN KEY (vendor) REFERENCES Vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: PurchaseOrderItem
-- Line items within each purchase order — materials, spares, consumables
-- ============================================================================

CREATE TABLE PurchaseOrderItem (
    id              VARCHAR(25)     NOT NULL,
    poId            VARCHAR(25)     NOT NULL,
    itemCode        VARCHAR(100)    DEFAULT NULL,
    itemName        VARCHAR(255)    NOT NULL,
    quantity        INT             NOT NULL,
    unit            VARCHAR(50)     DEFAULT NULL,
    unitPrice       DOUBLE          NOT NULL,
    amount          DOUBLE          NOT NULL,
    deliveredQty    INT             DEFAULT 0,
    remarks         TEXT            DEFAULT NULL,
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_poi_poid (poId),
    CONSTRAINT fk_poi_po FOREIGN KEY (poId) REFERENCES PurchaseOrder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: GoodsReceipt
-- Goods Receipt Note (GRN) — records delivery of materials against a PO
-- Includes inspection tracking for quality assurance
-- ============================================================================

CREATE TABLE GoodsReceipt (
    id                VARCHAR(25)     NOT NULL,
    grnNo             VARCHAR(50)     NOT NULL,
    poId              VARCHAR(25)     DEFAULT NULL,
    vendor            VARCHAR(255)    DEFAULT NULL,
    date              DATE            NOT NULL,
    receivedBy        VARCHAR(255)    DEFAULT NULL,
    challanNo         VARCHAR(100)    DEFAULT NULL,
    vehicleNo         VARCHAR(50)     DEFAULT NULL,
    condition         VARCHAR(50)     DEFAULT NULL,
    inspectedBy       VARCHAR(255)    DEFAULT NULL,
    inspectionStatus  VARCHAR(50)     DEFAULT NULL,
    remarks           TEXT            DEFAULT NULL,
    createdAt         DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt         DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_grn_no (grnNo),
    INDEX idx_grn_poid (poId),
    CONSTRAINT fk_grn_po FOREIGN KEY (poId) REFERENCES PurchaseOrder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ############################################################################
-- INSERT DATA
-- ############################################################################

-- ============================================================================
-- VENDORS (8 records)
-- Industrial spares, bearings, motors, valves, lubricants suppliers
-- ============================================================================
INSERT INTO Vendor (id, code, name, contactPerson, email, phone, address, city, state, gst, pan, rating, paymentTerms, bankDetails, status) VALUES
('vendor_001', 'VND-001', 'Bharat Engineering Supplies', 'Ramesh Agarwal', 'sales@bharatengg.in', '022-25678901',
 'Plot No. 45, MIDC Industrial Area, Andheri East', 'Mumbai', 'Maharashtra',
 '27AABCB1234F1Z5', 'AABCB1234F', 4.5,
 'Net 30',
 'Bank: HDFC Bank, A/C: 50100123456789, IFSC: HDFC0001234, Branch: Andheri East, Mumbai', 'Active'),

('vendor_002', 'VND-002', 'SKF India Ltd', 'Pramod Kulkarni', 'orders@skfIndia.co.in', '020-25667890',
 'Survey No. 112, Chakan MIDC, Taluka Khed', 'Pune', 'Maharashtra',
 '27AABCS5678G1Z3', 'AABCS5678G', 4.8,
 'Net 45',
 'Bank: ICICI Bank, A/C: 60100234567890, IFSC: ICIC0002345, Branch: Chakan, Pune', 'Active'),

('vendor_003', 'VND-003', 'Siemens India', 'Nandini Bhosle', 'procurement@siemens.co.in', '022-24987654',
 'Siemens House, 19/21 Sir M.V. Road, Lalbaug', 'Mumbai', 'Maharashtra',
 '27AABCS9012H1Z1', 'AABCS9012H', 4.7,
 'Net 30',
 'Bank: State Bank of India, A/C: 30215678901234, IFSC: SBIN0005678, Branch: Fort, Mumbai', 'Active'),

('vendor_004', 'VND-004', 'ABB India Ltd', 'Karthik Reddy', 'india.orders@abb.com', '080-22234567',
 'Plot 49, KIADB Industrial Area, Whitefield', 'Bengaluru', 'Karnataka',
 '29AABCA3456I1Z9', 'AABCA3456I', 4.6,
 'Net 45',
 'Bank: Axis Bank, A/C: 70100345678901, IFSC: UTIB0006789, Branch: Whitefield, Bengaluru', 'Active'),

('vendor_005', 'VND-005', 'Indian Oil Petrochemicals', 'Manoj Tandon', 'supply@iopcl.co.in', '011-23456789',
 'IOC Complex, Pandara Road', 'Delhi', 'Delhi',
 '07AABCI7890J1Z5', 'AABCI7890J', 4.2,
 'Net 15',
 'Bank: Punjab National Bank, A/C: 40100456789012, IFSC: PUNB0012345, Branch: Pandara Road, Delhi', 'Active'),

('vendor_006', 'VND-006', 'Timken India', 'Santosh Mishra', 'orders@timkenindia.in', '0657-2345678',
 '299, Khas Mahal Road, Kadma', 'Jamshedpur', 'Jharkhand',
 '20AABCT1234K1Z2', 'AABCT1234K', 4.4,
 'Net 30',
 'Bank: Bank of Baroda, A/C: 50100567890123, IFSC: BARB0JAM001, Branch: Sakchi, Jamshedpur', 'Active'),

('vendor_007', 'VND-007', 'Godrej & Boyce', 'Anand Godrej', 'industrial@godrej.com', '022-28001234',
 'Godrej Bhavan, Vikhroli East, LBS Marg', 'Mumbai', 'Maharashtra',
 '27AABCG5678L1Z8', 'AABCG5678L', 4.3,
 'Net 30',
 'Bank: Bank of India, A/C: 60100678901234, IFSC: BKID0009012, Branch: Vikhroli, Mumbai', 'Active'),

('vendor_008', 'VND-008', 'L&T Valves', 'Suresh Babu', 'sales.valves@lantech.com', '044-23456789',
 'L&T Valves Works, Manapakkam', 'Chennai', 'Tamil Nadu',
 '33AABCL9012M1Z6', 'AABCL9012M', 4.6,
 'Net 30',
 'Bank: Indian Bank, A/C: 70100789012345, IFSC: IDIB0003456, Branch: Manapakkam, Chennai', 'Active');


-- ============================================================================
-- PURCHASE ORDERS (10 records)
-- POs raised for various project requirements — bearings, motors, valves,
-- lubricants, instrumentation, switchgear, and general spares
-- ============================================================================
INSERT INTO PurchaseOrder (id, poNo, vendor, project, requisitionRef, date, deliveryDate, subtotal, tax, totalAmount, currency, paymentTerms, status, approvedBy, remarks) VALUES
-- PO-001: Bearings & seals for Reliance Jamnagar AMC (Approved & partially delivered)
('po_001', 'PO-2025-001', 'vendor_001', 'proj_001', 'PR-2025-001', '2025-01-05', '2025-01-25', 185000, 33300, 218300, 'INR', 'Net 30', 'Approved', 'Ravi Tiwari',
 'Urgent replacement bearings and seals for compressor overhaul at Jamnagar site'),

-- PO-002: SKF bearings for Tata Steel BF-3 Shutdown (In Progress)
('po_002', 'PO-2025-002', 'vendor_002', 'proj_002', 'PR-2025-003', '2025-01-10', '2025-02-05', 342000, 61560, 403560, 'INR', 'Net 45', 'In Progress', 'Rajesh Mehta',
 'High-capacity roller bearings for blast furnace rebuild — critical path item'),

-- PO-003: Siemens motors & VFDs for NTPC Singrauli O&M (Approved)
('po_003', 'PO-2025-003', 'vendor_003', 'proj_003', 'PR-2025-004', '2025-01-15', '2025-02-15', 475000, 85500, 560500, 'INR', 'Net 30', 'Approved', 'Ravi Tiwari',
 'Squirrel cage motors and variable frequency drives for coal handling plant'),

-- PO-004: ABB instrumentation for IOCL Panipat Turnaround (Submitted, pending approval)
('po_004', 'PO-2025-004', 'vendor_004', 'proj_005', 'PR-2025-006', '2025-02-01', '2025-03-01', 628000, 113040, 741040, 'INR', 'Net 45', 'Submitted', NULL,
 'Pressure transmitters, temperature sensors, and flow meters for CDU turnaround'),

-- PO-005: Lubricants & greases for Reliance Jamnagar AMC (Delivered)
('po_005', 'PO-2025-005', 'vendor_005', 'proj_001', 'PR-2025-002', '2025-01-02', '2025-01-10', 96000, 17280, 113280, 'INR', 'Net 15', 'Delivered', 'Rahul Deshmukh',
 'Bulk lubricants and EP greases for quarterly plant maintenance'),

-- PO-006: Timken tapered bearings for Tata Steel Shutdown (Approved)
('po_006', 'PO-2025-006', 'vendor_006', 'proj_002', 'PR-2025-005', '2025-01-12', '2025-02-10', 256000, 46080, 302080, 'INR', 'Net 30', 'Approved', 'Ravi Tiwari',
 'Tapered roller bearings for furnace drive system — shutdown critical'),

-- PO-007: Godrej locks & hardware for UltraTech Kiln PM (In Progress)
('po_007', 'PO-2025-007', 'vendor_007', 'proj_004', 'PR-2025-007', '2025-02-05', '2025-02-28', 142000, 25560, 167560, 'INR', 'Net 30', 'In Progress', 'Rajesh Mehta',
 'Industrial locks, safety hinges, and access panels for kiln area'),

-- PO-008: L&T valves for IOCL Panipat Turnaround (Submitted)
('po_008', 'PO-2025-008', 'vendor_008', 'proj_005', 'PR-2025-008', '2025-02-03', '2025-03-05', 398000, 71640, 469640, 'INR', 'Net 30', 'Submitted', NULL,
 'Gate valves, globe valves, and check valves for CDU process piping'),

-- PO-009: Gaskets & bolts from Bharat Engg for JSW Mill (Draft)
('po_009', 'PO-2025-009', 'vendor_001', 'proj_006', 'PR-2025-009', '2025-02-10', '2025-03-10', 114000, 20520, 134520, 'INR', 'Net 30', 'Draft', NULL,
 'Spiral wound gaskets and stud bolts for hot strip mill maintenance'),

-- PO-010: Siemens switchgear for NTPC Singrauli (Draft)
('po_010', 'PO-2025-010', 'vendor_003', 'proj_003', 'PR-2025-010', '2025-02-12', '2025-03-20', 520000, 93600, 613600, 'INR', 'Net 30', 'Draft', NULL,
 'LV switchgear panels and MCC for coal conveyor electrical upgrade');


-- ============================================================================
-- PURCHASE ORDER ITEMS (23 records, 2-3 per PO)
-- Industrial maintenance items: bearings, motors, valves, gaskets, lubricants
-- ============================================================================
INSERT INTO PurchaseOrderItem (id, poId, itemCode, itemName, quantity, unit, unitPrice, amount, deliveredQty, remarks) VALUES
-- Items for PO-2025-001 (Bharat Engineering — Bearings & Seals for Jamnagar)
('poi_001', 'po_001', 'BRG-6310', 'SKF 6310-2RS Deep Groove Ball Bearing', 24, 'Nos', 3500, 84000, 24, 'Compressor main bearings'),
('poi_002', 'po_001', 'SEL-MEC-72', 'Mechanical Seal 72mm Shaft Dia', 8, 'Nos', 8750, 70000, 8, 'Pump mechanical seals — John Crane type'),
('poi_003', 'po_001', 'ORING-NBR-90', 'Nitrile O-Ring Set 90mm ID (Box of 50)', 10, 'Box', 3100, 31000, 10, 'Standard O-ring kit for flanged connections'),

-- Items for PO-2025-002 (SKF — Bearings for Tata Steel BF-3)
('poi_004', 'po_002', 'BRG-22320', 'SKF 22320 CC/W33 Spherical Roller Bearing', 12, 'Nos', 18500, 222000, 8, 'Main drive bearings — blast furnace'),
('poi_005', 'po_002', 'BRG-32216', 'SKF 32216 J2 Tapered Roller Bearing', 20, 'Nos', 6000, 120000, 10, 'Conveyor idler bearings'),

-- Items for PO-2025-003 (Siemens — Motors & VFDs for NTPC)
('poi_006', 'po_003', 'MTR-SIM-30KW', 'Siemens 1LE1501-2AB53 Squirrel Cage Motor 30kW', 4, 'Nos', 65000, 260000, 4, 'Coal conveyor drive motors — 4-pole 1500 RPM'),
('poi_007', 'po_003', 'VFD-SIM-22KW', 'Siemens Sinamics G120 VFD 22kW', 4, 'Nos', 53750, 215000, 4, 'Variable frequency drives for conveyor speed control'),

-- Items for PO-2025-004 (ABB — Instrumentation for IOCL Turnaround)
('poi_008', 'po_004', 'PT-ABB-3051', 'ABB 266PST Pressure Transmitter 0-25 bar', 15, 'Nos', 18500, 277500, 0, 'CDU process pressure monitoring'),
('poi_009', 'po_004', 'TT-ABB-TT100', 'ABB TSP341 Temperature Sensor PT100 with Thermowell', 20, 'Nos', 9500, 190000, 0, 'Flanged thermowell assemblies'),
('poi_010', 'po_004', 'FT-ABB-FT200', 'ABB Swirl Flowmeter DN100', 5, 'Nos', 32100, 160500, 0, 'Custody transfer flow measurement'),

-- Items for PO-2025-005 (Indian Oil Petrochemicals — Lubricants for Jamnagar)
('poi_011', 'po_005', 'LUB-SAE-68', 'SERVO PRISTA S68 Hydraulic Oil 209L Drum', 10, 'Drum', 7200, 72000, 10, 'Hydraulic system top-up for cranes and presses'),
('poi_012', 'po_005', 'GRS-EP2-18', 'SERVO GREASE EP2 Lithium Grease 18kg Can', 10, 'Can', 2400, 24000, 10, 'Multi-purpose EP2 grease for rotating equipment'),

-- Items for PO-2025-006 (Timken — Bearings for Tata Steel)
('poi_013', 'po_006', 'BRG-TIM-32309', 'Timken 32309 Tapered Roller Bearing', 16, 'Nos', 8500, 136000, 10, 'Furnace tilting mechanism bearings'),
('poi_014', 'po_006', 'BRG-TIM-32016', 'Timken 32016 X Tapered Roller Bearing', 20, 'Nos', 6000, 120000, 8, 'Cast house crane wheel bearings'),

-- Items for PO-2025-007 (Godrej — Hardware for UltraTech Kiln)
('poi_015', 'po_007', 'LCK-GRJ-80', 'Godrej 80mm Heavy Duty Padlock', 20, 'Nos', 1800, 36000, 14, 'Safety lockout padlocks for kiln area'),
('poi_016', 'po_007', 'HNG-GRJ-100', 'Godrej 100mm Stainless Steel Piano Hinge', 30, 'Nos', 2200, 66000, 18, 'Access panel door hinges — SS304'),
('poi_017', 'po_007', 'LP-GRJ-SM', 'Godrej Safety Lockout Hasp', 15, 'Nos', 2666.67, 40000, 8, 'Multi-padlock safety hasps for LOTO'),

-- Items for PO-2025-008 (L&T Valves — Valves for IOCL Turnaround)
('poi_018', 'po_008', 'VLV-LT-GV80', 'L&T Gate Valve ANSI 300 2" CS', 10, 'Nos', 14000, 140000, 0, 'Process line isolation gate valves'),
('poi_019', 'po_008', 'VLV-LT-CV50', 'L&T Check Valve ANSI 300 1.5" CS Swing', 8, 'Nos', 8500, 68000, 0, 'Pump discharge check valves'),
('poi_020', 'po_008', 'VLV-LT-GV100', 'L&T Globe Valve ANSI 300 3" CS', 10, 'Nos', 19000, 190000, 0, 'Control valve bypass globe valves'),

-- Items for PO-2025-009 (Bharat Engg — Gaskets for JSW Mill)
('poi_021', 'po_009', 'GSK-SW-150', 'Spiral Wound Gasket 150# 4" SS316/Graphite', 40, 'Nos', 1800, 72000, 0, 'Flange gaskets for mill stand piping'),
('poi_022', 'po_009', 'BLT-STUD-M20', 'Stud Bolt M20x120 Gr B7 with Nuts (Set)', 30, 'Set', 1400, 42000, 0, 'High-tensile stud bolts for flanged joints'),

-- Items for PO-2025-010 (Siemens — Switchgear for NTPC)
('poi_023', 'po_010', 'SWG-SIM-415V', 'Siemens SIVACON 8PT MCC Panel 415V 800A', 2, 'Nos', 210000, 420000, 0, 'Motor Control Centre for conveyor system'),
('poi_024', 'po_010', 'ACB-SIM-630', 'Siemens 3WL ACB 630A 3P with Motor Operator', 4, 'Nos', 25000, 100000, 0, 'Air circuit breakers for incoming feeders');


-- ============================================================================
-- GOODS RECEIPTS (8 records)
-- GRNs recorded at site stores upon material delivery with inspection status
-- ============================================================================
INSERT INTO GoodsReceipt (id, grnNo, poId, vendor, date, receivedBy, challanNo, vehicleNo, condition, inspectedBy, inspectionStatus, remarks) VALUES
-- GRN-001: First delivery of bearings from Bharat Engg for Jamnagar — all good
('grn_001', 'GRN-2025-001', 'po_001', 'Bharat Engineering Supplies', '2025-01-22', 'Ganesh Patil', 'CHL-BE-250120', 'MH-02-AB-1234', 'Good', 'Senthil Kumar', 'Accepted',
 'All 24 bearings, 8 seals, and 10 O-ring kits received in good condition. Verified against PO items.'),

-- GRN-002: Lubricants delivered from IOCL Petrochemicals — all good
('grn_002', 'GRN-2025-002', 'po_005', 'Indian Oil Petrochemicals', '2025-01-09', 'Ganesh Patil', 'CHL-IOP-080120', 'DL-01-CD-5678', 'Good', 'Senthil Kumar', 'Accepted',
 '10 drums of hydraulic oil and 10 cans of EP2 grease delivered. Batch numbers verified.'),

-- GRN-003: SKF bearings partial delivery for Tata Steel
('grn_003', 'GRN-2025-003', 'po_002', 'SKF India Ltd', '2025-01-28', 'Mahesh Kumar', 'CHL-SKF-270125', 'MH-12-FG-9012', 'Good', 'Senthil Kumar', 'Accepted',
 'First consignment: 8 spherical roller bearings and 10 tapered bearings. Balance to follow.'),

-- GRN-004: Siemens motors and VFDs delivered to NTPC Singrauli
('grn_004', 'GRN-2025-004', 'po_003', 'Siemens India', '2025-02-10', 'Mohan Lal', 'CHL-SIE-080205', 'MH-04-GH-3456', 'Good', 'Senthil Kumar', 'Accepted',
 'All 4 motors and 4 VFDs received. Tested for continuity and insulation resistance — OK.'),

-- GRN-005: Timken bearings partial delivery for Tata Steel
('grn_005', 'GRN-2025-005', 'po_006', 'Timken India', '2025-02-05', 'Mahesh Kumar', 'CHL-TMK-030205', 'JH-05-HJ-7890', 'Good', 'Senthil Kumar', 'Under Review',
 '10 nos 32309 and 8 nos 32016 bearings received. Under dimensional inspection.'),

-- GRN-006: Godrej hardware partial delivery for UltraTech Kiln
('grn_006', 'GRN-2025-006', 'po_007', 'Godrej & Boyce', '2025-02-22', 'Venkat Rao', 'CHL-GRJ-200205', 'AP-28-BB-1122', 'Partial', 'Senthil Kumar', 'Under Review',
 'Partial delivery: 14 padlocks, 18 hinges, and 8 hasps received. Balance items pending from vendor.'),

-- GRN-007: Second delivery from Bharat Engg for Jamnagar — gaskets for JSW
('grn_007', 'GRN-2025-007', 'po_009', 'Bharat Engineering Supplies', '2025-02-20', 'Pradeep Rao', 'CHL-BE-180205', 'KA-05-MN-3344', 'Good', 'Senthil Kumar', 'Accepted',
 'Advance delivery of gaskets and stud bolts for JSW mill maintenance. All items match PO spec.'),

-- GRN-008: SKF bearings — damaged consignment returned
('grn_008', 'GRN-2025-008', 'po_002', 'SKF India Ltd', '2025-02-01', 'Raju Yadav', 'CHL-SKF-300125', 'MH-12-FG-9012', 'Damaged', 'Senthil Kumar', 'Rejected',
 '2 nos spherical roller bearings found with chipped race. Returned to vendor for replacement under warranty.')
