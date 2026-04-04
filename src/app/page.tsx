'use client';

import { useERPStore, MAIN_MODULES, SUB_MODULES, MODULE_CONFIG, EXPANDABLE_MODULES, PAGE_MODULES } from '@/store/erp-store';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2, Users, ShoppingCart, CreditCard, FolderKanban, Package, Wrench,
  TrendingUp, Briefcase, Settings, MessageSquare, BookOpen, Zap,
  UserCog, HardHat, ClipboardList, CalendarDays, RotateCcw, GraduationCap,
  Search, IndianRupee, Receipt, FileText, MapPin, ShieldAlert, Handshake,
  BarChart3, ShoppingBag, Menu, X, Bell, ChevronRight, ChevronDown,
  ArrowLeft
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, Users, ShoppingCart, CreditCard, FolderKanban, Package, Wrench,
  TrendingUp, Briefcase, Settings: Settings, MessageSquare, BookOpen, Zap,
  UserCog, HardHat, ClipboardList, CalendarDays, RotateCcw, GraduationCap,
  Search, IndianRupee, Receipt, FileText, MapPin, ShieldAlert, Handshake,
  BarChart3, ShoppingBag,
};

// Dynamic imports for all page-level module components
const Dashboard = dynamic(() => import('@/components/erp/dashboard'), { ssr: false });
const Employees = dynamic(() => import('@/components/erp/employees'), { ssr: false });
const Attendance = dynamic(() => import('@/components/erp/attendance'), { ssr: false });
const Leave = dynamic(() => import('@/components/erp/leave'), { ssr: false });
const Shift = dynamic(() => import('@/components/erp/shift'), { ssr: false });
const Training = dynamic(() => import('@/components/erp/training'), { ssr: false });
const Recruitment = dynamic(() => import('@/components/erp/recruitment'), { ssr: false });
const Purchases = dynamic(() => import('@/components/erp/purchases'), { ssr: false });
const Expenses = dynamic(() => import('@/components/erp/expenses'), { ssr: false });
const Payroll = dynamic(() => import('@/components/erp/payroll'), { ssr: false });
const Invoices = dynamic(() => import('@/components/erp/invoices'), { ssr: false });
const Projects = dynamic(() => import('@/components/erp/projects'), { ssr: false });
const Sites = dynamic(() => import('@/components/erp/sites'), { ssr: false });
const Equipment = dynamic(() => import('@/components/erp/equipment'), { ssr: false });
const Permits = dynamic(() => import('@/components/erp/permits'), { ssr: false });
const Safety = dynamic(() => import('@/components/erp/safety'), { ssr: false });
const Subcontractors = dynamic(() => import('@/components/erp/subcontractors'), { ssr: false });
const Reports = dynamic(() => import('@/components/erp/reports'), { ssr: false });
const SettingsModule = dynamic(() => import('@/components/erp/settings'), { ssr: false });

// New modules
const Organization = dynamic(() => import('@/components/erp/organization'), { ssr: false });
const InventoryModule = dynamic(() => import('@/components/erp/inventory'), { ssr: false });
const SalesModule = dynamic(() => import('@/components/erp/sales'), { ssr: false });
const CrmModule = dynamic(() => import('@/components/erp/crm'), { ssr: false });
const SupportModule = dynamic(() => import('@/components/erp/support'), { ssr: false });
const KnowledgebaseModule = dynamic(() => import('@/components/erp/knowledgebase'), { ssr: false });

const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  employees: Employees,
  attendance: Attendance,
  leave: Leave,
  shift: Shift,
  training: Training,
  recruitment: Recruitment,
  purchases: Purchases,
  expenses: Expenses,
  payroll: Payroll,
  invoices: Invoices,
  projects: Projects,
  sites: Sites,
  equipment: Equipment,
  permits: Permits,
  safety: Safety,
  subcontractors: Subcontractors,
  reports: Reports,
  settings: SettingsModule,
  organization: Organization,
  inventory: InventoryModule,
  sales: SalesModule,
  crm: CrmModule,
  support: SupportModule,
  knowledgebase: KnowledgebaseModule,
};

// Modules that don't have a create action
const NO_CREATE_MODULES = ['dashboard', 'reports', 'settings'];

function ModuleGrid() {
  const { setActiveModule } = useERPStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {MAIN_MODULES.map((mod) => {
        const Icon = ICON_MAP[mod.icon] || Zap;
        const hasSubModules = SUB_MODULES[mod.id] && SUB_MODULES[mod.id].length > 0;
        return (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id as any)}
            className="group bg-[#161c24] border border-[#252e3a] rounded-xl p-6 text-left hover:border-[#f5a623]/40 transition-all duration-200 hover:shadow-lg hover:shadow-[#f5a623]/5"
          >
            <div className="w-12 h-12 bg-[#f5a623]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#f5a623]/20 transition-colors">
              <Icon size={24} className="text-[#f5a623]" />
            </div>
            <div className="text-[14px] font-semibold text-[#e2e8f0] group-hover:text-[#f5a623] transition-colors">
              {mod.label}
            </div>
            {hasSubModules && (
              <div className="text-[11px] text-[#5a6878] mt-1">
                {SUB_MODULES[mod.id].length} sub-modules
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Sidebar() {
  const { activeModule, activeParentModule, setActiveModule, sidebarOpen, setSidebarOpen } = useERPStore();

  // Show sub-module nav when the parent is an expandable module (not dashboard)
  const isSubNav = EXPANDABLE_MODULES.includes(activeParentModule) && activeParentModule !== 'dashboard';
  const subModules = SUB_MODULES[activeParentModule] || [];

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full z-50 w-[220px] min-w-[220px]
        bg-[#161c24] border-r border-[#252e3a]
        flex flex-col overflow-y-auto transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#252e3a] flex items-center gap-3">
          <button
            onClick={() => { setActiveModule('dashboard'); setSidebarOpen(false); }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#f5a623] to-[#e8891a] rounded-lg flex items-center justify-center text-sm font-extrabold text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              VC
            </div>
            <div>
              <div className="text-[15px] font-bold text-[#f5a623] tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VOLTCORE</div>
              <div className="text-[9px] text-[#5a6878] tracking-[2px] uppercase">ERP · HRMS</div>
            </div>
          </button>
          <button className="ml-auto lg:hidden text-[#5a6878] hover:text-[#e2e8f0]" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-2">
          {isSubNav ? (
            // Sub-module navigation mode
            <>
              <button
                onClick={() => { setActiveModule('dashboard'); setSidebarOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-medium text-[#5a6878] hover:text-[#e2e8f0] transition-colors"
              >
                <ArrowLeft size={12} />
                <ChevronRight size={14} />
                <span>All Modules</span>
              </button>
              <div className="mx-3 my-2 border-t border-[#252e3a]" />
              <div className="text-[9px] tracking-[2px] uppercase text-[#f5a623] font-bold px-4 py-2">
                {MODULE_CONFIG[activeParentModule]?.title || activeParentModule}
              </div>
              {subModules.map(item => {
                const Icon = ICON_MAP[item.icon] || Zap;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveModule(item.id as any); setSidebarOpen(false); }}
                    className={`
                      w-full flex items-center gap-2 px-4 py-[7px] text-left text-[12px] font-medium
                      transition-all duration-150 border-l-[3px]
                      ${activeModule === item.id
                        ? 'text-[#f5a623] border-l-[#f5a623] bg-[#f5a623]/7'
                        : 'text-[#8899aa] border-l-transparent hover:text-[#e2e8f0] hover:bg-[#141920]'
                      }
                    `}
                  >
                    <Icon size={14} className="w-4 text-center shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-[#ff3d3d] text-white text-[9px] font-bold px-[5px] py-[1px] rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            // Dashboard / grid navigation mode
            <>
              <button
                onClick={() => setActiveModule('dashboard')}
                className={`w-full flex items-center gap-2 px-4 py-[7px] text-left text-[12px] font-medium transition-all duration-150 border-l-[3px] ${activeModule === 'dashboard' ? 'text-[#f5a623] border-l-[#f5a623] bg-[#f5a623]/7' : 'text-[#8899aa] border-l-transparent hover:text-[#e2e8f0] hover:bg-[#141920]'}`}
              >
                <Zap size={14} className="w-4 text-center shrink-0" />
                <span>Dashboard</span>
              </button>
            </>
          )}
        </div>

        {/* User card */}
        <div className="border-t border-[#252e3a] p-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#141920] cursor-pointer">
            <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8891a] flex items-center justify-center text-[11px] font-bold text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              RK
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold truncate">Rajesh Kumar</div>
              <div className="text-[10px] text-[#5a6878]">HR Manager</div>
            </div>
            <ChevronDown size={14} className="text-[#5a6878] shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar() {
  const { activeModule, triggerCreateDialog } = useERPStore();
  const { setSidebarOpen } = useERPStore();
  const config = MODULE_CONFIG[activeModule];
  const [searchQuery, setSearchQuery] = useState('');

  const showNewBtn = !NO_CREATE_MODULES.includes(activeModule);

  return (
    <header className="h-[50px] bg-[#161c24] border-b border-[#252e3a] flex items-center gap-3 px-4 shrink-0">
      <button className="lg:hidden text-[#8899aa] hover:text-[#e2e8f0]" onClick={() => setSidebarOpen(true)}>
        <Menu size={20} />
      </button>
      <div>
        <h1 className="text-[19px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {config?.title || 'VoltCore ERP'}
        </h1>
        <p className="text-[10px] text-[#5a6878]">{config?.breadcrumb || ''}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-[5px] w-[190px]">
          <Search size={14} className="text-[#5a6878] shrink-0" />
          <input
            type="text"
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-[#e2e8f0] outline-none text-[12px] w-full"
          />
        </div>
        {showNewBtn && (
          <button className="vc-btn-primary" onClick={triggerCreateDialog}>+ New</button>
        )}
        <button className="relative text-[#8899aa] hover:text-[#e2e8f0] transition-colors">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ff3d3d] rounded-full" />
        </button>
      </div>
    </header>
  );
}

export default function ERPPage() {
  const { activeModule } = useERPStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0d12]">
        <div className="text-center">
          <div className="text-4xl font-extrabold text-[#f5a623] mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VOLTCORE</div>
          <div className="text-sm text-[#5a6878] tracking-widest uppercase">Loading ERP System...</div>
        </div>
      </div>
    );
  }

  const isDashboard = activeModule === 'dashboard';
  const ActiveComponent = MODULE_COMPONENTS[activeModule];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d12]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-in fade-in duration-200">
            {isDashboard ? <ModuleGrid /> : ActiveComponent && <ActiveComponent />}
          </div>
        </main>
      </div>
    </div>
  );
}
