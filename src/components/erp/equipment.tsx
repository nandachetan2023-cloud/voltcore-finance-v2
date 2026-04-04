'use client';

import { useState, useEffect } from 'react';
import {
  Wrench, CheckCircle2, AlertOctagon, Clock, MapPin, User,
  Gauge, Activity
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────
interface EquipmentItem {
  id: string;
  name: string;
  eqId: string;
  site: string;
  status: string;
  lastPM: string | null;
  nextPM: string | null;
  issue: string | null;
  downSince: string | null;
  etaRepair: string | null;
  assignedTo: string | null;
  utilization: number;
}

// ── Helpers ────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
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

// ── Equipment Card ─────────────────────────────────────
function EquipmentCard({ eq }: { eq: EquipmentItem }) {
  const isMaintenance = eq.status?.toLowerCase() === 'maintenance' || eq.status?.toLowerCase() === 'under maintenance';
  const barColor = isMaintenance ? '#ff3d3d' : '#00e676';
  const statusBg = isMaintenance ? 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40' : 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
  const statusLabel = isMaintenance ? 'Maintenance' : 'Operational';

  return (
    <div
      className={`vc-panel transition-colors ${
        isMaintenance
          ? 'border-[#ff3d3d]/40 hover:border-[#ff3d3d]/60'
          : 'hover:border-[#2e3a48]'
      }`}
    >
      {/* Header */}
      <div className="vc-panel-header">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Wrench size={13} className={isMaintenance ? 'text-[#ff3d3d]' : 'text-[#00e676]'} />
            <span className="text-[12px] font-bold text-[#e2e8f0] truncate">{eq.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] text-[#5a6878]"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              {eq.eqId}
            </span>
            <span className="text-[#252e3a]">|</span>
            <span className="text-[10px] text-[#8899aa] flex items-center gap-1">
              <MapPin size={9} />
              {eq.site}
            </span>
          </div>
        </div>
        <span className={`vc-badge border shrink-0 ${statusBg}`}>
          {statusLabel}
        </span>
      </div>

      {/* Body */}
      <div className="vc-panel-body space-y-3">
        {isMaintenance ? (
          <>
            {/* Maintenance specific fields */}
            <div className="flex items-center gap-2">
              <AlertOctagon size={12} className="text-[#ff3d3d] shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Issue</div>
                <div className="text-[11px] text-[#e2e8f0] truncate">{eq.issue || 'Not specified'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-[#5a6878]" />
                <div>
                  <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Down Since</div>
                  <div className="text-[11px] text-[#8899aa]">{formatDate(eq.downSince)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity size={11} className="text-[#ffab40]" />
                <div>
                  <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">ETA Repair</div>
                  <div className="text-[11px] text-[#ffab40]">{formatDate(eq.etaRepair)}</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Operational specific fields */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-[#5a6878]" />
                <div>
                  <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Last PM</div>
                  <div className="text-[11px] text-[#8899aa]">{formatDate(eq.lastPM)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-[#00d4ff]" />
                <div>
                  <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Next PM</div>
                  <div className="text-[11px] text-[#00d4ff]">{formatDate(eq.nextPM)}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Assigned To */}
        {eq.assignedTo && (
          <div className="flex items-center gap-1.5">
            <User size={11} className="text-[#5a6878]" />
            <span className="text-[11px] text-[#8899aa]">{eq.assignedTo}</span>
          </div>
        )}

        {/* Utilization Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold">
              Utilization
            </span>
            <span
              className="text-[12px] font-bold"
              style={{ fontFamily: "'Share Tech Mono', monospace", color: barColor }}
            >
              {eq.utilization}%
            </span>
          </div>
          <div className="h-[6px] bg-[#141920] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, eq.utilization))}%`,
                background: `linear-gradient(90deg, ${barColor}90, ${barColor})`,
              }}
            />
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="vc-panel">
            <Skeleton className="h-14 w-full bg-[#1e2630]" />
            <Skeleton className="h-28 w-full bg-[#1e2630]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function EquipmentModule() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/equipment');
        const json = await res.json();
        if (json.success) {
          setEquipment(json.data);
        } else {
          setError(json.error || 'Failed to load equipment');
        }
      } catch {
        setError('Network error fetching equipment');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Compute stats ──
  const operational = equipment.filter(e => e.status?.toLowerCase() === 'operational').length;
  const maintenance = equipment.filter(e =>
    e.status?.toLowerCase() === 'maintenance' || e.status?.toLowerCase() === 'under maintenance'
  ).length;
  const avgUtilization = equipment.length > 0
    ? Math.round(equipment.reduce((sum, e) => sum + e.utilization, 0) / equipment.length)
    : 0;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Wrench size={40} className="text-[#ff3d3d]" />
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
          icon={CheckCircle2}
          label="Operational"
          value={operational}
          color="#00e676"
          sub="Running assets"
        />
        <StatCard
          icon={AlertOctagon}
          label="Under Maintenance"
          value={maintenance}
          color="#ff3d3d"
          sub="Currently offline"
        />
        <StatCard
          icon={Clock}
          label="PM Due This Week"
          value="8"
          color="#00d4ff"
          sub="Preventive Maintenance"
        />
        <StatCard
          icon={Gauge}
          label="Utilization"
          value={`${avgUtilization}%`}
          color="#f5a623"
          sub="Fleet average"
        />
      </div>

      {/* ── Equipment Grid ── */}
      {equipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#5a6878]">
          <Wrench size={36} className="mb-2 opacity-40" />
          <p className="text-[12px]">No equipment registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {equipment.map(eq => (
            <EquipmentCard key={eq.id} eq={eq} />
          ))}
        </div>
      )}
    </div>
  );
}
