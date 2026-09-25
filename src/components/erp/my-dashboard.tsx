'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Clock, IndianRupee, Bell, FileText, Plane,
  CheckCircle2, AlertTriangle, RefreshCw, TrendingUp, CalendarClock,
  Briefcase, ArrowRight, Sun, Coffee, ShieldCheck, UserX,
} from 'lucide-react';
import { useERPStore } from '@/store/erp-store';

/* ── Types ── */
interface DashboardData {
  employee: {
    id: number; name: string; employeeCode: string;
    department: string | null; designation: string | null; branch: string | null;
    dateOfJoining: string | null; employmentStatus: string;
  };
  attendance: { present: number; late: number; absent: number; halfDay: number; totalFines: number; totalLateMinutes: number; markedDays: number; attendanceRate: number };
  today: { status: string | null; punchIn: string | null; punchOut: string | null; isWeekOff: boolean };
  leave: { balance: { type: string; name: string; allocated: number; used: number; remaining: number }[]; totalRemaining: number; totalAllocated: number; pending: number };
  pending: { requests: number; tours: number; leaves: number };
  notices: { unread: number };
  payslip: { netPay: number; grossEarning: number; totalDeduction: number; month: number | null; year: number | null } | null;
  shift: { name: string; startTime: string; endTime: string; crossesMidnight: boolean } | null;
  certifications: { expiring: number; expired: number };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LEAVE_COLORS: Record<string, string> = {
  EL: '#00d4ff', SL: '#ffab40', ML: '#a78bfa', CL: '#00e676', 'Comp Off': '#f5a623',
};

function fmtCurrency(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function fmtTime(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notLinked, setNotLinked] = useState(false);
  const setActiveModule = useERPStore(s => s.setActiveModule);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setNotLinked(false);
    try {
      const res = await fetch('/api/employee-self/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setData(null);
        setErrorMsg(json.error || 'Failed to load dashboard');
        // 400 with "not linked" message → dedicated friendly state
        if (res.status === 400 && /not linked/i.test(json.error || '')) {
          setNotLinked(true);
        }
      }
    } catch {
      setData(null);
      setErrorMsg('We couldn\u2019t reach the server. Check your connection and try again.');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-24 bg-[#161c24] rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-[#161c24] rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-[#161c24] rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ── Account not linked to an employee record ──
  if (notLinked) {
    return (
      <div className="p-4">
        <div className="vc-panel max-w-xl mx-auto mt-8">
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#00d4ff]/10 flex items-center justify-center mx-auto mb-4">
              <UserX size={26} className="text-[#00d4ff]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Account not linked yet</h2>
            <p className="text-[12px] text-[#8899aa] mt-2 leading-relaxed">
              Your login isn&apos;t connected to an employee profile, so we can&apos;t show your attendance,
              leave, payslips or shifts yet.
            </p>
            <div className="mt-4 rounded-xl border border-[#252e3a] bg-[#0d1117] p-4 text-left">
              <div className="text-[11px] font-semibold text-[#e2e8f0] mb-2">What to do</div>
              <ul className="space-y-1.5 text-[11px] text-[#8899aa]">
                <li className="flex gap-2"><span className="text-[#f5a623]">1.</span> Ask your HR / admin to link your account to your employee record.</li>
                <li className="flex gap-2"><span className="text-[#f5a623]">2.</span> They can do this in <span className="text-[#e2e8f0]">User Management</span> by selecting your employee profile for this login.</li>
                <li className="flex gap-2"><span className="text-[#f5a623]">3.</span> Once linked, refresh this page — your personal dashboard will appear.</li>
              </ul>
            </div>
            <button onClick={fetchData} className="vc-btn-ghost mt-4 inline-flex items-center gap-1.5">
              <RefreshCw size={13} /> Check again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={28} className="text-[#ffab40]" />
        <p className="text-[13px] text-[#8899aa] text-center max-w-sm">{errorMsg || 'Couldn\u2019t load your dashboard.'}</p>
        <button onClick={fetchData} className="vc-btn-primary flex items-center gap-1.5"><RefreshCw size={13} /> Retry</button>
      </div>
    );
  }

  const { employee, attendance, today, leave, pending, notices, payslip, shift, certifications } = data;
  const initials = employee.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const totalPending = pending.requests + pending.tours + pending.leaves;

  // Today status presentation
  const todayBadge = (() => {
    if (today.isWeekOff) return { label: 'Week Off', color: '#a78bfa', icon: Coffee };
    if (today.status === 'present') return { label: 'Present', color: '#00e676', icon: CheckCircle2 };
    if (today.status === 'late') return { label: 'Late', color: '#ffab40', icon: Clock };
    if (today.status === 'absent') return { label: 'Absent', color: '#ff3d3d', icon: AlertTriangle };
    if (today.status === 'half_day') return { label: 'Half Day', color: '#00d4ff', icon: Clock };
    if (today.punchIn) return { label: 'Checked In', color: '#00e676', icon: CheckCircle2 };
    return { label: 'Not Marked', color: '#5a6878', icon: CalendarClock };
  })();

  return (
    <div className="p-4 space-y-4">
      {/* ── Hero / greeting banner ── */}
      <div className="vc-panel overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[18px] font-black shrink-0 bg-[#f5a623]/15 text-[#f5a623]">
              {initials}
            </div>
            <div>
              <div className="text-[12px] text-[#5a6878]">{greeting()},</div>
              <h2 className="text-[20px] font-bold text-[#e2e8f0] leading-tight">{employee.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-[#8899aa]">
                <span className="font-mono">{employee.employeeCode}</span>
                {employee.designation && <><span className="text-[#2e3a48]">•</span><span>{employee.designation}</span></>}
                {employee.department && <><span className="text-[#2e3a48]">•</span><span>{employee.department}</span></>}
                {employee.branch && <><span className="text-[#2e3a48]">•</span><span>{employee.branch}</span></>}
              </div>
            </div>
          </div>
          {/* Today + shift snapshot */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <todayBadge.icon size={14} style={{ color: todayBadge.color }} />
                <span className="text-[13px] font-bold" style={{ color: todayBadge.color }}>{todayBadge.label}</span>
              </div>
              {shift && !today.isWeekOff && (
                <div className="text-[10px] text-[#5a6878] mt-0.5">
                  {shift.name} · {shift.startTime}–{shift.endTime}
                </div>
              )}
              {today.punchIn && (
                <div className="text-[10px] text-[#5a6878] mt-0.5 font-mono">
                  In {fmtTime(today.punchIn)}{today.punchOut ? ` · Out ${fmtTime(today.punchOut)}` : ''}
                </div>
              )}
            </div>
            <button onClick={fetchData} className="p-2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors"><RefreshCw size={15} /></button>
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Attendance" sub={`${attendance.present + attendance.late + attendance.halfDay}/${attendance.markedDays} days this month`}
          value={`${attendance.attendanceRate}%`} icon={TrendingUp} color="#00e676"
          onClick={() => setActiveModule('my-attendance')}
        >
          <Ring pct={attendance.attendanceRate} color="#00e676" />
        </KpiCard>

        <KpiCard
          label="Leave Balance" sub={`${leave.totalRemaining} of ${leave.totalAllocated} days left`}
          value={String(leave.totalRemaining)} icon={CalendarDays} color="#00d4ff"
          onClick={() => setActiveModule('my-leave')}
        />

        <KpiCard
          label="Latest Net Pay"
          sub={payslip ? `${MONTHS[(payslip.month || 1) - 1]} ${payslip.year}` : 'No payslip yet'}
          value={payslip ? fmtCurrency(payslip.netPay) : '—'} icon={IndianRupee} color="#f5a623"
          onClick={() => setActiveModule('my-payslips')}
        />

        <KpiCard
          label="Pending Actions" sub={`${pending.leaves} leave · ${pending.requests} req · ${pending.tours} tour`}
          value={String(totalPending)} icon={Clock} color={totalPending > 0 ? '#ffab40' : '#5a6878'}
          onClick={() => setActiveModule('my-requests')}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Leave balance breakdown */}
        <div className="vc-panel lg:col-span-1">
          <div className="px-4 py-3 border-b border-[#252e3a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-[#00d4ff]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Leave Balance</span>
            </div>
            <button onClick={() => setActiveModule('my-leave')} className="text-[10px] text-[#00d4ff] hover:underline flex items-center gap-0.5">
              Apply <ArrowRight size={10} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {leave.balance.length === 0 && <p className="text-[11px] text-[#5a6878] text-center py-4">No leave policies configured.</p>}
            {leave.balance.map(l => {
              const color = LEAVE_COLORS[l.type] || '#8899aa';
              const pct = l.allocated > 0 ? Math.min(100, Math.round((l.used / l.allocated) * 100)) : 0;
              return (
                <div key={l.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold" style={{ color }}>{l.name || l.type}</span>
                    <span className="text-[10px] text-[#8899aa]"><span className="font-bold text-[#e2e8f0]">{l.remaining}</span> / {l.allocated} left</span>
                  </div>
                  <div className="h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* This month attendance */}
        <div className="vc-panel lg:col-span-1">
          <div className="px-4 py-3 border-b border-[#252e3a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#00e676]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">This Month</span>
            </div>
            <button onClick={() => setActiveModule('my-attendance')} className="text-[10px] text-[#00e676] hover:underline flex items-center gap-0.5">
              Details <ArrowRight size={10} />
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2.5">
            <MiniStat label="Present" value={attendance.present} color="#00e676" />
            <MiniStat label="Late" value={attendance.late} color="#ffab40" />
            <MiniStat label="Absent" value={attendance.absent} color="#ff3d3d" />
            <MiniStat label="Half Day" value={attendance.halfDay} color="#00d4ff" />
          </div>
          {(attendance.totalLateMinutes > 0 || attendance.totalFines > 0) && (
            <div className="px-4 pb-4 -mt-1 flex items-center justify-between text-[10px]">
              <span className="text-[#5a6878]">Late: <span className="text-[#ffab40] font-semibold">{attendance.totalLateMinutes} min</span></span>
              <span className="text-[#5a6878]">Fines: <span className="text-[#ff3d3d] font-semibold">{fmtCurrency(attendance.totalFines)}</span></span>
            </div>
          )}
        </div>

        {/* Quick actions + alerts */}
        <div className="vc-panel lg:col-span-1">
          <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-2">
            <Briefcase size={14} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Quick Actions</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            <QuickAction icon={CalendarDays} label="Apply Leave" color="#00d4ff" onClick={() => setActiveModule('my-leave')} />
            <QuickAction icon={Plane} label="Request Tour" color="#a78bfa" onClick={() => setActiveModule('my-tours')} />
            <QuickAction icon={FileText} label="New Request" color="#f5a623" onClick={() => setActiveModule('my-requests')} />
            <QuickAction icon={IndianRupee} label="Payslips" color="#00e676" onClick={() => setActiveModule('my-payslips')} />
            <QuickAction
              icon={Bell} label="Notices" color="#ff3d3d" badge={notices.unread}
              onClick={() => setActiveModule('my-notices')}
            />
            <QuickAction icon={Sun} label="My Shifts" color="#ffab40" onClick={() => setActiveModule('my-shifts')} />
          </div>
        </div>
      </div>

      {/* ── Alerts strip ── */}
      {(notices.unread > 0 || certifications.expiring > 0 || certifications.expired > 0 || pending.leaves > 0) && (
        <div className="flex flex-wrap gap-2">
          {notices.unread > 0 && (
            <AlertChip color="#ff3d3d" icon={Bell} onClick={() => setActiveModule('my-notices')}>
              {notices.unread} unread notice{notices.unread !== 1 ? 's' : ''}
            </AlertChip>
          )}
          {certifications.expired > 0 && (
            <AlertChip color="#ff3d3d" icon={ShieldCheck} onClick={() => setActiveModule('my-documents')}>
              {certifications.expired} certificate{certifications.expired !== 1 ? 's' : ''} expired
            </AlertChip>
          )}
          {certifications.expiring > 0 && (
            <AlertChip color="#ffab40" icon={ShieldCheck} onClick={() => setActiveModule('my-documents')}>
              {certifications.expiring} certificate{certifications.expiring !== 1 ? 's' : ''} expiring soon
            </AlertChip>
          )}
          {pending.leaves > 0 && (
            <AlertChip color="#00d4ff" icon={CalendarClock} onClick={() => setActiveModule('my-leave')}>
              {pending.leaves} leave request{pending.leaves !== 1 ? 's' : ''} awaiting approval
            </AlertChip>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function KpiCard({ label, sub, value, icon: Icon, color, onClick, children }: {
  label: string; sub: string; value: string; icon: any; color: string; onClick?: () => void; children?: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="vc-stat-card text-left hover:border-[#f5a623]/30 transition-colors group">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">{label}</div>
          <div className="text-[26px] font-black leading-none text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
          <div className="text-[10px] text-[#5a6878] mt-1.5 truncate">{sub}</div>
        </div>
        {children || (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
            <Icon size={17} style={{ color }} />
          </div>
        )}
      </div>
    </button>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 16, c = 2 * Math.PI * r;
  const off = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#0d1117" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-[#0d1117] border border-[#252e3a] p-2.5 text-center">
      <div className="text-[20px] font-black leading-none" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
      <div className="text-[9px] text-[#5a6878] mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick, badge }: {
  icon: any; label: string; color: string; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border border-[#252e3a] bg-[#0d1117] hover:border-[#f5a623]/30 hover:bg-[#1a2028] transition-colors">
      {!!badge && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff3d3d] text-white text-[9px] font-bold flex items-center justify-center">{badge}</span>
      )}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <span className="text-[10px] text-[#8899aa] font-medium">{label}</span>
    </button>
  );
}

function AlertChip({ color, icon: Icon, children, onClick }: { color: string; icon: any; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-[#1a2028]"
      style={{ borderColor: `${color}40`, background: `${color}0d` }}>
      <Icon size={13} style={{ color }} />
      <span className="text-[11px] font-medium" style={{ color }}>{children}</span>
    </button>
  );
}
