'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Plus, Trash2,
  CalendarRange, FileCheck, RefreshCw, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Reused helpers from leave.tsx ─────────────────── */
function typeBadge(t: string) {
  const m: Record<string, string> = {
    EL: 'bg-[#00d4ff]/15 text-[#00d4ff]', SL: 'bg-[#ffab40]/15 text-[#ffab40]',
    ML: 'bg-[#a78bfa]/15 text-[#a78bfa]', CL: 'bg-[#00e676]/15 text-[#00e676]',
    'Comp Off': 'bg-[#f5a623]/15 text-[#f5a623]',
  };
  return m[t] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function statusBadge(s: string) {
  const m: Record<string, string> = {
    Pending: 'bg-[#ffab40]/15 text-[#ffab40]', Approved: 'bg-[#00e676]/15 text-[#00e676]',
    Rejected: 'bg-[#ff3d3d]/15 text-[#ff3d3d]', Cancelled: 'bg-[#5a6878]/15 text-[#5a6878]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function BalanceCard({ label, allocated, used, color }: { label: string; allocated: number; used: number; color: string }) {
  const balance = Math.max(0, allocated - used);
  const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
  return (
    <div className="bg-[#0f1318] border border-[#1e2530] rounded-lg p-3">
      <div className="text-[9px] text-[#5a6878] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-bold" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>{balance}</span>
        <span className="text-[10px] text-[#5a6878] mb-0.5">/ {allocated}</span>
      </div>
      <div className="h-[4px] bg-[#141920] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#5a6878]">{used} used</span>
        <span className="text-[9px] text-[#5a6878]">{pct}%</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════ */
export default function MyLeave() {
  const [records, setRecords] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

  const emptyForm = { leaveType: '', fromDate: '', toDate: '', days: 0, reason: '' };
  const [form, setForm] = useState(emptyForm);

  // Get employee ID from localStorage
  useEffect(() => {
    const match = document.cookie.match(/(^| )erp_employee_id=([^;]+)/);
    if (match) { setEmployeeId(decodeURIComponent(match[2])); return; }
    try {
      const u = localStorage.getItem('erp_auth_user');
      if (u) { const p = JSON.parse(u); if (p.employeeId) setEmployeeId(String(p.employeeId)); }
    } catch {}
  }, []);

  const fetchData = useCallback(async (empId: string) => {
    setLoading(true);
    try {
      const [leaveRes, policiesRes, empRes] = await Promise.all([
        fetch(`/api/leave?employeeId=${empId}`),
        fetch('/api/leave-policies'),
        fetch(`/api/employees/${empId}`),
      ]);
      const [leaveData, policiesData, empData] = await Promise.all([
        leaveRes.json(), policiesRes.json(), empRes.json(),
      ]);

      if (leaveData.success) {
        setRecords(leaveData.data.map((r: any) => ({
          ...r,
          status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
          type: r.leaveType,
        })));
      }
      if (policiesData.success) setPolicies(policiesData.data || []);
      if (empData.success) setEmployeeData(empData.data);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (employeeId) fetchData(employeeId);
    else setLoading(false);
  }, [employeeId, fetchData]);

  // Auto-calculate days when dates change
  const updateDates = async (field: 'fromDate' | 'toDate', value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (updated.fromDate && updated.toDate && employeeId) {
      try {
        const res = await fetch(`/api/leave/calculate-days?employeeId=${employeeId}&startDate=${updated.fromDate}&endDate=${updated.toDate}`);
        const data = await res.json();
        if (data.success) setForm(f => ({ ...f, [field]: value, days: data.data.workingDays }));
      } catch {
        const diff = Math.max(1, Math.round((new Date(updated.toDate).getTime() - new Date(updated.fromDate).getTime()) / 86400000) + 1);
        setForm(f => ({ ...f, [field]: value, days: diff }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!employeeId || !form.leaveType || !form.fromDate || !form.toDate || form.days < 1) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: parseInt(employeeId),
          leaveType: form.leaveType,
          fromDate: form.fromDate,
          toDate: form.toDate,
          days: form.days,
          reason: form.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Leave application submitted successfully');
        setCreateOpen(false);
        setForm(emptyForm);
        fetchData(employeeId);
      } else {
        toast.error(data.error || 'Failed to submit leave');
      }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch('/api/leave', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Leave request cancelled');
      setDeleteTarget(null);
      if (employeeId) fetchData(employeeId);
    } else toast.error(data.error);
  };

  // Leave balances
  const balances = useMemo(() => {
    const usedMap: Record<string, number> = {};
    records.filter(r => r.status === 'Approved').forEach(r => {
      usedMap[r.type] = (usedMap[r.type] || 0) + Number(r.days);
    });
    const colorMap: Record<string, string> = {
      EL: '#00d4ff', SL: '#ffab40', ML: '#a78bfa', CL: '#00e676', 'Comp Off': '#f5a623',
    };
    return policies.filter(p => p.isActive).map(p => ({
      type: p.code || p.leaveType,
      name: p.name,
      allocated: Number(p.annualQuota),
      used: usedMap[p.code] || usedMap[p.leaveType] || 0,
      color: colorMap[p.code] || colorMap[p.leaveType] || '#5a6878',
    }));
  }, [records, policies]);

  const filtered = activeTab === 'all' ? records : records.filter(r => r.status === activeTab);

  if (!employeeId) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
        <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
        <p className="text-[11px] text-[#5a6878]">Your account is not linked to an employee record. Contact your administrator.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-[#1e2630]" />)}
    </div>
  );

  return (
    <div className="space-y-4 p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <CalendarDays size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Apply for Leave</h2>
            <p className="text-[11px] text-[#5a6878]">Submit and track your leave applications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => employeeId && fetchData(employeeId)} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
            <Plus size={13} /> Apply Leave
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: records.filter(r => r.status === 'Pending').length, color: '#ffab40', icon: Clock },
          { label: 'Approved', value: records.filter(r => r.status === 'Approved').length, color: '#00e676', icon: CheckCircle2 },
          { label: 'Rejected', value: records.filter(r => r.status === 'Rejected').length, color: '#ff3d3d', icon: XCircle },
        ].map(s => (
          <div key={s.label} className="vc-stat-card">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.color }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{s.label}</div>
                <div className="text-[22px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.value}</div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Leave balances */}
      {balances.length > 0 && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <CalendarRange size={14} className="text-[#a78bfa]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">My Leave Balance</span>
          </div>
          <div className="vc-panel-body">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {balances.map(b => <BalanceCard key={b.type} label={b.type} allocated={b.allocated} used={b.used} color={b.color} />)}
            </div>
          </div>
        </div>
      )}

      {/* Tabs + table */}
      <div className="flex items-center gap-1 bg-[#161c24] border border-[#252e3a] rounded-lg p-1">
        {(['all', 'Pending', 'Approved', 'Rejected'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-3 py-[6px] rounded-md text-[11px] font-semibold transition-all ${activeTab === t ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
            {t === 'all' ? 'All' : t} ({t === 'all' ? records.length : records.filter(r => r.status === t).length})
          </button>
        ))}
      </div>

      <div className="vc-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#0f1318] border-b border-[#252e3a]">
                {['Type', 'From', 'To', 'Days', 'Reason', 'Applied On', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[9px] font-bold uppercase tracking-wider text-[#5a6878]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2028]">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-[#5a6878] text-[12px]">No leave requests found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3"><span className={`vc-badge ${typeBadge(r.type)}`}>{r.type}</span></td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.fromDate)}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.toDate)}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-semibold">{r.days}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate" title={r.reason}>{r.reason || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.appliedDate || r.createdAt)}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3">
                    {r.status === 'Pending' && (
                      <button onClick={() => setDeleteTarget(r)} className="p-1 text-[#5a6878] hover:text-[#ff3d3d] transition-colors" title="Cancel">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> Apply for Leave
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Leave Type *</label>
              <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))} className="vc-input appearance-none">
                <option value="">Select leave type...</option>
                {policies.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.code || p.leaveType}>{p.name} ({p.code || p.leaveType})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">From Date *</label>
                <input type="date" value={form.fromDate} onChange={e => updateDates('fromDate', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">To Date *</label>
                <input type="date" value={form.toDate} onChange={e => updateDates('toDate', e.target.value)} className="vc-input" />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Working Days</label>
              <input type="number" value={form.days} readOnly className="vc-input opacity-60" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3} className="vc-input resize-none" placeholder="Reason for leave..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] border border-[#2e3a48]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Cancel Leave Request
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-[#8899aa]">Cancel your pending leave request for <span className="text-[#e2e8f0] font-semibold">{fmtDate(deleteTarget?.fromDate)} – {fmtDate(deleteTarget?.toDate)}</span>?</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] border border-[#2e3a48]" onClick={() => setDeleteTarget(null)}>Keep it</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold" onClick={handleDelete}>Cancel Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
