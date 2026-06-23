import { create } from 'zustand';

export type UserRole = 'superadmin' | 'admin' | 'demo';

// All top-level modules and their sub-modules for access checking
export const MODULE_TREE: Record<string, string[]> = {
  organization: ['organization', 'departments', 'designations', 'holidays', 'leave-policies', 'attendance-rules', 'checklist-templates', 'employee-documents', 'roles-access'],
  hrms: ['hrms', 'employee-analytics', 'employees', 'attendance', 'biometric', 'leave', 'tour-requests', 'shift', 'timesheet', 'payroll', 'training', 'recruitment', 'onboarding', 'offboarding', 'exit-management'],
  procurement: ['procurement', 'purchases', 'expenses'],
  finance: ['finance', 'finance-dashboard', 'ledger', 'accounts-payable', 'accounts-receivable', 'journal-entries', 'bank-cash', 'taxation', 'budget', 'financial-reports'],
  projects: ['projects', 'project-list', 'sites'],
  assets: ['assets', 'equipment', 'permits', 'safety', 'subcontractors'],
  // A dedicated "self-service" group for employees
  'self-service': ['my-dashboard', 'my-attendance', 'my-leave', 'my-tours', 'my-requests', 'my-profile', 'my-notices', 'my-payslips', 'my-documents', 'my-shifts'],
  system: ['system', 'reports', 'settings', 'user-management', 'onboarding-approvals', 'requests', 'notice-board'],
  reports: ['reports', 'report-manpower', 'report-attendance', 'report-payroll', 'report-leave', 'report-tour', 'report-late-fine', 'report-onboarding', 'report-turnover', 'report-training', 'report-notices', 'report-dispatch'],
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
  // Sub-modules
  | 'employees' | 'attendance' | 'leave' | 'tour-requests' | 'shift' | 'training' | 'recruitment'
  | 'onboarding' | 'offboarding' | 'exit-management' | 'checklist-templates'
  | 'purchases' | 'expenses' | 'invoices'
  | 'sites' | 'permits' | 'safety' | 'subcontractors'
  | 'reports' | 'settings'
  | 'report-manpower' | 'report-attendance' | 'report-payroll' | 'report-leave'
  | 'report-late-fine' | 'report-onboarding' | 'report-turnover' | 'report-training'
  | 'report-notices' | 'report-dispatch' | 'report-tour'
  // Analytics pages
  | 'employee-analytics'
  // Timesheet
  | 'timesheet'
  // Finance sub-modules
  | 'finance-dashboard' | 'ledger' | 'accounts-payable' | 'accounts-receivable'
  | 'journal-entries' | 'bank-cash' | 'taxation' | 'budget' | 'financial-reports'
  // Projects sub-modules
  | 'project-list'
  // Organization sub-modules
  | 'departments' | 'designations' | 'holidays' | 'leave-policies' | 'attendance-rules'
  | 'employee-documents' | 'roles-access'
  // Biometric
  | 'biometric'
  // Admin
  | 'trash'
  // User Management (tenant admin)
  | 'user-management'
  | 'onboarding-approvals'
  // Employee self-service
  | 'my-dashboard'
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
  | 'notice-board';

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
  { id: 'procurement', icon: 'ShoppingCart', label: 'Procurement' },
  { id: 'finance', icon: 'CreditCard', label: 'Finance' },
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
    { id: 'roles-access', icon: 'UserCog', label: 'Roles & Access' },
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
    { id: 'purchases', icon: 'ShoppingBag', label: 'Purchase Orders', section: 'Procurement' },
    { id: 'expenses', icon: 'Receipt', label: 'Expenses', badge: 3, section: 'Procurement' },
  ],
  finance: [
    { id: 'finance-dashboard', icon: 'BarChart3', label: 'Dashboard', section: 'Finance' },
    { id: 'ledger', icon: 'BookOpen', label: 'Ledger Management', section: 'Finance' },
    { id: 'accounts-payable', icon: 'ArrowDownCircle', label: 'Accounts Payable', section: 'Finance' },
    { id: 'accounts-receivable', icon: 'ArrowUpCircle', label: 'Accounts Receivable', section: 'Finance' },
    { id: 'journal-entries', icon: 'FileEdit', label: 'Journal Entries', section: 'Finance' },
    { id: 'bank-cash', icon: 'Landmark', label: 'Bank & Cash', section: 'Finance' },
    { id: 'taxation', icon: 'Scale', label: 'Taxation & Compliance', section: 'Finance' },
    { id: 'budget', icon: 'Target', label: 'Budget & Forecasting', section: 'Finance' },
    { id: 'financial-reports', icon: 'PieChart', label: 'Financial Reports', section: 'Finance' },
  ],
  projects: [
    { id: 'project-list', icon: 'FolderKanban', label: 'All Projects', section: 'Projects' },
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
    { id: 'report-tour',       icon: 'Plane',          label: 'Tour Requests',    section: 'Reports' },
    { id: 'report-late-fine',  icon: 'AlertTriangle',  label: 'Late & Fines',     section: 'Reports' },
    { id: 'report-onboarding', icon: 'UserCheck',      label: 'Onboarding',       section: 'Reports' },
    { id: 'report-turnover',   icon: 'UserX',          label: 'Turnover / Exit',  section: 'Reports' },
    { id: 'report-training',   icon: 'GraduationCap',  label: 'Training & Certs', section: 'Reports' },
    { id: 'report-notices',    icon: 'Bell',           label: 'Notice Read Rate', section: 'Reports' },
    { id: 'report-dispatch',   icon: 'Send',           label: 'Payslip Dispatch', section: 'Reports' },
  ],
  'self-service': [
    { id: 'my-dashboard', icon: 'BarChart3', label: 'My Dashboard', section: 'My Portal' },
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
  procurement: { title: 'Procurement', breadcrumb: 'VoltCore ERP › Procurement' },
  finance: { title: 'Finance', breadcrumb: 'VoltCore ERP › Finance' },
  projects: { title: 'Projects', breadcrumb: 'VoltCore ERP › Projects' },
  assets: { title: 'Assets', breadcrumb: 'VoltCore ERP › Assets & Operations' },
  system: { title: 'System', breadcrumb: 'VoltCore ERP › System' },
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
  'roles-access': { title: 'Roles & Access', breadcrumb: 'Organization › Roles & Access' },
  purchases: { title: 'Purchase Orders', breadcrumb: 'Finance › Procurement' },
  expenses: { title: 'Expense Claims', breadcrumb: 'Finance › Expense Management' },
  payroll: { title: 'Payroll', breadcrumb: 'HRMS › Payroll Processing' },
  // Finance sub-modules
  'finance-dashboard': { title: 'Finance Dashboard', breadcrumb: 'Finance › Overview' },
  ledger: { title: 'Ledger Management', breadcrumb: 'Finance › General Ledger' },
  'accounts-payable': { title: 'Accounts Payable', breadcrumb: 'Finance › AP Management' },
  'accounts-receivable': { title: 'Accounts Receivable', breadcrumb: 'Finance › AR Management' },
  'journal-entries': { title: 'Journal Entries', breadcrumb: 'Finance › Journal' },
  'bank-cash': { title: 'Bank & Cash Management', breadcrumb: 'Finance › Banking' },
  taxation: { title: 'Taxation & Compliance', breadcrumb: 'Finance › Tax' },
  budget: { title: 'Budget & Forecasting', breadcrumb: 'Finance › Budget' },
  'financial-reports': { title: 'Financial Reports', breadcrumb: 'Finance › Reports' },
  'project-list': { title: 'All Projects', breadcrumb: 'Projects › All Projects' },
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
  'report-tour':       { title: 'Tour Requests Report',     breadcrumb: 'Reports › Tour Requests' },
  'report-late-fine':  { title: 'Late & Fine Report',       breadcrumb: 'Reports › Late & Fines' },
  'report-onboarding': { title: 'Onboarding Status Report', breadcrumb: 'Reports › Onboarding' },
  'report-turnover':   { title: 'Turnover / Exit Report',   breadcrumb: 'Reports › Turnover' },
  'report-training':   { title: 'Certificate Report',   breadcrumb: 'Reports › Certificates' },
  'report-notices':    { title: 'Notice Read Rate Report',  breadcrumb: 'Reports › Notices' },
  'report-dispatch':   { title: 'Payslip Dispatch Report',  breadcrumb: 'Reports › Dispatch' },
  settings: { title: 'Settings', breadcrumb: 'VoltCore ERP › System Settings' },
  trash: { title: 'Recycle Bin', breadcrumb: 'Admin › Deleted Items' },
  'user-management': { title: 'User Management', breadcrumb: 'System › User Management' },
  'onboarding-approvals': { title: 'Onboarding Approvals', breadcrumb: 'System › Onboarding Approvals' },
  'requests': { title: 'Employee Requests', breadcrumb: 'System › Employee Requests' },
  'self-service': { title: 'My Portal', breadcrumb: 'VoltCore ERP › My Portal' },
  'my-dashboard': { title: 'My Dashboard', breadcrumb: 'My Portal › Dashboard' },
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
export const EXPANDABLE_MODULES = ['organization', 'hrms', 'procurement', 'finance', 'projects', 'assets', 'system', 'self-service', 'reports'];

// Main modules that have their own page (no sub-nav)
export const PAGE_MODULES = ['dashboard'];

// Reverse lookup: given a sub-module id, find its parent module
const PARENT_MAP: Record<string, string> = {};
(Object.keys(SUB_MODULES) as string[]).forEach((parent) => {
  SUB_MODULES[parent].forEach((sub) => {
    if (!PARENT_MAP[sub.id]) PARENT_MAP[sub.id] = parent; // First parent wins
  });
});

// Expandable modules that show their own sub-module grid (instead of auto-redirecting to first child)
export const EXPANDABLE_WITH_PAGE = ['hrms', 'organization', 'finance', 'projects', 'reports'];

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
}));
