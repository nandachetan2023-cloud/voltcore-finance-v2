'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, MessageSquare,
  Plus, FileText, ChevronRight, Clock, MapPin, User
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────
interface Incident {
  id: string;
  refNo: string;
  date: string;
  site: string;
  type: string;
  severity: string;
  person: string;
  status: string;
}

// ── Helpers ────────────────────────────────────────────
function severityColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'critical':
    case 'fatal': return 'bg-[#ff3d3d]/20 text-[#ff3d3d] border-[#ff3d3d]/40';
    case 'major':
    case 'high': return 'bg-[#ffab40]/20 text-[#ffab40] border-[#ffab40]/40';
    case 'moderate':
    case 'medium': return 'bg-[#f5a623]/20 text-[#f5a623] border-[#f5a623]/40';
    case 'minor':
    case 'low': return 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/40';
    default: return 'bg-[#5a6878]/20 text-[#8899aa] border-[#5a6878]/40';
  }
}

function statusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'open':
    case 'investigating': return 'bg-[#ffab40]/20 text-[#ffab40] border-[#ffab40]/40';
    case 'closed':
    case 'resolved': return 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40';
    case 'pending review': return 'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/40';
    default: return 'bg-[#5a6878]/20 text-[#8899aa] border-[#5a6878]/40';
  }
}

function formatDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, color, sub
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="vc-stat-card">
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">
            {label}
          </div>
          <div
            className="text-[28px] font-bold leading-none"
            style={{ fontFamily: "'Share Tech Mono', monospace", color }}
          >
            {value}
          </div>
          {sub && (
            <div className="text-[10px] text-[#5a6878] mt-1">{sub}</div>
          )}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── KPI Row ────────────────────────────────────────────
function KPIRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-[9px] border-b border-[#252e3a] last:border-0">
      <span className="text-[11px] text-[#8899aa]">{label}</span>
      <span
        className="text-[14px] font-bold"
        style={{ fontFamily: "'Share Tech Mono', monospace", color }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Audit Card ─────────────────────────────────────────
function AuditCard({
  title, due, type, icon: Icon
}: {
  title: string; due: string; type: string; icon: React.ElementType;
}) {
  const isOverdue = type === 'overdue';
  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      isOverdue
        ? 'bg-[#ff3d3d]/5 border-[#ff3d3d]/30 hover:border-[#ff3d3d]/50'
        : 'bg-[#141920] border-[#252e3a] hover:border-[#2e3a48]'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={isOverdue ? 'text-[#ff3d3d]' : 'text-[#f5a623]'} />
        <span className="text-[11px] font-semibold text-[#e2e8f0]">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        <Clock size={11} className={isOverdue ? 'text-[#ff3d3d]' : 'text-[#5a6878]'} />
        <span className={`text-[10px] ${isOverdue ? 'text-[#ff3d3d]' : 'text-[#5a6878]'}`}>
          {due}
        </span>
      </div>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-8 w-16 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="vc-panel">
          <Skeleton className="h-10 w-full bg-[#1e2630]" />
          <div className="p-3 space-y-2">
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} className="h-9 w-full bg-[#1e2630]" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="vc-panel">
            <Skeleton className="h-10 w-full bg-[#1e2630]" />
            <Skeleton className="h-32 w-full bg-[#1e2630]" />
          </div>
          <div className="vc-panel">
            <Skeleton className="h-10 w-full bg-[#1e2630]" />
            <Skeleton className="h-24 w-full bg-[#1e2630]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function SafetyModule() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/incidents');
        const json = await res.json();
        if (json.success) {
          setIncidents(json.data);
        } else {
          setError(json.error || 'Failed to load incidents');
        }
      } catch {
        setError('Network error fetching incidents');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Compute stats from incidents ──
  const ltiCount = incidents.filter(i =>
    i.type?.toLowerCase().includes('lti') || i.severity?.toLowerCase() === 'fatal'
  ).length;

  const nearMissCount = incidents.filter(i =>
    i.type?.toLowerCase().includes('near miss') || i.type?.toLowerCase().includes('near-miss')
  ).length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button
          className="vc-btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="LTI YTD"
          value={ltiCount}
          color="#ff3d3d"
          sub="Lost Time Incidents"
        />
        <StatCard
          icon={ShieldAlert}
          label="Near Miss MTD"
          value={nearMissCount}
          color="#ffab40"
          sub="This Month"
        />
        <StatCard
          icon={CheckCircle2}
          label="Safe Man-Days"
          value="41,220"
          color="#00e676"
          sub="Since Last LTI"
        />
        <StatCard
          icon={MessageSquare}
          label="Toolbox Talks MTD"
          value="186"
          color="#00d4ff"
          sub="Avg Attendance: 94%"
        />
      </div>

      {/* ── Main Content: 2-column layout (65/35) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* ── Left: Incident Register ── */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <FileText size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-bold text-[#e2e8f0]">Incident Register</span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{incidents.length} records</span>
            <button className="vc-btn-primary ml-2 flex items-center gap-1">
              <Plus size={13} />
              Report Incident
            </button>
          </div>

          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
              <ShieldAlert size={36} className="mb-2 opacity-40" />
              <p className="text-[12px]">No incidents recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                    {['Ref No.', 'Date', 'Site', 'Type', 'Severity', 'Person', 'Status'].map(h => (
                      <th
                        key={h}
                        className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="max-h-[360px] overflow-y-auto block">
                  {incidents.map((inc, idx) => (
                    <tr
                      key={inc.id}
                      className={`border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors ${
                        idx === 0 ? '' : ''
                      }`}
                    >
                      <td className="px-3 py-[9px] font-semibold text-[#f5a623] whitespace-nowrap"
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {inc.refNo}
                      </td>
                      <td className="px-3 py-[9px] text-[#8899aa] whitespace-nowrap">
                        {formatDate(inc.date)}
                      </td>
                      <td className="px-3 py-[9px] text-[#e2e8f0] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin size={10} className="text-[#5a6878]" />
                          {inc.site}
                        </div>
                      </td>
                      <td className="px-3 py-[9px] text-[#e2e8f0] whitespace-nowrap">
                        {inc.type}
                      </td>
                      <td className="px-3 py-[9px] whitespace-nowrap">
                        <span className={`vc-badge border ${severityColor(inc.severity)}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-3 py-[9px] text-[#e2e8f0] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User size={10} className="text-[#5a6878]" />
                          {inc.person}
                        </div>
                      </td>
                      <td className="px-3 py-[9px] whitespace-nowrap">
                        <span className={`vc-badge border ${statusColor(inc.status)}`}>
                          {inc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">
          {/* HSE KPIs */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <ShieldAlert size={15} className="text-[#f5a623]" />
              <span className="text-[12px] font-bold text-[#e2e8f0]">HSE KPIs</span>
            </div>
            <div className="vc-panel-body">
              <KPIRow label="TRIR" value="0.42" color="#f5a623" />
              <KPIRow label="LTIR" value="0.00" color="#00e676" />
              <KPIRow label="First Aid Rate" value="2.1" color="#00d4ff" />
              <KPIRow label="PPE Compliance" value="96.8%" color="#00e676" />
              <KPIRow label="TBT Attendance" value="94.2%" color="#00d4ff" />
            </div>
          </div>

          {/* Upcoming Audits */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <ChevronRight size={15} className="text-[#f5a623]" />
              <span className="text-[12px] font-bold text-[#e2e8f0]">Upcoming Audits</span>
            </div>
            <div className="vc-panel-body space-y-3">
              <AuditCard
                title="ISO 45001 Internal Audit"
                due="Due: 15 Feb 2025"
                type="upcoming"
                icon={ShieldAlert}
              />
              <AuditCard
                title="Client HSE Inspection"
                due="Due: 22 Feb 2025"
                type="upcoming"
                icon={ShieldAlert}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
