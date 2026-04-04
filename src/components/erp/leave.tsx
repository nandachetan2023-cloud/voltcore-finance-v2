'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, CheckCircle2, XCircle, UserCheck, Plus, Pencil,
  Trash2, Loader2, AlertTriangle, FileCheck, CalendarRange,
  RotateCcw, RefreshCw, ShieldAlert, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Types ────────────────────────────────────────── */
interface Employee {
  id: string;
  empId: string;
  name: string;
  role: string;
  site: string;
}

interface LeaveRequest {
  id: string;
  empId: string;
  site: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
}

interface LeaveFormData {
  empId: string;
  site: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
}

const EMPTY_FORM: LeaveFormData = {
  empId: '', site: '', type: 'EL', fromDate: '', toDate: '', days: 0, reason: '',
};

const LEAVE_TYPES = ['EL', 'SL', 'CL', 'ML', 'Comp Off'] as const;
type TabFilter = 'all' | 'Pending' | 'Approved' | 'Rejected';

const TABS: { id: TabFilter; label: string }[] = [
  { id: 'all', label: 'All Requests' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' },
];

/* ── Helpers ──────────────────────────────────────── */
function typeBadge(t: string) {
  const m: Record<string, string> = {
    EL: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    SL: 'bg-[#ffab40]/15 text-[#ffab40]',
    ML: 'bg-[#a78bfa]/15 text-[#a78bfa]',
    CL: 'bg-[#00e676]/15 text-[#00e676]',
    'Comp Off': 'bg-[#f5a623]/15 text-[#f5a623]',
  };
  return m[t] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function statusBadge(s: string) {
  const m: Record<string, string> = {
    Pending: 'bg-[#ffab40]/15 text-[#ffab40]',
    Approved: 'bg-[#00e676]/15 text-[#00e676]',
    Rejected: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Cancelled: 'bg-[#5a6878]/15 text-[#5a6878]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function fmtDate(d: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return d; }
}

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const d1 = new Date(from), d2 = new Date(to);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

/* ── Loading Skeleton ─────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-7 w-12 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-[#1e2630]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[22px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ── Balance Card ─────────────────────────────────── */
function BalanceCard({ label, allocated, used, color }: {
  label: string; allocated: number; used: number; color: string;
}) {
  const balance = allocated - used;
  const pct = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
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

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function LeaveModule() {
  const [records, setRecords] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState<LeaveFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [leaveRes, empRes] = await Promise.all([
        fetch('/api/leave'),
        fetch('/api/employees'),
      ]);
      const leaveJson = await leaveRes.json();
      const empJson = await empRes.json();
      if (leaveJson.success) setRecords(leaveJson.data);
      if (empJson.success) setEmployees(empJson.data);
    } catch {
      toast.error('Failed to fetch leave data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const pendingCount = records.filter(r => r.status === 'Pending').length;
  const approvedMTD = records.filter(r => r.status === 'Approved').length;
  const rejectedCount = records.filter(r => r.status === 'Rejected').length;
  const currentlyOnLeave = records.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.status === 'Approved' && r.fromDate <= today && r.toDate >= today;
  }).length;

  /* ── Leave balances (computed from approved data) ── */
  const balances = useMemo(() => {
    const allocMap: Record<string, number> = { EL: 24, SL: 12, CL: 6, ML: 180, 'Comp Off': 2 };
    const usedMap: Record<string, number> = { EL: 0, SL: 0, CL: 0, ML: 0, 'Comp Off': 0 };
    records.filter(r => r.status === 'Approved').forEach(r => {
      if (usedMap[r.type] !== undefined) usedMap[r.type] += r.days;
    });
    return Object.entries(allocMap).map(([type, alloc]) => ({
      type, allocated: alloc, used: usedMap[type],
      color: typeBadge(type).split(' ')[1],
    }));
  }, [records]);

  /* ── Filtered ── */
  const filtered = activeTab === 'all' ? records : records.filter(r => r.status === activeTab);

  /* ── Form helpers ── */
  const updateForm = (field: keyof LeaveFormData, value: string | number) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'fromDate' || field === 'toDate') {
        next.days = calcDays(next.fromDate, next.toDate);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!form.empId || !form.fromDate || !form.toDate || form.days < 1) {
      toast.error('Please fill in employee, dates, and valid date range');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Leave request created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create leave request');
      }
    } catch {
      toast.error('Network error creating leave request');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Approve / Reject ── */
  const handleStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      setActionLoading(id);
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Leave ${status.toLowerCase()}`);
        await fetchData();
      } else {
        toast.error(json.error || 'Action failed');
      }
    } catch {
      toast.error('Network error updating status');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/leave', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Leave request deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting leave request');
    }
  };

  /* ── Render ── */
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Pending Requests" value={pendingCount} color="#ffab40" />
        <StatCard icon={CheckCircle2} label="Approved MTD" value={approvedMTD} color="#00e676" />
        <StatCard icon={XCircle} label="Rejected" value={rejectedCount} color="#ff3d3d" />
        <StatCard icon={UserCheck} label="Currently on Leave" value={currentlyOnLeave} color="#a78bfa" />
      </div>

      {/* Leave Balance Panel */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <CalendarRange className="text-[#a78bfa]" size={14} />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Leave Balances (Computed from Data)</span>
        </div>
        <div className="vc-panel-body">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {balances.map(b => (
              <BalanceCard key={b.type} label={b.type} allocated={b.allocated} used={b.used} color={b.color} />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#161c24] border border-[#252e3a] rounded-lg p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[11px] font-semibold whitespace-nowrap transition-all duration-150 ${activeTab === tab.id ? 'bg-[#f5a623] text-black shadow-sm' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
            {tab.label}
            {tab.id !== 'all' && (
              <span className={`text-[9px] px-1.5 rounded-full ${activeTab === tab.id ? 'bg-black/20' : 'bg-[#252e3a]'}`}>
                {records.filter(r => tab.id === 'all' || r.status === tab.id).length}
              </span>
            )}
          </button>
        ))}
        <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
          className="ml-auto vc-btn-primary flex items-center gap-1.5">
          <Plus size={13} /> New Request
        </button>
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileCheck className="text-[#f5a623]" size={14} />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">
            {activeTab === 'all' ? 'All Leave Requests' : `${activeTab} Requests`}
          </span>
          <span className="ml-auto vc-badge bg-[#252e3a] text-[#8899aa]">{filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Employee', 'Site', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center">
                      <CheckCircle2 className="mx-auto text-[#00e676] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No leave requests found</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3">
                        <div>
                          <div className="text-[#e2e8f0] font-medium">{r.employee?.name || 'Unknown'}</div>
                          <div className="text-[#5a6878] text-[9px]">{r.employee?.empId || r.empId}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[100px] truncate">{r.site}</td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${typeBadge(r.type)}`}>{r.type}</span></td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.fromDate)}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.toDate)}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-semibold">{r.days}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {r.status === 'Pending' && (
                            <>
                              <button onClick={() => handleStatus(r.id, 'Approved')} disabled={actionLoading === r.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/20 transition-all disabled:opacity-50">
                                {actionLoading === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                Approve
                              </button>
                              <button onClick={() => handleStatus(r.id, 'Rejected')} disabled={actionLoading === r.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 border border-[#ff3d3d]/20 transition-all disabled:opacity-50">
                                Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }}
                            className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Leave Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Employee *</label>
              <select value={form.empId} onChange={e => updateForm('empId', e.target.value)} className="vc-input appearance-none">
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.empId} - {emp.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Leave Type *</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site</label>
                <select value={form.site} onChange={e => updateForm('site', e.target.value)} className="vc-input appearance-none">
                  <option value="">Auto from employee</option>
                  {employees.map(emp => emp.site).filter((v, i, a) => a.indexOf(v) === i).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">From Date *</label>
                <input type="date" value={form.fromDate} onChange={e => updateForm('fromDate', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">To Date *</label>
                <input type="date" value={form.toDate} onChange={e => updateForm('toDate', e.target.value)} className="vc-input" />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Days (auto-calculated)</label>
              <input type="number" value={form.days} readOnly className="vc-input opacity-60" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason</label>
              <textarea value={form.reason} onChange={e => updateForm('reason', e.target.value)} rows={3} placeholder="Leave reason..." className="vc-input resize-none" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Request
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Leave Request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete the leave request for <strong className="text-[#e2e8f0]">{deleteTarget?.employee?.name}</strong> ({fmtDate(deleteTarget?.fromDate || '')} to {fmtDate(deleteTarget?.toDate || '')})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
