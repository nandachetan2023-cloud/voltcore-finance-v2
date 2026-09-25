'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users, Building2, UserCheck, ShieldAlert, AlertTriangle,
  Clock, ArrowUpRight, IndianRupee, TrendingUp,
  CircleDot, ChevronRight, Activity, FileWarning, CalendarDays,
  Search
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useERPStore, MODULE_CONFIG } from '@/store/erp-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardData {
  employees: { total: number; active: number };
  projects: { total: number; active: number };
  attendance: {
    date: string;
    total: number;
    present: number;
    absent: number;
    onLeave: number;
    records: { status: string; employee: { name: string; role: string; site: string } }[];
  };
  leaves: { pending: number; recent: { id: string; type: string; days: number; status: string; employee: { name: string } }[] };
  incidents: { total: number; open: number };
  equipment: { total: number; operational: number };
  subcontractors: { total: number };
  recruitment: { openPositions: number };
  invoices: { overdue: number };
  payroll: { paid: number; totalDisbursed: number; totalGross: number };
  sites: { total: number };
  recentAttendance: {
    id: string;
    status: string;
    createdAt: string;
    employee: { name: string };
  }[];
}

interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  type: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  progress: number;
  people: number;
  status: string;
  site: string;
}

interface WorkPermit {
  id: string;
  permitNo: string;
  type: string;
  location: string;
  issuedTo: string;
  expiry: string;
  status: string;
  description?: string | null;
  precautions?: string | null;
}

interface Incident {
  id: string;
  refNo: string;
  date: string;
  site: string;
  type: string;
  severity: string;
  person: string;
  status: string;
  description?: string | null;
  action?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Skeleton loaders                                                   */
/* ------------------------------------------------------------------ */

function StatCardSkeleton() {
  return (
    <div className="vc-stat-card">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-8 w-8 rounded-lg bg-[#1e252e]" />
        <Skeleton className="h-4 w-16 rounded bg-[#1e252e]" />
      </div>
      <Skeleton className="h-7 w-20 mb-1 rounded bg-[#1e252e]" />
      <Skeleton className="h-3 w-28 rounded bg-[#1e252e]" />
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="vc-panel">
      <div className="vc-panel-header">
        <Skeleton className="h-4 w-32 rounded bg-[#1e252e]" />
      </div>
      <div className="vc-panel-body space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded bg-[#1e252e]" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${(n ?? 0).toLocaleString('en-IN')}`;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'On Track': return { bg: 'bg-[#00e676]/10', text: 'text-[#00e676]', border: 'border-[#00e676]/20' };
    case 'Delayed': return { bg: 'bg-[#ff3d3d]/10', text: 'text-[#ff3d3d]', border: 'border-[#ff3d3d]/20' };
    case 'At Risk': return { bg: 'bg-[#ffab40]/10', text: 'text-[#ffab40]', border: 'border-[#ffab40]/20' };
    case 'Completed': return { bg: 'bg-[#00d4ff]/10', text: 'text-[#00d4ff]', border: 'border-[#00d4ff]/20' };
    default: return { bg: 'bg-[#8899aa]/10', text: 'text-[#8899aa]', border: 'border-[#8899aa]/20' };
  }
}

function getProgressColor(pct: number) {
  if (pct >= 75) return '#00e676';
  if (pct >= 40) return '#f5a623';
  return '#ff3d3d';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isExpiringSoon(expiry: string, hoursThreshold: number = 48): boolean {
  if (!expiry) return false;
  const expiryDate = new Date(expiry);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffMs > 0 && diffHours <= hoursThreshold;
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: color, opacity: 0.7 }} />
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}1a` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-semibold ${
              trend === 'up' ? 'text-[#00e676]' : 'text-[#ff3d3d]'
            }`}
          >
            {trend === 'up' ? <ArrowUpRight size={12} /> : <></>}
            Active
          </span>
        )}
      </div>
      <div className="text-[26px] font-bold leading-none mb-1 tracking-tight tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-[#8899aa]">{sub}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ pct, color, height = 6 }: { pct: number; color?: string; height?: number }) {
  const barColor = color || getProgressColor(pct);
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ background: '#1e252e', height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Component                                           */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [permits, setPermits] = useState<WorkPermit[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setActiveModule } = useERPStore();

  useEffect(() => {
    async function fetchAll() {
      try {
        const [dashRes, projRes, permitsRes, incidentsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/projects'),
          fetch('/api/permits'),
          fetch('/api/incidents'),
        ]);
        if (!dashRes.ok || !projRes.ok) throw new Error('Failed to fetch');
        const dashJson = await dashRes.json();
        const projJson = await projRes.json();
        if (dashJson.success) setData(dashJson.data);
        if (projJson.success) setProjects(projJson.data);

        // Permits and incidents are optional
        if (permitsRes.ok) {
          const permitsJson = await permitsRes.json();
          if (permitsJson.success) setPermits(permitsJson.data || []);
        }
        if (incidentsRes.ok) {
          const incidentsJson = await incidentsRes.json();
          if (incidentsJson.success) setIncidents(incidentsJson.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  /* derived attendance percentage */
  const attendancePct = useMemo(() => {
    if (!data || data.employees.total === 0) return 0;
    return ((data.attendance.present / data.employees.total) * 100).toFixed(1);
  }, [data]);

  /* Workforce by trade */
  const tradeBreakdown = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    data.attendance.records.forEach((r) => {
      const trade = r.employee.role || 'Unassigned';
      map.set(trade, (map.get(trade) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([trade, count]) => ({ trade, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [data]);

  /* Expiring permits (dynamic) */
  const expiringPermits = useMemo(() => {
    return permits.filter(p => {
      if (p.status === 'Expiring') return true;
      if (p.status === 'Active' && isExpiringSoon(p.expiry, 48)) return true;
      return false;
    });
  }, [permits]);

  /* Recent open incidents for safety alerts */
  const recentIncidents = useMemo(() => {
    return incidents
      .filter(i => i.status === 'Investigating' || i.status === 'Open')
      .slice(0, 3);
  }, [incidents]);

  /* Loading state */
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg bg-[#1e252e]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-4">
          <PanelSkeleton />
          <div className="space-y-4">
            <PanelSkeleton />
            <PanelSkeleton />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PanelSkeleton />
          <PanelSkeleton />
          <PanelSkeleton />
        </div>
      </div>
    );
  }

  /* Error state */
  if (error || !data) {
    return (
      <div className="vc-panel">
        <div className="vc-panel-body text-center py-12">
          <AlertTriangle size={40} className="mx-auto text-[#ff3d3d] mb-3" />
          <div className="text-[#e2e8f0] text-sm font-semibold mb-1">Failed to load dashboard</div>
          <div className="text-[#8899aa] text-xs">{error || 'Unknown error'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* ===== 1. Alert Strip (Dynamic - permits) ===== */}
      {(expiringPermits.length > 0 || recentIncidents.length > 0) && (
        <div className="space-y-2">
          {expiringPermits.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#ffab40]/10 border border-[#ffab40]/20">
              <FileWarning size={16} className="text-[#ffab40] shrink-0" />
              <span className="text-[12px] text-[#ffab40] font-medium">
                <span className="font-bold">{expiringPermits.length} work permit{expiringPermits.length > 1 ? 's' : ''}</span> expiring within 48 hours —{' '}
                {expiringPermits.slice(0, 3).map(p => p.permitNo).join(', ')}
                {expiringPermits.length > 3 ? ` +${expiringPermits.length - 3} more` : ''}
                {' '}require immediate renewal.
              </span>
              <button
                onClick={() => setActiveModule('permits')}
                className="ml-auto text-[#ffab40] text-[11px] font-semibold hover:underline whitespace-nowrap hidden sm:block"
              >
                Review Permits <ChevronRight size={12} className="inline" />
              </button>
            </div>
          )}
          {recentIncidents.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/20">
              <ShieldAlert size={16} className="text-[#ff3d3d] shrink-0" />
              <span className="text-[12px] text-[#ff3d3d] font-medium">
                <span className="font-bold">{recentIncidents.length} safety incident{recentIncidents.length > 1 ? 's' : ''}</span> under investigation —{' '}
                {recentIncidents.map(i => i.refNo).join(', ')}
              </span>
              <button
                onClick={() => setActiveModule('safety')}
                className="ml-auto text-[#ff3d3d] text-[11px] font-semibold hover:underline whitespace-nowrap hidden sm:block"
              >
                View Safety <ChevronRight size={12} className="inline" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== 2. Stats Row (4 cards) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Workforce"
          value={String(data.employees.total)}
          sub={`${data.employees.active} currently active`}
          color="#f5a623"
          trend="up"
        />
        <StatCard
          icon={Building2}
          label="Active Projects"
          value={String(data.projects.active)}
          sub={`of ${data.projects.total} total projects`}
          color="#00d4ff"
        />
        <StatCard
          icon={UserCheck}
          label="Attendance Today"
          value={`${attendancePct}%`}
          sub={`${data.attendance.present} of ${data.employees.total} present`}
          color="#00e676"
        />
        <StatCard
          icon={ShieldAlert}
          label="Safety Incidents"
          value={String(data.incidents.open)}
          sub={`${data.incidents.total} total (${data.incidents.open} open)`}
          color="#ff3d3d"
        />
      </div>

      {/* ===== 3. Two-column Layout (65/35) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-4">
        {/* LEFT: Project Progress */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Building2 size={14} className="text-[#00d4ff]" />
            <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              PROJECT PROGRESS
            </span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{projects.length} projects</span>
          </div>
          <div className="vc-panel-body p-0">
            <div className="max-h-[340px] overflow-y-auto">
              <div className="grid grid-cols-[1fr_100px_140px_60px_80px] gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-[#5a6878] border-b border-[#252e3a] sticky top-0 bg-[#161c24] z-10">
                <span>Project</span>
                <span className="hidden sm:block">Site</span>
                <span>Progress</span>
                <span className="text-center">People</span>
                <span className="text-right">Status</span>
              </div>
              {projects.length === 0 ? (
                <div className="px-4 py-8 text-center text-[#5a6878] text-xs">No projects found</div>
              ) : (
                projects.map((p) => {
                  const sc = getStatusColor(p.status);
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_100px_140px_60px_80px] gap-2 px-4 py-3 items-center border-b border-[#1e252e] last:border-0 hover:bg-[#1a2028] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold truncate text-[#e2e8f0]">{p.name}</div>
                        <div className="text-[10px] text-[#5a6878]">{p.code}</div>
                      </div>
                      <div className="text-[11px] text-[#8899aa] hidden sm:block truncate">{p.site}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar pct={p.progress} />
                          </div>
                          <span className="text-[10px] text-[#8899aa] w-8 text-right" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                            {(Number.isFinite(p.progress) ? p.progress : 0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {(Number.isFinite(p.people) ? p.people : 0)}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <span
                          className={`vc-badge ${sc.bg} ${sc.text}`}
                          style={{ border: `1px solid ${sc.border}` }}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Workforce by Trade + Pending Actions */}
        <div className="space-y-4">
          {/* Workforce by Trade */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <Users size={14} className="text-[#f5a623]" />
              <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                WORKFORCE BY TRADE
              </span>
            </div>
            <div className="vc-panel-body space-y-3">
              {tradeBreakdown.length === 0 ? (
                <div className="text-center text-[#5a6878] text-xs py-4">No data available</div>
              ) : (
                tradeBreakdown.map(({ trade, count }) => {
                  const pct = data.employees.total > 0 ? (count / data.employees.total) * 100 : 0;
                  return (
                    <div key={trade}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[#e2e8f0] font-medium">{trade}</span>
                        <span className="text-[10px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {count} <span className="text-[#5a6878]">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <ProgressBar pct={pct} color="#f5a623" height={4} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Actions - Clickable */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <Clock size={14} className="text-[#a78bfa]" />
              <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                PENDING ACTIONS
              </span>
            </div>
            <div className="vc-panel-body space-y-2.5">
              <button
                onClick={() => setActiveModule('leave')}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#141920] hover:bg-[#1a2028] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#a78bfa]/10 flex items-center justify-center shrink-0">
                  <CalendarDays size={14} className="text-[#a78bfa]" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[11px] text-[#e2e8f0] font-medium">Leave Requests</div>
                  <div className="text-[10px] text-[#5a6878]">Awaiting approval</div>
                </div>
                <span
                  className="text-[13px] font-bold text-[#a78bfa]"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {data.leaves.pending}
                </span>
              </button>
              <button
                onClick={() => setActiveModule('safety')}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#141920] hover:bg-[#1a2028] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#ff3d3d]/10 flex items-center justify-center shrink-0">
                  <ShieldAlert size={14} className="text-[#ff3d3d]" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[11px] text-[#e2e8f0] font-medium">Safety Incidents</div>
                  <div className="text-[10px] text-[#5a6878]">Under investigation</div>
                </div>
                <span
                  className="text-[13px] font-bold text-[#ff3d3d]"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {data.incidents.open}
                </span>
              </button>
              <button
                onClick={() => setActiveModule('recruitment')}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#141920] hover:bg-[#1a2028] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center shrink-0">
                  <Search size={14} className="text-[#00d4ff]" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[11px] text-[#e2e8f0] font-medium">Open Positions</div>
                  <div className="text-[10px] text-[#5a6878]">Active job openings</div>
                </div>
                <span
                  className="text-[13px] font-bold text-[#00d4ff]"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {data.recruitment.openPositions}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 4. Three-column Layout ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Attendance */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <UserCheck size={14} className="text-[#00e676]" />
            <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              TODAY&apos;S ATTENDANCE
            </span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{data.attendance.date}</span>
          </div>
          <div className="vc-panel-body">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg p-3 bg-[#00e676]/5 border border-[#00e676]/15 text-center">
                <div className="text-[22px] font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {data.attendance.present}
                </div>
                <div className="text-[10px] text-[#8899aa] font-medium mt-0.5">Present</div>
              </div>
              <div className="rounded-lg p-3 bg-[#ff3d3d]/5 border border-[#ff3d3d]/15 text-center">
                <div className="text-[22px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {data.attendance.absent}
                </div>
                <div className="text-[10px] text-[#8899aa] font-medium mt-0.5">Absent</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                  <span className="text-[11px] text-[#8899aa]">On Leave</span>
                </div>
                <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {data.attendance.onLeave}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ffab40]" />
                  <span className="text-[11px] text-[#8899aa]">Late Arrivals</span>
                </div>
                <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {data.attendance.records.filter((r) => r.status === 'Late').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00d4ff]" />
                  <span className="text-[11px] text-[#8899aa]">OT Workers</span>
                </div>
                <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {data.attendance.records.filter((r) => r.status === 'OT').length}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#252e3a]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#5a6878]">ATTENDANCE RATE</span>
                <span className="text-[11px] font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {attendancePct}%
                </span>
              </div>
              <ProgressBar pct={parseFloat(attendancePct)} color="#00e676" height={8} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Activity size={14} className="text-[#00d4ff]" />
            <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              RECENT ACTIVITY
            </span>
          </div>
          <div className="vc-panel-body">
            <div className="max-h-[280px] overflow-y-auto">
              {data.recentAttendance.length === 0 && data.leaves.recent.length === 0 ? (
                <div className="text-center text-[#5a6878] text-xs py-6">No recent activity</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#252e3a]" />
                  <div className="space-y-4">
                    {data.recentAttendance.map((item) => (
                      <div key={`att-${item.id}`} className="flex items-start gap-3 relative">
                        <div
                          className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 mt-0.5 z-[1] flex items-center justify-center ${
                            item.status === 'Present'
                              ? 'border-[#00e676] bg-[#00e676]/20'
                              : item.status === 'Absent'
                              ? 'border-[#ff3d3d] bg-[#ff3d3d]/20'
                              : 'border-[#8899aa] bg-[#8899aa]/20'
                          }`}
                        >
                          <div
                            className={`w-[5px] h-[5px] rounded-full ${
                              item.status === 'Present'
                                ? 'bg-[#00e676]'
                                : item.status === 'Absent'
                                ? 'bg-[#ff3d3d]'
                                : 'bg-[#8899aa]'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[#e2e8f0] font-medium truncate">
                            {item.employee.name}
                          </div>
                          <div className="text-[10px] text-[#5a6878]">
                            Marked {item.status.toLowerCase()} &middot; {timeAgo(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {data.leaves.recent.map((item) => (
                      <div key={`leave-${item.id}`} className="flex items-start gap-3 relative">
                        <div className="w-[15px] h-[15px] rounded-full border-2 border-[#a78bfa] bg-[#a78bfa]/20 shrink-0 mt-0.5 z-[1] flex items-center justify-center">
                          <div className="w-[5px] h-[5px] rounded-full bg-[#a78bfa]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[#e2e8f0] font-medium truncate">
                            {item.employee.name}
                          </div>
                          <div className="text-[10px] text-[#5a6878]">
                            {item.type} leave ({item.days}d) &middot; Pending
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payroll Summary */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <IndianRupee size={14} className="text-[#f5a623]" />
            <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              PAYROLL SUMMARY
            </span>
            <span className="ml-auto text-[10px] text-[#5a6878]">This month</span>
          </div>
          <div className="vc-panel-body space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141920]">
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-[#00d4ff]" />
                <span className="text-[11px] text-[#8899aa]">Gross Pay</span>
              </div>
              <span className="text-[14px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {formatCurrency(data.payroll.totalGross)}
              </span>
            </div>
            <div className="space-y-2 pl-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#5a6878]">PF Contribution</span>
                <span className="text-[11px] text-[#ff3d3d] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  - {formatCurrency(data.payroll.totalGross * 0.12)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#5a6878]">ESI</span>
                <span className="text-[11px] text-[#ff3d3d] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  - {formatCurrency(data.payroll.totalGross * 0.0075)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#5a6878]">OT Amount</span>
                <span className="text-[11px] text-[#00e676] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  + {formatCurrency(data.payroll.totalGross * 0.08)}
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[#252e3a]" />
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f5a623]/5 border border-[#f5a623]/15">
              <span className="text-[12px] text-[#f5a623] font-semibold">Net Disbursed</span>
              <span className="text-[18px] font-bold text-[#f5a623]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {formatCurrency(data.payroll.totalDisbursed)}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#5a6878]">
              <CircleDot size={10} />
              <span>{data.payroll.paid} employees paid this cycle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
