-- ============================================================================
-- MODULE 02: Users & Access Control
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor (India)
-- ============================================================================
-- Tables  : Role, Permission, User
-- FK      : User.roleId → Role(id)
-- Data    : 6 roles, 15 permissions, 10 users
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: Role
-- Defines system-level access roles for ERP users. Each role carries a JSON
-- blob of permission codes that gate module-level features (e.g. hrms.manage).
-- Role IDs are referenced by Section 2.8 of the design reference.
-- ----------------------------------------------------------------------------
CREATE TABLE Role (
    id          VARCHAR(25)    NOT NULL,
    name        VARCHAR(50)    NOT NULL,
    description VARCHAR(255)   DEFAULT NULL,
    permissions JSON           DEFAULT NULL COMMENT 'Array of permission codes granted to this role',
    status      VARCHAR(20)    NOT NULL DEFAULT 'Active',
    createdAt   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_role_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='System access roles that group permissions for ERP module access control';

-- ----------------------------------------------------------------------------
-- Table: Permission
-- Fine-grained permissions mapped to ERP modules. Each permission has a
-- dot-notation code (e.g. "inventory.manage") used inside the Role.permissions
-- JSON array for fast programmatic checks.
-- Covers 12 modules: HRMS, Inventory, Sales, CRM, Projects, Manufacturing,
-- Assets, Finance, Procurement, Reports, Settings, Safety.
-- ----------------------------------------------------------------------------
CREATE TABLE Permission (
    id          VARCHAR(25)    NOT NULL,
    name        VARCHAR(100)   NOT NULL,
    code        VARCHAR(100)   NOT NULL COMMENT 'Dot-notation code: module.action (e.g. hrms.manage)',
    module      VARCHAR(50)    NOT NULL COMMENT 'ERP module this permission belongs to',
    description VARCHAR(255)   DEFAULT NULL,
    createdAt   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_perm_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Granular module-level permissions referenced by Role.permissions JSON';

-- ----------------------------------------------------------------------------
-- Table: User
-- ERP login accounts mapped to real employees (emp_0001 – emp_0010).
-- The userId is a unique human-friendly login identifier (usr_001…usr_010).
-- roleId links to Role; department stores the department code as VARCHAR.
-- ----------------------------------------------------------------------------
CREATE TABLE User (
    id          VARCHAR(25)    NOT NULL,
    userId      VARCHAR(25)    NOT NULL COMMENT 'Unique login ID (usr_001 … usr_010)',
    name        VARCHAR(100)   NOT NULL,
    email       VARCHAR(150)   NOT NULL,
    phone       VARCHAR(20)    DEFAULT NULL,
    roleId      VARCHAR(25)    NOT NULL COMMENT 'FK → Role(id), section 2.8',
    department  VARCHAR(50)    DEFAULT NULL COMMENT 'Department code (ENG, OPS, HSE, etc.)',
    designation VARCHAR(100)   DEFAULT NULL,
    status      VARCHAR(20)    NOT NULL DEFAULT 'Active',
    lastLogin   DATETIME(3)    DEFAULT NULL COMMENT 'Timestamp of most recent successful login',
    createdAt   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_userId (userId),
    UNIQUE KEY uk_user_email (email),
    INDEX idx_user_roleId (roleId),
    CONSTRAINT fk_user_role FOREIGN KEY (roleId) REFERENCES Role (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERP user accounts linked to employees and system roles';

-- ============================================================================
-- INSERT DATA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6 Roles (IDs per design reference §2.8)
-- Each role carries a JSON array of permission codes relevant to its access scope.
-- All codes reference exactly the 15 permission records inserted below.
-- ----------------------------------------------------------------------------
INSERT INTO Role (id, name, description, permissions, status) VALUES
('role_001', 'Admin',
 'Full system administrator with unrestricted access to all ERP modules and settings',
 '["hrms.view","hrms.manage","inventory.view","inventory.manage","sales.manage","crm.manage","projects.view","projects.manage","manufacturing.manage","assets.manage","finance.manage","procurement.manage","reports.view","settings.manage","safety.manage"]',
 'Active'),

('role_002', 'Manager',
 'Department and site-level manager with broad operational access across most modules',
 '["hrms.view","inventory.view","inventory.manage","sales.manage","crm.manage","projects.view","projects.manage","manufacturing.manage","assets.manage","finance.manage","procurement.manage","reports.view","safety.manage"]',
 'Active'),

('role_003', 'Engineer',
 'Site and office engineers with access to technical modules — projects, manufacturing, inventory, safety',
 '["inventory.view","inventory.manage","projects.view","projects.manage","manufacturing.manage","assets.manage","safety.manage","reports.view"]',
 'Active'),

('role_004', 'Supervisor',
 'Field supervisors with day-to-day operational access — HRMS view, inventory, safety, reports',
 '["hrms.view","inventory.view","projects.view","manufacturing.manage","assets.manage","safety.manage","reports.view"]',
 'Active'),

('role_005', 'Technician',
 'Skilled and unskilled technicians with limited module access — attendance view, safety, reports',
 '["hrms.view","inventory.view","manufacturing.manage","safety.manage","reports.view"]',
 'Active'),

('role_006', 'HR_Finance',
 'HR and Finance staff with access to HRMS, payroll, finance, procurement and reporting modules',
 '["hrms.view","hrms.manage","sales.manage","finance.manage","procurement.manage","reports.view","settings.manage"]',
 'Active');

-- ----------------------------------------------------------------------------
-- 15 Permissions covering all 12 ERP modules
-- Distribution: HRMS (2), Inventory (2), Projects (2) — remaining 9 modules
-- each have 1 permission. Codes use dot-notation <module>.<action>.
-- ----------------------------------------------------------------------------
INSERT INTO Permission (id, name, code, module, description) VALUES
-- HRMS (2 permissions: view + manage)
('perm_001', 'HRMS View',             'hrms.view',             'HRMS',
 'View employee records, attendance summaries, leave balances and organisational charts'),
('perm_002', 'HRMS Manage',           'hrms.manage',           'HRMS',
 'Create and edit employees, process leave requests, manage attendance and payroll'),

-- Inventory (2 permissions: view + manage)
('perm_003', 'Inventory View',        'inventory.view',        'Inventory',
 'View stock levels, warehouse locations, item details and stock movement history'),
('perm_004', 'Inventory Manage',      'inventory.manage',      'Inventory',
 'Create and adjust stock entries, manage warehouses, process goods receipts and issues'),

-- Sales (1 permission)
('perm_005', 'Sales Manage',          'sales.manage',          'Sales',
 'Create and edit quotations, sales orders, invoices; manage billing and collections'),

-- CRM (1 permission)
('perm_006', 'CRM Manage',            'crm.manage',            'CRM',
 'Manage leads, enquiries, customer interactions and follow-up activities'),

-- Projects (2 permissions: view + manage)
('perm_007', 'Projects View',         'projects.view',         'Projects',
 'View project details, task lists, milestones, resource allocation and Gantt charts'),
('perm_008', 'Projects Manage',       'projects.manage',       'Projects',
 'Create and edit projects, assign tasks, manage milestones and project resources'),

-- Manufacturing (1 permission)
('perm_009', 'Manufacturing Manage',  'manufacturing.manage',  'Manufacturing',
 'Create and edit BOMs, work orders, production orders; manage shop-floor execution'),

-- Assets (1 permission)
('perm_010', 'Assets Manage',         'assets.manage',         'Assets',
 'Register assets, schedule maintenance, manage allocations and disposals'),

-- Finance (1 permission)
('perm_011', 'Finance Manage',        'finance.manage',        'Finance',
 'Create journal entries, manage AP/AR, process payments, update budgets and tax records'),

-- Procurement (1 permission)
('perm_012', 'Procurement Manage',    'procurement.manage',    'Procurement',
 'Create purchase requisitions, invite vendor quotations, process purchase orders'),

-- Reports (1 permission)
('perm_013', 'Reports View',          'reports.view',          'Reports',
 'Access all standard and custom ERP reports, dashboards and analytics'),

-- Settings (1 permission)
('perm_014', 'Settings Manage',       'settings.manage',       'Settings',
 'Configure company settings, leave policies, shift patterns and system preferences'),

-- Safety (1 permission)
('perm_015', 'Safety Manage',         'safety.manage',         'Safety',
 'Create safety permits, log incidents, schedule safety audits and manage compliance');

-- ----------------------------------------------------------------------------
-- 10 Users (usr_001 – usr_010) mapped to real employees emp_0001 – emp_0010
-- Login credentials use VoltCore corporate email domain.
-- Phone numbers follow Indian mobile format (+91 XXXXX XXXXX).
-- Role assignments cover all 6 roles:
--   Admin(1), Manager(1), Engineer(4), Supervisor(2), Technician(1), HR_Finance(1)
-- ----------------------------------------------------------------------------
INSERT INTO User (id, userId, name, email, phone, roleId, department, designation, status, lastLogin) VALUES
-- usr_001 → Rajesh Mehta (emp_0001, VC-001) | Senior Engineer, Engineering | Admin
('user_001', 'usr_001', 'Rajesh Mehta',
 'rajesh.mehta@voltcore.in', '+91 98200 12345',
 'role_001', 'ENG', 'Senior Engineer', 'Active',
 '2025-06-18 09:15:00.000'),

-- usr_002 → Sanjay Kumar Singh (emp_0002, VC-002) | Site Supervisor, Operations | Supervisor
('user_002', 'usr_002', 'Sanjay Kumar Singh',
 'sanjay.singh@voltcore.in', '+91 98310 23456',
 'role_004', 'OPS', 'Site Supervisor', 'Active',
 '2025-06-18 08:30:00.000'),

-- usr_003 → Vikram Pandey (emp_0003, VC-003) | Site Incharge, Operations | Manager
('user_003', 'usr_003', 'Vikram Pandey',
 'vikram.pandey@voltcore.in', '+91 98420 34567',
 'role_002', 'OPS', 'Site Incharge', 'Active',
 '2025-06-18 09:00:00.000'),

-- usr_004 → Nagarjuna Reddy (emp_0004, VC-004) | Planning Engineer, Maintenance Planning | Engineer
('user_004', 'usr_004', 'Nagarjuna Reddy',
 'nagarjuna.reddy@voltcore.in', '+91 98530 45678',
 'role_003', 'MP', 'Planning Engineer', 'Active',
 '2025-06-17 17:45:00.000'),

-- usr_005 → Arun Sharma (emp_0005, VC-005) | Project Engineer, Engineering | Engineer
('user_005', 'usr_005', 'Arun Sharma',
 'arun.sharma@voltcore.in', '+91 98640 56789',
 'role_003', 'ENG', 'Project Engineer', 'Active',
 '2025-06-18 10:20:00.000'),

-- usr_006 → Pradeep Rao (emp_0006, VC-006) | Site Supervisor, Operations | Supervisor
('user_006', 'usr_006', 'Pradeep Rao',
 'pradeep.rao@voltcore.in', '+91 98750 67890',
 'role_004', 'OPS', 'Site Supervisor', 'Active',
 '2025-06-17 18:00:00.000'),

-- usr_007 → Amit Joshi (emp_0007, VC-007) | Engineer, Engineering | Engineer
('user_007', 'usr_007', 'Amit Joshi',
 'amit.joshi@voltcore.in', '+91 98860 78901',
 'role_003', 'ENG', 'Engineer', 'Active',
 '2025-06-18 08:45:00.000'),

-- usr_008 → Suresh Patel (emp_0008, VC-008) | Engineer, Engineering | Technician
('user_008', 'usr_008', 'Suresh Patel',
 'suresh.patel@voltcore.in', '+91 98970 89012',
 'role_005', 'ENG', 'Engineer', 'Active',
 '2025-06-16 09:30:00.000'),

-- usr_009 → Deepak Verma (emp_0009, VC-009) | Safety Officer, Safety & HSE | Technician
('user_009', 'usr_009', 'Deepak Verma',
 'deepak.verma@voltcore.in', '+91 99080 90123',
 'role_005', 'HSE', 'Safety Officer', 'Active',
 '2025-06-18 07:30:00.000'),

-- usr_010 → Mahesh Kumar (emp_0010, VC-010) | Supervisor, Operations | HR_Finance
('user_010', 'usr_010', 'Mahesh Kumar',
 'mahesh.kumar@voltcore.in', '+91 99190 01234',
 'role_006', 'OPS', 'Supervisor', 'Active',
 '2025-06-17 14:10:00.000')
