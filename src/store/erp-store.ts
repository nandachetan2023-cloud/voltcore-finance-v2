import { create } from 'zustand';

export type ModuleId =
  | 'dashboard' | 'organization' | 'hrms' | 'procurement' | 'finance'
  | 'projects' | 'inventory' | 'assets' | 'sales' | 'crm'
  | 'system' | 'support' | 'knowledgebase'
  // Sub-modules
  | 'employees' | 'attendance' | 'leave' | 'shift' | 'training' | 'recruitment'
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
  | 'downloads';

interface NavItem {
  id: ModuleId;
  icon: string;
  label: string;
  badge?: number;
  section?: string;
}

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
];

export const SUB_MODULES: Record<string, NavItem[]> = {
  organization: [
    { id: 'employees', icon: 'UserCog', label: 'Departments & Roles' },
  ],
  hrms: [
    { id: 'employee-analytics', icon: 'BarChart3', label: 'Employee Analytics', section: 'HRMS' },
    { id: 'employees', icon: 'HardHat', label: 'Employees', section: 'HRMS' },
    { id: 'attendance', icon: 'ClipboardList', label: 'Attendance', section: 'HRMS' },
    { id: 'leave', icon: 'CalendarDays', label: 'Leave Management', badge: 5, section: 'HRMS' },
    { id: 'shift', icon: 'RotateCcw', label: 'Shift Roster', section: 'HRMS' },
    { id: 'timesheet', icon: 'TimerReset', label: 'Timesheet', section: 'HRMS' },
    { id: 'payroll', icon: 'IndianRupee', label: 'Payroll', section: 'HRMS' },
    { id: 'training', icon: 'GraduationCap', label: 'Training & Certs', section: 'HRMS' },
    { id: 'recruitment', icon: 'Search', label: 'Recruitment', section: 'HRMS' },
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
  // Sub-modules
  'employee-analytics': { title: 'Employee Analytics', breadcrumb: 'HRMS › Employee Analytics' },
  timesheet: { title: 'Timesheet', breadcrumb: 'HRMS › Weekly Timesheet' },
  employees: { title: 'Employees', breadcrumb: 'HRMS › Employee Directory' },
  attendance: { title: 'Attendance', breadcrumb: 'HRMS › Daily Attendance' },
  leave: { title: 'Leave Management', breadcrumb: 'HRMS › Leave Requests' },
  shift: { title: 'Shift Roster', breadcrumb: 'HRMS › Shift Planning' },
  training: { title: 'Training & Certifications', breadcrumb: 'HRMS › Competency Management' },
  recruitment: { title: 'Recruitment', breadcrumb: 'HRMS › Talent Acquisition' },
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
};

// Modules with sub-modules (clicking them shows sub-nav instead of a page)
export const EXPANDABLE_MODULES = ['organization', 'hrms', 'procurement', 'finance', 'projects', 'assets', 'system'];

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

function resolveInitialSubModule(parent: ModuleId): ModuleId {
  const subs = SUB_MODULES[parent];
  if (subs && subs.length > 0) return subs[0].id;
  return parent;
}

interface ERPStore {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  activeParentModule: ModuleId;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  triggerCreate: number;
  triggerCreateDialog: () => void;
}

export const useERPStore = create<ERPStore>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set((s) => {
    const parent = resolveParent(module);
    // If clicking an expandable module that has NO page and HAS sub-modules, go to first sub-module
    const finalModule = (
      EXPANDABLE_MODULES.includes(module) &&
      !EXPANDABLE_WITH_PAGE.includes(module) &&
      SUB_MODULES[module] &&
      SUB_MODULES[module].length > 0
    ) ? resolveInitialSubModule(module) : module;
    return {
      activeModule: finalModule,
      activeParentModule: parent,
    };
  }),
  // Initialize parent so page modules show correct sidebar
  activeParentModule: 'dashboard' as ModuleId,
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  triggerCreate: 0,
  triggerCreateDialog: () => set((s) => ({ triggerCreate: s.triggerCreate + 1 })),
}));
