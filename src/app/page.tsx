'use client';

import { useERPStore, NAV_ITEMS, MODULE_CONFIG } from '@/store/erp-store';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Zap, Building2, MapPin, HardHat, ClipboardList, CalendarDays,
  RotateCcw, GraduationCap, Search, IndianRupee, Receipt, Package,
  FileText, ShieldAlert, Wrench, Handshake, BarChart3, Settings as SettingsIcon,
  Menu, X, Bell, ChevronDown
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Building2, MapPin, HardHat, ClipboardList, CalendarDays,
  RotateCcw, GraduationCap, Search, IndianRupee, Receipt, Package,
  FileText, ShieldAlert, Wrench, Handshake, BarChart3, Settings: SettingsIcon,
};

// Dynamic imports for all modules
const Dashboard = dynamic(() => import('@/components/erp/dashboard'), { ssr: false });
const Projects = dynamic(() => import('@/components/erp/projects'), { ssr: false });
const Sites = dynamic(() => import('@/components/erp/sites'), { ssr: false });
const Employees = dynamic(() => import('@/components/erp/employees'), { ssr: false });
const Attendance = dynamic(() => import('@/components/erp/attendance'), { ssr: false });
const Leave = dynamic(() => import('@/components/erp/leave'), { ssr: false });
const Shift = dynamic(() => import('@/components/erp/shift'), { ssr: false });
const Training = dynamic(() => import('@/components/erp/training'), { ssr: false });
const Recruitment = dynamic(() => import('@/components/erp/recruitment'), { ssr: false });
const Payroll = dynamic(() => import('@/components/erp/payroll'), { ssr: false });
const Expenses = dynamic(() => import('@/components/erp/expenses'), { ssr: false });
const Purchases = dynamic(() => import('@/components/erp/purchases'), { ssr: false });
const Invoices = dynamic(() => import('@/components/erp/invoices'), { ssr: false });
const Permits = dynamic(() => import('@/components/erp/permits'), { ssr: false });
const Safety = dynamic(() => import('@/components/erp/safety'), { ssr: false });
const Equipment = dynamic(() => import('@/components/erp/equipment'), { ssr: false });
const Subcontractors = dynamic(() => import('@/components/erp/subcontractors'), { ssr: false });
const Reports = dynamic(() => import('@/components/erp/reports'), { ssr: false });
const SettingsModule = dynamic(() => import('@/components/erp/settings'), { ssr: false });

const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  projects: Projects,
  sites: Sites,
  employees: Employees,
  attendance: Attendance,
  leave: Leave,
  shift: Shift,
  training: Training,
  recruitment: Recruitment,
  payroll: Payroll,
  expenses: Expenses,
  purchases: Purchases,
  invoices: Invoices,
  permits: Permits,
  safety: Safety,
  equipment: Equipment,
  subcontractors: Subcontractors,
  reports: Reports,
  settings: SettingsModule,
};

function Sidebar() {
  const { activeModule, setActiveModule, sidebarOpen, setSidebarOpen } = useERPStore();

  const sections = ['Overview', 'HR Management', 'Payroll & Finance', 'Operations', 'System'];
  const groupedItems = sections.map(section => ({
    section,
    items: NAV_ITEMS.filter(item => item.section === section),
  }));

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50
        w-[220px] min-w-[220px]
        bg-[#161c24] border-r border-[#252e3a]
        flex flex-col overflow-y-auto
        transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#252e3a] flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#f5a623] to-[#e8891a] rounded-lg flex items-center justify-center text-sm font-extrabold text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            VC
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#f5a623] tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VOLTCORE</div>
            <div className="text-[9px] text-[#5a6878] tracking-[2px] uppercase">ERP · HRMS</div>
          </div>
          <button className="ml-auto lg:hidden text-[#5a6878] hover:text-[#e2e8f0]" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav sections */}
        <div className="flex-1 py-2">
          {groupedItems.map(({ section, items }) => (
            <div key={section}>
              <div className="text-[9px] tracking-[2px] uppercase text-[#5a6878] font-bold px-4 py-2">
                {section}
              </div>
              {items.map(item => {
                const Icon = ICON_MAP[item.icon] || Zap;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveModule(item.id); setSidebarOpen(false); }}
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
                      <span className="bg-[#ff3d3d] text-white text-[9px] font-bold px-[5px] py-[1px] rounded-full" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
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

// Modules that don't have a create action
const NO_CREATE_MODULES = ['dashboard', 'reports', 'settings'];

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
          {config.title}
        </h1>
        <p className="text-[10px] text-[#5a6878]">{config.breadcrumb}</p>
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

  // Use requestAnimationFrame to avoid synchronous setState in effect
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

  const ActiveComponent = MODULE_COMPONENTS[activeModule];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d12]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-[18px]">
          <div className="animate-in fade-in duration-200">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </main>
      </div>
    </div>
  );
}
