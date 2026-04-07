-- ============================================================================
-- MODULE 18: Asset Management
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Manages all company assets including power tools, heavy equipment, vehicles,
-- testing equipment, and IT equipment. Tracks maintenance schedules, asset
-- allocations to employees/teams, and disposal records.
-- ============================================================================

-- ============================================================================
-- TABLE: Asset
-- Master table for all physical assets owned by the company
-- ============================================================================
CREATE TABLE Asset (
    id              VARCHAR(25)      NOT NULL,
    assetCode       VARCHAR(50)      NOT NULL,
    name            VARCHAR(255)     NOT NULL,
    category        VARCHAR(100)     NOT NULL,
    subCategory     VARCHAR(100)     DEFAULT NULL,
    make            VARCHAR(100)     DEFAULT NULL,
    model           VARCHAR(100)     DEFAULT NULL,
    serialNo        VARCHAR(100)     DEFAULT NULL,
    purchaseDate    DATE             DEFAULT NULL,
    purchaseCost    DOUBLE           NOT NULL,
    currentValue    DOUBLE           DEFAULT NULL,
    vendor          VARCHAR(255)     DEFAULT NULL,
    location        VARCHAR(255)     DEFAULT NULL,
    site            VARCHAR(255)     DEFAULT NULL,
    `condition`     VARCHAR(50)      DEFAULT NULL,
    warrantyEnd     DATE             DEFAULT NULL,
    depreciationRate DOUBLE          DEFAULT 10,
    status          VARCHAR(50)      DEFAULT 'Active',
    assignedTo      VARCHAR(255)     DEFAULT NULL,
    createdAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_asset_code (assetCode),
    INDEX idx_asset_category (category),
    INDEX idx_asset_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: AssetMaintenance
-- Records all maintenance activities performed on assets including preventive,
-- breakdown repairs, calibration, and annual servicing
-- ============================================================================
CREATE TABLE AssetMaintenance (
    id              VARCHAR(25)      NOT NULL,
    assetId         VARCHAR(25)      NOT NULL,
    type            VARCHAR(50)      DEFAULT NULL,
    scheduledDate   DATE             DEFAULT NULL,
    completedDate   DATE             DEFAULT NULL,
    performedBy     VARCHAR(255)     DEFAULT NULL,
    cost            DOUBLE           DEFAULT 0,
    description     TEXT             DEFAULT NULL,
    findings        TEXT             DEFAULT NULL,
    nextDueDate     DATE             DEFAULT NULL,
    status          VARCHAR(50)      DEFAULT 'Scheduled',
    createdAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_maint_asset_id (assetId),
    INDEX idx_maint_type (type),
    INDEX idx_maint_status (status),
    CONSTRAINT fk_maint_asset FOREIGN KEY (assetId) REFERENCES Asset(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: AssetAllocation
-- Tracks allocation of assets to employees, departments, and sites
-- ============================================================================
CREATE TABLE AssetAllocation (
    id              VARCHAR(25)      NOT NULL,
    assetId         VARCHAR(25)      NOT NULL,
    allocatedTo     VARCHAR(255)     NOT NULL,
    empId           VARCHAR(25)      DEFAULT NULL,
    department      VARCHAR(255)     DEFAULT NULL,
    site            VARCHAR(255)     DEFAULT NULL,
    allocationDate  DATE             NOT NULL,
    returnDate      DATE             DEFAULT NULL,
    purpose         TEXT             DEFAULT NULL,
    status          VARCHAR(50)      DEFAULT 'Allocated',
    remarks         TEXT             DEFAULT NULL,
    createdAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_alloc_asset_id (assetId),
    INDEX idx_alloc_allocated_to (allocatedTo),
    CONSTRAINT fk_alloc_asset FOREIGN KEY (assetId) REFERENCES Asset(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: AssetDisposal
-- Records disposal of assets through sale, scrap, donation, auction, or trade-in
-- ============================================================================
CREATE TABLE AssetDisposal (
    id              VARCHAR(25)      NOT NULL,
    assetId         VARCHAR(25)      NOT NULL,
    disposalDate    DATE             NOT NULL,
    method          VARCHAR(50)      DEFAULT NULL,
    buyer           VARCHAR(255)     DEFAULT NULL,
    salePrice       DOUBLE           DEFAULT 0,
    remarks         TEXT             DEFAULT NULL,
    approvedBy      VARCHAR(255)     DEFAULT NULL,
    status          VARCHAR(50)      DEFAULT 'Proposed',
    createdAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)      DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_disposal_asset_id (assetId),
    CONSTRAINT fk_disposal_asset FOREIGN KEY (assetId) REFERENCES Asset(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT DATA: Asset (15 records)
-- Categories: Power Tools (4), Heavy Equipment (3), Vehicles (3),
--             Testing Equipment (3), IT Equipment (2)
-- ============================================================================

-- Power Tools (4)
INSERT INTO Asset (id, assetCode, name, category, subCategory, make, model, serialNo, purchaseDate, purchaseCost, currentValue, vendor, location, site, `condition`, warrantyEnd, depreciationRate, status, assignedTo)
VALUES
('ast_0001', 'AST-001', 'Angle Grinder 4" Heavy Duty', 'Power Tools', 'Grinders', 'Bosch', 'GWS 750-100', 'BOS-AG-2024-001', '2024-01-15', 8500.00, 7650.00, 'Bharat Engineering Supplies', 'Jamnagar Central Store', 'Reliance Jamnagar Refinery', 'Good', '2025-01-15', 10, 'Active', 'Mohan Lal'),

('ast_0002', 'AST-002', 'Impact Wrench 1/2" Air', 'Power Tools', 'Wrenches', 'Atlas Copco', 'LIS22 P7FR', 'ATC-IW-2023-045', '2023-06-20', 22000.00, 17600.00, 'Bharat Engineering Supplies', 'Jamshedpur Site Store', 'Tata Steel Plant, Jamshedpur', 'Good', '2024-06-20', 10, 'Active', 'Raju Yadav'),

('ast_0003', 'AST-003', 'Drill Machine 13mm', 'Power Tools', 'Drills', 'DeWalt', 'DWD024', 'DWT-DM-2023-112', '2023-03-10', 6500.00, 5200.00, 'Bharat Engineering Supplies', 'Singrauli Warehouse', 'NTPC Singrauli Super Thermal', 'Fair', '2024-03-10', 10, 'Active', 'Suresh M'),

('ast_0004', 'AST-004', 'Cutting Machine 14" Abrasive', 'Power Tools', 'Cutters', 'Makita', '4114S', 'MKT-CM-2022-078', '2022-09-05', 18500.00, 11100.00, 'Bharat Engineering Supplies', 'Singrauli Warehouse', 'NTPC Singrauli Super Thermal', 'Fair', '2023-09-05', 10, 'Active', NULL),

-- Heavy Equipment (3)
('ast_0005', 'AST-005', 'Forklift 3 Ton Diesel', 'Heavy Equipment', 'Material Handling', 'Toyota', '8FGU25', 'TYT-FL-2021-012', '2021-11-20', 850000.00, 595000.00, 'Godrej & Boyce', 'Jamnagar Central Store', 'Reliance Jamnagar Refinery', 'Good', '2024-11-20', 15, 'Active', NULL),

('ast_0006', 'AST-006', 'Crane (Mobile) 20 Ton', 'Heavy Equipment', 'Lifting', 'Liebherr', 'LTM 1020', 'LBH-CR-2020-005', '2020-04-15', 2500000.00, 1500000.00, 'Godrej & Boyce', 'Tata Steel Plant, Jamshedpur', 'Tata Steel Plant, Jamshedpur', 'Fair', '2023-04-15', 15, 'Active', NULL),

('ast_0007', 'AST-007', 'Generator Set 500 KVA', 'Heavy Equipment', 'Power Generation', 'Cummins', 'C500 D5', 'CUM-GS-2022-033', '2022-02-28', 1200000.00, 840000.00, 'Siemens India', 'Singrauli Warehouse', 'NTPC Singrauli Super Thermal', 'Good', '2025-02-28', 15, 'Active', NULL),

-- Vehicles (3)
('ast_0008', 'AST-008', 'Bolero Pickup', 'Vehicles', 'Light Commercial', 'Mahindra', 'Bolero Pik-Up ExtraLong', 'MHD-BP-2022-091', '2022-07-10', 950000.00, 665000.00, 'Indian Oil Petrochemicals', 'Jamnagar Central Store', 'Reliance Jamnagar Refinery', 'Good', '2025-07-10', 15, 'Active', 'Sanjay Kumar Singh'),

('ast_0009', 'AST-009', 'Tata Ace Gold', 'Vehicles', 'Mini Truck', 'Tata', 'Ace Gold EX2', 'TTA-TA-2021-056', '2021-12-15', 550000.00, 357500.00, 'Indian Oil Petrochemicals', 'Jamshedpur Site Store', 'Tata Steel Plant, Jamshedpur', 'Fair', '2024-12-15', 15, 'Active', 'Vikram Pandey'),

('ast_0010', 'AST-010', 'Mahindra Scorpio S11', 'Vehicles', 'SUV', 'Mahindra', 'Scorpio S11 4WD', 'MHD-SC-2023-018', '2023-05-08', 1650000.00, 1320000.00, 'Indian Oil Petrochemicals', 'Mumbai HQ Store', 'Mumbai HQ', 'Good', '2026-05-08', 10, 'Active', 'Rajesh Mehta'),

-- Testing Equipment (3)
('ast_0011', 'AST-011', 'Ultrasonic Flaw Detector', 'Testing Equipment', 'NDT Equipment', 'Olympus', 'EPOCH 650', 'OLY-UFD-2023-002', '2023-08-20', 750000.00, 600000.00, 'SKF India Ltd', 'Singrauli Warehouse', 'NTPC Singrauli Super Thermal', 'Good', '2025-08-20', 10, 'Active', 'Senthil Kumar'),

('ast_0012', 'AST-012', 'Vibration Analyzer', 'Testing Equipment', 'Condition Monitoring', 'SKF', 'CMAS 100-SL', 'SKF-VA-2022-015', '2022-04-12', 450000.00, 315000.00, 'SKF India Ltd', 'Jamnagar Central Store', 'Reliance Jamnagar Refinery', 'Good', '2024-04-12', 15, 'Active', 'Nagarjuna Reddy'),

('ast_0013', 'AST-013', 'Thermography Camera', 'Testing Equipment', 'Condition Monitoring', 'FLIR', 'E8 Pro', 'FLR-TC-2023-008', '2023-10-05', 380000.00, 304000.00, 'ABB India Ltd', 'Mumbai HQ Store', 'UltraTech Cement, Tadipatri', 'New', '2025-10-05', 10, 'Active', 'Arun Sharma'),

-- IT Equipment (2)
('ast_0014', 'AST-014', 'Laptop Dell Latitude 5540', 'IT Equipment', 'Laptops', 'Dell', 'Latitude 5540', 'DLL-LT-2024-041', '2024-02-01', 75000.00, 67500.00, 'ABB India Ltd', 'Mumbai HQ Store', 'Mumbai HQ', 'New', '2026-02-01', 20, 'Active', 'Priya Sharma'),

('ast_0015', 'AST-015', 'Laptop HP ProBook 450 G10', 'IT Equipment', 'Laptops', 'HP', 'ProBook 450 G10', 'HP-LT-2024-055', '2024-03-15', 68000.00, 61200.00, 'ABB India Ltd', 'Mumbai HQ Store', 'Mumbai HQ', 'New', '2026-03-15', 20, 'Active', 'Kavita Reddy');

-- ============================================================================
-- INSERT DATA: AssetMaintenance (12 records)
-- Mix of preventive, breakdown, calibration, and annual servicing
-- ============================================================================

INSERT INTO AssetMaintenance (id, assetId, type, scheduledDate, completedDate, performedBy, cost, description, findings, nextDueDate, status)
VALUES
-- Preventive maintenance records
('amnt_0001', 'ast_0005', 'Preventive', '2025-01-15', '2025-01-18', 'Godrej & Boyce Service Team', 12000.00, 'Quarterly preventive servicing of forklift – engine oil change, hydraulic oil top-up, filter replacement', 'Engine oil was dark; hydraulic system working within spec. Brake pads at 60% life.', '2025-04-15', 'Completed'),

('amnt_0002', 'ast_0007', 'Preventive', '2025-01-10', '2025-01-12', 'Cummins Authorized Service', 25000.00, 'Half-yearly generator set service – oil change, air filter, fuel filter, coolant check', 'All parameters normal. Load test passed at 95% capacity. Fuel consumption within limits.', '2025-07-10', 'Completed'),

('amnt_0003', 'ast_0010', 'Annual', '2025-01-20', NULL, 'Mahindra Authorised Service', 18000.00, 'Annual vehicle service – engine oil, filters, brake inspection, tire rotation', NULL, NULL, 'Scheduled'),

-- Calibration records for testing equipment
('amnt_0004', 'ast_0011', 'Calibration', '2025-01-05', '2025-01-07', 'Olympus India Calibration Lab', 15000.00, 'Annual calibration of ultrasonic flaw detector per ASME/ASTM standards', 'Unit calibrated successfully. All channels within ±0.1dB tolerance. Certificate valid till Jan 2026.', '2026-01-05', 'Completed'),

('amnt_0005', 'ast_0012', 'Calibration', '2024-12-20', '2024-12-22', 'SKF India Calibration Centre', 12000.00, 'Annual calibration of vibration analyzer with reference shaker test', 'Sensor sensitivity within spec. Frequency response 2Hz-15kHz validated. Certificate issued.', '2025-12-20', 'Completed'),

('amnt_0006', 'ast_0013', 'Calibration', '2025-02-01', NULL, 'FLIR India Service Centre', 10000.00, 'Annual calibration of thermography camera – radiometric accuracy check', NULL, NULL, 'Scheduled'),

-- Breakdown maintenance records
('amnt_0007', 'ast_0006', 'Breakdown', '2024-12-10', '2024-12-15', 'Liebherr Emergency Service Team', 85000.00, 'Emergency repair – hydraulic pump failure on mobile crane during BF-3 shutdown work', 'Main hydraulic pump seal failure caused by contaminated oil. Pump rebuilt, oil replaced, filters changed. Crane back in operation.', NULL, 'Completed'),

('amnt_0008', 'ast_0004', 'Breakdown', '2024-11-22', '2024-11-24', 'Internal Maintenance Team', 2500.00, 'Breakdown – cutting machine motor overheating and tripping frequently', 'Motor winding insulation degraded due to dust ingress. Motor rewound and reinstalled. Added protective cover.', NULL, 'Completed'),

('amnt_0009', 'ast_0008', 'Breakdown', '2025-01-08', '2025-01-10', 'Mahindra Roadside Assistance', 9500.00, 'Breakdown – Bolero pickup battery failure and starter motor issue at site', 'Battery replaced with Exide 70Ah. Starter motor solenoid repaired. Alternator output checked – normal.', NULL, 'Completed'),

-- Overhaul record
('amnt_0010', 'ast_0006', 'Overhaul', '2025-02-15', NULL, 'Liebherr Service Centre', 250000.00, 'Major overhaul – complete hydraulic system overhaul, wire rope replacement, structural inspection planned', NULL, NULL, 'Scheduled'),

('amnt_0011', 'ast_0005', 'Preventive', '2025-02-20', NULL, 'Godrej & Boyce Service Team', 8000.00, 'Quarterly forklift service – mast chain lubrication, tire condition check, load test', NULL, '2025-05-20', 'Scheduled'),

('amnt_0012', 'ast_0009', 'Annual', '2025-01-25', NULL, 'Tata Motors Authorised Service', 14000.00, 'Annual vehicle service for Tata Ace – engine tune-up, brake system, electrical check', NULL, NULL, 'Scheduled');

-- ============================================================================
-- INSERT DATA: AssetAllocation (10 records)
-- Employees from the design reference assigned to tools/equipment
-- ============================================================================

INSERT INTO AssetAllocation (id, assetId, allocatedTo, empId, department, site, allocationDate, returnDate, purpose, status, remarks)
VALUES
('aalc_0001', 'ast_0001', 'Mohan Lal', 'emp_0015', 'Operations', 'Reliance Jamnagar Refinery', '2024-06-01', NULL, 'Daily use for grinding and cutting work during AMC activities at Reliance Jamnagar', 'Allocated', 'Fitter using angle grinder for general fabrication work'),

('aalc_0002', 'ast_0002', 'Raju Yadav', 'emp_0016', 'Operations', 'Tata Steel Plant, Jamshedpur', '2024-07-15', NULL, 'Impact wrench for bolt tightening during BF-3 shutdown activities', 'Allocated', 'Welder using for structural assembly work'),

('aalc_0003', 'ast_0003', 'Suresh M', 'emp_0018', 'Operations', 'NTPC Singrauli Super Thermal', '2024-05-20', NULL, 'Drill machine for installation work at NTPC O&M project', 'Allocated', 'Electrician using for panel and cable tray installation'),

('aalc_0004', 'ast_0011', 'Senthil Kumar', 'emp_0014', 'QA/QC', 'NTPC Singrauli Super Thermal', '2024-08-01', NULL, 'UT flaw detector for NDT inspection of weld joints and pressure vessels', 'Allocated', 'QA/QC Inspector using for routine and shutdown inspection'),

('aalc_0005', 'ast_0012', 'Nagarjuna Reddy', 'emp_0004', 'Maintenance Planning', 'Reliance Jamnagar Refinery', '2024-09-01', NULL, 'Vibration analyzer for condition monitoring of rotating equipment at Reliance AMC', 'Allocated', 'Planning Engineer carrying out predictive maintenance checks'),

('aalc_0006', 'ast_0013', 'Arun Sharma', 'emp_0005', 'Engineering', 'UltraTech Cement, Tadipatri', '2024-10-15', NULL, 'Thermography camera for electrical switchgear thermal scanning at UltraTech plant', 'Allocated', 'Instrumentation Engineer performing PM on HT/LT panels'),

('aalc_0007', 'ast_0010', 'Rajesh Mehta', 'emp_0001', 'Engineering', 'Mumbai HQ', '2024-11-01', NULL, 'Mahindra Scorpio for site visits and client coordination across project sites', 'Allocated', 'Senior Engineer official vehicle for multi-site travel'),

('aalc_0008', 'ast_0008', 'Sanjay Kumar Singh', 'emp_0002', 'Operations', 'Tata Steel Plant, Jamshedpur', '2024-08-10', NULL, 'Bolero pickup for material transport and crew movement at Tata Steel site', 'Allocated', 'Site Supervisor using for daily logistics at shutdown site'),

('aalc_0009', 'ast_0009', 'Vikram Pandey', 'emp_0003', 'Operations', 'NTPC Singrauli Super Thermal', '2024-07-01', NULL, 'Tata Ace for light material transport and spare delivery at NTPC site', 'Allocated', 'Site Incharge using for store-to-plant material movement'),

('aalc_0010', 'ast_0014', 'Priya Sharma', 'emp_0012', 'Finance', 'Mumbai HQ', '2024-02-15', NULL, 'Dell laptop for accounts, payroll, and ERP operation work', 'Allocated', 'Accounts Executive primary work laptop');

-- ============================================================================
-- INSERT DATA: AssetDisposal (3 records)
-- 2 scrapped tools, 1 sold vehicle
-- ============================================================================

INSERT INTO AssetDisposal (id, assetId, disposalDate, method, buyer, salePrice, remarks, approvedBy, status)
VALUES
('adsp_0001', 'ast_0004', '2025-01-20', 'Scrapped', NULL, 0.00, 'Cutting Machine 14" Abrasive scrapped due to repeated motor failures and uneconomical repair cost. Motor rewound twice already, frame cracked.', 'Rajesh Mehta', 'Completed'),

('adsp_0002', 'ast_0003', '2025-01-28', 'Scrapped', NULL, 500.00, 'Drill Machine 13mm declared beyond repair – chuck mechanism worn out, spindle bent. Salvage value only from usable parts.', 'Vikram Pandey', 'Completed'),

('adsp_0003', 'ast_0009', '2025-02-01', 'Sold', 'R.K. Auto Traders, Jamshedpur', 85000.00, 'Tata Ace Gold sold as running condition vehicle. Buyer is a local transport vendor. RC transfer initiated. Vehicle had done 78,000 km.', 'Rajesh Mehta', 'Approved')
