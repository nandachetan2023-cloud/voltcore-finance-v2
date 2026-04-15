'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TimerReset, ChevronLeft, ChevronRight, Clock, UserCheck,
  AlertCircle, Download
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Types ── */
interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department?: {
    name: string;
  };
  branch?: {
    name: string;
  };
  employmentStatus: string;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  logDate: string;
  punchIn: string | null;
  punchOut: string | null;
  status: string;
  biometricDeviceId: string | null;
  employee: {
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

/* ── Helpers ── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Monday = 0 offset from Monday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return '';
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function calcHours(punchIn: string | null, punchOut: string | null): number {
  if (!punchIn || !punchOut) return 0;
  try {
    const inTime = new Date(punchIn);
    const outTime = new Date(punchOut);
    const diff = outTime.getTime() - inTime.getTime();
    if (diff < 0) return 0;
    return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
  } catch {
    return 0;
  }
}

function calcOtHours(totalHours: number): number {
  // OT is hours worked beyond 8 hours
  return Math.max(0, Math.round((totalHours - 8) * 10) / 10);
}

function getStatusStyle(status: string) {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'present': return 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30';
    case 'absent': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30';
    case 'leave': return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
    case 'half_day': return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
    case 'holiday': return 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30';
    case 'late': return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
    default: return 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30';
  }
}

function getStatusLabel(status: string): string {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'present': return 'P';
    case 'absent': return 'A';
    case 'leave': return 'L';
    case 'half_day': return 'HD';
    case 'holiday': return 'H';
    default: return status.substring(0, 2).toUpperCase();
  }
}

/* ── Skeleton ── */
function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64 bg-[#1e2630] rounded-lg" />
        <Skeleton className="h-8 w-40 bg-[#1e2630] rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 bg-[#1e2630] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] bg-[#1e2630] rounded-xl" />
    </div>
  );
}

/* ── Main Component ── */
export default function TimesheetModule() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [siteFilter, setSiteFilter] = useState('');

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${start.getFullYear()}`;
  }, [weekDates]);

  const isCurrentWeek = weekOffset === 0;

  // Build attendance lookup: employeeId + date -> record
  const attMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance.forEach(a => {
      const dateStr = new Date(a.logDate).toISOString().split('T')[0];
      map[`${a.employeeId}_${dateStr}`] = a;
    });
    return map;
  }, [attendance]);

  // Filtered employees
  const sites = useMemo(() => {
    const s = new Set(employees.map(e => e.Branch?.name).filter(Boolean));
    return Array.from(s).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees.filter(e => e.employmentStatus === 'active');
    if (siteFilter) result = result.filter(e => e.Branch?.name === siteFilter);
    return result;
  }, [employees, siteFilter]);

  // Computed stats for the week
  const stats = useMemo(() => {
    const weekStart = formatDate(weekDates[0]);
    const weekEnd = formatDate(weekDates[6]);
    const weekRecords = attendance.filter(a => {
      const dateStr = new Date(a.logDate).toISOString().split('T')[0];
      return dateStr >= weekStart && dateStr <= weekEnd;
    });

    const present = weekRecords.filter(a => a.status.toLowerCase() === 'present').length;
    const absent = weekRecords.filter(a => a.status.toLowerCase() === 'absent').length;
    const onLeave = weekRecords.filter(a => a.status.toLowerCase() === 'leave').length;
    
    let totalOt = 0;
    weekRecords.forEach(a => {
      if (a.status.toLowerCase() === 'present' && a.punchIn && a.punchOut) {
        const hours = calcHours(a.punchIn, a.punchOut);
        totalOt += calcOtHours(hours);
      }
    });
    
    // Count unique employees who were present this week
    const uniquePresent = new Set(
      weekRecords
        .filter(a => a.status.toLowerCase() === 'present')
        .map(a => a.employeeId)
    ).size;

    return { present, absent, onLeave, totalOt: Math.round(totalOt * 10) / 10, uniquePresent };
  }, [attendance, weekDates]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch employees and attendance for the week range
      const weekStart = formatDate(weekDates[0]);
      const weekEnd = formatDate(weekDates[6]);
      
      const [empRes, attRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/attendance?limit=1000`), // Get more records to cover the week
      ]);
      
      const empJson = await empRes.json();
      const attJson = await attRes.json();
      
      if (empJson.success) {
        setEmployees(empJson.data || []);
      } else {
        throw new Error(empJson.error || 'Failed to fetch employees');
      }
      
      if (attJson.success) {
        // Filter attendance records to only include the current week
        const weekAttendance = (attJson.data || []).filter((a: AttendanceRecord) => {
          const dateStr = new Date(a.logDate).toISOString().split('T')[0];
          return dateStr >= weekStart && dateStr <= weekEnd;
        });
        setAttendance(weekAttendance);
      } else {
        throw new Error(attJson.error || 'Failed to fetch attendance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [weekDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const headers = [
      'Employee',
      'Emp ID',
      'Site',
      ...DAYS.map((_, i) => `${DAYS[i]} ${formatDisplayDate(weekDates[i])}`),
      'Total Hrs',
      'OT Hrs',
      'Days Present'
    ];
    
    const csvRows = filteredEmployees.map(emp => {
      const cells = [
        `"${emp.firstName} ${emp.lastName}"`,
        emp.employeeCode,
        emp.Branch?.name || ''
      ];
      
      let totalHrs = 0;
      let totalOt = 0;
      let daysPresent = 0;
      
      DAYS.forEach((_, i) => {
        const dateStr = formatDate(weekDates[i]);
        const record = attMap[`${emp.id}_${dateStr}`];
        
        if (record && record.status.toLowerCase() === 'present' && record.punchIn && record.punchOut) {
          const hrs = calcHours(record.punchIn, record.punchOut);
          const ot = calcOtHours(hrs);
          totalHrs += hrs;
          totalOt += ot;
          daysPresent++;
          const timeIn = formatTime(record.punchIn);
          const timeOut = formatTime(record.punchOut);
          cells.push(`${timeIn}-${timeOut} (${hrs}h)`);
        } else if (record) {
          cells.push(getStatusLabel(record.status));
        } else {
          cells.push('—');
        }
      });
      
      cells.push(`${totalHrs}h`, `${totalOt}h`, `${daysPresent}/7`);
      return cells.join(',');
    });
    
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSkeleton />;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle size={40} className="text-[#ff3d3d]" />
        <div className="text-sm text-[#e2e8f0] font-medium">{error}</div>
        <button className="vc-btn-primary mt-2" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <TimerReset size={20} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Weekly Timesheet
            </h2>
            <p className="text-[11px] text-[#5a6878]">HRMS › Time Tracking & Hours</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="vc-input w-[120px] text-[11px] appearance-none cursor-pointer"
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
          >
            <option value="">All Sites</option>
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            className="vc-btn-ghost flex items-center gap-1.5"
            onClick={handleExport}
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Week Navigator ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 flex items-center justify-between">
        <button
          className="flex items-center gap-1.5 text-[#8899aa] hover:text-[#e2e8f0] transition-colors text-[12px] font-medium"
          onClick={() => setWeekOffset(w => w - 1)}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Prev Week</span>
        </button>
        <div className="text-center">
          <div className="text-[14px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {weekLabel}
          </div>
          {isCurrentWeek && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#00e676] bg-[#00e676]/10 px-2 py-[1px] rounded">Current Week</span>
          )}
        </div>
        <button
          className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${weekOffset >= 0 ? 'text-[#5a6878] cursor-not-allowed' : 'text-[#8899aa] hover:text-[#e2e8f0]'}`}
          onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
          disabled={weekOffset >= 0}
        >
          <span className="hidden sm:inline">Next Week</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: UserCheck, label: 'Present Entries', value: stats.present, sub: `${stats.uniquePresent} unique employees`, color: '#00e676' },
          { icon: AlertCircle, label: 'Absent Entries', value: stats.absent, sub: 'This week', color: '#ff3d3d' },
          { icon: Clock, label: 'On Leave', value: stats.onLeave, sub: 'Approved leaves', color: '#ffab40' },
          { icon: TimerReset, label: 'Total OT Hours', value: `${stats.totalOt}h`, sub: 'Overtime this week', color: '#00d4ff' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: stat.color }} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{stat.label}</div>
                  <div className="text-[20px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{stat.value}</div>
                  <div className="text-[10px] text-[#5a6878] mt-1">{stat.sub}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Timesheet Grid ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="vc-panel-header">
          <TimerReset size={14} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Timesheet Grid</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{filteredEmployees.length} employees</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[900px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[180px]">Employee</th>
                <th className="text-center py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[50px]">Site</th>
                {DAYS.map((day, i) => (
                  <th key={day} className="text-center py-2.5 px-1 min-w-[110px]">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-[#8899aa]">{day}</div>
                    <div className="text-[10px] text-[#5a6878]">{formatDisplayDate(weekDates[i])}</div>
                  </th>
                ))}
                <th className="text-center py-2.5 px-2 text-[#00e676] font-bold text-[9px] uppercase tracking-wider min-w-[60px]">Total</th>
                <th className="text-center py-2.5 px-2 text-[#00d4ff] font-bold text-[9px] uppercase tracking-wider min-w-[50px]">OT</th>
                <th className="text-center py-2.5 px-2 text-[#f5a623] font-bold text-[9px] uppercase tracking-wider min-w-[50px]">Days</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-[#5a6878] text-[12px]">
                    No active employees found
                  </td>
                </tr>
              ) : filteredEmployees.map(emp => {
                let totalHrs = 0;
                let totalOt = 0;
                let daysPresent = 0;
                
                return (
                  <tr key={emp.id} className="border-b border-[#252e3a]/40 hover:bg-[#141920] transition-colors group">
                    <td className="py-2.5 px-3">
                      <div className="text-[12px] font-semibold text-[#e2e8f0] truncate max-w-[130px]">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-[9px] text-[#5a6878] font-mono">{emp.employeeCode}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[10px] text-[#8899aa]">{emp.Branch?.name || '—'}</span>
                    </td>
                    {DAYS.map((_, i) => {
                      const dateStr = formatDate(weekDates[i]);
                      const record = attMap[`${emp.id}_${dateStr}`];
                      const isWeekend = i >= 5;

                      if (record && record.status.toLowerCase() === 'present' && record.punchIn && record.punchOut) {
                        const hrs = calcHours(record.punchIn, record.punchOut);
                        const ot = calcOtHours(hrs);
                        totalHrs += hrs;
                        totalOt += ot;
                        daysPresent++;
                        
                        return (
                          <td key={i} className={`py-2 px-1 text-center ${isWeekend ? 'bg-[#141920]/50' : ''}`}>
                            <div className="flex flex-col items-center gap-[2px]">
                              <span className="text-[10px] text-[#8899aa] font-mono">
                                {formatTime(record.punchIn)}–{formatTime(record.punchOut)}
                              </span>
                              <span className="text-[11px] font-bold text-[#e2e8f0] font-mono">{hrs}h</span>
                              {ot > 0 && (
                                <span className="text-[9px] text-[#00d4ff] font-mono">+{ot}h OT</span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (record) {
                        return (
                          <td key={i} className={`py-2 px-1 text-center ${isWeekend ? 'bg-[#141920]/50' : ''}`}>
                            <span className={`inline-block px-2 py-[2px] rounded text-[9px] font-bold ${getStatusStyle(record.status)}`}>
                              {getStatusLabel(record.status)}
                            </span>
                          </td>
                        );
                      }

                      // No record
                      if (isWeekend) {
                        return (
                          <td key={i} className="py-2 px-1 text-center bg-[#141920]/50">
                            <span className="text-[9px] text-[#3a4858]">—</span>
                          </td>
                        );
                      }

                      // Check if date is in the future
                      const today = new Date().toISOString().split('T')[0];
                      if (dateStr > today) {
                        return (
                          <td key={i} className="py-2 px-1 text-center">
                            <span className="text-[9px] text-[#3a4858]">—</span>
                          </td>
                        );
                      }

                      // Past date with no record = no data
                      return (
                        <td key={i} className="py-2 px-1 text-center">
                          <span className="text-[9px] text-[#5a6878] italic">—</span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[13px] font-bold text-[#00e676] font-mono">{totalHrs > 0 ? `${totalHrs}h` : '—'}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[13px] font-bold text-[#00d4ff] font-mono">{totalOt > 0 ? `${totalOt}h` : '—'}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[13px] font-bold text-[#f5a623] font-mono">{daysPresent}/7</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Summary Footer ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00e676]" />
            <span className="text-[#8899aa]">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ff3d3d]" />
            <span className="text-[#8899aa]">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ffab40]" />
            <span className="text-[#8899aa]">Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00d4ff]" />
            <span className="text-[#8899aa]">OT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#5a6878]" />
            <span className="text-[#8899aa]">No Data</span>
          </div>
        </div>
        <div className="text-[10px] text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          Showing {filteredEmployees.length} active employees · Week of {weekLabel}
        </div>
      </div>
    </div>
  );
}
