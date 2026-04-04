import { create } from 'zustand';

export type ModuleId =
  | 'dashboard' | 'projects' | 'sites' | 'employees' | 'attendance'
  | 'leave' | 'shift' | 'training' | 'recruitment' | 'payroll'
  | 'expenses' | 'purchases' | 'invoices' | 'permits' | 'safety'
  | 'equipment' | 'subcontractors' | 'reports' | 'settings';

interface NavItem {
  id: ModuleId;
  icon: string;
  label: string;
  badge?: number;
  section: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: 'Zap', label: 'Dashboard', section: 'Overview' },
  { id: 'projects', icon: 'Building2', label: 'Projects', section: 'Overview' },
  { id: 'sites', icon: 'MapPin', label: 'Site Map', section: 'Overview' },
  { id: 'employees', icon: 'HardHat', label: 'Employees', section: 'HR Management' },
  { id: 'attendance', icon: 'ClipboardList', label: 'Attendance', section: 'HR Management' },
  { id: 'leave', icon: 'CalendarDays', label: 'Leave Management', badge: 5, section: 'HR Management' },
  { id: 'shift', icon: 'RotateCcw', label: 'Shift Roster', section: 'HR Management' },
  { id: 'training', icon: 'GraduationCap', label: 'Training & Certs', section: 'HR Management' },
  { id: 'recruitment', icon: 'Search', label: 'Recruitment', section: 'HR Management' },
  { id: 'payroll', icon: 'IndianRupee', label: 'Payroll', section: 'Payroll & Finance' },
  { id: 'expenses', icon: 'Receipt', label: 'Expenses', badge: 3, section: 'Payroll & Finance' },
  { id: 'purchases', icon: 'Package', label: 'Purchase Orders', section: 'Payroll & Finance' },
  { id: 'invoices', icon: 'FileText', label: 'Invoicing', section: 'Payroll & Finance' },
  { id: 'permits', icon: 'ShieldAlert', label: 'Work Permits', badge: 2, section: 'Operations' },
  { id: 'safety', icon: 'HardHat', label: 'Safety & HSE', section: 'Operations' },
  { id: 'equipment', icon: 'Wrench', label: 'Equipment', section: 'Operations' },
  { id: 'subcontractors', icon: 'Handshake', label: 'Subcontractors', section: 'Operations' },
  { id: 'reports', icon: 'BarChart3', label: 'Reports', section: 'System' },
  { id: 'settings', icon: 'Settings', label: 'Settings', section: 'System' },
];

export interface ModuleConfig {
  title: string;
  breadcrumb: string;
}

export const MODULE_CONFIG: Record<ModuleId, ModuleConfig> = {
  dashboard: { title: 'Dashboard', breadcrumb: 'VoltCore ERP › Overview' },
  projects: { title: 'Projects', breadcrumb: 'VoltCore ERP › Project Management' },
  sites: { title: 'Site Map', breadcrumb: 'VoltCore ERP › Sites' },
  employees: { title: 'Employees', breadcrumb: 'HRMS › Employee Directory' },
  attendance: { title: 'Attendance', breadcrumb: 'HRMS › Daily Attendance' },
  leave: { title: 'Leave Management', breadcrumb: 'HRMS › Leave Requests' },
  shift: { title: 'Shift Roster', breadcrumb: 'HRMS › Shift Planning' },
  training: { title: 'Training & Certifications', breadcrumb: 'HRMS › Competency Management' },
  recruitment: { title: 'Recruitment', breadcrumb: 'HRMS › Talent Acquisition' },
  payroll: { title: 'Payroll', breadcrumb: 'Finance › Payroll Processing' },
  expenses: { title: 'Expense Claims', breadcrumb: 'Finance › Expense Management' },
  purchases: { title: 'Purchase Orders', breadcrumb: 'Finance › Procurement' },
  invoices: { title: 'Invoicing', breadcrumb: 'Finance › Client Invoices' },
  permits: { title: 'Work Permits (PTW)', breadcrumb: 'Operations › Permit to Work' },
  safety: { title: 'Safety & HSE', breadcrumb: 'Operations › HSE Management' },
  equipment: { title: 'Equipment', breadcrumb: 'Operations › Asset Management' },
  subcontractors: { title: 'Subcontractors', breadcrumb: 'Operations › Subcontractor Management' },
  reports: { title: 'Reports', breadcrumb: 'VoltCore ERP › Analytics' },
  settings: { title: 'Settings', breadcrumb: 'VoltCore ERP › System Settings' },
};

interface ERPStore {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useERPStore = create<ERPStore>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
