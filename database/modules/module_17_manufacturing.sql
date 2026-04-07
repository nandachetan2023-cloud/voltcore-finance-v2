-- ============================================================================
-- MODULE 17: Manufacturing (Basic)
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : BillOfMaterials, BOMItem, WorkOrder, ProductionOrder
-- Context : Fabrication of maintenance spares, pump assembly, heat exchanger
--           retubing, structural fabrication, control panel assembly, etc.
-- ============================================================================

-- ============================================================================
-- TABLE: BillOfMaterials
-- Stores BOM definitions for assembly/fabrication jobs in plant maintenance
-- ============================================================================
CREATE TABLE BillOfMaterials (
    id              VARCHAR(25)     NOT NULL,
    bomNo           VARCHAR(50)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    product         VARCHAR(255)    NOT NULL,
    version         VARCHAR(20)     DEFAULT '1.0',
    description     TEXT,
    status          VARCHAR(50)     DEFAULT 'Draft',
    effectiveDate   DATE,
    revision        VARCHAR(20),
    preparedBy      VARCHAR(255),
    approvedBy      VARCHAR(255),
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_bomNo (bomNo),
    INDEX idx_bomNo (bomNo),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: BOMItem
-- Line items within a BOM — materials and components required for assembly
-- ============================================================================
CREATE TABLE BOMItem (
    id              VARCHAR(25)     NOT NULL,
    bomId           VARCHAR(25)     NOT NULL,
    slNo            INT,
    itemCode        VARCHAR(100),
    itemName        VARCHAR(255)    NOT NULL,
    specification   TEXT,
    quantity        DOUBLE          NOT NULL,
    unit            VARCHAR(50),
    unitCost        DOUBLE          DEFAULT 0,
    totalCost       DOUBLE          DEFAULT 0,
    remarks         TEXT,
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_bomId (bomId),
    CONSTRAINT fk_bomitem_bom FOREIGN KEY (bomId) REFERENCES BillOfMaterials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: WorkOrder
-- Work orders for fabrication, assembly, repair, and maintenance jobs
-- ============================================================================
CREATE TABLE WorkOrder (
    id              VARCHAR(25)     NOT NULL,
    woNo            VARCHAR(50)     NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT,
    type            VARCHAR(50),
    priority        VARCHAR(50)     DEFAULT 'Medium',
    status          VARCHAR(50)     DEFAULT 'Pending',
    assignedTo      VARCHAR(255),
    project         VARCHAR(25),
    startDate       DATE,
    dueDate         DATE,
    completedDate   DATE,
    estimatedCost   DOUBLE          DEFAULT 0,
    actualCost      DOUBLE          DEFAULT 0,
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_woNo (woNo),
    INDEX idx_woNo (woNo),
    INDEX idx_wo_status (status),
    INDEX idx_wo_assignedTo (assignedTo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: ProductionOrder
-- Production orders linking BOM and WorkOrder for actual manufacturing runs
-- ============================================================================
CREATE TABLE ProductionOrder (
    id              VARCHAR(25)     NOT NULL,
    poNo            VARCHAR(50)     NOT NULL,
    product         VARCHAR(255)    NOT NULL,
    quantity        INT             NOT NULL,
    bomId           VARCHAR(25),
    workOrderId     VARCHAR(25),
    status          VARCHAR(50)     DEFAULT 'Planned',
    startDate       DATE,
    targetDate      DATE,
    completedDate   DATE,
    completedQty    INT             DEFAULT 0,
    rejectedQty     INT             DEFAULT 0,
    remarks         TEXT,
    preparedBy      VARCHAR(255),
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_poNo (poNo),
    INDEX idx_poNo (poNo),
    INDEX idx_po_status (status),
    INDEX idx_po_bomId (bomId),
    INDEX idx_po_workOrderId (workOrderId),
    CONSTRAINT fk_prodorder_bom FOREIGN KEY (bomId) REFERENCES BillOfMaterials(id) ON DELETE SET NULL,
    CONSTRAINT fk_prodorder_wo FOREIGN KEY (workOrderId) REFERENCES WorkOrder(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT DATA: BillOfMaterials
-- 4 BOMs covering typical plant maintenance fabrication and assembly jobs
-- ============================================================================

-- BOM-001: Centrifugal Pump Assembly — common pump overhaul at refinery sites
INSERT INTO BillOfMaterials (id, bomNo, name, product, version, description, status, effectiveDate, revision, preparedBy, approvedBy)
VALUES ('bom_001', 'BOM-001', 'Centrifugal Pump Assembly', 'Centrifugal Pump API 610', '2.0',
        'BOM for complete centrifugal pump assembly during turnaround overhaul. Includes rotating assembly, casing, and auxiliaries.',
        'Active', '2025-01-01', 'Rev-C', 'Rajesh Mehta', 'Arun Sharma');

-- BOM-002: Heat Exchanger Bundle — retubing job for shell & tube exchangers
INSERT INTO BillOfMaterials (id, bomNo, name, product, version, description, status, effectiveDate, revision, preparedBy, approvedBy)
VALUES ('bom_002', 'BOM-002', 'Heat Exchanger Bundle', 'Shell & Tube Heat Exchanger', '1.0',
        'BOM for heat exchanger bundle retubing with SS304 tubes and SA516 tube sheets. Used in refinery CDU/VDU units.',
        'Active', '2025-01-15', 'Rev-A', 'Sanjay Kumar Singh', 'Rajesh Mehta');

-- BOM-003: Steel Structure Fabrication — platform and support structures
INSERT INTO BillOfMaterials (id, bomNo, name, product, version, description, status, effectiveDate, revision, preparedBy, approvedBy)
VALUES ('bom_003', 'BOM-003', 'Steel Structure Fabrication', 'MS Structural Platform', '1.0',
        'BOM for fabrication of mild steel structural platforms, supports, and mounting frames for plant equipment.',
        'Active', '2025-02-01', 'Rev-A', 'Nagarjuna Reddy', 'Sanjay Kumar Singh');

-- BOM-004: Control Panel Assembly — MCC and VFD panels for motor control
INSERT INTO BillOfMaterials (id, bomNo, name, product, version, description, status, effectiveDate, revision, preparedBy, approvedBy)
VALUES ('bom_004', 'BOM-004', 'Control Panel Assembly', 'Motor Control Centre Panel', '1.0',
        'BOM for fabrication of motor control panels with PLC, VFD, and protection components for HT/LT motor drives.',
        'Draft', '2025-02-10', 'Rev-A', 'Vikram Pandey', 'Arun Sharma');

-- ============================================================================
-- INSERT DATA: BOMItem
-- 21 line items across 4 BOMs with realistic specifications and costs
-- ============================================================================

-- BOM-001: Centrifugal Pump Assembly (6 items)
INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_001', 'bom_001', 1, 'RM-SHF-001', 'Pump Shaft', 'EN8 Steel, Forged, Ø80mm x 450mm, machined to tolerance H7', 1, 'Nos', 12500.00, 12500.00, 'Dynamic balanced after machining');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_002', 'bom_001', 2, 'RM-IMP-001', 'Semi-Open Impeller', 'SS316 Investment Cast, 6" dia, 5 vanes, max RPM 2950', 1, 'Nos', 18500.00, 18500.00, 'Hydrotested at 15 bar');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_003', 'bom_001', 3, 'RM-CAS-001', 'Volute Casing', 'Cast Iron Grade 25, volute profile, flanged connections', 1, 'Nos', 22000.00, 22000.00, 'Machined on CNC for seal face');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_004', 'bom_001', 4, 'RM-BRG-001', 'Deep Groove Bearing', 'SKF 6314-2RS, C3 clearance, double sealed', 2, 'Nos', 4200.00, 8400.00, 'Both DE and NDE bearings');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_005', 'bom_001', 5, 'RM-SEL-001', 'Mechanical Seal', 'Crane 1472, cartridge type, SS316/SiC/PTFE, dual seal', 1, 'Set', 35000.00, 35000.00, 'API 682 compliant, for hydrocarbon service');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_006', 'bom_001', 6, 'RM-CPL-001', 'Flexible Coupling', 'Fenner F9, spacer type, size 107, GR 42', 1, 'Nos', 9800.00, 9800.00, 'Includes guard and spacer');

-- BOM-002: Heat Exchanger Bundle (5 items)
INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_007', 'bom_002', 1, 'RM-TUB-001', 'Seamless Tubes', 'SS304 ASTM A213, Ø19.05mm OD x 2.11mm WT x 6000mm length', 80, 'Nos', 1850.00, 148000.00, 'UT tested, pickle passivated');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_008', 'bom_002', 2, 'RM-TSH-001', 'Tube Sheet', 'SA516 Gr.70, Ø600mm x 40mm thick, drilled and grooved', 2, 'Nos', 28000.00, 56000.00, 'CNC drilled for tube-to-sheet joints');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_009', 'bom_002', 3, 'RM-BFL-001', 'Segmental Baffles', 'SS304, 25% cut, Ø588mm, 4mm thick', 8, 'Nos', 3200.00, 25600.00, 'Laser cut with burr-free edges');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_010', 'bom_002', 4, 'RM-GSK-001', 'Spiral Wound Gasket', 'SS316/graphite, inner ring, DN600, CL150', 4, 'Nos', 4500.00, 18000.00, 'ASME B16.20 compliant');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_011', 'bom_002', 5, 'RM-FLG-001', 'Weld Neck Flanges', 'SA105 forged, WNRF, DN600, CL150, ASME B16.5', 2, 'Nos', 15500.00, 31000.00, 'Machined face finish 125 Ra');

-- BOM-003: Steel Structure Fabrication (4 items)
INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_012', 'bom_003', 1, 'RM-PLT-001', 'MS Plates', 'IS 2062 Gr.A, 12mm thick, 2500mm x 1250mm', 6, 'Nos', 8200.00, 49200.00, 'Cut and bevelled for welding');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_013', 'bom_003', 2, 'RM-ANL-001', 'MS Angles', 'ISA 75x75x6mm, IS 2062 Gr.A, 6m length', 10, 'Nos', 950.00, 9500.00, 'Hot rolled, mill certified');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_014', 'bom_003', 3, 'RM-BLT-001', 'High Tension Bolts', 'M20x80mm, Grade 8.8, black, with nut and washer', 50, 'Sets', 85.00, 4250.00, 'Galvanised for outdoor use');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_015', 'bom_003', 4, 'RM-WLD-001', 'Welding Electrodes', 'E7018, 3.15mm, low hydrogen, AWS A5.1', 20, 'Kg', 280.00, 5600.00, 'Baked at 300°C before use');

-- BOM-004: Control Panel Assembly (6 items)
INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_016', 'bom_004', 1, 'RM-PLC-001', 'PLC Controller', 'Siemens S7-1200 CPU 1214C, AC/DC/RLY, 14DI/10DO/2AI', 1, 'Nos', 45000.00, 45000.00, 'With 16-channel DI and 2AO expansion');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_017', 'bom_004', 2, 'RM-VFD-001', 'Variable Frequency Drive', 'ABB ACS580-01-060A-3, 15kW, 3-phase, IP21', 1, 'Nos', 62000.00, 62000.00, 'With EMC filter and brake chopper');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_018', 'bom_004', 3, 'RM-MCB-001', 'MCB Triple Pole', 'Schneider Acti9 C60, 3P, 32A, C-curve, 10kA', 4, 'Nos', 1850.00, 7400.00, 'For feeder and branch protection');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_019', 'bom_004', 4, 'RM-CON-001', 'Contactors', 'Siemens 3RT2026, 3-pole, 25A, AC-3, 220V coil', 3, 'Nos', 3400.00, 10200.00, 'With 1NO+1NC auxiliary block');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_020', 'bom_004', 5, 'RM-CBL-001', 'Power Cables', '4-core XLPE, 3x10+1x6 sq.mm, Cu, 90°C rated, 20m', 1, 'Lot', 4800.00, 4800.00, 'IS 7098 Part-1, flame retardant');

INSERT INTO BOMItem (id, bomId, slNo, itemCode, itemName, specification, quantity, unit, unitCost, totalCost, remarks)
VALUES ('bitem_021', 'bom_004', 6, 'RM-ENC-001', 'Panel Enclosure', 'IP65, powder coated CRCA, 1200x800x300mm, with door', 1, 'Nos', 18000.00, 18000.00, 'With mounting plate and cable gland plate');

-- ============================================================================
-- INSERT DATA: WorkOrder
-- 8 work orders covering fabrication, assembly, repair, and maintenance
-- ============================================================================

-- WO-2025-001: Centrifugal Pump Overhaul at Reliance Jamnagar
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_001', 'WO-2025-001', 'Centrifugal Pump Overhaul — Crude Transfer Pump P-101A',
        'Complete overhaul of crude transfer centrifugal pump. Includes bearing replacement, mechanical seal installation, impeller clearance check, and alignment with motor. BOM-001 to be used for material procurement.',
        'Assembly', 'Critical', 'In Progress', 'Rajesh Mehta', 'proj_001',
        '2025-01-10', '2025-01-20', NULL, 250000.00, 185000.00);

-- WO-2025-002: Heat Exchanger Retubing at Tata Steel
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_002', 'WO-2025-002', 'Heat Exchanger Retubing — Blast Furnace Gas Cooler E-201',
        'Full retubing of shell & tube heat exchanger for blast furnace gas cooling. All 80 tubes to be replaced, tube sheets re-drilled, and hydrotested at 1.5x design pressure.',
        'Fabrication', 'High', 'In Progress', 'Sanjay Kumar Singh', 'proj_002',
        '2025-01-15', '2025-02-05', NULL, 450000.00, 320000.00);

-- WO-2025-003: Structural Steel Repair at NTPC Singrauli
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_003', 'WO-2025-003', 'Structural Steel Repair — Conveyor Support Platform',
        'Fabrication and erection of replacement conveyor support platform. Existing structure corroded beyond repair. New MS platform with grating to be fabricated as per BOM-003.',
        'Fabrication', 'Medium', 'Pending', 'Vikram Pandey', 'proj_003',
        '2025-02-01', '2025-02-15', NULL, 120000.00, 0.00);

-- WO-2025-004: Motor Control Panel Fabrication at UltraTech Cement
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_004', 'WO-2025-004', 'Motor Control Panel Fabrication — Kiln Fan Drive Panel',
        'Design and fabrication of VFD-based motor control panel for kiln induced draft fan. Panel to include PLC, VFD, MCBs, contactors, and power cables as per BOM-004.',
        'Assembly', 'High', 'Pending', 'Nagarjuna Reddy', 'proj_004',
        '2025-02-10', '2025-02-28', NULL, 210000.00, 0.00);

-- WO-2025-005: Gate Valve Refurbishment at IOCL Panipat
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_005', 'WO-2025-005', 'Gate Valve Refurbishment — 8" CL300 CS Gate Valves',
        'Refurbishment of 6 nos. 8" CL300 carbon steel gate valves. Scope includes lapping of seat and wedge, stem repacking, handwheel replacement, and hydrotesting.',
        'Repair', 'Medium', 'Pending', 'Arun Sharma', 'proj_005',
        '2025-03-01', '2025-03-15', NULL, 95000.00, 0.00);

-- WO-2025-006: HT Motor Rewinding at JSW Steel
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_006', 'WO-2025-006', 'HT Motor Rewinding — 6.6kV 350kW Rolling Mill Motor',
        'Complete rewinding of 6.6kV, 350kW, 6-pole HT motor for hot strip mill. Includes copper winding replacement, VPI impregnation, rotor balancing, and no-load/full-load test.',
        'Repair', 'Critical', 'Pending', 'Pradeep Rao', 'proj_006',
        '2025-03-10', '2025-03-30', NULL, 380000.00, 0.00);

-- WO-2025-007: Pipe Spool Fabrication at Reliance Jamnagar
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_007', 'WO-2025-007', 'Pipe Spool Fabrication — Cooling Water Line Spools',
        'Fabrication of 15 pipe spools for cooling water replacement. Material: SS304, sizes ranging from 2" to 6". Includes welding, NDT (RT), and pickling passivation.',
        'Fabrication', 'Low', 'Completed', 'Suresh Patel', 'proj_001',
        '2025-01-05', '2025-01-12', '2025-01-11', 75000.00, 68000.00);

-- WO-2025-008: Storage Tank Repair at NTPC Singrauli
INSERT INTO WorkOrder (id, woNo, title, description, type, priority, status, assignedTo, project, startDate, dueDate, completedDate, estimatedCost, actualCost)
VALUES ('wo_008', 'WO-2025-008', 'Storage Tank Repair — HFO Tank Bottom Plate Patching',
        'Repair of heavy fuel oil storage tank bottom plate corrosion. Scope includes plate cutting, welding of 4mm SS patches, NDT by MPI, and post-weld hydrotest.',
        'Maintenance', 'High', 'In Progress', 'Vikram Pandey', 'proj_003',
        '2025-01-20', '2025-02-05', NULL, 165000.00, 92000.00);

-- ============================================================================
-- INSERT DATA: ProductionOrder
-- 6 production orders linking BOMs and WorkOrders for manufacturing runs
-- ============================================================================

-- PROD-2025-001: Centrifugal Pump Assembly linked to BOM-001 and WO-001
INSERT INTO ProductionOrder (id, poNo, product, quantity, bomId, workOrderId, status, startDate, targetDate, completedDate, completedQty, rejectedQty, remarks, preparedBy)
VALUES ('prod_001', 'PROD-2025-001', 'Centrifugal Pump API 610 — 50kW', 1, 'bom_001', 'wo_001',
        'In Progress', '2025-01-12', '2025-01-20', NULL, 0, 0,
        'Pump assembly in progress — shaft and impeller fitted, bearing housing under assembly', 'Rajesh Mehta');

-- PROD-2025-002: Heat Exchanger Bundle linked to BOM-002 and WO-002
INSERT INTO ProductionOrder (id, poNo, product, quantity, bomId, workOrderId, status, startDate, targetDate, completedDate, completedQty, rejectedQty, remarks, preparedBy)
VALUES ('prod_002', 'PROD-2025-002', 'Heat Exchanger Bundle — DN600 S&T', 1, 'bom_002', 'wo_002',
        'In Progress', '2025-01-18', '2025-02-05', NULL, 0, 0,
        'Tube expansion in progress — 48 of 80 tubes expanded, remaining to be done by 28 Jan', 'Sanjay Kumar Singh');

-- PROD-2025-003: Steel Structure linked to BOM-003 and WO-003
INSERT INTO ProductionOrder (id, poNo, product, quantity, bomId, workOrderId, status, startDate, targetDate, completedDate, completedQty, rejectedQty, remarks, preparedBy)
VALUES ('prod_003', 'PROD-2025-003', 'MS Structural Platform — Conveyor Support', 1, 'bom_003', 'wo_003',
        'Planned', '2025-02-01', '2025-02-15', NULL, 0, 0,
        'Material requisition raised — awaiting MS plate delivery from warehouse', 'Vikram Pandey');

-- PROD-2025-004: Motor Control Panel linked to BOM-004 and WO-004
INSERT INTO ProductionOrder (id, poNo, product, quantity, bomId, workOrderId, status, startDate, targetDate, completedDate, completedQty, rejectedQty, remarks, preparedBy)
VALUES ('prod_004', 'PROD-2025-004', 'Motor Control Panel — 15kW VFD with PLC', 1, 'bom_004', 'wo_004',
        'Planned', '2025-02-12', '2025-02-28', NULL, 0, 0,
        'Panel design approved — PLC and VFD procurement in progress', 'Nagarjuna Reddy');

-- PROD-2025-005: Pipe Spool Set linked to WO-007 (no specific BOM, direct fabrication)
INSERT INTO ProductionOrder (id, poNo, product, quantity, bomId, workOrderId, status, startDate, targetDate, completedDate, completedQty, rejectedQty, remarks, preparedBy)
VALUES ('prod_005', 'PROD-2025-005', 'Pipe Spool Set — SS304 CW Line (2" to 6")', 15, NULL, 'wo_007',
        'Completed', '2025-01-05', '2025-01-12', '2025-01-11', 15, 1,
        'All 15 spools fabricated, NDT (RT) completed. 1 spool rejected due to weld porosity — re-welded and accepted', 'Suresh Patel');

-- PROD-2025-006: Tank Repair Patch Kit linked to WO-008
INSERT INTO ProductionOrder (id, poNo, product, quantity, bomId, workOrderId, status, startDate, targetDate, completedDate, completedQty, rejectedQty, remarks, preparedBy)
VALUES ('prod_006', 'PROD-2025-006', 'HFO Tank Bottom Patch Plates — 4mm SS316L', 6, NULL, 'wo_008',
        'In Progress', '2025-01-22', '2025-02-05', NULL, 3, 0,
        '3 of 6 patch plates cut and welded. Remaining patches scheduled for next shutdown window', 'Vikram Pandey');
