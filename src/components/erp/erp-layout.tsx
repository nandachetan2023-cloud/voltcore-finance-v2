'use client';

import { useERPStore, MAIN_MODULES, SUB_MODULES, MODULE_CONFIG, EXPANDABLE_MODULES, PAGE_MODULES, MAIN_MODULE_MAP, isModuleAllowed } from '@/store/erp-store';
import React, { useState, useEffect, Component, type ReactNode } from 'react';
import { ModuleRenderer as LazyModuleRenderer } from '@/components/erp/module-registry';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import {
  Building2, Users, ShoppingCart, CreditCard, FolderKanban, Package, Wrench,
  TrendingUp, Briefcase, Settings, MessageSquare, BookOpen, Zap,
  UserCog, HardHat, ClipboardList, CalendarDays, RotateCcw, GraduationCap,
  Search, IndianRupee, Receipt, FileText, MapPin, ShieldAlert, Handshake,
  BarChart3, ShoppingBag, TimerReset, Menu, X, Bell, ChevronRight, ChevronDown,
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, FileEdit, Landmark, Scale, Target, PieChart,
  Wallet, FileSpreadsheet, ReceiptIndianRupee, BadgeIndianRupee, CircleDollarSign, Undo2,
  ArrowRightLeft, HandCoins, RefreshCw, AlertTriangle, Award, Download, Fingerprint, Shield, Trash2,
  UserCircle, UserCheck, UserX, FolderOpen, Megaphone, User, Send, Plane
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, Users, ShoppingCart, CreditCard, FolderKanban, Package, Wrench,
  TrendingUp, Briefcase, Settings: Settings, MessageSquare, BookOpen, Zap,
  UserCog, HardHat, ClipboardList, CalendarDays, RotateCcw, GraduationCap,
  Search, IndianRupee, Receipt, FileText, MapPin, ShieldAlert, Handshake,
  BarChart3, ShoppingBag, TimerReset, ArrowDownCircle, ArrowUpCircle, FileEdit,
  Landmark, Scale, Target, PieChart, Wallet, FileSpreadsheet, ReceiptIndianRupee,
  BadgeIndianRupee, CircleDollarSign, Undo2, ArrowRightLeft, HandCoins, Award, Download,
  Fingerprint, Shield, Trash2, UserCircle, UserCheck, UserX, FolderOpen, Megaphone, Bell, User,
  AlertTriangle, Send, Plane,
};

const NO_CREATE_MODULES = ['dashboard', 'reports', 'settings', 'hrms', 'employee-analytics', 'timesheet', 'finance-dashboard', 'fin-payments', 'financial-reports', 'trash'];
const SUB_GRID_MODULES = ['hrms', 'organization', 'procurement', 'finance', 'projects', 'assets', 'system'];

// ── Error Boundary ──────────────────────────────────────────────
interface EBProps { children: ReactNode; moduleName: string; onBack: () => void }
interface EBState { hasError: boolean; error: Error | null }

class ModuleErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || '';
      const isChunk = msg.includes('ChunkLoadError') || msg.includes('Loading chunk') || msg.includes('Failed to fetch dynamically');

      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 p-6 bg-[#161c24] border border-[#252e3a] rounded-xl max-w-sm text-center">
            <div className="w-10 h-10 rounded-full bg-[#ffab40]/15 flex items-center justify-center">
              <AlertTriangle size={20} className="text-[#ffab40]" />
            </div>
            <p className="text-[13px] font-semibold text-[#e2e8f0]">
              {isChunk ? 'Module Updated' : 'Load Error'}
            </p>
            <p className="text-[11px] text-[#5a6878]">
              {isChunk
                ? 'This module was updated by the server. Reloading...'
                : `Could not load "${this.props.moduleName}"`}
            </p>
            <div className="flex gap-2">
              <button onClick={this.props.onBack} className="px-3 py-1.5 text-[11px] font-medium text-[#8899aa] bg-[#141920] border border-[#2e3a48] rounded-md hover:border-[#f5a623] hover:text-[#e2e8f0] transition-colors">
                Back
              </button>
              <button onClick={() => window.location.reload()} className="vc-btn-primary flex items-center gap-1.5 text-[11px]">
                <RefreshCw size={12} /> Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Module Renderer ─────────────────────────────────────────────
const ModuleRendererWrapper = React.memo(function ModuleRendererWrapper({ moduleKey }: { moduleKey: string }) {
  const { setActiveModule } = useERPStore();

  return (
    <ModuleErrorBoundary moduleName={moduleKey} onBack={() => setActiveModule('dashboard')}>
      <LazyModuleRenderer moduleKey={moduleKey} />
    </ModuleErrorBoundary>
  );
});

// ── Module Grid (Dashboard) ─────────────────────────────────────
function ModuleGrid() {
  const { setActiveModule, userRole, allowedModules } = useERPStore();
  const visibleModules = MAIN_MODULES.filter(mod =>
    allowedModules === 'all' || isModuleAllowed(mod.id, allowedModules)
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {visibleModules.map((mod) => {
        const Icon = ICON_MAP[mod.icon] || Zap;
        const allSubs = SUB_MODULES[mod.id] || [];
        const visibleSubs = allowedModules === 'all'
          ? allSubs
          : allSubs.filter(s => isModuleAllowed(s.id, allowedModules));
        return (
          <button key={mod.id} onClick={() => setActiveModule(mod.id as any)}
            className="group bg-[#161c24] border border-[#252e3a] rounded-xl p-6 text-left hover:border-[#f5a623]/40 transition-all duration-200 hover:shadow-lg hover:shadow-[#f5a623]/5">
            <div className="w-12 h-12 bg-[#f5a623]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#f5a623]/20 transition-colors">
              <Icon size={24} className="text-[#f5a623]" />
            </div>
            <div className="text-[14px] font-semibold text-[#e2e8f0] group-hover:text-[#f5a623] transition-colors">{mod.label}</div>
            {visibleSubs.length > 0 && <div className="text-[11px] text-[#5a6878] mt-1">{visibleSubs.length} sub-modules</div>}
          </button>
        );
      })}
    </div>
  );
}

// ── Sub-Module Grid ─────────────────────────────────────────────
function SubModuleGrid({ moduleId }: { moduleId: string }) {
  const { setActiveModule, userRole, allowedModules } = useERPStore();
  const allItems = SUB_MODULES[moduleId] || [];
  const items = allowedModules === 'all'
    ? allItems
    : allItems.filter(item => isModuleAllowed(item.id, allowedModules));
  const config = MODULE_CONFIG[moduleId];
  const parentInfo = MAIN_MODULE_MAP[moduleId];
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-5">
        {parentInfo && (() => {
          const PIcon = ICON_MAP[parentInfo.icon] || Zap;
          return <div className="w-10 h-10 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><PIcon size={20} className="text-[#f5a623]" /></div>;
        })()}
        <div>
          <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{config?.title || moduleId}</h2>
          <p className="text-[11px] text-[#5a6878]">{config?.breadcrumb || ''}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] || Zap;
          return (
            <button key={item.id} onClick={() => setActiveModule(item.id as any)}
              className="group bg-[#161c24] border border-[#252e3a] rounded-xl p-5 text-center hover:border-[#f5a623]/40 transition-all duration-200 hover:shadow-lg hover:shadow-[#f5a623]/5">
              <div className="w-12 h-12 bg-[#f5a623]/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#f5a623]/20 transition-colors">
                <Icon size={22} className="text-[#f5a623]" />
              </div>
              <div className="text-[13px] font-semibold text-[#e2e8f0] group-hover:text-[#f5a623] transition-colors leading-tight">{item.label}</div>
              {item.badge && <span className="inline-block mt-2 bg-[#ff3d3d] text-white text-[9px] font-bold px-2 py-[1px] rounded-full">{item.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────
function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const { activeModule, activeParentModule, setActiveModule, sidebarOpen, setSidebarOpen, userRole, allowedModules } = useERPStore();
  const isSubNav = EXPANDABLE_MODULES.includes(activeParentModule) && activeParentModule !== 'dashboard';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const branding = useTenantBranding();
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    role?: string;
    moduleAccess?: string[];
  } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('erp_auth_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserData(user);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  // Poll unread notice count every 60s (only when employee is linked)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notices/unread-count').then(r => r.json());
        if (res.success) setUnreadNotices(res.count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const isPageModule = !isSubNav && PAGE_MODULES.includes(activeModule as string) && activeModule !== 'dashboard';
  const allSubModules = SUB_MODULES[activeParentModule] || [];
  const subModules = allowedModules === 'all'
    ? allSubModules
    : allSubModules.filter(item => isModuleAllowed(item.id, allowedModules));

  const isDemo = userRole === 'demo';

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full z-50 w-[220px] min-w-[220px] bg-[#161c24] border-r border-[#252e3a] flex flex-col overflow-y-auto transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-4 py-4 border-b border-[#252e3a] flex items-center gap-3">
          <button onClick={() => { setActiveModule('dashboard'); setSidebarOpen(false); }} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.name} className="w-9 h-9 object-contain rounded-lg bg-white/5 p-1" />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-[#f5a623] to-[#e8891a] rounded-lg flex items-center justify-center text-sm font-extrabold text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {branding?.name ? branding.name.substring(0, 2).toUpperCase() : 'VC'}
              </div>
            )}
            <div>
              <div className="text-[15px] font-bold text-[#f5a623] tracking-wider truncate max-w-[140px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {branding?.name?.toUpperCase() || 'VOLTCORE'}
              </div>
              <div className="text-[9px] text-[#5a6878] tracking-[2px] uppercase">ERP · HRMS</div>
            </div>
          </button>
          <button className="ml-auto lg:hidden text-[#5a6878] hover:text-[#e2e8f0]" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        {/* Restricted access banner */}
        {!isDemo && userRole !== 'admin' && (
          <div className="mx-3 mt-2 px-3 py-2 bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-lg flex items-center gap-2">
            <Shield size={12} className="text-[#f5a623] shrink-0" />
            <span className="text-[10px] text-[#f5a623] font-semibold tracking-wide">LIMITED ACCESS</span>
          </div>
        )}

        <div className="flex-1 py-2">
          {(isSubNav || isPageModule) ? (
            <>
              <button onClick={() => { setActiveModule('dashboard'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-medium text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
                <ArrowLeft size={12} /><ChevronRight size={14} /><span>All Modules</span>
              </button>
              <div className="mx-3 my-2 border-t border-[#252e3a]" />
              <div className="text-[9px] tracking-[2px] uppercase text-[#f5a623] font-bold px-4 py-2">{MODULE_CONFIG[isSubNav ? activeParentModule : activeModule]?.title || activeModule}</div>
              {isSubNav ? subModules.map(item => {
                const Icon = ICON_MAP[item.icon] || Zap;
                const badge = item.id === 'my-notices' ? (unreadNotices > 0 ? unreadNotices : null) : item.badge;
                return (
                  <button key={item.id} onClick={() => { setActiveModule(item.id as any); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-[7px] text-left text-[12px] font-medium transition-all duration-150 border-l-[3px] ${activeModule === item.id ? 'text-[#f5a623] border-l-[#f5a623] bg-[#f5a623]/7' : 'text-[#8899aa] border-l-transparent hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
                    <Icon size={14} className="w-4 text-center shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badge && <span className="bg-[#ff3d3d] text-white text-[9px] font-bold px-[5px] py-[1px] rounded-full">{badge > 99 ? '99+' : badge}</span>}
                  </button>
                );
              }) : (() => {
                const modInfo = MAIN_MODULE_MAP[activeModule];
                const Icon = ICON_MAP[modInfo?.icon || ''] || Zap;
                return (
                  <button className="w-full flex items-center gap-2 px-4 py-[7px] text-left text-[12px] font-medium text-[#f5a623] border-l-[3px] border-l-[#f5a623] bg-[#f5a623]/7">
                    <Icon size={14} className="w-4 text-center shrink-0" /><span className="flex-1">{modInfo?.label || activeModule}</span>
                    <span className="text-[9px] text-[#f5a623]/60">Active</span>
                  </button>
                );
              })()}
            </>
          ) : (
            <button onClick={() => setActiveModule('dashboard')}
              className={`w-full flex items-center gap-2 px-4 py-[7px] text-left text-[12px] font-medium transition-all duration-150 border-l-[3px] ${activeModule === 'dashboard' ? 'text-[#f5a623] border-l-[#f5a623] bg-[#f5a623]/7' : 'text-[#8899aa] border-l-transparent hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
              <Zap size={14} className="w-4 text-center shrink-0" /><span>Dashboard</span>
            </button>
          )}
        </div>

        <div className="border-t border-[#252e3a] p-3 relative user-menu-container">
          <ThemeToggle />
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 p-2 rounded-lg bg-[#141920] hover:bg-[#1a2028] transition-colors cursor-pointer"
          >
            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-black bg-gradient-to-br from-[#f5a623] to-[#e8891a]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {userData ? getInitials(userData.name) : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold truncate">{userData?.name || 'User'}</div>
              <div className="text-[10px] text-[#5a6878] truncate font-mono">
                {userData?.employeeCode || (userData?.role === 'admin' ? 'Administrator' : userData?.email?.split('@')[0] || '—')}
              </div>
            </div>
            <ChevronDown size={14} className={`text-[#5a6878] shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#161c24] border border-[#252e3a] rounded-lg shadow-lg overflow-hidden z-50">
              <div className="p-3 border-b border-[#252e3a]">
                <div className="text-[11px] font-semibold text-[#e2e8f0]">{userData?.name || 'User'}</div>
                <div className="text-[10px] text-[#5a6878]">{userData?.email || ''}</div>
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-[2px] rounded-full text-[9px] font-bold bg-[#f5a623]/15 text-[#f5a623]">
                  <Zap size={9} /> {userData?.orgRoleName || (userData?.role === 'admin' ? 'ADMIN' : userData?.role?.toUpperCase() || 'USER')}
                </div>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); onLogout?.(); }}
                className="w-full px-3 py-2 text-left text-[11px] text-[#8899aa] hover:bg-[#1a2028] transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Topbar ──────────────────────────────────────────────────────
function Topbar({ onLogout }: { onLogout?: () => void }) {
  const { activeModule, setSidebarOpen, setActiveModule, userRole, allowedModules } = useERPStore();
  const config = MODULE_CONFIG[activeModule];
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch notifications on mount and poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    }
  };

  const markAllRead = async () => {
    try {
      const user = localStorage.getItem('erp_auth_user');
      const email = user ? JSON.parse(user).email : null;
      if (!email) return;
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userEmail: email }),
      });
      setNotifications([]);
    } catch {}
  };

  const markOneRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notifId }),
      });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch {}
  };

  // Map entityType → module IDs: [adminModule, selfServiceModule]
  // Admin/approver sees the management module; employee sees their self-service module.
  const ENTITY_MODULE_MAP: Record<string, { admin: string; self: string }> = {
    leave:      { admin: 'leave',           self: 'my-leave' },
    tour:       { admin: 'tour-requests',   self: 'tour-requests' },
    request:    { admin: 'requests',        self: 'my-requests' },
    attendance: { admin: 'attendance',      self: 'my-attendance' },
    payroll:    { admin: 'payroll',         self: 'my-payslips' },
    notice:     { admin: 'notice-board',    self: 'my-notices' },
  };

  const handleNotificationClick = async (notif: any) => {
    // Navigate to the relevant module — do NOT mark as read (user must explicitly click "Mark as Read")
    setShowNotifications(false);

    const entityType = notif.entityType as string;
    const mapping = ENTITY_MODULE_MAP[entityType];
    if (!mapping) return; // no known module for this type

    const isAdmin = userRole === 'admin';
    // Prefer admin module for admins, self-service for employees.
    // But always check access first — fall back to the other if not allowed.
    const preferred  = isAdmin ? mapping.admin : mapping.self;
    const fallback   = isAdmin ? mapping.self  : mapping.admin;

    const canPreferred = isModuleAllowed(preferred, allowedModules);
    const canFallback  = isModuleAllowed(fallback,  allowedModules);

    if (canPreferred) {
      setActiveModule(preferred as any);
    } else if (canFallback) {
      setActiveModule(fallback as any);
    }
    // If neither is accessible, do nothing (notification is still marked read)
  };

  useEffect(() => {
    // Close notifications when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showNotifications && !target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showNotifications]);

  const hasNotifications = notifications.length > 0;

  return (
    <header className="h-[50px] bg-[#161c24] border-b border-[#252e3a] flex items-center gap-3 px-4 shrink-0">
      <button className="lg:hidden text-[#8899aa] hover:text-[#e2e8f0]" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
      <div>
        <h1 className="text-[19px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{config?.title || 'VoltCore ERP'}</h1>
        <p className="text-[10px] text-[#5a6878]">{config?.breadcrumb || ''}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        
        {/* Notifications Bell */}
        <div className="relative notifications-container">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-[#8899aa] hover:text-[#e2e8f0] transition-colors"
          >
            <Bell size={16} />
            {hasNotifications && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ff3d3d] rounded-full" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-[320px] bg-[#161c24] border border-[#252e3a] rounded-lg shadow-lg overflow-hidden z-50">
              <div className="p-3 border-b border-[#252e3a] flex items-center justify-between">
                <div className="text-[12px] font-semibold text-[#e2e8f0]">Notifications</div>
                {hasNotifications && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#5a6878]">{notifications.length} new</span>
                    <button onClick={markAllRead} className="text-[10px] text-[#f5a623] hover:text-[#e8891a] font-semibold transition-colors">
                      Mark all read
                    </button>
                  </div>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell size={32} className="mx-auto text-[#5a6878] mb-2" />
                    <p className="text-[11px] text-[#5a6878]">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notif, idx) => {
                    const mapping = ENTITY_MODULE_MAP[notif.entityType as string];
                    const isAdmin = userRole === 'admin';
                    const targetModule = mapping
                      ? (isAdmin
                          ? (isModuleAllowed(mapping.admin, allowedModules) ? mapping.admin : isModuleAllowed(mapping.self, allowedModules) ? mapping.self : null)
                          : (isModuleAllowed(mapping.self, allowedModules) ? mapping.self : isModuleAllowed(mapping.admin, allowedModules) ? mapping.admin : null))
                      : null;
                    const typeColor: Record<string, string> = {
                      info: '#00d4ff', success: '#00e676', warning: '#f5a623', error: '#ff3d3d',
                    };
                    const borderColor = typeColor[notif.type] || '#5a6878';
                    return (
                      <div
                        key={idx}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 border-b border-[#252e3a] hover:bg-[#141920] transition-colors border-l-[3px] ${targetModule ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{ borderLeftColor: borderColor }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[11px] font-semibold text-[#e2e8f0] leading-snug flex-1">{notif.title}</div>
                          {targetModule && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ background: `${borderColor}20`, color: borderColor }}>
                              {MODULE_CONFIG[targetModule]?.title || targetModule}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#8899aa] mt-0.5 leading-snug">{notif.message}</div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[9px] text-[#5a6878]">{notif.time}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); markOneRead(notif.id); }}
                            className="text-[9px] font-semibold text-[#f5a623] hover:text-[#e8891a] transition-colors px-1.5 py-0.5 rounded hover:bg-[#f5a623]/10"
                          >
                            ✓ Mark as Read
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Main Layout ─────────────────────────────────────────────────
export default function ERPLayout({ onLogout }: { onLogout?: () => void }) {
  const { activeModule } = useERPStore();
  const [mounted, setMounted] = useState(false);
  const branding = useTenantBranding();

  useEffect(() => {
    // Global handler for chunk loading errors — auto-reload
    const handleChunkError = (e: Event | string) => {
      const msg = typeof e === 'string' ? e : (e as ErrorEvent)?.message || '';
      if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk') || msg.includes('Failed to fetch dynamically imported module')) {
        console.warn('[VoltCore] Chunk stale, reloading...');
        window.location.reload();
      }
    };
    window.addEventListener('error', handleChunkError as EventListener);
    window.addEventListener('unhandledrejection', (e) => {
      const reason = e.reason?.message || String(e.reason);
      if (reason.includes('ChunkLoadError') || reason.includes('Loading chunk')) {
        console.warn('[VoltCore] Chunk stale (promise), reloading...');
        window.location.reload();
      }
    });
    return () => { window.removeEventListener('error', handleChunkError as EventListener); };
  }, []);

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
  const isSubGrid = SUB_GRID_MODULES.includes(activeModule);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d12]">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto relative">
          {/* Tenant logo watermark */}
          {branding?.logoUrl && (
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
              style={{ left: '220px' }}
            >
              <div
                style={{
                  backgroundImage: `url(${branding.logoUrl})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '600px',
                  height: '600px',
                  opacity: 0.15,
                }}
              />
            </div>
          )}
          <div className="animate-in fade-in duration-200 relative z-10">
            {isDashboard ? <ModuleGrid /> : isSubGrid ? <SubModuleGrid moduleId={activeModule} /> : <ModuleRendererWrapper moduleKey={activeModule} />}
          </div>
        </main>
      </div>
    </div>
  );
}
