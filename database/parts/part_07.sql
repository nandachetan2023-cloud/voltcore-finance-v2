-- ============================================================================
-- Part 07: Inventory / Stock Movement / Customer / Sales Order
-- VoltCore Engineering Pvt Ltd - Plant Maintenance Contractor ERP
-- ============================================================================
USE voltcore_erp;

-- ============================================================================
-- TABLE: InventoryItem (15 records)
-- ============================================================================
INSERT INTO InventoryItem (id, itemCode, name, category, unit, currentStock, minStock, maxStock, unitCost, warehouse, status, createdAt, updatedAt) VALUES
('INV-ITEM-001', 'BRG-001', 'SKF 6310 Bearing',                     'Bearings',   'Nos',   45,  10, 100, 4500.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-01-15 09:00:00.000', '2024-12-01 10:30:00.000'),
('INV-ITEM-002', 'BRG-002', 'FAG 6208 Bearing',                     'Bearings',   'Nos',   60,  15,  80, 2800.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-01-15 09:05:00.000', '2024-12-01 10:30:00.000'),
('INV-ITEM-003', 'GSK-001', 'Spiral Wound Gasket 4"',               'Gaskets',    'Nos',  120,  20, 200,  850.00, 'Site Store - Jamnagar',     'In Stock',   '2024-02-10 11:00:00.000', '2024-12-02 08:15:00.000'),
('INV-ITEM-004', 'GSK-002', 'Ring Joint Gasket 8"',                 'Gaskets',    'Nos',   30,  10,  50, 3200.00, 'Central Warehouse Mumbai',  'Low Stock',  '2024-02-10 11:05:00.000', '2024-12-05 14:45:00.000'),
('INV-ITEM-005', 'VLV-001', 'Gate Valve 6" 150#',                   'Valves',     'Nos',    8,   5,  20, 18000.00,'Central Warehouse Mumbai',  'In Stock',   '2024-03-01 10:00:00.000', '2024-12-03 09:20:00.000'),
('INV-ITEM-006', 'VLV-002', 'Globe Valve 2" 300#',                  'Valves',     'Nos',   15,   5,  25, 8500.00, 'Site Store - Singrauli',    'In Stock',   '2024-03-01 10:05:00.000', '2024-12-04 11:10:00.000'),
('INV-ITEM-007', 'SEL-001', 'Mechanical Seal ENP-40',               'Seals',      'Nos',    6,   4,  15, 12000.00,'Central Warehouse Mumbai',  'Low Stock',  '2024-04-05 08:30:00.000', '2024-12-06 16:00:00.000'),
('INV-ITEM-008', 'SEL-002', 'O-Ring Kit (Assorted)',                'Seals',      'Sets',  25,  10,  40, 1500.00, 'Site Store - Jamshedpur',   'In Stock',   '2024-04-05 08:35:00.000', '2024-12-02 08:15:00.000'),
('INV-ITEM-009', 'BLT-001', 'V-Belt B-68',                          'Belts',      'Nos',   40,  15,  60,  680.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-05-12 09:15:00.000', '2024-12-07 13:45:00.000'),
('INV-ITEM-010', 'LUB-001', 'Shell Morlina S2 BL 68 (20L)',         'Lubricants', 'Drums', 18,   5,  30, 4500.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-05-12 09:20:00.000', '2024-12-01 10:30:00.000'),
('INV-ITEM-011', 'LUB-002', 'Mobil DTE 25 (20L)',                   'Lubricants', 'Drums', 12,   5,  20, 5200.00, 'Site Store - Vijayanagar',  'Low Stock',  '2024-06-01 10:00:00.000', '2024-12-08 07:30:00.000'),
('INV-ITEM-012', 'WLD-001', 'E7018 3.2mm Electrodes',               'Welding',    'Kg',  500, 100, 800,   85.00, 'Site Store - Jamshedpur',   'In Stock',   '2024-06-15 11:30:00.000', '2024-12-09 12:00:00.000'),
('INV-ITEM-013', 'WLD-002', 'E6013 2.5mm Electrodes',               'Welding',    'Kg',  350,  80, 500,   65.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-06-15 11:35:00.000', '2024-12-10 09:45:00.000'),
('INV-ITEM-014', 'PPE-001', 'Safety Shoes (Allen Cooper)',          'PPE',        'Pairs', 80,  30, 100, 2200.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-07-01 08:00:00.000', '2024-12-11 10:15:00.000'),
('INV-ITEM-015', 'BLT-002', 'HSFG Bolt M20x80 Gr 10.9',            'Fasteners',  'Nos',  200,  50, 300,  180.00, 'Central Warehouse Mumbai',  'In Stock',   '2024-07-01 08:05:00.000', '2024-12-12 11:30:00.000');

-- ============================================================================
-- TABLE: StockMovement (8 records)
-- ============================================================================
INSERT INTO StockMovement (id, itemCode, itemName, type, quantity, fromWarehouse, toWarehouse, reference, date, remarks, createdAt, updatedAt) VALUES
('STK-MOV-001', 'BRG-001', 'SKF 6310 Bearing',            'Issue',   10, 'Central Warehouse Mumbai',  'Site Store - Jamnagar',     'WO/JMN/2024-0891', '2024-12-02', 'Issued for DG Set overhauling at Jamnagar site',    '2024-12-02 09:30:00.000', '2024-12-02 09:30:00.000'),
('STK-MOV-002', 'VLV-001', 'Gate Valve 6" 150#',          'Issue',    4, 'Central Warehouse Mumbai',  'Site Store - Singrauli',    'WO/SGR/2024-0756', '2024-12-03', 'Issued for emergency pipeline valve replacement',   '2024-12-03 07:15:00.000', '2024-12-03 07:15:00.000'),
('STK-MOV-003', 'GSK-002', 'Ring Joint Gasket 8"',        'Receipt', 50, 'Vendor - SKF India Ltd',     'Central Warehouse Mumbai',  'PO/MUM/2024-0342', '2024-12-05', 'Received against PO for Q4 2024 requirement',       '2024-12-05 14:20:00.000', '2024-12-05 14:20:00.000'),
('STK-MOV-004', 'LUB-001', 'Shell Morlina S2 BL 68 (20L)','Transfer', 6, 'Central Warehouse Mumbai',  'Site Store - Vijayanagar',  'TRF/VJP/2024-0018', '2024-12-06', 'Transferred to replenish Vijayanagar site stock',   '2024-12-06 11:00:00.000', '2024-12-06 11:00:00.000'),
('STK-MOV-005', 'WLD-001', 'E7018 3.2mm Electrodes',      'Issue',  120, 'Site Store - Jamshedpur',    'Bay-12 Workshop Area',      'WO/JSD/2024-0634', '2024-12-09', 'Issued for BOF maintenance welding job',            '2024-12-09 06:45:00.000', '2024-12-09 06:45:00.000'),
('STK-MOV-006', 'SEL-002', 'O-Ring Kit (Assorted)',       'Return',   3, 'Site Store - Jamshedpur',    'Central Warehouse Mumbai',  'RTN/JSD/2024-0012', '2024-12-10', 'Returned excess kits after job completion',          '2024-12-10 15:30:00.000', '2024-12-10 15:30:00.000'),
('STK-MOV-007', 'BLT-002', 'HSFG Bolt M20x80 Gr 10.9',   'Issue',   80, 'Central Warehouse Mumbai',  'Site Store - Jamnagar',     'WO/JMN/2024-0897', '2024-12-11', 'Issued for structural steel bolting at refinery',   '2024-12-11 08:00:00.000', '2024-12-11 08:00:00.000'),
('STK-MOV-008', 'PPE-001', 'Safety Shoes (Allen Cooper)', 'Issue',   30, 'Central Warehouse Mumbai',  'Site Store - Singrauli',    'REQ/SGR/2024-0045', '2024-12-12', 'Issued for new batch of technicians onboarding',     '2024-12-12 10:00:00.000', '2024-12-12 10:00:00.000');

-- ============================================================================
-- TABLE: Customer (6 records)
-- ============================================================================
INSERT INTO Customer (id, code, name, contactPerson, email, phone, address, gst, city, state, totalOrders, totalRevenue, status, createdAt, updatedAt) VALUES
('CUST-001', 'CUST-001', 'Reliance Industries Ltd',            'A.K. Gupta',      'ak.gupta@ril.com',       '+91 22 3035 6001', 'Reliance Corporate Park, Ghansoli, Navi Mumbai', '27AABCR1234F1ZV', 'Mumbai',       'Maharashtra', 12, 455000000.00, 'Active', '2022-04-15 10:00:00.000', '2024-12-10 09:30:00.000'),
('CUST-002', 'CUST-002', 'Tata Steel Ltd',                    'S.K. Banerjee',   'sk.banerjee@tatasteel.com','+91 657 664 2001', 'Tata Steel Works, Jamshedpur, Jharkhand',         '20AABCT5678G1Z5', 'Jamshedpur',   'Jharkhand',    8, 321000000.00, 'Active', '2022-06-20 11:00:00.000', '2024-12-08 14:15:00.000'),
('CUST-003', 'CUST-003', 'NTPC Ltd',                          'R.P. Singh',      'rp.singh@ntpc.co.in',     '+91 11 2436 0101', 'NTPC Bhawan, SCOPE Complex, Lodhi Road',          '07AABCN9012H1Z3', 'New Delhi',    'Delhi',       15, 783000000.00, 'Active', '2021-11-10 09:00:00.000', '2024-12-12 16:00:00.000'),
('CUST-004', 'CUST-004', 'UltraTech Cement Ltd',              'K.V. Rao',        'kv.rao@ultratechcement.com','+91 40 2341 8001', 'Aditya Birla Centre, RT Nagar, Hyderabad',        '36AABCU3456I1Z9', 'Hyderabad',    'Telangana',    6, 187000000.00, 'Active', '2023-01-25 14:00:00.000', '2024-11-28 11:45:00.000'),
('CUST-005', 'CUST-005', 'Indian Oil Corporation Ltd',        'V.K. Malhotra',   'vk.malhotra@iocl.com',    '+91 1882 262 001', 'IOCL Refinery, Panipat, Haryana',                  '06AABCI7890J1Z7', 'Panipat',      'Haryana',     10, 428000000.00, 'Active', '2022-08-05 10:30:00.000', '2024-12-05 13:00:00.000'),
('CUST-006', 'CUST-006', 'JSW Steel Ltd',                     'M.R. Krishnan',   'mr.krishnan@jsw.in',      '+91 8392 250 001', 'JSW Steel Works, Vidyanagar, Toranagallu',        '29AABCJ2345K1Z1', 'Vijayanagar',  'Karnataka',    9, 524000000.00, 'Active', '2022-10-12 09:45:00.000', '2024-12-09 10:20:00.000');

-- ============================================================================
-- TABLE: SalesOrder (6 records)
-- ============================================================================
INSERT INTO SalesOrder (id, soNo, customer, project, item, quantity, unitPrice, amount, orderDate, deliveryDate, status, createdAt, updatedAt) VALUES
('SO-001', 'SO-2024-0451', 'Reliance Industries Ltd',      'Annual Mechanical Maintenance Contract - Jamnagar Refinery', 'Mechanical Maintenance Services - Rotating Equipment', 1,  120000000.00, 120000000.00, '2024-10-15', '2024-12-01', 'Delivered',          '2024-10-15 10:00:00.000', '2024-12-01 16:30:00.000'),
('SO-002', 'SO-2024-0468', 'Tata Steel Ltd',               'BOF Vessel Lining Repair - Jamshedpur Works',              'Refractory & Mechanical Repair Works',              1,   85000000.00,  85000000.00, '2024-10-28', '2024-12-15', 'In Progress',        '2024-10-28 11:30:00.000', '2024-12-15 09:00:00.000'),
('SO-003', 'SO-2024-0482', 'NTPC Ltd',                      'Turbine Overhaul - Singrauli Super Thermal Power Station', 'Steam Turbine Overhaul & Alignment',                1,   95000000.00,  95000000.00, '2024-11-10', '2025-02-28', 'In Progress',        '2024-11-10 09:00:00.000', '2024-12-10 14:00:00.000'),
('SO-004', 'SO-2024-0495', 'Indian Oil Corporation Ltd',    'Catalyst Loading & Mechanical Services - Panipat Refinery', 'Catalyst Loading, Scaffolding & Mechanical Works',  1,  120000000.00, 120000000.00, '2024-11-20', '2025-01-31', 'Partially Delivered', '2024-11-20 14:15:00.000', '2024-12-12 11:45:00.000'),
('SO-005', 'SO-2024-0501', 'UltraTech Cement Ltd',          'Kiln Roller Replacement - Tadipatri Plant',                'Kiln Mechanical Overhaul Services',                 1,   32000000.00,  32000000.00, '2024-11-25', '2025-03-15', 'Pending',            '2024-11-25 10:00:00.000', '2024-12-08 08:30:00.000'),
('SO-006', 'SO-2024-0512', 'JSW Steel Ltd',                 'SMS Maintenance - Hot Strip Mill Vijayanagar',             'Rolling Mill Mechanical Maintenance Contract',     1,   2000000.00,   2000000.00, '2024-12-01', '2024-12-20', 'Delivered',          '2024-12-01 09:30:00.000', '2024-12-20 17:00:00.000');
