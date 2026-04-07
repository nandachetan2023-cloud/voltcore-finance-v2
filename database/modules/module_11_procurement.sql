-- ============================================================================
-- MODULE 11: Procurement
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : PurchaseRequisition, RequisitionItem, VendorQuotation
-- Context : Manages internal purchase requisitions raised by site teams for
--           maintenance spares, safety equipment, tools, and consumables.
--           Vendor quotations are collected against requisitions for evaluation.

-- ============================================================================
-- DDL: PurchaseRequisition
-- ============================================================================
-- Stores purchase requisition headers raised by departments for procurement
-- of materials and services needed at plant sites.
-- PR number format: PR-YYYY-NNN (e.g. PR-2025-001)

CREATE TABLE PurchaseRequisition (
    id              VARCHAR(25)     NOT NULL,
    prNo            VARCHAR(50)     NOT NULL,
    department      VARCHAR(255)     NOT NULL,
    requestor       VARCHAR(255)     NOT NULL,
    date            DATE             NOT NULL,
    requiredDate    DATE             NOT NULL,
    priority        VARCHAR(50)      NOT NULL DEFAULT 'Medium',
    status          VARCHAR(50)      NOT NULL DEFAULT 'Pending',
    approvedBy      VARCHAR(255)     DEFAULT NULL,
    totalAmount     DOUBLE           NOT NULL DEFAULT 0,
    remarks         TEXT             DEFAULT NULL,
    createdAt       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_prNo (prNo),
    INDEX idx_prNo (prNo),
    INDEX idx_status (status),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DDL: RequisitionItem
-- ============================================================================
-- Line items within a purchase requisition. Each item represents a material
-- or spare part requested with estimated cost and specification details.

CREATE TABLE RequisitionItem (
    id              VARCHAR(25)     NOT NULL,
    requisitionId   VARCHAR(25)     NOT NULL,
    itemCode        VARCHAR(100)    DEFAULT NULL,
    itemName        VARCHAR(255)    NOT NULL,
    quantity        INT             NOT NULL,
    unit            VARCHAR(50)     DEFAULT NULL,
    estimatedCost   DOUBLE          NOT NULL DEFAULT 0,
    specification   TEXT            DEFAULT NULL,
    priority        VARCHAR(50)     NOT NULL DEFAULT 'Medium',
    remarks         TEXT            DEFAULT NULL,
    createdAt       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_requisitionId (requisitionId),
    CONSTRAINT fk_reqItem_requisition FOREIGN KEY (requisitionId)
        REFERENCES PurchaseRequisition (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DDL: VendorQuotation
-- ============================================================================
-- Quotations received from vendors against a purchase requisition.
-- Multiple vendors can quote on the same requisition for price comparison.

CREATE TABLE VendorQuotation (
    id              VARCHAR(25)     NOT NULL,
    requisitionId   VARCHAR(25)     NOT NULL,
    vendor          VARCHAR(255)    NOT NULL,
    quoteDate       DATE            NOT NULL,
    validUntil      DATE            NOT NULL,
    totalAmount     DOUBLE          NOT NULL DEFAULT 0,
    deliveryDays    INT             DEFAULT NULL,
    paymentTerms    VARCHAR(100)    DEFAULT NULL,
    status          VARCHAR(50)     NOT NULL DEFAULT 'Received',
    remarks         TEXT            DEFAULT NULL,
    createdAt       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_vq_requisitionId (requisitionId),
    CONSTRAINT fk_vendorQuote_requisition FOREIGN KEY (requisitionId)
        REFERENCES PurchaseRequisition (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT: PurchaseRequisition (8 records)
-- ============================================================================
-- Mix of departments, priorities, and statuses reflecting a realistic
-- procurement pipeline for Jan–Feb 2025.

INSERT INTO PurchaseRequisition (id, prNo, department, requestor, date, requiredDate, priority, status, approvedBy, totalAmount, remarks) VALUES
('pr_001', 'PR-2025-001', 'Engineering', 'Rajesh Mehta', '2025-01-05', '2025-01-20', 'High', 'Approved', 'Rahul Deshmukh', 185000.00,
 'Urgent requirement for BF-3 shutdown at Tata Steel Jamshedpur. Bearings and seals needed for roll stand assembly.'),
('pr_002', 'PR-2025-002', 'Maintenance Planning', 'Nagarjuna Reddy', '2025-01-08', '2025-01-25', 'Critical', 'Converted to PO', 'Rahul Deshmukh', 342000.00,
 'AC motor and pump spares for UltraTech Kiln PM. Production downtime risk if not delivered on time.'),
('pr_003', 'PR-2025-003', 'Operations', 'Sanjay Kumar Singh', '2025-01-12', '2025-02-05', 'Medium', 'Pending', NULL, 96000.00,
 'Routine requisition for gate valves and gasket material for Tata Steel site maintenance.'),
('pr_004', 'PR-2025-004', 'Safety & HSE', 'Deepak Verma', '2025-01-15', '2025-02-01', 'High', 'Approved', 'Rahul Deshmukh', 127500.00,
 'Annual HSE procurement — safety helmets, fire-resistant coveralls, and gas detectors for all sites.'),
('pr_005', 'PR-2025-005', 'Engineering', 'Arun Sharma', '2025-01-20', '2025-02-15', 'Medium', 'Under Review', NULL, 214000.00,
 'Instrumentation cables and solenoid valves for IOCL Panipat CDU turnaround preparation.'),
('pr_006', 'PR-2025-006', 'Procurement', 'Ravi Tiwari', '2025-01-25', '2025-02-20', 'Low', 'Pending', NULL, 48000.00,
 'Stock replenishment — hand tools, welding consumables, and general workshop supplies for HQ store.'),
('pr_007', 'PR-2025-007', 'Maintenance Planning', 'Anil Gupta', '2025-02-01', '2025-02-15', 'Critical', 'Rejected', NULL, 275000.00,
 'Compressor overhaul spares for NTPC Singrauli. Rejected — budget exceeded, resubmission requested with revised scope.'),
('pr_008', 'PR-2025-008', 'Operations', 'Vikram Pandey', '2025-02-05', '2025-02-28', 'High', 'Approved', 'Rahul Deshmukh', 198000.00,
 'MCCB circuit breakers and motor contactors for JSW Vijayanagar hot strip mill electrical maintenance.');

-- ============================================================================
-- INSERT: RequisitionItem (18 records)
-- ============================================================================
-- 2-3 items per requisition covering bearings, seals, gaskets, motors,
-- valves, PPE, tools, electrical panels, and instrumentation spares.

INSERT INTO RequisitionItem (id, requisitionId, itemCode, itemName, quantity, unit, estimatedCost, specification, priority, remarks) VALUES
-- PR-2025-001: Bearings & Seals for Tata Steel BF-3 Shutdown
('ri_001', 'pr_001', 'BRG-SKF-6310', 'SKF 6310-2RS Deep Groove Ball Bearing', 24, 'Nos', 96000.00, 'SKF 6310-2RS1/C3, 50x110x27mm, sealed, double rubber shield', 'High', 'For roll stand backup bearings'),
('ri_002', 'pr_001', 'SEL-MEC-210', 'Mechanical Seal — Type 210', 8, 'Nos', 56000.00, 'Crane 210 mechanical seal, SS316/SS316, Cartridge type, SiC vs SiC faces', 'High', 'For cooling water pump overhaul'),
('ri_003', 'pr_001', 'GKT-NBR-3MM', 'Nitrile Rubber Gasket Sheet — 3mm', 20, 'Sheets', 33000.00, 'NBR 70 Shore A, 3mm thick, 1200x1200mm, temperature rating -30 to 120 deg C', 'Medium', 'General maintenance gasket stock'),

-- PR-2025-002: Motor & Pump Spares for UltraTech Kiln PM
('ri_004', 'pr_002', 'MTR-ABB-75KW', 'ABB 75kW AC Motor — IE3', 2, 'Nos', 195000.00, 'ABB M3BP 250 MLA 4, 75kW, 4-pole, 1475 RPM, 415V, 50Hz, IP55, FLS class B', 'Critical', 'Kiln ID fan motor replacement'),
('ri_005', 'pr_002', 'CPL-FLEX-G', 'Flexible Grid Coupling — F type', 4, 'Nos', 92000.00, 'Falk Steelflex grid coupling, size F110, for 75kW motor to gearbox connection', 'Critical', 'Spare couplings for kiln drive train'),
('ri_006', 'pr_002', 'ORN-VITON-SET', 'Viton O-Ring Assorted Kit', 10, 'Sets', 55000.00, 'Viton (FKM) O-ring kit, AS568 standard, -20 to 200 deg C, chemical resistant', 'High', 'For high-temperature pump sealing applications'),

-- PR-2025-003: Valves & Gaskets for Tata Steel Site
('ri_007', 'pr_003', 'VLV-GATE-50', 'Gate Valve — 50mm CS 150#', 12, 'Nos', 54000.00, 'Forged carbon steel gate valve, API 602, 50mm (2"), 150# RF, handwheel operated', 'Medium', 'For cooling water system isolation'),
('ri_008', 'pr_003', 'GKT-SPIRAL-150', 'Spiral Wound Gasket — 150mm CL150', 30, 'Nos', 42000.00, 'Spiral wound gasket, SS316/graphite, 150mm (6"), ASME B16.20, CL150, inner ring', 'Medium', 'For flanged pipe joints in water circuit'),

-- PR-2025-004: HSE — Safety Equipment for All Sites
('ri_009', 'pr_004', 'PPE-HELM-SAF', 'Safety Helmet — ISI Marked', 100, 'Nos', 35000.00, 'Karam PN 503, ABS material, ISI 2925, ratchet suspension, with chin strap', 'High', 'Annual replenishment for all 6 sites'),
('ri_010', 'pr_004', 'PPE-FR-COV', 'Fire Resistant Coverall — Type P', 50, 'Nos', 75000.00, 'Protector FR coverall, Nomex IIIA, EN ISO 11611/11612, with reflective tape', 'High', 'For hot work areas — blast furnace and refinery zones'),
('ri_011', 'pr_004', 'GDT-4GAS-PORT', 'Portable 4-Gas Detector', 10, 'Nos', 17500.00, 'Oldham MX6, detects LEL/O2/CO/H2S, IP67, datalogging, rechargeable Li-ion', 'Medium', 'Confined space entry monitoring equipment'),

-- PR-2025-005: Instrumentation for IOCL Panipat Turnaround
('ri_012', 'pr_005', 'CAB-INST-24C', 'Instrumentation Cable — 24 Core', 5000, 'Mtrs', 150000.00, '24-core shielded instrumentation cable, 1.5 sq mm, Cu, armoured, IS 1554 Pt-1', 'Medium', 'For DCS and field instrument wiring in CDU area'),
('ri_013', 'pr_005', 'VLV-SOL-15MM', 'Solenoid Valve — 15mm NAMUR', 20, 'Nos', 64000.00, 'Burkert 5404, 15mm NAMUR, 5/2 way, 415V AC, IP65, for pneumatic actuator control', 'High', 'For emergency shutdown valve actuation'),

-- PR-2025-006: Tools & Consumables for HQ Store
('ri_014', 'pr_006', 'TLS-HAND-SET', 'Hand Tool Kit — Fitter Set', 10, 'Sets', 28000.00, 'Stanley professional fitter tool kit, 40-piece, spanners 8-32mm, sockets, Allen keys, hammer', 'Low', 'General workshop replenishment'),
('ri_015', 'pr_006', 'WLD-E7018-3.2', 'Welding Electrode E7018 — 3.2mm', 50, 'Packets', 20000.00, 'ESAB OK 48.00, E7018-1, 3.2mm x 350mm, low hydrogen, ASME SFA 5.1, 25kg/pkt', 'Low', 'Stock consumable for site welding jobs'),

-- PR-2025-007: Compressor Spares for NTPC Singrauli (Rejected)
('ri_016', 'pr_007', 'CMP-VALVE-KIT', 'Compressor Valve Kit — Inlet/Discharge', 4, 'Sets', 160000.00, 'Ingersoll Rand valve plate assembly, 2-stage reciprocating compressor, SS material', 'Critical', 'For 100 CFM compressor overhaul — budget exceeded'),
('ri_017', 'pr_007', 'AIR-FILT-ELM', 'Air Filter Element — Compressor', 6, 'Nos', 115000.00, 'Donaldson P550560 panel filter element, 99.99% efficiency, for IR compressor intake', 'High', 'OEM replacement elements for NTPC compressor fleet'),

-- PR-2025-008: Electrical Panels for JSW Vijayanagar
('ri_018', 'pr_008', 'ELC-MCCB-630', 'MCCB — 630A 3-Pole', 6, 'Nos', 108000.00, 'Schneider NSX630F, 630A, 3P, 50kA breaking capacity, Micrologic 2.2 trip unit', 'High', 'For hot strip mill main drive panel replacement'),
('ri_019', 'pr_008', 'ELC-CONT-75A', 'Motor Contactor — 75A', 15, 'Nos', 54000.00, 'ABB AF95, 75A, 3-pole AC-3, 220V coil, with screw terminals, IEC 60947-4-1', 'High', 'For conveyor and auxiliary motor starters'),
('ri_020', 'pr_008', 'CAB-XLPE-4C', 'XLPE Power Cable — 4 Core 95 sq mm', 300, 'Mtrs', 36000.00, '4-core XLPE armoured cable, 95 sq mm Al, 1.1 kV, IS 7098 Pt-2, with PVC outer sheath', 'Medium', 'For motor feeder wiring in rolling mill area');

-- ============================================================================
-- INSERT: VendorQuotation (12 records)
-- ============================================================================
-- 1-2 vendor quotes per requisition using reference vendors.
-- Statuses reflect procurement evaluation progress.

INSERT INTO VendorQuotation (id, requisitionId, vendor, quoteDate, validUntil, totalAmount, deliveryDays, paymentTerms, status, remarks) VALUES
-- PR-2025-001: Bearings & Seals
('vq_001', 'pr_001', 'SKF India Ltd', '2025-01-07', '2025-02-07', 178500.00, 14, 'Net 30 Days', 'Selected',
 'Best price for SKF bearings. Complimentary seal installation training offered. OEM warranty.'),
('vq_002', 'pr_001', 'Bharat Engineering Supplies', '2025-01-08', '2025-02-08', 192000.00, 10, '50% Advance, 50% Delivery', 'Rejected',
 'Higher quote by 7.5%. Faster delivery offered but not selected due to price difference.'),

-- PR-2025-002: Motor & Pump Spares (Converted to PO)
('vq_003', 'pr_002', 'Siemens India', '2025-01-10', '2025-02-10', 330000.00, 21, 'Net 45 Days', 'Selected',
 'ABB motor sourced through Siemens authorized channel. Extended 2-year warranty included in price.'),
('vq_004', 'pr_002', 'ABB India Ltd', '2025-01-11', '2025-02-11', 352000.00, 28, 'Net 30 Days', 'Under Evaluation',
 'Direct OEM quote. Slightly higher but includes free site commissioning support.'),

-- PR-2025-003: Valves & Gaskets
('vq_005', 'pr_003', 'L&T Valves', '2025-01-15', '2025-02-15', 92000.00, 15, 'Net 30 Days', 'Received',
 'Competitive pricing on gate valves. Gaskets sourced from approved subcontractor.'),

-- PR-2025-004: HSE Safety Equipment
('vq_006', 'pr_004', 'Godrej & Boyce', '2025-01-18', '2025-02-18', 118000.00, 7, 'Net 15 Days', 'Selected',
 'Godrej safety helmets at best price. FR coveralls are reputed brand — Proban treated cotton.'),
('vq_007', 'pr_004', 'Bharat Engineering Supplies', '2025-01-19', '2025-02-19', 135000.00, 10, 'Net 30 Days', 'Rejected',
 'Quote 14% higher. Delivery timeline acceptable but price not competitive.'),

-- PR-2025-005: Instrumentation Cables & Solenoid Valves
('vq_008', 'pr_005', 'ABB India Ltd', '2025-01-22', '2025-02-22', 208000.00, 18, '100% Advance', 'Under Evaluation',
 'Burkert solenoid valves and Polycab cables bundled. Advance payment not preferred.'),

-- PR-2025-006: Tools & Consumables
('vq_009', 'pr_006', 'Bharat Engineering Supplies', '2025-01-27', '2025-02-27', 45000.00, 5, 'COD', 'Received',
 'Standard items — quick delivery from Mumbai warehouse. Cash on delivery terms offered.'),

-- PR-2025-007: Compressor Spares (PR Rejected)
('vq_010', 'pr_007', 'Timken India', '2025-02-03', '2025-03-03', 262000.00, 20, 'Net 30 Days', 'Received',
 'Quotation valid. PR was rejected by management — budget overrun. May be reconsidered next quarter.'),

-- PR-2025-008: Electrical Panels & Breakers
('vq_011', 'pr_008', 'Siemens India', '2025-02-07', '2025-03-07', 192000.00, 12, 'Net 45 Days', 'Selected',
 'Schneider MCCBs and ABB contactors at competitive price. Siemens panel integration offered.'),
('vq_012', 'pr_008', 'ABB India Ltd', '2025-02-08', '2025-03-08', 205000.00, 16, 'Net 30 Days', 'Rejected',
 'ABB OEM quote on contactors but MCCBs priced higher. Total 6.8% above Siemens quote.');
