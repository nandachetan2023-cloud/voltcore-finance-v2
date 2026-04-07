-- ============================================================================
-- MODULE 10: Inventory Management
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : Warehouse, InventoryItem, StockMovement
-- Context : Management of maintenance spares and consumables across site
--           warehouses. Covers bearings, seals, gaskets, valves, motors,
--           electrical items, PPE, tools, and consumables used in plant
--           shutdown, O&M, and preventive maintenance activities.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: Warehouse
-- Stores warehouse/store locations at each project site and HQ.
-- Types: General (standard stores), Cold (temperature-sensitive items),
--        Hazardous (chemicals, flammables), Tool Crib (hand/power tools)
-- ----------------------------------------------------------------------------
CREATE TABLE Warehouse (
    id          VARCHAR(25)    NOT NULL,
    code        VARCHAR(50)    NOT NULL,
    name        VARCHAR(255)   NOT NULL,
    location    VARCHAR(255)   NOT NULL,
    manager     VARCHAR(255)   DEFAULT NULL,
    capacity    INT            DEFAULT 0,
    used        INT            DEFAULT 0,
    type        VARCHAR(50)    DEFAULT 'General',
    status      VARCHAR(50)    DEFAULT 'Active',
    createdAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_warehouse_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: InventoryItem
-- Master list of all maintenance spares, consumables, PPE, and tools tracked
-- in inventory. Categories span mechanical, electrical, safety, and general
-- plant maintenance items commonly used in refinery/steel/power/cement plants.
-- unit options: Nos, Kg, Mtr, Ltr, Set, Pair, Pcs
-- status logic: In Stock (currentStock > minStock), Low Stock (currentStock <= minStock),
--               Out of Stock (currentStock = 0), On Order (PO placed, not yet received)
-- ----------------------------------------------------------------------------
CREATE TABLE InventoryItem (
    id            VARCHAR(25)    NOT NULL,
    itemCode      VARCHAR(100)   NOT NULL,
    name          VARCHAR(255)   NOT NULL,
    category      VARCHAR(100)   NOT NULL,
    subCategory   VARCHAR(100)   DEFAULT NULL,
    unit          VARCHAR(50)    DEFAULT 'Nos',
    currentStock  INT            DEFAULT 0,
    minStock      INT            DEFAULT 0,
    maxStock      INT            DEFAULT 0,
    unitCost      DOUBLE         DEFAULT 0,
    warehouse     VARCHAR(25)    DEFAULT NULL,
    supplier      VARCHAR(255)   DEFAULT NULL,
    status        VARCHAR(50)    DEFAULT 'In Stock',
    createdAt     DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt     DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_item_code (itemCode),
    INDEX idx_item_warehouse (warehouse),
    INDEX idx_item_category (category),
    CONSTRAINT fk_invitem_warehouse FOREIGN KEY (warehouse) REFERENCES Warehouse(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: StockMovement
-- Records all inward (PO receipt), outward (issue to work orders), transfers
-- between warehouses, and manual adjustments (damage, audit correction).
-- type options: In, Out, Transfer, Adjustment
-- ----------------------------------------------------------------------------
CREATE TABLE StockMovement (
    id              VARCHAR(25)    NOT NULL,
    itemCode        VARCHAR(100)   NOT NULL,
    itemName        VARCHAR(255)   NOT NULL,
    type            VARCHAR(50)    NOT NULL,
    quantity        INT            NOT NULL,
    fromWarehouse   VARCHAR(255)   DEFAULT NULL,
    toWarehouse     VARCHAR(255)   DEFAULT NULL,
    reference       VARCHAR(255)   DEFAULT NULL,
    date            DATE           NOT NULL,
    remarks         TEXT           DEFAULT NULL,
    performedBy     VARCHAR(255)   DEFAULT NULL,
    createdAt       DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_movement_itemcode (itemCode),
    INDEX idx_movement_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT DATA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Warehouses (4 records — from design reference Section 2.5)
-- Each warehouse is located at a project site with a designated storekeeper.
-- Capacity and usage figures reflect current occupancy.
-- ----------------------------------------------------------------------------
INSERT INTO Warehouse (id, code, name, location, manager, capacity, used, type, status) VALUES
('wh_001', 'WH-JMG', 'Jamnagar Central Store', 'Reliance Jamnagar Refinery, Gujarat',
 'Ganesh Patil', 5000, 3850, 'General', 'Active'),

('wh_002', 'WH-JSD', 'Jamshedpur Site Store', 'Tata Steel Plant, Jamshedpur, Jharkhand',
 'Mahesh Kumar', 3500, 2200, 'General', 'Active'),

('wh_003', 'WH-SNG', 'Singrauli Warehouse', 'NTPC Singrauli Super Thermal, Madhya Pradesh',
 'Vikram Pandey', 4000, 3100, 'General', 'Active'),

('wh_004', 'WH-HQ', 'Mumbai HQ Store', 'Mumbai HQ, Maharashtra',
 'Ravi Tiwari', 2000, 1200, 'General', 'Active');

-- ----------------------------------------------------------------------------
-- Inventory Items (25 records)
-- Maintenance spares and consumables used across VoltCore project sites.
-- Spread across categories: Bearings, Seals, Gaskets, Valves, Motors,
-- Bolts, Electrical, PPE, Tools, Consumables.
-- Stock statuses: mostly In Stock, some Low Stock, some Out of Stock.
-- Suppliers reference vendors from design reference Section 2.6.
-- ----------------------------------------------------------------------------
INSERT INTO InventoryItem (id, itemCode, name, category, subCategory, unit, currentStock, minStock, maxStock, unitCost, warehouse, supplier, status) VALUES
-- Bearings (3 items)
('inv_0001', 'BRG-SKF-6205', 'SKF 6205-2Z Deep Groove Ball Bearing', 'Bearings', 'Deep Groove', 'Nos', 120, 20, 200, 450.00, 'wh_001', 'SKF India Ltd', 'In Stock'),
('inv_0002', 'BRG-SKF-6310', 'SKF 6310-2RS Deep Groove Ball Bearing', 'Bearings', 'Deep Groove', 'Nos', 8, 15, 100, 1250.00, 'wh_002', 'SKF India Ltd', 'Low Stock'),
('inv_0003', 'BRG-TKN-32216', 'Timken 32216 Tapered Roller Bearing', 'Bearings', 'Tapered Roller', 'Nos', 45, 10, 80, 2800.00, 'wh_001', 'Timken India', 'In Stock'),

-- Seals (2 items)
('inv_0004', 'SEL-MEC-40', 'Mechanical Seal 40mm Single Spring', 'Seals', 'Mechanical Seal', 'Nos', 0, 5, 30, 3500.00, 'wh_001', 'Bharat Engineering Supplies', 'Out of Stock'),
('inv_0005', 'SEL-MEC-65', 'Mechanical Seal 65mm Cartridge Type', 'Seals', 'Mechanical Seal', 'Nos', 6, 5, 25, 8500.00, 'wh_003', 'Bharat Engineering Supplies', 'In Stock'),

-- Gaskets (2 items)
('inv_0006', 'GSK-SW-50', 'Spiral Wound Gasket 50mm SS316/Graphite', 'Gaskets', 'Spiral Wound', 'Nos', 200, 30, 500, 180.00, 'wh_001', 'Bharat Engineering Supplies', 'In Stock'),
('inv_0007', 'GSK-SW-150', 'Spiral Wound Gasket 150mm SS316/Graphite', 'Gaskets', 'Spiral Wound', 'Nos', 4, 20, 150, 520.00, 'wh_002', 'Bharat Engineering Supplies', 'Low Stock'),

-- Valves (3 items)
('inv_0008', 'VLV-GT-25', 'Gate Valve 25mm CS ASME 150', 'Valves', 'Gate Valve', 'Nos', 35, 10, 60, 4200.00, 'wh_001', 'L&T Valves', 'In Stock'),
('inv_0009', 'VLV-BL-50', 'Ball Valve 50mm SS304 Floating Type', 'Valves', 'Ball Valve', 'Nos', 18, 5, 40, 6800.00, 'wh_003', 'L&T Valves', 'In Stock'),
('inv_0010', 'VLV-GV-80', 'Globe Valve 80mm CS ASME 300', 'Valves', 'Globe Valve', 'Nos', 3, 8, 30, 9500.00, 'wh_001', 'L&T Valves', 'Low Stock'),

-- Motors (2 items)
('inv_0011', 'MOT-3PH-7.5', '3-Phase AC Motor 7.5kW 415V 1440RPM', 'Motors', 'AC Motor', 'Nos', 5, 2, 10, 45000.00, 'wh_003', 'Siemens India', 'In Stock'),
('inv_0012', 'MOT-VFD-11', 'VFD Drive 11kW 3-Phase 415V', 'Motors', 'VFD Drive', 'Nos', 0, 2, 8, 62000.00, 'wh_001', 'ABB India Ltd', 'Out of Stock'),

-- Bolts & Fasteners (2 items)
('inv_0013', 'BLT-HT-M20', 'HT Bolt M20x80 Grade 8.8 (Set of 1 Nut+1 Bolt)', 'Bolts', 'Hex Bolt', 'Nos', 500, 100, 1000, 65.00, 'wh_001', 'Bharat Engineering Supplies', 'In Stock'),
('inv_0014', 'BLT-ANC-M12', 'Anchor Bolt M12x100 Grade 4.6', 'Bolts', 'Anchor Bolt', 'Nos', 300, 50, 800, 35.00, 'wh_002', 'Bharat Engineering Supplies', 'In Stock'),

-- Electrical (3 items)
('inv_0015', 'ELC-LUG-35', 'Cable Lug 35mm2 Copper Tubular', 'Electrical', 'Cable Lug', 'Nos', 250, 50, 500, 45.00, 'wh_003', 'Bharat Engineering Supplies', 'In Stock'),
('inv_0016', 'ELC-MCB-63', 'MCB 63A Triple Pole 10kA C-Curve', 'Electrical', 'MCB', 'Nos', 12, 5, 30, 1850.00, 'wh_001', 'ABB India Ltd', 'In Stock'),
('inv_0017', 'ELC-CTC-2.5', 'Control Cable 2.5sqmm 4-Core', 'Electrical', 'Control Cable', 'Mtr', 800, 200, 2000, 42.00, 'wh_003', 'Bharat Engineering Supplies', 'In Stock'),

-- PPE (3 items)
('inv_0018', 'PPE-HMT-01', 'Safety Helmet ISI Marked (White)', 'PPE', 'Head Protection', 'Nos', 60, 15, 100, 280.00, 'wh_004', 'Godrej & Boyce', 'In Stock'),
('inv_0019', 'PPE-SHO-09', 'Safety Shoes Steel Toe IS 15298', 'PPE', 'Foot Protection', 'Pair', 10, 20, 80, 2200.00, 'wh_001', 'Godrej & Boyce', 'Low Stock'),
('inv_0020', 'PPE-GLV-RB', 'Rubber Insulated Gloves Class 00', 'PPE', 'Hand Protection', 'Pair', 25, 10, 50, 650.00, 'wh_003', 'Godrej & Boyce', 'In Stock'),

-- Tools (2 items)
('inv_0021', 'TLS-HND-ST1', 'Hand Tool Set (Spanner 8-32mm Combination)', 'Tools', 'Hand Tools', 'Set', 15, 5, 20, 4500.00, 'wh_004', 'Godrej & Boyce', 'In Stock'),
('inv_0022', 'TLS-PWR-GD', 'Angle Grinder 4-inch 850W', 'Tools', 'Power Tools', 'Nos', 8, 3, 15, 3800.00, 'wh_002', 'Bharat Engineering Supplies', 'In Stock'),

-- Consumables (3 items)
('inv_0023', 'CNM-LUB-68', 'Hydraulic Lubricant Oil ISO 68 (20L Can)', 'Consumables', 'Lubricants', 'Ltr', 160, 40, 400, 220.00, 'wh_001', 'Indian Oil Petrochemicals', 'In Stock'),
('inv_0024', 'CNM-CLN-THN', 'Industrial Cleaning Solvent THF (5L Can)', 'Consumables', 'Cleaning Chemicals', 'Ltr', 30, 20, 100, 380.00, 'wh_003', 'Indian Oil Petrochemicals', 'In Stock'),
('inv_0025', 'CNM-WLD-7018', 'Welding Rod E7018 3.15mm (1kg Pack)', 'Consumables', 'Welding Consumables', 'Kg', 15, 25, 200, 180.00, 'wh_002', 'Bharat Engineering Supplies', 'Low Stock');

-- ----------------------------------------------------------------------------
-- Stock Movements (20 records)
-- 10 Inward (from Purchase Orders), 5 Outward (issued to Work Orders),
-- 3 Transfers (between warehouses), 2 Adjustments (audit/damage correction).
-- performedBy references employee names from design reference Section 2.4.
-- ----------------------------------------------------------------------------
INSERT INTO StockMovement (id, itemCode, itemName, type, quantity, fromWarehouse, toWarehouse, reference, date, remarks, performedBy) VALUES
-- === 10 Inward Movements (Goods received against Purchase Orders) ===
('stm_0001', 'BRG-SKF-6205', 'SKF 6205-2Z Deep Groove Ball Bearing', 'In', 50, 'SKF India Ltd', 'WH-JMG', 'PO-2025-001', '2025-01-05', 'Received against PO for Jamnagar AMC annual requirement', 'Ganesh Patil'),
('stm_0002', 'BRG-TKN-32216', 'Timken 32216 Tapered Roller Bearing', 'In', 20, 'Timken India', 'WH-JMG', 'PO-2025-002', '2025-01-08', 'Urgent procurement for compressor overhaul at Reliance', 'Ganesh Patil'),
('stm_0003', 'GSK-SW-50', 'Spiral Wound Gasket 50mm SS316/Graphite', 'In', 100, 'Bharat Engineering Supplies', 'WH-JMG', 'PO-2025-003', '2025-01-10', 'Bulk procurement for shutdown spares kit', 'Ganesh Patil'),
('stm_0004', 'VLV-GT-25', 'Gate Valve 25mm CS ASME 150', 'In', 15, 'L&T Valves', 'WH-JSD', 'PO-2025-004', '2025-01-12', 'Valve procured for Tata Steel BF-3 shutdown', 'Mahesh Kumar'),
('stm_0005', 'MOT-3PH-7.5', '3-Phase AC Motor 7.5kW 415V 1440RPM', 'In', 2, 'Siemens India', 'WH-SNG', 'PO-2025-005', '2025-01-15', 'Spare motors for NTPC coal handling conveyor', 'Vikram Pandey'),
('stm_0006', 'ELC-MCB-63', 'MCB 63A Triple Pole 10kA C-Curve', 'In', 8, 'ABB India Ltd', 'WH-JMG', 'PO-2025-006', '2025-01-18', 'Electrical spares for relay panel maintenance', 'Ganesh Patil'),
('stm_0007', 'PPE-HMT-01', 'Safety Helmet ISI Marked (White)', 'In', 30, 'Godrej & Boyce', 'WH-HQ', 'PO-2025-007', '2025-01-20', 'PPE stock replenishment for all sites', 'Ravi Tiwari'),
('stm_0008', 'CNM-LUB-68', 'Hydraulic Lubricant Oil ISO 68 (20L Can)', 'In', 80, 'Indian Oil Petrochemicals', 'WH-JMG', 'PO-2025-008', '2025-01-22', 'Quarterly lubricant procurement for Reliance site', 'Ganesh Patil'),
('stm_0009', 'BLT-HT-M20', 'HT Bolt M20x80 Grade 8.8 (Set of 1 Nut+1 Bolt)', 'In', 200, 'Bharat Engineering Supplies', 'WH-JSD', 'PO-2025-009', '2025-01-25', 'Fasteners for Tata Steel shutdown structural work', 'Mahesh Kumar'),
('stm_0010', 'PPE-SHO-09', 'Safety Shoes Steel Toe IS 15298', 'In', 10, 'Godrej & Boyce', 'WH-JMG', 'PO-2025-010', '2025-01-28', 'Safety shoes for new on-site technicians', 'Ganesh Patil'),

-- === 5 Outward Movements (Issued to Work Orders) ===
('stm_0011', 'BRG-SKF-6205', 'SKF 6205-2Z Deep Groove Ball Bearing', 'Out', 10, 'WH-JMG', 'Reliance Jamnagar AMC', 'WO-2025-001', '2025-01-15', 'Issued for pump bearing replacement at RO plant', 'Ganesh Patil'),
('stm_0012', 'GSK-SW-50', 'Spiral Wound Gasket 50mm SS316/Graphite', 'Out', 24, 'WH-JMG', 'Reliance Jamnagar AMC', 'WO-2025-002', '2025-01-18', 'Issued for heat exchanger flange gasket replacement', 'Ganesh Patil'),
('stm_0013', 'VLV-GT-25', 'Gate Valve 25mm CS ASME 150', 'Out', 5, 'WH-JSD', 'Tata Steel BF-3 Shutdown', 'WO-2025-003', '2025-01-20', 'Valves for blast furnace cooling water line', 'Mahesh Kumar'),
('stm_0014', 'CNM-WLD-7018', 'Welding Rod E7018 3.15mm (1kg Pack)', 'Out', 10, 'WH-JSD', 'Tata Steel BF-3 Shutdown', 'WO-2025-004', '2025-01-22', 'Welding consumables for structural repair work', 'Mahesh Kumar'),
('stm_0015', 'ELC-LUG-35', 'Cable Lug 35mm2 Copper Tubular', 'Out', 40, 'WH-SNG', 'NTPC Singrauli O&M', 'WO-2025-005', '2025-01-25', 'Cable termination materials for HT panel wiring', 'Vikram Pandey'),

-- === 3 Transfer Movements (Between Warehouses) ===
('stm_0016', 'BRG-SKF-6205', 'SKF 6205-2Z Deep Groove Ball Bearing', 'Transfer', 15, 'WH-JMG', 'WH-JSD', 'TRF-2025-001', '2025-01-20', 'Transferred to Jamshedpur for emergency compressor job', 'Ganesh Patil'),
('stm_0017', 'MOT-3PH-7.5', '3-Phase AC Motor 7.5kW 415V 1440RPM', 'Transfer', 1, 'WH-SNG', 'WH-JMG', 'TRF-2025-002', '2025-01-22', 'Motor sent to Jamnagar for fan replacement at Reliance', 'Vikram Pandey'),
('stm_0018', 'PPE-SHO-09', 'Safety Shoes Steel Toe IS 15298', 'Transfer', 5, 'WH-HQ', 'WH-SNG', 'TRF-2025-003', '2025-01-28', 'Safety shoes dispatched to Singrauli for new joiners', 'Ravi Tiwari'),

-- === 2 Adjustment Movements (Audit/Damage Correction) ===
('stm_0019', 'VLV-BL-50', 'Ball Valve 50mm SS304 Floating Type', 'Adjustment', -2, 'WH-SNG', NULL, 'ADJ-2025-001', '2025-01-30', 'Adjusted due to 2 units found damaged during stock audit — beyond repair', 'Vikram Pandey'),
('stm_0020', 'BLT-ANC-M12', 'Anchor Bolt M12x100 Grade 4.6', 'Adjustment', 20, 'WH-JSD', NULL, 'ADJ-2025-002', '2025-01-31', 'Physical count reconciliation — 20 extra units found during verification', 'Mahesh Kumar')
