'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: number; logDate: string;
  punchIn: string | null; punchOut: string | null;
  status: string; source: string;
}

interface Summary { present: number; late: number; absent: number; halfDay: number; total: number; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present:  { label: 'Present',  color: '#00e676', bg: 'rgba(0,230,118,0.12)' },
  late:     { label: 'Late',     color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
  absent:   { label: 'Absent',   color: '#ff3d3d', bg: 'rgba(255,61,61,0.12)' },
  half_day: { label: 'Half Day', color: '#00d4ff', bg: 'rgba(0,212,255,0.12)' },
};

function fmt(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(dt: string): string {
  return new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

function calcHours(punchIn: string | null, punchOut: string | null): string {
  if (!punchIn || !punchOut) return '—';
  const diff = new Date(punchOut).getTime() - new Date(punchIn).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function MyAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ present: 0, late: 0, absent: 0, halfDay: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Get employee ID from localStorage (stored at login)
  useEffect(() => {
    // Cookie set server-side at login is the authoritative source
    const match = document.cookie.match(/(^| )erp_employee_id=([^;]+)/);
    if (match) { setEmployeeId(decodeURIComponent(match[2])); return; }
    // Fallback: localStorage
    try {
      const u = localStorage.getItem('erp_auth_user');
      if (u) { const p = JSON.parse(u); if (p.employeeId) setEmployeeId(String(p.employeeId)); }
    } catch {}
  }, []);

  const fetchAttendance = useCallback(async (empId: string, month: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee-self/attendance?employeeId=${empId}&month=${month}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        setSummary(data.summary);
      }
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (employeeId) fetchAttendance(employeeId, currentMonth);
    else setLoading(false);
  }, [employeeId, currentMonth, fetchAttendance]);

  const changeMonth = (dir: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (!employeeId) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
        <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
        <p className="text-[11px] text-[#5a6878]">Your login account is not linked to an employee record. Contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <CalendarDays size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">My Attendance</h2>
            <p className="text-[11px] text-[#5a6878]">View your attendance records</p>
          </div>
        </div>
        <button onClick={() => fetchAttendance(employeeId, currentMonth)} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between bg-[#161c24] border border-[#252e3a] rounded-xl px-4 py-3 mb-4">
        <button onClick={() => changeMonth(-1)} className="p-1 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[13px] font-semibold text-[#e2e8f0]">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="p-1 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Present', value: summary.present, color: '#00e676' },
          { label: 'Late', value: summary.late, color: '#f5a623' },
          { label: 'Absent', value: summary.absent, color: '#ff3d3d' },
          { label: 'Half Day', value: summary.halfDay, color: '#00d4ff' },
        ].map(s => (
          <div key={s.label} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 text-center">
            <div className="text-[20px] font-black" style={{ color: s.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.value}</div>
            <div className="text-[10px] text-[#5a6878] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <CalendarDays size={28} className="mx-auto text-[#5a6878] mb-2" />
          <p className="text-[12px] text-[#5a6878]">No attendance records for this month</p>
        </div>
      ) : (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#252e3a] bg-[#141920]">
                {['Date', 'Punch In', 'Punch Out', 'Hours', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#5a6878]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG['present'];
                return (
                  <tr key={r.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#e2e8f0]">{fmtDate(r.logDate)}</td>
                    <td className="px-4 py-3 text-[#8899aa]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} className="text-[#00e676]" />
                        {fmt(r.punchIn)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#8899aa]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} className="text-[#ff3d3d]" />
                        {fmt(r.punchOut)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#8899aa]">{calcHours(r.punchIn, r.punchOut)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-[3px] rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
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
  );
}
