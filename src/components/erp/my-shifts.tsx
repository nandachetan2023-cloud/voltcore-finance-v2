'use client';
import { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, RefreshCw, Clock, Moon } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Shift type → accent colour (no DB colour field, derive from shift properties)
function shiftColor(shift: any): string {
  if (shift.crossesMidnight) return '#a78bfa'; // night → purple
  const [h] = (shift.startTime || '09:00').split(':').map(Number);
  if (h < 6)  return '#a78bfa'; // very early → purple
  if (h < 12) return '#00d4ff'; // morning → cyan
  if (h < 17) return '#00e676'; // afternoon → green
  return '#f5a623';             // evening → amber
}

function fmt12(t: string | null) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Given a list of assignments (effectiveFrom / effectiveTo), find which one
// is active on a specific date (YYYY-MM-DD string).
function getShiftForDate(assignments: any[], dateStr: string): any | null {
  const d = new Date(dateStr);
  d.setHours(12, 0, 0, 0); // noon to avoid TZ edge cases

  // Find the assignment whose range covers this date.
  // If multiple overlap (shouldn't happen after API cleanup), prefer the latest effectiveFrom.
  let best: any = null;
  for (const a of assignments) {
    const from = new Date(a.effectiveFrom);
    from.setHours(0, 0, 0, 0);
    const to = a.effectiveTo ? new Date(a.effectiveTo) : null;
    if (to) to.setHours(23, 59, 59, 999);

    if (d >= from && (!to || d <= to)) {
      if (!best || from > new Date(best.effectiveFrom)) best = a;
    }
  }
  return best;
}

export default function MyShifts() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasEmployee, setHasEmployee] = useState(true);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee-self/shifts').then(r => r.json());
      if (res.success) {
        setAssignments(res.data || []);
      } else if (res.error?.includes('Not linked')) {
        setHasEmployee(false);
      } else {
        toast.error(res.error || 'Failed to load shifts');
      }
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShifts(); }, []);

  const today = new Date().toISOString().split('T')[0];

  // Build 5-week grid starting from the Monday of the current week
  const startDate = new Date();
  const dow = startDate.getDay(); // 0=Sun
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));
  startDate.setHours(0, 0, 0, 0);

  const weeks: Date[][] = [];
  for (let w = 0; w < 5; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      week.push(date);
    }
    weeks.push(week);
  }

  // Derive the current active shift (for the summary card at the top)
  const currentAssignment = getShiftForDate(assignments, today);
  const currentShift = currentAssignment?.Shift ?? null;

  if (!hasEmployee) return (
    <div className="p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
      <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
      <p className="text-[11px] text-[#5a6878]">Contact your administrator to link your account.</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center">
            <RotateCcw size={18} className="text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">My Shifts</h2>
            <p className="text-[11px] text-[#5a6878]">Your shift schedule — 5 week view</p>
          </div>
        </div>
        <button onClick={fetchShifts} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Current shift summary card */}
      {currentShift ? (
        <div className="rounded-xl border p-4 flex items-center gap-4"
          style={{ borderColor: `${shiftColor(currentShift)}30`, background: `${shiftColor(currentShift)}08` }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${shiftColor(currentShift)}20` }}>
            {currentShift.crossesMidnight
              ? <Moon size={18} style={{ color: shiftColor(currentShift) }} />
              : <Clock size={18} style={{ color: shiftColor(currentShift) }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#5a6878] uppercase tracking-wider font-semibold mb-0.5">Current Shift</div>
            <div className="text-[15px] font-bold text-[#e2e8f0]">{currentShift.name}</div>
            <div className="text-[12px] font-mono mt-0.5" style={{ color: shiftColor(currentShift) }}>
              {fmt12(currentShift.startTime)} – {fmt12(currentShift.endTime)}
              {currentShift.crossesMidnight && <span className="ml-1.5 text-[10px] opacity-70">crosses midnight</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-[#5a6878] mb-1">Week Off</div>
            <div className="flex gap-1 justify-end">
              {DAYS.map((d, i) => (
                <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  currentShift.weekOffDays?.includes(i)
                    ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]'
                    : 'bg-[#1a2332] text-[#3a4858]'
                }`}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#252e3a] bg-[#0f1318] p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-[#f5a623] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[#e2e8f0]">No shift assigned</div>
            <div className="text-[11px] text-[#5a6878]">Contact your administrator to assign a shift.</div>
          </div>
        </div>
      )}

      {/* 5-week calendar grid */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#252e3a]">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#5a6878] bg-[#141920]">{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[#252e3a] last:border-0">
            {week.map((date, di) => {
              const dateStr = date.toISOString().split('T')[0];
              const assignment = getShiftForDate(assignments, dateStr);
              const shift = assignment?.Shift ?? null;
              const isToday = dateStr === today;
              const isPast = dateStr < today;
              const isWeekend = di === 0 || di === 6;
              const isWeekOff = shift?.weekOffDays?.includes(di);
              const color = shift ? shiftColor(shift) : null;

              return (
                <div
                  key={di}
                  className={`min-h-[72px] p-2 border-r border-[#252e3a] last:border-0 transition-colors ${
                    isToday
                      ? 'bg-[#f5a623]/5'
                      : isWeekend || isWeekOff
                      ? 'bg-[#0d1117]/50'
                      : ''
                  }`}
                >
                  {/* Date number */}
                  <div className={`text-[11px] font-semibold mb-1 flex items-center gap-1 ${
                    isToday ? 'text-[#f5a623]' : isPast ? 'text-[#3a4858]' : 'text-[#8899aa]'
                  }`}>
                    {date.getDate()}
                    {isToday && (
                      <span className="text-[8px] bg-[#f5a623] text-black px-1 rounded font-bold leading-tight">TODAY</span>
                    )}
                  </div>

                  {/* Shift cell */}
                  {shift && !isWeekOff ? (
                    <div
                      className="rounded px-1.5 py-1 text-[9px] leading-tight"
                      style={{ background: `${color}15`, borderLeft: `2px solid ${color}` }}
                    >
                      <div className="font-bold truncate" style={{ color: color! }}>{shift.name}</div>
                      <div className="text-[#5a6878] mt-0.5 font-mono">
                        {fmt12(shift.startTime)}–{fmt12(shift.endTime)}
                      </div>
                    </div>
                  ) : isWeekOff ? (
                    <div className="text-[9px] text-[#ff3d3d]/50 font-semibold">Week Off</div>
                  ) : (
                    !isPast && !isWeekend && (
                      <div className="text-[9px] text-[#2e3a48] italic">No shift</div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-4 text-[12px] text-[#5a6878]">
          No shift assignments found. Contact your administrator.
        </div>
      )}
    </div>
  );
}
