'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  HardHat, Search, Plus, Eye, Pencil, Users, MapPin,
  UserPlus, UserMinus, ChevronDown, X, AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Employee {
  id: string;
  empId: string;
  name: string;
  email: string | null;
  phone: string | null;
  trade: string;
  role: string;
  site: string;
  type: string;
  status: string;
  joiningDate: string;
  certifications: string;
  attendance: { id: string; status: string; date: string }[];
  leaveRequests: { id: string; status: string }[];
  payroll: { id: string; status: string }[];
  expenses: { id: string; status: string }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  B: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  C: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  D: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

function getAvatarColor(name: string) {
  const letter = name.charAt(0).toUpperCase();
  return AVATAR_COLORS[letter] || { bg: 'bg-red-500/20', text: 'text-red-400' };
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Active':
      return { bg: 'bg-[#00e676]/10', text: 'text-[#00e676]', border: 'border-[#00e676]/20' };
    case 'Inactive':
      return { bg: 'bg-[#5a6878]/10', text: 'text-[#5a6878]', border: 'border-[#5a6878]/20' };
    case 'On Leave':
      return { bg: 'bg-[#a78bfa]/10', text: 'text-[#a78bfa]', border: 'border-[#a78bfa]/20' };
    case 'Notice Period':
      return { bg: 'bg-[#ffab40]/10', text: 'text-[#ffab40]', border: 'border-[#ffab40]/20' };
    case 'Separated':
      return { bg: 'bg-[#ff3d3d]/10', text: 'text-[#ff3d3d]', border: 'border-[#ff3d3d]/20' };
    default:
      return { bg: 'bg-[#8899aa]/10', text: 'text-[#8899aa]', border: 'border-[#8899aa]/20' };
  }
}

function getTypeStyle(type: string) {
  switch (type) {
    case 'Staff':
      return { bg: 'bg-[#00d4ff]/10', text: 'text-[#00d4ff]' };
    case 'Labor':
      return { bg: 'bg-[#f5a623]/10', text: 'text-[#f5a623]' };
    case 'Contractor':
      return { bg: 'bg-[#a78bfa]/10', text: 'text-[#a78bfa]' };
    default:
      return { bg: 'bg-[#8899aa]/10', text: 'text-[#8899aa]' };
  }
}

function parseCertifications(certStr: string): string[] {
  if (!certStr || certStr.trim() === '') return [];
  return certStr.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 3);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */

function EmployeesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-8 w-8 rounded-lg bg-[#1e252e] mb-3" />
            <Skeleton className="h-7 w-20 rounded bg-[#1e252e] mb-1" />
            <Skeleton className="h-3 w-28 rounded bg-[#1e252e]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <div className="vc-panel-body space-y-3">
          <div className="flex gap-3 flex-wrap">
            <Skeleton className="h-9 w-64 rounded-lg bg-[#1e252e]" />
            <Skeleton className="h-9 w-32 rounded-lg bg-[#1e252e]" />
            <Skeleton className="h-9 w-32 rounded-lg bg-[#1e252e]" />
            <Skeleton className="h-9 w-32 rounded-lg bg-[#1e252e]" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded bg-[#1e252e]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: color }}
      />
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div
        className="text-[26px] font-bold leading-none mb-1"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {value}
      </div>
      <div className="text-[11px] text-[#8899aa]">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filters */
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  /* Page */
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  /* Fetch */
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/employees');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (json.success) setEmployees(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, []);

  /* Derived filter options */
  const sites = useMemo(() => {
    const set = new Set(employees.map((e) => e.site));
    return Array.from(set).sort();
  }, [employees]);

  const trades = useMemo(() => {
    const set = new Set(employees.map((e) => e.trade));
    return Array.from(set).sort();
  }, [employees]);

  /* Filtered list */
  const filtered = useMemo(() => {
    let list = employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.empId.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.trade.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q)
      );
    }
    if (siteFilter !== 'all') list = list.filter((e) => e.site === siteFilter);
    if (tradeFilter !== 'all') list = list.filter((e) => e.trade === tradeFilter);
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    return list;
  }, [employees, search, siteFilter, tradeFilter, statusFilter]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* Stats */
  const totalEmployees = employees.length;
  const onSite = employees.filter((e) => e.status === 'Active').length;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const newJoiners = employees.filter((e) => e.joiningDate >= thirtyDaysAgo).length;
  const separations = employees.filter((e) => e.status === 'Separated').length;

  /* Reset page on filter change */
  useEffect(() => { setPage(1); }, [search, siteFilter, tradeFilter, statusFilter]);

  /* ---------- Loading ---------- */
  if (loading) return <EmployeesSkeleton />;

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="vc-panel">
        <div className="vc-panel-body text-center py-12">
          <AlertTriangle size={40} className="mx-auto text-[#ff3d3d] mb-3" />
          <div className="text-[#e2e8f0] text-sm font-semibold mb-1">Failed to load employees</div>
          <div className="text-[#8899aa] text-xs">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== 1. Stats Row ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={Users} label="Total Employees" value={totalEmployees} color="#f5a623" />
        <MiniStat icon={MapPin} label="On Site" value={onSite} color="#00e676" />
        <MiniStat icon={UserPlus} label="New Joiners (30d)" value={newJoiners} color="#00d4ff" />
        <MiniStat icon={UserMinus} label="Separations" value={separations} color="#ff3d3d" />
      </div>

      {/* ===== 2. Employee Directory ===== */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <HardHat size={14} className="text-[#f5a623]" />
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            EMPLOYEE DIRECTORY
          </span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{filtered.length} records</span>
        </div>
        <div className="vc-panel-body space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-lg px-3 py-[6px] flex-1 min-w-[200px] max-w-[360px]">
              <Search size={14} className="text-[#5a6878] shrink-0" />
              <input
                type="text"
                placeholder="Search by name, ID, trade, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none text-[#e2e8f0] outline-none text-[12px] w-full placeholder:text-[#5a6878]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[#5a6878] hover:text-[#e2e8f0]">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Site Filter */}
            <div className="relative">
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="vc-input appearance-none pr-7 min-w-[130px] cursor-pointer"
              >
                <option value="all">All Sites</option>
                {sites.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
            </div>

            {/* Trade Filter */}
            <div className="relative">
              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="vc-input appearance-none pr-7 min-w-[130px] cursor-pointer"
              >
                <option value="all">All Trades</option>
                {trades.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="vc-input appearance-none pr-7 min-w-[130px] cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
                <option value="Notice Period">Notice Period</option>
                <option value="Separated">Separated</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
            </div>

            {/* Add Employee */}
            <button className="vc-btn-primary flex items-center gap-1.5 whitespace-nowrap">
              <Plus size={14} />
              Add Employee
            </button>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-[#252e3a] overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto">
              {/* Table Header */}
              <div className="grid grid-cols-[80px_1fr_130px_100px_70px_90px_140px_80px_70px] gap-2 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-[#5a6878] bg-[#141920] border-b border-[#252e3a] sticky top-0 z-10">
                <span>EMP ID</span>
                <span>Name</span>
                <span className="hidden md:block">Trade / Role</span>
                <span className="hidden lg:block">Site</span>
                <span>Type</span>
                <span className="hidden sm:block">Joined</span>
                <span className="hidden xl:block">Certifications</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Table Body */}
              {paged.length === 0 ? (
                <div className="px-4 py-12 text-center text-[#5a6878] text-xs">
                  No employees match your filters.
                </div>
              ) : (
                paged.map((emp) => {
                  const avatar = getAvatarColor(emp.name);
                  const statusStyle = getStatusStyle(emp.status);
                  const typeStyle = getTypeStyle(emp.type);
                  const certs = parseCertifications(emp.certifications);
                  const initials = emp.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={emp.id}
                      className="grid grid-cols-[80px_1fr_130px_100px_70px_90px_140px_80px_70px] gap-2 px-3 py-2.5 items-center border-b border-[#1e252e] last:border-0 hover:bg-[#1a2028] transition-colors group"
                    >
                      {/* EMP ID */}
                      <span
                        className="text-[11px] text-[#8899aa] font-medium truncate"
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}
                      >
                        {emp.empId}
                      </span>

                      {/* Name with Avatar */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${avatar.bg} ${avatar.text}`}
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-[#e2e8f0] truncate">{emp.name}</div>
                          <div className="text-[10px] text-[#5a6878] truncate">{emp.email || emp.phone || '—'}</div>
                        </div>
                      </div>

                      {/* Trade / Role */}
                      <div className="hidden md:block min-w-0">
                        <div className="text-[11px] text-[#e2e8f0] truncate">{emp.trade}</div>
                        <div className="text-[10px] text-[#5a6878] truncate">{emp.role}</div>
                      </div>

                      {/* Site */}
                      <span className="hidden lg:block text-[11px] text-[#8899aa] truncate">{emp.site}</span>

                      {/* Type Badge */}
                      <span className={`vc-badge ${typeStyle.bg} ${typeStyle.text}`}>
                        {emp.type}
                      </span>

                      {/* Joining Date */}
                      <span className="hidden sm:block text-[10px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {formatDate(emp.joiningDate)}
                      </span>

                      {/* Certifications */}
                      <div className="hidden xl:flex items-center gap-1 flex-wrap">
                        {certs.length === 0 ? (
                          <span className="text-[10px] text-[#5a6878]">None</span>
                        ) : (
                          certs.map((cert, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-1.5 py-[1px] rounded text-[8px] font-semibold bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/15"
                            >
                              {cert}
                            </span>
                          ))
                        )}
                        {emp.certifications.split(',').filter(Boolean).length > 3 && (
                          <span className="text-[9px] text-[#5a6878]">
                            +{emp.certifications.split(',').length - 3}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`vc-badge ${statusStyle.bg} ${statusStyle.text}`}
                        style={{ border: `1px solid ${statusStyle.border}` }}
                      >
                        {emp.status}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#5a6878]">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="vc-btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-[10px] px-2.5"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-semibold transition-colors ${
                        page === pageNum
                          ? 'bg-[#f5a623] text-black'
                          : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1e252e]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="vc-btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-[10px] px-2.5"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
