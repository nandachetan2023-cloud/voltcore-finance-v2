'use client';
import { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmt12(t: string | null) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function MyShifts() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasEmployee, setHasEmployee] = useState(true);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee-self/shifts').then(r => r.json());
      if (res.success) setAssignments(res.data);
      else if (res.error?.includes('Not linked')) setHasEmployee(false);
      else toast.error(res.error);
    } catch { toast.error('Failed to load shifts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchShifts(); }, []);

  const today = new Date().toISOString().split('T')[0];

  const byDate = new Map<string, any>();
  assignments.forEach(a => { byDate.set(new Date(a.date).toISOString().split('T')[0], a); });

  // Build 5-week grid starting from last Monday
  const startDate = new Date();
  const day = startDate.getDay();
  startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));

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

  if (!hasEmployee) return (
    <div className="p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
      <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
      <p className="text-[11px] text-[#5a6878]">Contact your administrator to link your account.</p>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 max-w-4xl space-y-4">
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
        <button onClick={fetchShifts} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
      </div>

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
              const assignment = byDate.get(dateStr);
              const shift = assignment?.Shift;
              const isToday = dateStr === today;
              const isPast = dateStr < today;
              const isWeekend = di === 0 || di === 6;

              return (
                <div key={di} className={`min-h-[72px] p-2 border-r border-[#252e3a] last:border-0 ${isToday ? 'bg-[#f5a623]/5' : isWeekend ? 'bg-[#0d1117]/50' : ''}`}>
                  <div className={`text-[11px] font-semibold mb-1 ${isToday ? 'text-[#f5a623]' : isPast ? 'text-[#3a4858]' : 'text-[#8899aa]'}`}>
                    {date.getDate()}
                    {isToday && <span className="ml-1 text-[9px] bg-[#f5a623] text-black px-1 rounded font-bold">Today</span>}
                  </div>
                  {shift ? (
                    <div className="rounded px-1.5 py-1 text-[9px] leading-tight" style={{ background: `${shift.color || '#00d4ff'}15`, borderLeft: `2px solid ${shift.color || '#00d4ff'}` }}>
                      <div className="font-bold truncate" style={{ color: shift.color || '#00d4ff' }}>{shift.name}</div>
                      <div className="text-[#5a6878] mt-0.5">{fmt12(shift.startTime)}–{fmt12(shift.endTime)}</div>
                    </div>
                  ) : (
                    !isWeekend && !isPast && <div className="text-[9px] text-[#2e3a48] italic">No shift</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-4 text-[12px] text-[#5a6878]">No shift assignments found for this period.</div>
      )}
    </div>
  );
}
