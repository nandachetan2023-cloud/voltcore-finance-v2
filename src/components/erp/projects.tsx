'use client';

import { useState, useEffect } from 'react';
import {
  Building2, IndianRupee, Plus, FileText, MapPin, Users, Calendar,
  TrendingUp
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────
function statusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'on track': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40';
    case 'at risk': return 'bg-[#ffab40]/15 text-[#ffab40] border-[#ffab40]/40';
    case 'near done':
    case 'completed': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'delayed': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function progressColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'on track': return '#00d4ff';
    case 'at risk': return '#ffab40';
    case 'near done':
    case 'completed': return '#00e676';
    case 'delayed': return '#ff3d3d';
    default: return '#5a6878';
  }
}

function formatDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatCurrency(val: string) {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num >= 100) {
    return `₹${num.toLocaleString('en-IN')}Cr`;
  }
  return `₹${num.toLocaleString('en-IN')}L`;
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
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-11 w-full bg-[#1e2630]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function ProjectsModule() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/projects');
        const json = await res.json();
        if (json.success) {
          setProjects(json.data);
        } else {
          setError(json.error || 'Failed to load projects');
        }
      } catch {
        setError('Network error fetching projects');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Compute stats ──
  const activeCount = projects.filter(p =>
    p.status?.toLowerCase() !== 'completed' && p.status?.toLowerCase() !== 'cancelled'
  ).length;
  const delayedCount = projects.filter(p => p.status?.toLowerCase() === 'delayed').length;
  const totalContract = projects.reduce((sum, p) => sum + (parseFloat(p.contractValue) || 0), 0);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Building2 size={40} className="text-[#ff3d3d]" />
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
          icon={Building2}
          label="Active Projects"
          value={activeCount}
          color="#f5a623"
          sub={`${projects.length} total projects`}
        />
        <StatCard
          icon={IndianRupee}
          label="Contract Value"
          value={totalContract >= 100 ? `₹${totalContract.toLocaleString('en-IN')}Cr` : `₹${totalContract.toLocaleString('en-IN')}L`}
          color="#00e676"
          sub="All active contracts"
        />
        <StatCard
          icon={TrendingUp}
          label="Billed YTD"
          value="₹387Cr"
          color="#00d4ff"
          sub="46% of contract value"
        />
        <StatCard
          icon={Calendar}
          label="Delayed"
          value={delayedCount}
          color="#ff3d3d"
          sub="Need attention"
        />
      </div>

      {/* ── Project Portfolio Table ── */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-bold text-[#e2e8f0]">Project Portfolio</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{projects.length} projects</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1">
            <Plus size={13} />
            New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
            <Building2 size={36} className="mb-2 opacity-40" />
            <p className="text-[12px]">No projects found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                  {['Code', 'Name', 'Client', 'Type', 'Contract ₹', 'Start', 'End', 'Progress', 'People', 'Status'].map(h => (
                    <th
                      key={h}
                      className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="max-h-[420px] overflow-y-auto block">
                {projects.map((proj) => {
                  const pColor = progressColor(proj.status);
                  return (
                    <tr
                      key={proj.id}
                      className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors"
                    >
                      <td className="px-3 py-[10px] font-semibold text-[#f5a623] whitespace-nowrap"
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {proj.code}
                      </td>
                      <td className="px-3 py-[10px] text-[#e2e8f0] whitespace-nowrap max-w-[180px] truncate font-medium">
                        {proj.name}
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[140px] truncate">
                        {proj.client}
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">
                        {proj.type}
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap"
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="text-[#00e676]">{formatCurrency(proj.contractValue)}</span>
                      </td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">
                        {formatDate(proj.startDate)}
                      </td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">
                        {formatDate(proj.endDate)}
                      </td>
                      {/* Progress cell */}
                      <td className="px-3 py-[10px] whitespace-nowrap min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-[6px] bg-[#141920] rounded-full overflow-hidden min-w-[50px]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(0, Math.min(100, proj.progress))}%`,
                                background: `linear-gradient(90deg, ${pColor}80, ${pColor})`,
                              }}
                            />
                          </div>
                          <span
                            className="text-[10px] font-bold w-8 text-right"
                            style={{ fontFamily: "'Share Tech Mono', monospace", color: pColor }}
                          >
                            {proj.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Users size={10} className="text-[#5a6878]" />
                          <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                            {proj.people}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <span className={`vc-badge border ${statusColor(proj.status)}`}>
                          {proj.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
