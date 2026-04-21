import { create } from 'zustand';

export type UserRole = 'superadmin' | 'admin' | 'demo';

// All top-level modules and their sub-modules for access checking
export const MODULE_TREE: Record<string, string[]> = {
  organization: ['organization', 'departments', 'designations', 'holidays', 'leave-policies', 'attendance-rules', 'checklist-templates', 'employee-documents'],
  hrms: ['hrms', 'employee-analytics', 'employees', 'attendance', 'biometric', 'leave', 'shift', 'timesheet', 'payroll', 'training', 'recruitment', 'onboarding', 'offboarding', 'exit-management'],
  procurement: ['procurement', 'purchases', 'expenses'],
  finance: ['finance', 'finance-dashboard', 'ledger', 'accounts-payable', 'accounts-receivable', 'journal-entries', 'bank-cash', 'taxation', 'budget', 'financial-reports'],
  projects: ['projects', 'project-list', 'sites'],
  inventory: ['inventory'],
  assets: ['assets', 'equipment', 'permits', 'safety', 'subcontractors'],
  sales: ['sales'],
  crm: ['crm'],
  // A dedicated "self-service" group for employees
  'self-service': ['my-attendance', 'my-leave', 'my-requests'],
  system: ['system', 'reports', 'settings', 'user-management', 'requests'],
  support: ['support'],
  knowledgebase: ['knowledgebase'],
  downloads: ['downloads'],
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
  | 'projects' | 'inventory' | 'assets' | 'sales' | 'crm'
  | 'system' | 'support' | 'knowledgebase'
  // Sub-modules
  | 'employees' | 'attendance' | 'leave' | 'shift' | 'training' | 'recruitment'
  | 'onboarding' | 'offboarding' | 'exit-management' | 'checklist-templates'
  | 'purchases' | 'expenses' | 'invoices'
  | 'sites' | 'permits' | 'safety' | 'subcontractors'
  | 'reports' | 'settings'
  // Analytics pages
  | 'employee-analytics'
  // Timesheet
  | 'timesheet'
  // Finance sub-modules
  | 'finance-dashboard' | 'ledger' | 'accounts-payable' | 'accounts-receivable'
  | 'journal-entries' | 'bank-cash' | 'taxation' | 'budget' | 'financial-reports'
  // Projects sub-modules
  | 'project-list'
  // Downloads
  | 'downloads'
  // Organization sub-modules
  | 'departments' | 'designations' | 'holidays' | 'leave-policies' | 'attendance-rules'
  | 'employee-documents'
  // Biometric
  | 'biometric'
  // Admin
  | 'trash'
  // User Management (tenant admin)
  | 'user-management'
  // Employee self-service
  | 'my-attendance'
  | 'my-leave'
  | 'my-requests'
  // Admin requests view
  | 'requests';

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
  { id: 'inventory', icon: 'Package', label: 'Inventory' },
  { id: 'assets', icon: 'Wrench', label: 'Assets' },
  { id: 'sales', icon: 'TrendingUp', label: 'Sales' },
  { id: 'crm', icon: 'Briefcase', label: 'CRM' },
  { id: 'system', icon: 'Settings', label: 'System' },
  { id: 'support', icon: 'MessageSquare', label: 'Support' },
  { id: 'knowledgebase', icon: 'BookOpen', label: 'Knowledgebase' },
  { id: 'downloads', icon: 'Download', label: 'Downloads' },
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
    { id: 'shift', icon: 'RotateCcw', label: 'Shift Roster', section: 'HRMS' },
    { id: 'timesheet', icon: 'TimerReset', label: 'Timesheet', section: 'HRMS' },
    { id: 'payroll', icon: 'IndianRupee', label: 'Payroll', section: 'HRMS' },
    { id: 'training', icon: 'GraduationCap', label: 'Training & Certs', section: 'HRMS' },
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
  inventory: [],
  assets: [
    { id: 'equipment', icon: 'Wrench', label: 'Equipment', section: 'Assets' },
    { id: 'permits', icon: 'ShieldAlert', label: 'Work Permits', badge: 2, section: 'Operations' },
    { id: 'safety', icon: 'HardHat', label: 'Safety & HSE', section: 'Operations' },
    { id: 'subcontractors', icon: 'Handshake', label: 'Subcontractors', section: 'Operations' },
  ],
  sales: [],
  crm: [],
  system: [
    { id: 'reports', icon: 'BarChart3', label: 'Reports', section: 'System' },
    { id: 'settings', icon: 'Settings', label: 'Settings', section: 'System' },
    { id: 'user-management', icon: 'UserCog', label: 'User Management', section: 'System' },
    { id: 'requests', icon: 'ClipboardList', label: 'Employee Requests', section: 'System' },
  ],
  'self-service': [
    { id: 'my-attendance', icon: 'ClipboardList', label: 'My Attendance', section: 'My Portal' },
    { id: 'my-leave', icon: 'CalendarDays', label: 'Apply Leave', section: 'My Portal' },
    { id: 'my-requests', icon: 'FileText', label: 'My Requests', section: 'My Portal' },
  ],
  support: [],
  knowledgebase: [],
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
  inventory: { title: 'Inventory', breadcrumb: 'VoltCore ERP › Inventory' },
  assets: { title: 'Assets', breadcrumb: 'VoltCore ERP › Assets & Operations' },
  sales: { title: 'Sales', breadcrumb: 'VoltCore ERP › Sales' },
  crm: { title: 'CRM', breadcrumb: 'VoltCore ERP › CRM' },
  system: { title: 'System', breadcrumb: 'VoltCore ERP › System' },
  support: { title: 'Support', breadcrumb: 'VoltCore ERP › Support' },
  knowledgebase: { title: 'Knowledgebase', breadcrumb: 'VoltCore ERP › Knowledgebase' },
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
  training: { title: 'Training & Certifications', breadcrumb: 'HRMS › Competency Management' },
  recruitment: { title: 'Recruitment', breadcrumb: 'HRMS › Talent Acquisition' },
  onboarding: { title: 'Onboarding', breadcrumb: 'HRMS › Employee Lifecycle › Onboarding' },
  offboarding: { title: 'Offboarding', breadcrumb: 'HRMS › Employee Lifecycle › Offboarding' },
  'exit-management': { title: 'Exit Management', breadcrumb: 'HRMS › Employee Lifecycle › Exit' },
  'checklist-templates': { title: 'Checklist Templates', breadcrumb: 'Organization › Checklist Templates' },
  'employee-documents': { title: 'Employee Documents', breadcrumb: 'Organization › Employee Documents' },
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
  reports: { title: 'Reports', breadcrumb: 'VoltCore ERP › Analytics' },
  settings: { title: 'Settings', breadcrumb: 'VoltCore ERP › System Settings' },
  downloads: { title: 'Downloads', breadcrumb: 'VoltCore ERP › Project Downloads' },
  trash: { title: 'Recycle Bin', breadcrumb: 'Admin › Deleted Items' },
  'user-management': { title: 'User Management', breadcrumb: 'System › User Management' },
  'requests': { title: 'Employee Requests', breadcrumb: 'System › Employee Requests' },
  'self-service': { title: 'My Portal', breadcrumb: 'VoltCore ERP › My Portal' },
  'my-attendance': { title: 'My Attendance', breadcrumb: 'My Portal › Attendance' },
  'my-leave': { title: 'Apply for Leave', breadcrumb: 'My Portal › Leave Application' },
  'my-requests': { title: 'My Requests', breadcrumb: 'My Portal › Requests' },
};

// Modules with sub-modules (clicking them shows sub-nav instead of a page)
export const EXPANDABLE_MODULES = ['organization', 'hrms', 'procurement', 'finance', 'projects', 'assets', 'system', 'self-service'];

// Main modules that have their own page (no sub-nav)
export const PAGE_MODULES = ['dashboard', 'inventory', 'sales', 'crm', 'support', 'knowledgebase', 'downloads'];

// Reverse lookup: given a sub-module id, find its parent module
const PARENT_MAP: Record<string, string> = {};
(Object.keys(SUB_MODULES) as string[]).forEach((parent) => {
  SUB_MODULES[parent].forEach((sub) => {
    if (!PARENT_MAP[sub.id]) PARENT_MAP[sub.id] = parent; // First parent wins
  });
});

// Expandable modules that show their own sub-module grid (instead of auto-redirecting to first child)
export const EXPANDABLE_WITH_PAGE = ['hrms', 'organization', 'finance', 'projects', 'inventory', 'sales', 'crm', 'support', 'knowledgebase'];

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
  
  // If admin, return first sub-module
  if (userRole === 'admin') return subs[0].id;
  
  // For restricted users, find the first allowed sub-module
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
    // Guard: non-admin users cannot navigate to modules they don't have access to
    if (s.userRole !== 'admin' && module !== 'dashboard' && !isModuleAllowed(module, s.allowedModules)) {
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
