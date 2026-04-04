'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserX, CalendarOff, Clock, TrendingUp,
  ChevronLeft, ChevronRight, Loader2, AlertTriangle,
} from 'lucide-react';

interface Employee {
  id: string;
  empId: string;
  name: string;
  role: string;
  site: string;
}

interface AttendanceRecord {
  id: string;
  empId: string;
  site: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  otHours: number;
  shift: string | null;
  status: string;
  employee: Employee;
}

export default function AttendanceModule() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/attendance');
      if (!res.ok) throw new Error('Failed to fetch attendance data');
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed stats
  const presentToday = records.filter((r) => r.status === 'Present').length;
  const absent = records.filter((r) => r.status === 'Absent').length;
  const onLeave = records.filter((r) => r.status === 'On Leave').length;
  const otWorkers = records.filter((r) => r.otHours > 0).length;

  // Monthly trends
  const totalOT = records.reduce((sum, r) => sum + (r.otHours || 0), 0);
  const avgAttendance = records.length > 0
    ? Math.round((presentToday / records.length) * 100)
    : 0;
  const absenteeismRate = records.length > 0
    ? Math.round((absent / records.length) * 100)
    : 0;
  const weekendOT = records.filter((r) => {
    const d = new Date(r.date);
    return (d.getDay() === 0 || d.getDay() === 6) && r.otHours > 0;
  }).length;

  // Calendar state
  const [calMonth] = useState(5); // June (0-indexed)
  const [calYear] = useState(2024);
  const today = 18;
  const eventDays = [4, 12];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(calMonth, calYear);
  const firstDay = getFirstDayOfMonth(calMonth, calYear);
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  // Status color helper
  const statusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-[#00e676]/15 text-[#00e676]';
      case 'Absent': return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
      case 'On Leave': return 'bg-[#ffab40]/15 text-[#ffab40]';
      case 'Half Day': return 'bg-[#a78bfa]/15 text-[#a78bfa]';
      case 'Weekly Off': return 'bg-[#00d4ff]/15 text-[#00d4ff]';
      default: return 'bg-[#5a6878]/15 text-[#5a6878]';
    }
  };

  // Shift color helper
  const shiftColor = (shift: string) => {
    switch (shift) {
      case 'Morning': return 'bg-[#00d4ff]/15 text-[#00d4ff]';
      case 'Afternoon': return 'bg-[#ffab40]/15 text-[#ffab40]';
      case 'Night': return 'bg-[#a78bfa]/15 text-[#a78bfa]';
      case 'General': return 'bg-[#8899aa]/15 text-[#8899aa]';
      default: return 'bg-[#5a6878]/15 text-[#5a6878]';
    }
  };

  // Initials helper
  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Avatar color based on name
  const avatarColor = (name: string) => {
    const colors = [
      'from-[#f5a623] to-[#e8891a]',
      'from-[#00d4ff] to-[#0098b3]',
      'from-[#00e676] to-[#00a152]',
      'from-[#a78bfa] to-[#7c5cc4]',
      'from-[#ff3d3d] to-[#cc2020]',
      'from-[#ffab40] to-[#cc8520]',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#f5a623]" size={28} />
        <span className="ml-3 text-sm text-[#8899aa]">Loading attendance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <AlertTriangle className="text-[#ff3d3d]" size={24} />
        <span className="ml-3 text-sm text-[#ff3d3d]">{error}</span>
        <button onClick={fetchData} className="ml-4 vc-btn-ghost text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00e676]/10 flex items-center justify-center">
              <Users className="text-[#00e676]" size={16} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {presentToday}
              </div>
              <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">Present Today</div>
            </div>
          </div>
        </div>
        <div className="vc-stat-card" style={{ '--before-bg': '#ff3d3d' } as React.CSSProperties}>
          <div className="before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#ff3d3d]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#ff3d3d]/10 flex items-center justify-center">
                <UserX className="text-[#ff3d3d]" size={16} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {absent}
                </div>
                <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">Absent</div>
              </div>
            </div>
          </div>
        </div>
        <div className="vc-stat-card" style={{ '--before-bg': '#ffab40' } as React.CSSProperties}>
          <div className="before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#ffab40]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#ffab40]/10 flex items-center justify-center">
                <CalendarOff className="text-[#ffab40]" size={16} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {onLeave}
                </div>
                <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">On Leave</div>
              </div>
            </div>
          </div>
        </div>
        <div className="vc-stat-card" style={{ '--before-bg': '#00d4ff' } as React.CSSProperties}>
          <div className="before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#00d4ff]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center">
                <Clock className="text-[#00d4ff]" size={16} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {otWorkers}
                </div>
                <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">OT Workers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-4">
        {/* Left: Attendance Log */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <ClipboardListIcon />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Attendance Log</span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{records.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Site</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">In Time</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Out Time</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">OT (hrs)</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Shift</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#5a6878] text-[11px]">
                        No attendance records found.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(r.employee.name)} flex items-center justify-center text-[9px] font-bold text-black shrink-0`}>
                              {getInitials(r.employee.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#e2e8f0] font-medium truncate">{r.employee.name}</div>
                              <div className="text-[#5a6878] text-[9px]">{r.employee.empId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{r.site}</td>
                        <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{r.timeIn || '—'}</td>
                        <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{r.timeOut || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={r.otHours > 0 ? 'text-[#00d4ff] font-semibold' : 'text-[#5a6878]'}>
                            {r.otHours > 0 ? r.otHours.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {r.shift ? (
                            <span className={`vc-badge ${shiftColor(r.shift)}`}>{r.shift}</span>
                          ) : (
                            <span className="text-[#5a6878]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge ${statusColor(r.status)}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Calendar + Trends */}
        <div className="space-y-4">
          {/* Calendar */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <CalendarIcon />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">June 2024</span>
            </div>
            <div className="vc-panel-body">
              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayLabels.map((d) => (
                  <div key={d} className="text-center text-[9px] font-bold text-[#5a6878] uppercase py-1">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const isToday = day === today;
                  const isEvent = day !== null && eventDays.includes(day);
                  return (
                    <div
                      key={idx}
                      className={`
                        aspect-square flex items-center justify-center rounded-md text-[11px] font-medium
                        transition-all duration-150 cursor-default
                        ${day === null ? 'invisible' : ''}
                        ${isToday
                          ? 'bg-[#f5a623] text-black font-bold ring-2 ring-[#f5a623]/30'
                          : isEvent
                            ? 'bg-[#00d4ff]/15 text-[#00d4ff] font-semibold border border-[#00d4ff]/25'
                            : 'text-[#8899aa] hover:bg-[#141920] hover:text-[#e2e8f0]'
                        }
                      `}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1e2530]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#f5a623]" />
                  <span className="text-[9px] text-[#5a6878]">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#00d4ff]/30 border border-[#00d4ff]/40" />
                  <span className="text-[9px] text-[#5a6878]">Events</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <TrendingUp className="text-[#f5a623]" size={14} />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Monthly Trends</span>
            </div>
            <div className="vc-panel-body space-y-3">
              <TrendRow
                label="Avg Attendance"
                value={`${avgAttendance}%`}
                color={avgAttendance >= 80 ? '#00e676' : avgAttendance >= 60 ? '#ffab40' : '#ff3d3d'}
                pct={avgAttendance}
              />
              <TrendRow
                label="Total OT Hours"
                value={`${totalOT.toFixed(1)}h`}
                color="#00d4ff"
                pct={Math.min(totalOT, 100)}
              />
              <TrendRow
                label="Absenteeism Rate"
                value={`${absenteeismRate}%`}
                color={absenteeismRate <= 10 ? '#00e676' : absenteeismRate <= 25 ? '#ffab40' : '#ff3d3d'}
                pct={absenteeismRate}
              />
              <TrendRow
                label="Weekend OT"
                value={`${weekendOT} workers`}
                color="#a78bfa"
                pct={records.length > 0 ? Math.round((weekendOT / records.length) * 100) : 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Sub-components */

function ClipboardListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TrendRow({
  label,
  value,
  color,
  pct,
}: {
  label: string;
  value: string;
  color: string;
  pct: number;
}) {
  const clampedPct = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#8899aa]">{label}</span>
        <span className="text-[11px] font-bold" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {value}
        </span>
      </div>
      <div className="h-[5px] bg-[#0f1318] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clampedPct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
