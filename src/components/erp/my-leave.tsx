'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Plus, Trash2,
  CalendarRange, FileCheck, RefreshCw, AlertTriangle, Paperclip, MessageSquare
} from 'lucide-react';
import { rejectionPositionLabel } from '@/lib/rejection-position-format';
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
  const [blockError, setBlockError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

  const emptyForm = { leaveType: '', fromDate: '', toDate: '', days: 0, reason: '' };
  const [form, setForm] = useState(emptyForm);
  const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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
        fetch(`/api/leave?employeeId=${empId}`, { cache: 'no-store' }),
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
      if (empData.success) {
        // employees list endpoint returns array; find by id
        const emp = Array.isArray(empData.data)
          ? empData.data.find((e: any) => String(e.id) === String(empId))
          : empData.data;
        if (emp) setEmployeeData(emp);
      }
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
    if (balanceWarning) {
      toast.error(balanceWarning);
      return;
    }
    if (policyViolation) {
      toast.error(policyViolation.replace('⚠ ', ''));
      return;
    }
    if (selectedPolicy?.requiresDocument && !supportingDoc) {
      toast.error('A supporting document is required for this leave type (e.g. medical certificate)');
      return;
    }
    setSubmitting(true);
    try {
      let docPayload: { name: string; type: string; size: number; data: string } | null = null;
      if (supportingDoc) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(supportingDoc);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        docPayload = { name: supportingDoc.name, type: supportingDoc.type, size: supportingDoc.size, data: base64 };
      }
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
          supportingDocument: docPayload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Leave application submitted successfully');
        setCreateOpen(false);
        setForm(emptyForm);
        setSupportingDoc(null);
        if (docInputRef.current) docInputRef.current.value = '';
        fetchData(employeeId);
      } else if (res.status === 422) {
        // No approval chain configured — show persistent dialog
        setCreateOpen(false);
        setBlockError(data.error || 'No approval chain is configured for your role.');
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

  // Compute balance for the currently selected leave type — must be after balances
  const selectedBalance = useMemo(() => {
    if (!form.leaveType || balances.length === 0) return null;
    return balances.find(b => b.type === form.leaveType) || null;
  }, [form.leaveType, balances]);

  // Selected policy object (for restriction hints)
  const selectedPolicy = useMemo(() => {
    if (!form.leaveType) return null;
    return policies.find(p => (p.code || p.leaveType) === form.leaveType) || null;
  }, [form.leaveType, policies]);

  // Policy restriction warnings shown inline in the form
  const policyRestrictions = useMemo(() => {
    if (!selectedPolicy) return [];
    const hints: { type: 'info' | 'warn'; text: string }[] = [];

    if (selectedPolicy.minDaysNotice > 0) {
      hints.push({ type: 'info', text: `Requires ${selectedPolicy.minDaysNotice} day${selectedPolicy.minDaysNotice !== 1 ? 's' : ''} advance notice before leave start date.` });
    }
    if (selectedPolicy.maxConsecutiveDays > 0) {
      hints.push({ type: 'info', text: `Maximum ${selectedPolicy.maxConsecutiveDays} consecutive day${selectedPolicy.maxConsecutiveDays !== 1 ? 's' : ''} per application.` });
    }
    if (selectedPolicy.applicableAfterMonths > 0) {
      hints.push({ type: 'info', text: `Eligible only after ${selectedPolicy.applicableAfterMonths} month${selectedPolicy.applicableAfterMonths !== 1 ? 's' : ''} of service.` });
    }
    if (selectedPolicy.applicableGender && selectedPolicy.applicableGender !== 'all') {
      hints.push({ type: 'info', text: `Applicable to ${selectedPolicy.applicableGender} employees only.` });
    }
    if (selectedPolicy.requiresDocument) {
      hints.push({ type: 'info', text: 'Supporting document (e.g. medical certificate) required.' });
    }

    // Active violations
    if (form.fromDate && selectedPolicy.minDaysNotice > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const leaveFrom = new Date(form.fromDate); leaveFrom.setHours(0, 0, 0, 0);
      const daysUntil = Math.floor((leaveFrom.getTime() - today.getTime()) / 86400000);
      if (daysUntil < selectedPolicy.minDaysNotice) {
        hints.push({ type: 'warn', text: `⚠ Leave starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — minimum ${selectedPolicy.minDaysNotice} days notice required.` });
      }
    }
    if (form.days > 0 && selectedPolicy.maxConsecutiveDays > 0 && form.days > selectedPolicy.maxConsecutiveDays) {
      hints.push({ type: 'warn', text: `⚠ You selected ${form.days} days — maximum allowed is ${selectedPolicy.maxConsecutiveDays} consecutive days.` });
    }

    return hints;
  }, [selectedPolicy, form.fromDate, form.days]);

  const balanceWarning = useMemo(() => {
    if (!selectedBalance || form.days <= 0) return null;
    const remaining = selectedBalance.allocated - selectedBalance.used;
    if (form.days > remaining) {
      return `You only have ${remaining} day${remaining !== 1 ? 's' : ''} remaining for ${selectedBalance.name || form.leaveType}. You selected ${form.days} day${form.days !== 1 ? 's' : ''}.`;
    }
    return null;
  }, [selectedBalance, form.days, form.leaveType]);

  // Any active policy violation that should block submission
  const policyViolation = useMemo(() => {
    return policyRestrictions.find(r => r.type === 'warn')?.text || null;
  }, [policyRestrictions]);

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
                  <td className="py-2.5 px-3 max-w-[160px]">
                    <div className="text-[#8899aa] truncate" title={r.reason}>{r.reason || '—'}</div>
                    {r.status === 'Rejected' && r.rejectionReason && (
                      <div className="flex items-start gap-1 text-[9px] text-[#ff3d3d] mt-1" title={r.rejectionReason}>
                        <MessageSquare size={9} className="mt-[1px] shrink-0" />
                        <span className="line-clamp-2">{r.rejectionReason}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.appliedDate || r.createdAt)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span>
                    {r.status === 'Pending' && r.approvalStage && (
                      <div className="text-[9px] text-[#00d4ff] font-semibold mt-1">
                        Awaiting {r.approvalStage.approverRole}
                        {r.approvalStage.totalSteps > 1 ? ` · Step ${r.approvalStage.currentStep}/${r.approvalStage.totalSteps}` : ''}
                      </div>
                    )}
                    {/* Where it was rejected. Absent on rows that predate this
                        feature, which fall back to the bare status badge. */}
                    {r.status === 'Rejected' && rejectionPositionLabel(r.rejectedAtStep, r.rejectedByRoleName) && (
                      <div className="text-[9px] text-[#ff3d3d] font-semibold mt-1">
                        Rejected at {rejectionPositionLabel(r.rejectedAtStep, r.rejectedByRoleName)}
                      </div>
                    )}
                  </td>
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
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) { setSupportingDoc(null); if (docInputRef.current) docInputRef.current.value = ''; } }}>
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
            {/* Policy restriction hints */}
            {policyRestrictions.length > 0 && (
              <div className="rounded-lg border border-[#2e3a48] bg-[#0f1318] divide-y divide-[#1e2530]">
                {policyRestrictions.map((hint, i) => (
                  <div key={i} className={`flex items-start gap-2 px-3 py-2 ${hint.type === 'warn' ? 'bg-[#ff3d3d]/8' : ''}`}>
                    <span className={`text-[11px] leading-snug ${hint.type === 'warn' ? 'text-[#ff3d3d]' : 'text-[#8899aa]'}`}>{hint.text}</span>
                  </div>
                ))}
              </div>
            )}
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
            {/* Balance warning */}
            {balanceWarning && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg">
                <AlertTriangle size={14} className="text-[#ff3d3d] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#ff3d3d] leading-snug">{balanceWarning}</p>
              </div>
            )}
            {/* Remaining balance hint */}
            {selectedBalance && !balanceWarning && form.days > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg">
                <CheckCircle2 size={13} className="text-[#00e676] shrink-0" />
                <p className="text-[11px] text-[#00e676]">
                  {Math.max(0, selectedBalance.allocated - selectedBalance.used - form.days)} day{Math.max(0, selectedBalance.allocated - selectedBalance.used - form.days) !== 1 ? 's' : ''} will remain after this request.
                </p>
              </div>
            )}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3} className="vc-input resize-none" placeholder="Reason for leave..." />
            </div>
            {/* Supporting document upload — shown & required when policy mandates it */}
            {selectedPolicy?.requiresDocument && (
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#ff3d3d] font-bold mb-1 flex items-center gap-1">
                  <Paperclip size={10} /> Supporting Document *
                </label>
                <div
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    supportingDoc
                      ? 'border-[#00e676]/40 bg-[#00e676]/5'
                      : 'border-[#ff3d3d]/40 bg-[#ff3d3d]/5 hover:border-[#ff3d3d]/70'
                  }`}
                  onClick={() => docInputRef.current?.click()}
                >
                  <Paperclip size={13} className={supportingDoc ? 'text-[#00e676]' : 'text-[#ff3d3d]'} />
                  <span className={`text-[11px] flex-1 truncate ${supportingDoc ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                    {supportingDoc ? supportingDoc.name : 'Click to attach document (PDF, JPG, PNG)'}
                  </span>
                  {supportingDoc && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSupportingDoc(null); if (docInputRef.current) docInputRef.current.value = ''; }}
                      className="text-[#5a6878] hover:text-[#ff3d3d] text-[10px]"
                    >✕</button>
                  )}
                </div>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => setSupportingDoc(e.target.files?.[0] || null)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] border border-[#2e3a48]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            {(() => {
              const docMissing = selectedPolicy?.requiresDocument && !supportingDoc;
              const blocked = !!balanceWarning || !!policyViolation || docMissing;
              return (
                <Button
                  className={`font-semibold ${blocked ? 'bg-[#ff3d3d] hover:bg-[#cc2020] text-white' : 'bg-[#f5a623] text-black hover:bg-[#e8891a]'}`}
                  disabled={submitting || blocked}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Submitting...' : balanceWarning ? 'Exceeds Balance' : policyViolation ? 'Policy Violation' : docMissing ? 'Document Required' : 'Submit Application'}
                </Button>
              );
            })()}
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

      {/* Approval chain not configured — block error dialog */}
      <Dialog open={!!blockError} onOpenChange={() => setBlockError(null)}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <AlertTriangle size={16} /> Cannot Submit Leave
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px] text-[#8899aa] leading-relaxed">{blockError}</p>
            <div className="px-3 py-2.5 bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-lg text-[11px] text-[#f5a623]">
              Please contact your system administrator to configure an approval workflow for your role.
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" onClick={() => setBlockError(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
