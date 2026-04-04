import { create } from 'zustand';

export type ModuleId =
  | 'dashboard' | 'organization' | 'hrms' | 'procurement' | 'finance'
  | 'projects' | 'inventory' | 'assets' | 'sales' | 'crm'
  | 'system' | 'support' | 'knowledgebase'
  // Sub-modules
  | 'employees' | 'attendance' | 'leave' | 'shift' | 'training' | 'recruitment'
  | 'purchases' | 'expenses' | 'invoices'
  | 'sites' | 'permits' | 'safety' | 'subcontractors'
  | 'reports' | 'settings';

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
];

export const SUB_MODULES: Record<string, NavItem[]> = {
  organization: [
    { id: 'employees', icon: 'UserCog', label: 'Departments & Roles' },
  ],
  hrms: [
    { id: 'employees', icon: 'HardHat', label: 'Employees', section: 'HRMS' },
    { id: 'attendance', icon: 'ClipboardList', label: 'Attendance', section: 'HRMS' },
    { id: 'leave', icon: 'CalendarDays', label: 'Leave Management', badge: 5, section: 'HRMS' },
    { id: 'shift', icon: 'RotateCcw', label: 'Shift Roster', section: 'HRMS' },
    { id: 'training', icon: 'GraduationCap', label: 'Training & Certs', section: 'HRMS' },
    { id: 'recruitment', icon: 'Search', label: 'Recruitment', section: 'HRMS' },
  ],
  procurement: [
    { id: 'purchases', icon: 'ShoppingBag', label: 'Purchase Orders', section: 'Procurement' },
    { id: 'expenses', icon: 'Receipt', label: 'Expenses', badge: 3, section: 'Procurement' },
  ],
  finance: [
    { id: 'payroll', icon: 'IndianRupee', label: 'Payroll', section: 'Finance' },
    { id: 'invoices', icon: 'FileText', label: 'Invoicing', section: 'Finance' },
  ],
  projects: [
    { id: 'projects', icon: 'FolderKanban', label: 'All Projects', section: 'Projects' },
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
  employees: { title: 'Employees', breadcrumb: 'HRMS › Employee Directory' },
  attendance: { title: 'Attendance', breadcrumb: 'HRMS › Daily Attendance' },
  leave: { title: 'Leave Management', breadcrumb: 'HRMS › Leave Requests' },
  shift: { title: 'Shift Roster', breadcrumb: 'HRMS › Shift Planning' },
  training: { title: 'Training & Certifications', breadcrumb: 'HRMS › Competency Management' },
  recruitment: { title: 'Recruitment', breadcrumb: 'HRMS › Talent Acquisition' },
  purchases: { title: 'Purchase Orders', breadcrumb: 'Finance › Procurement' },
  expenses: { title: 'Expense Claims', breadcrumb: 'Finance › Expense Management' },
  payroll: { title: 'Payroll', breadcrumb: 'Finance › Payroll Processing' },
  invoices: { title: 'Invoicing', breadcrumb: 'Finance › Client Invoices' },
  sites: { title: 'Site Map', breadcrumb: 'VoltCore ERP › Sites' },
  permits: { title: 'Work Permits (PTW)', breadcrumb: 'Operations › Permit to Work' },
  safety: { title: 'Safety & HSE', breadcrumb: 'Operations › HSE Management' },
  equipment: { title: 'Equipment', breadcrumb: 'Operations › Asset Management' },
  subcontractors: { title: 'Subcontractors', breadcrumb: 'Operations › Subcontractor Management' },
  reports: { title: 'Reports', breadcrumb: 'VoltCore ERP › Analytics' },
  settings: { title: 'Settings', breadcrumb: 'VoltCore ERP › System Settings' },
};

// Modules with sub-modules (clicking them shows sub-nav instead of a page)
export const EXPANDABLE_MODULES = ['organization', 'hrms', 'procurement', 'finance', 'projects', 'assets', 'system'];

// Main modules that have their own page (no sub-nav)
export const PAGE_MODULES = ['dashboard', 'inventory', 'sales', 'crm', 'support', 'knowledgebase'];

// Reverse lookup: given a sub-module id, find its parent module
const PARENT_MAP: Record<string, string> = {};
(Object.keys(SUB_MODULES) as string[]).forEach((parent) => {
  SUB_MODULES[parent].forEach((sub) => {
    PARENT_MAP[sub.id] = parent;
  });
});

// Expandable modules that have their own page component
export const EXPANDABLE_WITH_PAGE = ['organization', 'projects', 'inventory', 'sales', 'crm', 'support', 'knowledgebase'];

function resolveParent(module: ModuleId): ModuleId {
  if (PARENT_MAP[module]) return PARENT_MAP[module] as ModuleId;
  if (EXPANDABLE_MODULES.includes(module)) return module;
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
  activeParentModule: 'dashboard',
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  triggerCreate: 0,
  triggerCreateDialog: () => set((s) => ({ triggerCreate: s.triggerCreate + 1 })),
}));
