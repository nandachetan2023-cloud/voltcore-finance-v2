import { create } from 'zustand';

export type UserRole = 'superadmin' | 'admin' | 'demo';

// All top-level modules and their sub-modules for access checking
export const MODULE_TREE: Record<string, string[]> = {
  organization: ['organization', 'departments', 'designations', 'holidays', 'leave-policies', 'attendance-rules', 'checklist-templates', 'employee-documents'],
  hrms: ['hrms', 'employee-analytics', 'employees', 'attendance', 'biometric', 'leave', 'tour-requests', 'shift', 'timesheet', 'payroll', 'training', 'recruitment', 'onboarding', 'offboarding', 'exit-management'],
  procurement: ['procurement', 'procurement-pr', 'procurement-rfq', 'procurement-po-register', 'procurement-vendors', 'procurement-material-tracking', 'procurement-subcontracts', 'po-approval-stepper', 'rfq-comparison-matrix', 'grn-3way-match'],
  sales: ['sales', 'sales-tax-invoices', 'sales-orders', 'sales-quotations', 'fin-credit-notes', 'sales-opportunity-pipeline', 'sales-tender-register', 'sales-revenue-forecast', 'sales-client-accounts'],
  projects: ['projects', 'project-list', 'project-hierarchy', 'budget', 'boq-entry', 'job-progress', 'sites', 'scrap-entry'],
  assets: ['assets', 'equipment', 'permits', 'safety', 'subcontractors'],
  // A dedicated "self-service" group for employees
  'self-service': ['my-attendance', 'my-leave', 'my-tours', 'my-requests', 'my-profile', 'my-notices', 'my-payslips', 'my-documents', 'my-shifts'],
  system: ['system', 'reports', 'settings', 'user-management', 'onboarding-approvals', 'requests', 'notice-board'],
  reports: ['reports', 'report-manpower', 'report-attendance', 'report-payroll', 'report-leave', 'report-late-fine', 'report-onboarding', 'report-turnover', 'report-training', 'report-notices', 'report-dispatch'],
  // Category groups (like HRMS / Organization)
  'login-role': ['fin-user-management'],
  'master-setup': ['fin-sites', 'fin-jobs', 'fin-parties', 'procurement-vendors', 'employees', 'chart-of-accounts'],
  purchase: ['procurement-pr', 'procurement-rfq', 'rfq-comparison-matrix', 'procurement-po-register', 'po-approval-stepper', 'grn-3way-match', 'accounts-payable'],
  inventory: ['site-store', 'material-receipt', 'material-issue-wip', 'stock-ledger', 'scrap-entry'],
  'sales-billing': ['sales-orders', 'sales-quotations', 'ra-work-slider', 'sales-tax-invoices', 'receipt-entry'],
  'finance-accounts': ['finance-dashboard', 'ledger', 'accounts-payable', 'accounts-receivable', 'bank-cash', 'fin-bank-reconciliation', 'journal-entries', 'taxation', 'fin-profit-loss', 'financial-reports'],
  'petty-cash': ['fin-petty-cash-custodian', 'fin-petty-cash', 'fin-petty-cash-approval-queue', 'fin-petty-cash-replenishment'],
  mis: ['report-drilldown', 'po-cost-tree', 'customer-profitability', 'budget'],
}

// Build a reverse map: sub-module key → parent key
const SUB_TO_PARENT: Record<string, string> = {}
Object.entries(MODULE_TREE).forEach(([parent, children]) => {
  children.forEach(child => {
    if (!SUB_TO_PARENT[child]) SUB_TO_PARENT[child] = parent
  })
})

// Check if a module is accessible given an allowedModules string
export function isModuleAllowed(moduleId: string, allowedModules: string): boolean {
  if (!allowedModules || allowedModules === 'all') return true
  const allowed = allowedModules.split(',').map(s => s.trim()).filter(Boolean)

  for (const key of allowed) {
    // Exact match
    if (key === moduleId) return true

    // key is a parent group that contains moduleId (e.g. key='hrms', moduleId='employees')
    const tree = MODULE_TREE[key]
    if (tree && tree.includes(moduleId)) return true

    // moduleId is a parent group and key is one of its children
    // e.g. moduleId='hrms', key='employees' → hrms should be visible
    const parentTree = MODULE_TREE[moduleId]
    if (parentTree && parentTree.includes(key)) return true
  }
  return false
}

export type ModuleId =
  | 'dashboard' | 'organization' | 'hrms' | 'procurement' | 'finance'
  | 'projects' | 'assets'
  | 'system'
  // Category parents (like HRMS / Organization)
  | 'login-role' | 'master-setup' | 'purchase' | 'inventory' | 'sales-billing'
  | 'finance-accounts' | 'petty-cash' | 'mis'
  // Sub-modules
  | 'employees' | 'attendance' | 'leave' | 'tour-requests' | 'shift' | 'training' | 'recruitment'
  | 'onboarding' | 'offboarding' | 'exit-management' | 'checklist-templates'
  | 'purchases' | 'expenses' | 'invoices'
  | 'sites' | 'permits' | 'safety' | 'subcontractors'
  | 'reports' | 'settings'
  | 'report-manpower' | 'report-attendance' | 'report-payroll' | 'report-leave'
  | 'report-late-fine' | 'report-onboarding' | 'report-turnover' | 'report-training'
  | 'report-notices' | 'report-dispatch'
  // Analytics pages
  | 'employee-analytics'
  // Timesheet
  | 'timesheet'
  // Finance sub-modules
  | 'finance-dashboard' | 'chart-of-accounts' | 'ledger' | 'accounts-payable' | 'accounts-receivable'
  | 'journal-entries' | 'bank-cash' | 'taxation' | 'budget' | 'financial-reports'
   | 'finance' | 'create-journal-entry' | 'fin-sites' | 'fin-jobs' | 'fin-parties'
   | 'fin-invoices' | 'fin-payments' | 'fin-payment-advices' | 'fin-petty-cash' | 'fin-assets' | 'fin-profit-loss' | 'fin-bank-reconciliation'
    | 'fin-purchase-orders' | 'fin-credit-notes' | 'fin-expense-claims' | 'fin-site-expenses' | 'fin-work-orders' | 'fin-client-follow-up'
    | 'fin-petty-cash-custodian' | 'fin-petty-cash-approval-queue' | 'fin-petty-cash-replenishment'
  | 'fin-user-management'
   // Procurement sub-modules
   | 'procurement-pr' | 'procurement-rfq' | 'procurement-po-register' | 'procurement-vendors' | 'procurement-material-tracking' | 'procurement-subcontracts'
   | 'po-approval-stepper' | 'rfq-comparison-matrix' | 'grn-3way-match' | 'stock-ledger' | 'material-issue-wip' | 'ra-work-slider' | 'scrap-entry' | 'customer-profitability' | 'report-drilldown' | 'po-cost-tree' | 'site-store'
   | 'sales' | 'sales-tax-invoices' | 'sales-orders' | 'sales-quotations'
   | 'sales-opportunity-pipeline' | 'sales-tender-register' | 'sales-revenue-forecast' | 'sales-client-accounts'
   // Tabbed-dashboard screens
   | 'receipt-entry' | 'material-receipt'
  // Projects sub-modules
  | 'project-list'
  | 'project-hierarchy'
  | 'boq-entry'
  | 'job-progress'
  // Organization sub-modules
  | 'departments' | 'designations' | 'holidays' | 'leave-policies' | 'attendance-rules'
  | 'employee-documents'
  // Biometric
  | 'biometric'
  // Admin
  | 'trash'
  // User Management (tenant admin)
  | 'user-management'
  | 'onboarding-approvals'
  // Employee self-service
  | 'my-attendance'
  | 'my-leave'
  | 'my-tours'
  | 'my-requests'
  | 'my-profile'
  | 'my-notices'
  | 'my-payslips'
  | 'my-documents'
  | 'my-shifts'
  // Admin requests view
  | 'requests'
  | 'notice-board'
  // Top-level modules missing from the original union
  | 'self-service' | 'payroll' | 'equipment';

interface NavItem {
  id: ModuleId;
  icon: string;
  label: string;
  badge?: number;
  section?: string;
}

// Modules the demo user is allowed to access (top-level and sub-modules)
export const DEMO_ALLOWED_MODULES: Set<string> = new Set([
  'dashboard',
  'organization',
  'departments',
  'designations',
  'holidays',
  'leave-policies',
  'attendance-rules',
  'hrms',
  'employee-analytics',
  'employees',
  'attendance',
  'leave',
  'tour-requests',
  'shift',
  'timesheet',
  'payroll',
  'training',
  'recruitment',
  'biometric',
]);

export const MAIN_MODULES: NavItem[] = [
  { id: 'organization', icon: 'Building2', label: 'Organization' },
  { id: 'hrms', icon: 'Users', label: 'HRMS' },
  { id: 'login-role', icon: 'LogIn', label: 'Login & Role' },
  { id: 'master-setup', icon: 'Layers', label: 'Master Setup' },
  { id: 'purchase', icon: 'ShoppingCart', label: 'Purchase' },
  { id: 'inventory', icon: 'Package', label: 'Inventory' },
  { id: 'sales-billing', icon: 'BadgePercent', label: 'Sales & Billing' },
  { id: 'finance-accounts', icon: 'Landmark', label: 'Finance & Accounts' },
  { id: 'petty-cash', icon: 'Wallet', label: 'Petty Cash' },
  { id: 'mis', icon: 'PieChart', label: 'MIS' },
  { id: 'projects', icon: 'FolderKanban', label: 'Projects' },
  { id: 'assets', icon: 'Wrench', label: 'Assets' },
  { id: 'system', icon: 'Settings', label: 'System' },
  { id: 'self-service', icon: 'UserCircle', label: 'My Portal' },
];

export const SUB_MODULES: Record<string, NavItem[]> = {
  organization: [
    { id: 'departments', icon: 'Building2', label: 'Departments' },
    { id: 'designations', icon: 'Award', label: 'Designations' },
    { id: 'holidays', icon: 'CalendarDays', label: 'Holidays' },
    { id: 'leave-policies', icon: 'FileText', label: 'Leave Policies' },
    { id: 'attendance-rules', icon: 'Shield', label: 'Attendance Rules' },
    { id: 'checklist-templates', icon: 'ClipboardList', label: 'Checklist Templates' },
    { id: 'employee-documents', icon: 'FolderOpen', label: 'Employee Documents' },
  ],
  hrms: [
    { id: 'employee-analytics', icon: 'BarChart3', label: 'Employee Analytics', section: 'HRMS' },
    { id: 'employees', icon: 'HardHat', label: 'Employees', section: 'HRMS' },
    { id: 'attendance', icon: 'ClipboardList', label: 'Attendance', section: 'HRMS' },
    { id: 'biometric', icon: 'Fingerprint', label: 'Biometric Sync', section: 'HRMS' },
    { id: 'leave', icon: 'CalendarDays', label: 'Leave Management', section: 'HRMS' },
    { id: 'tour-requests', icon: 'Plane', label: 'Tour Requests', section: 'HRMS' },
    { id: 'shift', icon: 'RotateCcw', label: 'Shift Roster', section: 'HRMS' },
    { id: 'timesheet', icon: 'TimerReset', label: 'Timesheet', section: 'HRMS' },
    { id: 'payroll', icon: 'IndianRupee', label: 'Payroll', section: 'HRMS' },
    { id: 'training', icon: 'GraduationCap', label: 'Certificates', section: 'HRMS' },
    { id: 'recruitment', icon: 'Search', label: 'Recruitment', section: 'HRMS' },
    { id: 'onboarding', icon: 'UserCheck', label: 'Onboarding', section: 'Lifecycle' },
    { id: 'offboarding', icon: 'UserX', label: 'Offboarding', section: 'Lifecycle' },
    { id: 'exit-management', icon: 'ArrowLeft', label: 'Exit Management', section: 'Lifecycle' },
  ],
  procurement: [
    { id: 'procurement-pr', icon: 'FileEdit', label: 'Purchase Requisition', section: 'Procurement' },
    { id: 'procurement-rfq', icon: 'ClipboardList', label: 'RFQ Management', section: 'Procurement' },
    { id: 'procurement-po-register', icon: 'ShoppingCart', label: 'PO Register', section: 'Procurement' },
    { id: 'procurement-vendors', icon: 'Users', label: 'Vendor Management', section: 'Procurement' },
    { id: 'procurement-material-tracking', icon: 'Package', label: 'Material Tracking', section: 'Procurement' },
    { id: 'procurement-subcontracts', icon: 'FileText', label: 'Subcontract Register', section: 'Procurement' },
  ],
  // Category modules (like HRMS / Organization)
  'login-role': [
    { id: 'fin-user-management', icon: 'UserCog', label: 'Finance Access Control', section: 'Access Control' },
  ],
  'master-setup': [
    { id: 'fin-sites', icon: 'MapPin', label: 'Sites', section: 'Masters' },
    { id: 'fin-jobs', icon: 'Briefcase', label: 'Jobs (PO-wise)', section: 'Masters' },
    { id: 'fin-parties', icon: 'Users', label: 'Clients & Vendors', section: 'Masters' },
    { id: 'procurement-vendors', icon: 'Users', label: 'Vendor Management', section: 'Masters' },
    { id: 'employees', icon: 'HardHat', label: 'Employees', section: 'Masters' },
    { id: 'chart-of-accounts', icon: 'BookOpen', label: 'Chart of Accounts', section: 'Masters' },
  ],
  purchase: [
    { id: 'procurement-pr', icon: 'FileEdit', label: 'Purchase Requisition', section: 'Purchase' },
    { id: 'procurement-rfq', icon: 'ClipboardList', label: 'RFQ Management', section: 'Purchase' },
    { id: 'rfq-comparison-matrix', icon: 'BarChart3', label: 'Quotation Comparison', section: 'Purchase' },
    { id: 'procurement-po-register', icon: 'ShoppingCart', label: 'PO Register', section: 'Purchase' },
    { id: 'po-approval-stepper', icon: 'ListChecks', label: 'PO Approval', section: 'Purchase' },
    { id: 'grn-3way-match', icon: 'Scale', label: 'GRN 3-Way Match', section: 'Purchase' },
    { id: 'accounts-payable', icon: 'ArrowDownCircle', label: 'Purchase Bills (AP)', section: 'Purchase' },
    { id: 'fin-purchase-orders', icon: 'ShoppingCart', label: 'Purchase Orders', section: 'Purchase' },
  ],
  inventory: [
    { id: 'site-store', icon: 'Warehouse', label: 'Site Store Management', section: 'Inventory' },
    { id: 'material-receipt', icon: 'Package', label: 'Material Receipt', section: 'Inventory' },
    { id: 'material-issue-wip', icon: 'Package', label: 'Material Issue → WIP', section: 'Inventory' },
    { id: 'stock-ledger', icon: 'BookOpen', label: 'Stock Ledger', section: 'Inventory' },
    { id: 'scrap-entry', icon: 'Recycle', label: 'Scrap Entry', section: 'Inventory' },
  ],
  'sales-billing': [
    { id: 'sales-orders', icon: 'ShoppingBag', label: 'Sales Orders', section: 'Sales & Billing' },
    { id: 'sales-quotations', icon: 'FileText', label: 'Quotations', section: 'Sales & Billing' },
    { id: 'ra-work-slider', icon: 'FileText', label: 'RA %-Work Billing', section: 'Sales & Billing' },
    { id: 'sales-tax-invoices', icon: 'FileText', label: 'Tax Invoices', section: 'Sales & Billing' },
    { id: 'receipt-entry', icon: 'ArrowUpCircle', label: 'Receipt Entry', section: 'Sales & Billing' },
    { id: 'fin-credit-notes', icon: 'Files', label: 'Credit Notes', section: 'Sales & Billing' },
  ],
  'finance-accounts': [
    { id: 'finance-dashboard', icon: 'BarChart3', label: 'Dashboard', section: 'Overview' },

    { id: 'ledger', icon: 'BookOpen', label: 'Ledger', section: 'General Ledger' },
    { id: 'journal-entries', icon: 'FileEdit', label: 'Journal Entries', section: 'General Ledger' },
    { id: 'create-journal-entry', icon: 'FilePlus', label: 'Create Journal Entry', section: 'General Ledger' },

    { id: 'accounts-payable', icon: 'ArrowDownCircle', label: 'Accounts Payable', section: 'Accounts Payable' },
    { id: 'fin-payments', icon: 'Send', label: 'Payment Center', section: 'Accounts Payable' },
    { id: 'fin-payment-advices', icon: 'FileText', label: 'Payment Advices', section: 'Accounts Payable' },
    { id: 'fin-work-orders', icon: 'ClipboardList', label: 'Work Orders', section: 'Accounts Payable' },

    { id: 'accounts-receivable', icon: 'ArrowUpCircle', label: 'Accounts Receivable', section: 'Accounts Receivable' },
    { id: 'fin-invoices', icon: 'FileText', label: 'Site Invoices', section: 'Accounts Receivable' },
    { id: 'fin-client-follow-up', icon: 'PhoneCall', label: 'Client Follow Up', section: 'Accounts Receivable' },

    { id: 'bank-cash', icon: 'Landmark', label: 'Bank & Cash', section: 'Bank & Cash' },
    { id: 'fin-bank-reconciliation', icon: 'Scale', label: 'Bank Reconciliation', section: 'Bank & Cash' },

    { id: 'fin-expense-claims', icon: 'Wallet', label: 'Expense Claims', section: 'Expense Management' },
    { id: 'fin-site-expenses', icon: 'FileSpreadsheet', label: 'Site Expenses', section: 'Expense Management' },

    { id: 'fin-assets', icon: 'Package', label: 'Fixed Assets', section: 'Fixed Assets' },

    { id: 'taxation', icon: 'Scale', label: 'GST / TDS', section: 'Compliance' },

    { id: 'fin-profit-loss', icon: 'TrendingUp', label: 'Profit & Loss', section: 'Reports & Analysis' },
    { id: 'financial-reports', icon: 'PieChart', label: 'Financial Reports', section: 'Reports & Analysis' },
  ],
  'petty-cash': [
    { id: 'fin-petty-cash-custodian', icon: 'Wallet', label: 'Custodian Dashboard', section: 'Petty Cash' },
    { id: 'fin-petty-cash', icon: 'Wallet', label: 'Vouchers', section: 'Petty Cash' },
    { id: 'fin-petty-cash-approval-queue', icon: 'ListChecks', label: 'Approval Queue', section: 'Petty Cash' },
    { id: 'fin-petty-cash-replenishment', icon: 'HandCoins', label: 'Replenishment', section: 'Petty Cash' },
  ],
  mis: [
    { id: 'report-drilldown', icon: 'BarChart3', label: 'Site / Job P&L Drill-down', section: 'MIS' },
    { id: 'po-cost-tree', icon: 'BookOpen', label: 'PO Cost Tree', section: 'MIS' },
    { id: 'customer-profitability', icon: 'Users', label: 'Customer Profitability', section: 'MIS' },
    { id: 'budget', icon: 'Target', label: 'Budget vs Actual', section: 'MIS' },
  ],
  sales: [
    { id: 'sales-opportunity-pipeline', icon: 'TrendingUp', label: 'Opportunity Pipeline', section: 'Sales & BD' },
    { id: 'sales-tender-register', icon: 'ClipboardList', label: 'Tender Register', section: 'Sales & BD' },
    { id: 'sales-revenue-forecast', icon: 'BarChart3', label: 'Revenue Forecast', section: 'Sales & BD' },
    { id: 'sales-client-accounts', icon: 'Users', label: 'Client Accounts', section: 'Sales & BD' },
    { id: 'sales-tax-invoices', icon: 'FileText', label: 'Tax Invoices', section: 'Sales & BD' },
    { id: 'sales-orders', icon: 'ShoppingBag', label: 'Sales Orders', section: 'Sales & BD' },
    { id: 'sales-quotations', icon: 'FileText', label: 'Quotations', section: 'Sales & BD' },
    { id: 'fin-credit-notes', icon: 'Files', label: 'Credit Notes', section: 'Sales & BD' },
  ],
  'projects': [
    { id: 'project-list', icon: 'FolderKanban', label: 'All Projects', section: 'Projects' },
    { id: 'project-hierarchy', icon: 'ListTree', label: 'Project / Job Hierarchy', section: 'Projects' },
    { id: 'budget', icon: 'Target', label: 'Budget vs Actual', section: 'Projects' },
    { id: 'boq-entry', icon: 'ListTree', label: 'BOQ Entry & Tracking', section: 'Projects' },
    { id: 'job-progress', icon: 'Gauge', label: 'Job Progress & Milestones', section: 'Projects' },
    { id: 'sites', icon: 'MapPin', label: 'Site Map', section: 'Projects' },
  ],
  assets: [
    { id: 'equipment', icon: 'Wrench', label: 'Equipment', section: 'Assets' },
    { id: 'permits', icon: 'ShieldAlert', label: 'Work Permits', badge: 2, section: 'Operations' },
    { id: 'safety', icon: 'HardHat', label: 'Safety & HSE', section: 'Operations' },
    { id: 'subcontractors', icon: 'Handshake', label: 'Subcontractors', section: 'Operations' },
  ],
  system: [
    { id: 'reports', icon: 'BarChart3', label: 'Reports', section: 'System' },
    { id: 'settings', icon: 'Settings', label: 'Settings', section: 'System' },
    { id: 'user-management', icon: 'UserCog', label: 'User Management', section: 'System' },
    { id: 'onboarding-approvals', icon: 'UserCheck', label: 'Onboarding Approvals', section: 'System' },
    { id: 'requests', icon: 'ClipboardList', label: 'Employee Requests', section: 'System' },
    { id: 'notice-board', icon: 'Megaphone', label: 'Notice Board', section: 'System' },
  ],
  reports: [
    { id: 'report-manpower',   icon: 'Users',         label: 'Manpower',         section: 'Reports' },
    { id: 'report-attendance', icon: 'ClipboardList',  label: 'Attendance',       section: 'Reports' },
    { id: 'report-payroll',    icon: 'IndianRupee',    label: 'Payroll',          section: 'Reports' },
    { id: 'report-leave',      icon: 'CalendarDays',   label: 'Leave',            section: 'Reports' },
    { id: 'report-late-fine',  icon: 'AlertTriangle',  label: 'Late & Fines',     section: 'Reports' },
    { id: 'report-onboarding', icon: 'UserCheck',      label: 'Onboarding',       section: 'Reports' },
    { id: 'report-turnover',   icon: 'UserX',          label: 'Turnover / Exit',  section: 'Reports' },
    { id: 'report-training',   icon: 'GraduationCap',  label: 'Training & Certs', section: 'Reports' },
    { id: 'report-notices',    icon: 'Bell',           label: 'Notice Read Rate', section: 'Reports' },
    { id: 'report-dispatch',   icon: 'Send',           label: 'Payslip Dispatch', section: 'Reports' },
  ],
  'self-service': [
    { id: 'my-attendance', icon: 'ClipboardList', label: 'My Attendance', section: 'My Portal' },
    { id: 'my-leave', icon: 'CalendarDays', label: 'Apply Leave', section: 'My Portal' },
    { id: 'my-tours', icon: 'Plane', label: 'My Tours', section: 'My Portal' },
    { id: 'my-requests', icon: 'FileText', label: 'My Requests', section: 'My Portal' },
    { id: 'my-profile', icon: 'User', label: 'My Profile', section: 'My Portal' },
    { id: 'my-notices', icon: 'Bell', label: 'My Notices', section: 'My Portal' },
    { id: 'my-payslips', icon: 'IndianRupee', label: 'My Payslips', section: 'My Portal' },
    { id: 'my-documents', icon: 'FolderOpen', label: 'My Documents', section: 'My Portal' },
    { id: 'my-shifts', icon: 'RotateCcw', label: 'My Shifts', section: 'My Portal' },
  ],
};

export interface ModuleConfig {
  title: string;
  breadcrumb: string;
}

export const MODULE_CONFIG: Record<string, ModuleConfig> = {
  // Main modules (grid view)
  dashboard: { title: 'Dashboard', breadcrumb: 'VoltCore ERP › Overview' },
  organization: { title: 'Organization', breadcrumb: 'VoltCore ERP › Organization' },
  hrms: { title: 'HRMS', breadcrumb: 'VoltCore ERP › Human Resources' },
  procurement: { title: 'Procurement Management', breadcrumb: 'VoltCore ERP › Procurement' },
  finance: { title: 'Finance', breadcrumb: 'VoltCore ERP › Finance' },
  projects: { title: 'Projects', breadcrumb: 'VoltCore ERP › Projects' },
  assets: { title: 'Assets', breadcrumb: 'VoltCore ERP › Assets & Operations' },
  system: { title: 'System', breadcrumb: 'VoltCore ERP › System' },
  'login-role': { title: 'Login & Role', breadcrumb: 'VoltCore ERP › Login & Role' },
  'master-setup': { title: 'Master Setup', breadcrumb: 'VoltCore ERP › Master Setup' },
  purchase: { title: 'Purchase', breadcrumb: 'VoltCore ERP › Purchase' },
  inventory: { title: 'Inventory', breadcrumb: 'VoltCore ERP › Inventory' },
  'sales-billing': { title: 'Sales & Billing', breadcrumb: 'VoltCore ERP › Sales & Billing' },
  'finance-accounts': { title: 'Finance & Accounts', breadcrumb: 'VoltCore ERP › Finance & Accounts' },
  'petty-cash': { title: 'Petty Cash', breadcrumb: 'VoltCore ERP › Petty Cash' },
  mis: { title: 'MIS', breadcrumb: 'VoltCore ERP › MIS' },
  // Organization sub-modules
  departments: { title: 'Departments', breadcrumb: 'Organization › Departments' },
  designations: { title: 'Designations', breadcrumb: 'Organization › Designations' },
  holidays: { title: 'Holidays', breadcrumb: 'Organization › Holidays' },
  'leave-policies': { title: 'Leave Policies', breadcrumb: 'Organization › Leave Policies' },
  'attendance-rules': { title: 'Attendance Rules', breadcrumb: 'Organization › Attendance Rules' },
  // HRMS sub-modules
  'employee-analytics': { title: 'Employee Analytics', breadcrumb: 'HRMS › Employee Analytics' },
  timesheet: { title: 'Timesheet', breadcrumb: 'HRMS › Weekly Timesheet' },
  employees: { title: 'Employees', breadcrumb: 'HRMS › Employee Directory' },
  attendance: { title: 'Attendance', breadcrumb: 'HRMS › Daily Attendance' },
  biometric: { title: 'Biometric Sync', breadcrumb: 'HRMS › Biometric Integration' },
  leave: { title: 'Leave Management', breadcrumb: 'HRMS › Leave Requests' },
  shift: { title: 'Shift Roster', breadcrumb: 'HRMS › Shift Planning' },
  training: { title: 'Certificates', breadcrumb: 'HRMS › Certificates' },
  recruitment: { title: 'Recruitment', breadcrumb: 'HRMS › Talent Acquisition' },
  onboarding: { title: 'Onboarding', breadcrumb: 'HRMS › Employee Lifecycle › Onboarding' },
  offboarding: { title: 'Offboarding', breadcrumb: 'HRMS › Employee Lifecycle › Offboarding' },
  'exit-management': { title: 'Exit Management', breadcrumb: 'HRMS › Employee Lifecycle › Exit' },
  'checklist-templates': { title: 'Checklist Templates', breadcrumb: 'Organization › Checklist Templates' },
  'employee-documents': { title: 'Employee Documents', breadcrumb: 'Organization › Employee Documents' },
  purchases: { title: 'Purchase Orders', breadcrumb: 'Procurement › PO' },
  'fin-expense-claims': { title: 'Expense Claims', breadcrumb: 'Finance › Expense Claims' },
  'fin-site-expenses': { title: 'Site Expenses', breadcrumb: 'Finance › Site Expenses' },
  'procurement-pr': { title: 'Purchase Requisition', breadcrumb: 'Procurement › PR' },
  'procurement-rfq': { title: 'RFQ Management', breadcrumb: 'Procurement › RFQ' },
  'procurement-po-register': { title: 'PO Register', breadcrumb: 'Procurement › PO Register' },
  'procurement-vendors': { title: 'Vendor Management', breadcrumb: 'Procurement › Vendors' },
  'procurement-material-tracking': { title: 'Material Tracking', breadcrumb: 'Procurement › Materials' },
  'procurement-subcontracts': { title: 'Subcontract Register', breadcrumb: 'Procurement › Subcontracts' },
  payroll: { title: 'Payroll', breadcrumb: 'HRMS › Payroll Processing' },
  // Finance sub-modules
  'finance-dashboard': { title: 'Finance Dashboard', breadcrumb: 'Finance › Overview' },
  'create-journal-entry': { title: 'Create Journal Entry', breadcrumb: 'Finance › New Journal Entry' },
  'fin-sites': { title: 'Finance Sites', breadcrumb: 'Finance › Sites' },
  'fin-jobs': { title: 'Job Master', breadcrumb: 'Finance › Jobs' },
  'fin-parties': { title: 'Party Master', breadcrumb: 'Finance › Parties' },
  'fin-invoices': { title: 'Site Invoices', breadcrumb: 'Finance › Invoices' },
  'fin-purchase-orders': { title: 'Purchase Orders (Finance)', breadcrumb: 'Finance › Purchase Orders' },
  'po-approval-stepper': { title: 'PO Approval Stepper', breadcrumb: 'Finance › Purchase › Approval Stepper' },
  'rfq-comparison-matrix': { title: 'RFQ Comparison Matrix', breadcrumb: 'Finance › Purchase › RFQ Matrix' },
  'grn-3way-match': { title: 'GRN 3-Way Match', breadcrumb: 'Finance › Purchase › GRN Match' },
  'stock-ledger': { title: 'Stock Ledger', breadcrumb: 'Finance › Inventory › Stock Ledger' },
  'material-issue-wip': { title: 'Material Issue → WIP', breadcrumb: 'Finance › Inventory › Material Issue' },
  'scrap-entry': { title: 'Scrap Entry', breadcrumb: 'Finance › Inventory › Scrap' },
  'site-store': { title: 'Site Store Management', breadcrumb: 'Finance › Inventory › Site Store' },
  'ra-work-slider': { title: 'RA %-Work Billing', breadcrumb: 'Finance › Inventory › RA Billing' },
  'report-drilldown': { title: 'P&L / Balance Sheet Drill-down', breadcrumb: 'Finance › Reporting › Drill-down' },
  'po-cost-tree': { title: 'PO-wise Cost Tree', breadcrumb: 'Finance › Reporting › Cost Tree' },
  'customer-profitability': { title: 'Customer-wise Profitability', breadcrumb: 'Finance › MIS › Customer Profitability' },
  'fin-petty-cash': { title: 'Petty Cash', breadcrumb: 'Finance › Petty Cash' },
  'fin-petty-cash-custodian': { title: 'Custodian Dashboard', breadcrumb: 'Finance › Petty Cash › Custodian Dashboard' },
  'fin-petty-cash-approval-queue': { title: 'Approval Queue', breadcrumb: 'Finance › Petty Cash › Approval Queue' },
  'fin-petty-cash-replenishment': { title: 'Replenishment Request', breadcrumb: 'Finance › Petty Cash › Replenishment Request' },
  'fin-payments': { title: 'Payment Center', breadcrumb: 'Finance › Payment Center' },
  'fin-payment-advices': { title: 'Payment Advices', breadcrumb: 'Finance › Payment Advices' },
  'fin-credit-notes': { title: 'Credit Notes', breadcrumb: 'Sales › Credit Notes' },
  'fin-work-orders': { title: 'Work Orders (Orders in Hand)', breadcrumb: 'Finance › Work Orders' },
  'fin-bank-reconciliation': { title: 'Bank Reconciliation', breadcrumb: 'Finance › Bank Reconciliation' },
  'fin-assets': { title: 'Fixed Assets', breadcrumb: 'Finance › Fixed Assets' },
  'fin-profit-loss': { title: 'Profit & Loss', breadcrumb: 'Finance › Profit & Loss Account' },
  'fin-client-follow-up': { title: 'Client Follow Up', breadcrumb: 'Finance › Client Follow Up' },
  'receipt-entry': { title: 'Receipt Entry', breadcrumb: 'Sales › Receipts' },
  'material-receipt': { title: 'Material Receipt', breadcrumb: 'Inventory › Goods Receipt' },
  sales: { title: 'Sales & Business Development', breadcrumb: 'VoltCore ERP › Sales & BD' },
  'sales-opportunity-pipeline': { title: 'Opportunity Pipeline', breadcrumb: 'Sales & BD › Pipeline' },
  'sales-tender-register': { title: 'Tender Register', breadcrumb: 'Sales & BD › Tenders' },
  'sales-revenue-forecast': { title: 'Revenue Forecast', breadcrumb: 'Sales & BD › Forecast' },
  'sales-client-accounts': { title: 'Client Accounts', breadcrumb: 'Sales & BD › Clients' },
  'sales-tax-invoices': { title: 'Sales Tax Invoices', breadcrumb: 'Sales & BD › Tax Invoices' },
  'sales-orders': { title: 'Sales Orders', breadcrumb: 'Sales & BD › Orders' },
  'sales-quotations': { title: 'Quotations', breadcrumb: 'Sales & BD › Quotations' },
  ledger: { title: 'Ledger Management', breadcrumb: 'Finance › General Ledger' },
  'chart-of-accounts': { title: 'Chart of Accounts', breadcrumb: 'Finance › Chart of Accounts' },
  'accounts-payable': { title: 'Accounts Payable', breadcrumb: 'Finance › AP' },
  'accounts-receivable': { title: 'Accounts Receivable', breadcrumb: 'Finance › AR Management' },
  'journal-entries': { title: 'Journal Entries', breadcrumb: 'Finance › Journal' },
  'bank-cash': { title: 'Bank & Cash Management', breadcrumb: 'Finance › Banking' },
  taxation: { title: 'Taxation & Compliance', breadcrumb: 'Finance › Tax' },
  budget: { title: 'Budget & Forecasting', breadcrumb: 'Finance › Budget' },
  'financial-reports': { title: 'Financial Reports', breadcrumb: 'Finance › Reports' },
  'project-list': { title: 'All Projects', breadcrumb: 'Projects › All Projects' },
  'project-hierarchy': { title: 'Project / Job Hierarchy', breadcrumb: 'Projects › Project / Job Hierarchy' },
  'boq-entry': { title: 'BOQ Entry & Tracking', breadcrumb: 'Projects › BOQ' },
  'job-progress': { title: 'Job Progress & Milestones', breadcrumb: 'Projects › Job Progress' },
  sites: { title: 'Site Map', breadcrumb: 'Projects › Sites' },
  permits: { title: 'Work Permits (PTW)', breadcrumb: 'Operations › Permit to Work' },
  safety: { title: 'Safety & HSE', breadcrumb: 'Operations › HSE Management' },
  equipment: { title: 'Equipment', breadcrumb: 'Operations › Asset Management' },
  subcontractors: { title: 'Subcontractors', breadcrumb: 'Operations › Subcontractor Management' },
  reports: { title: 'Reports', breadcrumb: 'System › Reports' },
  'report-manpower':   { title: 'Manpower Report',         breadcrumb: 'Reports › Manpower' },
  'report-attendance': { title: 'Attendance Report',        breadcrumb: 'Reports › Attendance' },
  'report-payroll':    { title: 'Payroll Report',           breadcrumb: 'Reports › Payroll' },
  'report-leave':      { title: 'Leave Report',             breadcrumb: 'Reports › Leave' },
  'report-late-fine':  { title: 'Late & Fine Report',       breadcrumb: 'Reports › Late & Fines' },
  'report-onboarding': { title: 'Onboarding Status Report', breadcrumb: 'Reports › Onboarding' },
  'report-turnover':   { title: 'Turnover / Exit Report',   breadcrumb: 'Reports › Turnover' },
  'report-training':   { title: 'Certificate Report',   breadcrumb: 'Reports › Certificates' },
  'report-notices':    { title: 'Notice Read Rate Report',  breadcrumb: 'Reports › Notices' },
  'report-dispatch':   { title: 'Payslip Dispatch Report',  breadcrumb: 'Reports › Dispatch' },
  settings: { title: 'Settings', breadcrumb: 'VoltCore ERP › System Settings' },
  trash: { title: 'Recycle Bin', breadcrumb: 'Admin › Deleted Items' },
  'user-management': { title: 'User Management', breadcrumb: 'System › User Management' },
  'fin-user-management': { title: 'Finance User Management', breadcrumb: 'System Settings › Finance User Management' },
  'onboarding-approvals': { title: 'Onboarding Approvals', breadcrumb: 'System › Onboarding Approvals' },
  'requests': { title: 'Employee Requests', breadcrumb: 'System › Employee Requests' },
  'self-service': { title: 'My Portal', breadcrumb: 'VoltCore ERP › My Portal' },
  'my-attendance': { title: 'My Attendance', breadcrumb: 'My Portal › Attendance' },
  'my-leave': { title: 'Apply for Leave', breadcrumb: 'My Portal › Leave Application' },
  'my-tours': { title: 'My Tour Requests', breadcrumb: 'My Portal › Tour Requests' },
  'my-requests': { title: 'My Requests', breadcrumb: 'My Portal › Requests' },
  'my-profile':   { title: 'My Profile',   breadcrumb: 'My Portal › Profile' },
  'my-notices':   { title: 'My Notices',   breadcrumb: 'My Portal › Notices' },
  'my-payslips':  { title: 'My Payslips',  breadcrumb: 'My Portal › Payslips' },
  'my-documents': { title: 'My Documents', breadcrumb: 'My Portal › Documents' },
  'my-shifts':    { title: 'My Shifts',    breadcrumb: 'My Portal › Shifts' },
  'notice-board': { title: 'Notice Board', breadcrumb: 'System › Notice Board' },
};

// Modules with sub-modules (clicking them shows sub-nav instead of a page)
export const EXPANDABLE_MODULES = ['organization', 'hrms', 'procurement', 'sales', 'projects', 'assets', 'system', 'self-service', 'reports', 'login-role', 'master-setup', 'purchase', 'inventory', 'sales-billing', 'finance-accounts', 'petty-cash', 'mis'];

// Main modules that have their own page (no sub-nav)
export const PAGE_MODULES = ['dashboard'];

// Reverse lookup: given a sub-module id, find its parent module
const PARENT_MAP: Record<string, string> = {};
(Object.keys(SUB_MODULES) as string[]).forEach((parent) => {
  SUB_MODULES[parent].forEach((sub) => {
    if (!PARENT_MAP[sub.id]) PARENT_MAP[sub.id] = parent; // First parent wins
  });
});

// All parent boards that contain a given sub-module (a module can live under
// multiple categories, e.g. Accounts Payable under Purchase AND Finance).
export function getModuleParents(moduleId: string): string[] {
  const parents: string[] = [];
  (Object.keys(SUB_MODULES) as string[]).forEach((parent) => {
    if (SUB_MODULES[parent].some((sub) => sub.id === moduleId)) parents.push(parent);
  });
  return parents;
}

// Expandable modules that show their own sub-module grid (instead of auto-redirecting to first child)
export const EXPANDABLE_WITH_PAGE = ['hrms', 'organization', 'finance-accounts', 'sales', 'procurement', 'projects', 'reports', 'login-role', 'master-setup', 'purchase', 'inventory', 'sales-billing', 'petty-cash', 'mis'];

// Build a quick lookup for main module icons/labels
const MAIN_MODULE_MAP: Record<string, NavItem> = {};
MAIN_MODULES.forEach((m) => { MAIN_MODULE_MAP[m.id] = m; });
export { MAIN_MODULE_MAP };

function resolveParent(module: ModuleId): ModuleId {
  if (PARENT_MAP[module]) return PARENT_MAP[module] as ModuleId;
  if (EXPANDABLE_MODULES.includes(module)) return module;
  // PAGE_MODULES that aren't dashboard are their own parent
  if (PAGE_MODULES.includes(module) && module !== 'dashboard') return module;
  return 'dashboard';
}

function resolveInitialSubModule(parent: ModuleId, allowedModules: string, userRole: UserRole): ModuleId {
  const subs = SUB_MODULES[parent];
  if (!subs || subs.length === 0) return parent;
  
  // If full access, return first sub-module
  if (allowedModules === 'all') return subs[0].id;
  
  // For restricted access, find the first allowed sub-module
  const allowedSub = subs.find(sub => isModuleAllowed(sub.id, allowedModules));
  return allowedSub ? allowedSub.id : parent;
}

interface ERPStore {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  activeParentModule: ModuleId;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  triggerCreate: number;
  triggerCreateDialog: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  allowedModules: string;
  setAllowedModules: (modules: string) => void;
  /** Bumped whenever finance/ledger data changes — tables/dashboard listen and re-fetch. */
  dataVersion: number;
  bumpDataVersion: () => void;
}

export const useERPStore = create<ERPStore>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set((s) => {
    // Guard: users without full access cannot navigate to modules they don't have access to
    if (s.allowedModules !== 'all' && module !== 'dashboard' && !isModuleAllowed(module, s.allowedModules)) {
      console.warn(`[ERPStore] Access denied to module: ${module}`);
      return s; // No state change — stay where they are
    }

    const parent = resolveParent(module);
    const finalModule = (
      EXPANDABLE_MODULES.includes(module) &&
      !EXPANDABLE_WITH_PAGE.includes(module) &&
      SUB_MODULES[module] &&
      SUB_MODULES[module].length > 0
    ) ? resolveInitialSubModule(module, s.allowedModules, s.userRole) : module;
    return {
      activeModule: finalModule,
      activeParentModule: parent,
    };
  }),
  activeParentModule: 'dashboard' as ModuleId,
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  triggerCreate: 0,
  triggerCreateDialog: () => set((s) => ({ triggerCreate: s.triggerCreate + 1 })),
  userRole: 'admin',
  setUserRole: (role) => set({ userRole: role }),
  allowedModules: 'all',
  setAllowedModules: (modules) => set({ allowedModules: modules }),
  dataVersion: 0,
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}));

/**
 * Broadcast that finance/ledger data changed (bumps the store counter AND
 * dispatches a window event). Components that show live tables/dashboards
 * listen for `finance:data-changed` to re-fetch immediately, independent of
 * the hourly auto-sync interval.
 */
export function notifyFinanceDataChanged() {
  useERPStore.getState().bumpDataVersion();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance:data-changed'));
  }
}
