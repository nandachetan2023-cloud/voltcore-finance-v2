'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Scale, TrendingDown, AlertTriangle, Clock, Plus, Pencil,
  Trash2, Loader2, Calendar, CheckCircle2, FileWarning, IndianRupee,
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
interface TaxRecord {
  id: string;
  taxType: string;
  period: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TaxFormData {
  taxType: string;
  period: string;
  amount: string;
  dueDate: string;
  status: string;
}

const EMPTY_FORM: TaxFormData = {
  taxType: 'GST', period: '', amount: '', dueDate: '', status: 'Pending',
};

const TAX_TYPES = ['GST', 'TDS', 'PF', 'ESI', 'Prof Tax', 'Income Tax', 'CST', 'VAT'];
const STATUS_OPTIONS = ['Pending', 'Paid', 'Overdue', 'Filed'];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    Paid: 'bg-[#00e676]/15 text-[#00e676]',
    Pending: 'bg-[#f5a623]/15 text-[#f5a623]',
    Overdue: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Filed: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function statusIcon(s: string) {
  if (s === 'Paid') return <CheckCircle2 size={12} className="mr-1" />;
  if (s === 'Overdue') return <AlertTriangle size={12} className="mr-1" />;
  if (s === 'Filed') return <FileWarning size={12} className="mr-1" />;
  return <Clock size={12} className="mr-1" />;
}

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatDate(d: string): string {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string): number {
  const now = new Date();
  const due = new Date(d);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ── Loading Skeleton ─────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-7 w-14 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="vc-panel">
            <Skeleton className="h-10 w-full bg-[#1e2630]" />
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-[#1e2630]" />
              ))}
            </div>
          </div>
        </div>
        <div className="vc-panel">
          <Skeleton className="h-10 w-full bg-[#1e2630]" />
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full bg-[#1e2630]" />
            ))}
          </div>
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

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function Taxation() {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaxRecord | null>(null);
  const [editTarget, setEditTarget] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState<TaxFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/taxation');
      const json = await res.json();
      if (json.success) setRecords(json.data);
      else toast.error(json.error || 'Failed to fetch tax records');
    } catch {
      toast.error('Network error fetching tax records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Seed data on first empty load ── */
  useEffect(() => {
    if (!loading && records.length === 0) {
      seedData();
    }
  }, [loading]);

  const seedData = async () => {
    const now = new Date();
    const fy = '2024-25';
    const seedRecords = [
      { taxType: 'GST', period: `${fy} Q1 (Apr-Jun)`, amount: 245000, dueDate: '2024-07-20', status: 'Paid', paidDate: '2024-07-18' },
      { taxType: 'GST', period: `${fy} Q2 (Jul-Sep)`, amount: 312000, dueDate: '2024-10-20', status: 'Paid', paidDate: '2024-10-15' },
      { taxType: 'GST', period: `${fy} Q3 (Oct-Dec)`, amount: 287500, dueDate: '2025-01-20', status: 'Filed', paidDate: '2025-01-22' },
      { taxType: 'GST', period: `${fy} Q4 (Jan-Mar)`, amount: 298000, dueDate: '2025-04-20', status: 'Pending' },
      { taxType: 'TDS', period: `${fy} Q1`, amount: 185000, dueDate: '2024-07-31', status: 'Paid', paidDate: '2024-07-30' },
      { taxType: 'TDS', period: `${fy} Q2`, amount: 192000, dueDate: '2024-10-31', status: 'Paid', paidDate: '2024-10-28' },
      { taxType: 'TDS', period: `${fy} Q3`, amount: 178500, dueDate: '2025-01-31', status: 'Filed', paidDate: '2025-02-03' },
      { taxType: 'TDS', period: `${fy} Q4`, amount: 195000, dueDate: '2025-04-30', status: 'Pending' },
      { taxType: 'PF', period: 'Mar 2025', amount: 420000, dueDate: '2025-04-15', status: 'Paid', paidDate: '2025-04-14' },
      { taxType: 'ESI', period: 'Mar 2025', amount: 85000, dueDate: '2025-04-15', status: 'Overdue' },
      { taxType: 'Prof Tax', period: 'Mar 2025', amount: 12500, dueDate: '2025-04-30', status: 'Pending' },
      { taxType: 'Income Tax', period: `${fy} Advance Q4`, amount: 750000, dueDate: '2025-03-15', status: 'Paid', paidDate: '2025-03-14' },
      { taxType: 'Income Tax', period: `${fy} Advance Q1`, amount: 600000, dueDate: '2024-06-15', status: 'Paid', paidDate: '2024-06-12' },
    ];

    for (const r of seedRecords) {
      await fetch('/api/taxation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      });
    }
    await fetchData();
  };

  /* ── Stats ── */
  const totalLiability = records.reduce((s, r) => s + r.amount, 0);
  const paidYTD = records.filter(r => r.status === 'Paid').reduce((s, r) => s + r.amount, 0);
  const pendingAmount = records.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
  const overdueAmount = records.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.amount, 0);

  /* ── Upcoming due dates ── */
  const upcomingDues = records
    .filter(r => r.status === 'Pending' || r.status === 'Overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8);

  /* ── Form helpers ── */
  const updateForm = (field: keyof TaxFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.taxType || !form.period || !form.amount || !form.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/taxation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Tax record created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create tax record');
      }
    } catch {
      toast.error('Network error creating tax record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.taxType || !form.period || !form.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/taxation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Tax record updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update tax record');
      }
    } catch {
      toast.error('Network error updating tax record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/taxation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Tax record deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting tax record');
    }
  };

  const openEditDialog = (rec: TaxRecord) => {
    setEditTarget(rec);
    setForm({
      taxType: rec.taxType,
      period: rec.period,
      amount: String(rec.amount),
      dueDate: rec.dueDate,
      status: rec.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Scale} label="Total Tax Liability" value={formatCurrency(totalLiability)} color="#f5a623" />
        <StatCard icon={TrendingDown} label="Paid YTD" value={formatCurrency(paidYTD)} color="#00e676" />
        <StatCard icon={Clock} label="Pending Amount" value={formatCurrency(pendingAmount)} color="#f5a623" />
        <StatCard icon={AlertTriangle} label="Overdue" value={formatCurrency(overdueAmount)} color="#ff3d3d" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="lg:col-span-2 vc-panel">
          <div className="vc-panel-header">
            <Scale size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Tax Records</span>
            <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Records</span>
            <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
              className="vc-btn-primary flex items-center gap-1.5 ml-2">
              <Plus size={13} /> New Record
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    {['Tax Type', 'Period', 'Amount', 'Due Date', 'Paid Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <Scale className="mx-auto text-[#5a6878] mb-2" size={24} />
                        <div className="text-[11px] text-[#5a6878]">No tax records found</div>
                      </td>
                    </tr>
                  ) : (
                    records.map(rec => {
                      const days = daysUntil(rec.dueDate);
                      const isOverdueRow = rec.status === 'Overdue';
                      return (
                        <tr key={rec.id} className={`hover:bg-[#141920] transition-colors ${isOverdueRow ? 'bg-[#ff3d3d]/5' : ''}`}>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-[#e2e8f0]">{rec.taxType}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[#8899aa]">{rec.period}</td>
                          <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                            {formatCurrency(rec.amount)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={days < 0 && rec.status === 'Pending' ? 'text-[#ff3d3d]' : 'text-[#8899aa]'}>
                              {formatDate(rec.dueDate)}
                            </span>
                            {rec.status === 'Pending' && days >= 0 && days <= 7 && (
                              <span className="ml-1.5 text-[9px] text-[#f5a623] font-bold">{days}d left</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[#8899aa]">{formatDate(rec.paidDate || '')}</td>
                          <td className="py-2.5 px-3">
                            <span className={`vc-badge ${statusBadge(rec.status)}`}>
                              {statusIcon(rec.status)}{rec.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditDialog(rec)}
                                className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => { setDeleteTarget(rec); setDeleteOpen(true); }}
                                className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upcoming Due Dates Calendar Panel */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Calendar size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Upcoming Due Dates</span>
          </div>
          <div className="p-3 space-y-2">
            {upcomingDues.length === 0 ? (
              <div className="py-6 text-center">
                <Calendar className="mx-auto text-[#5a6878] mb-2" size={24} />
                <div className="text-[11px] text-[#5a6878]">No upcoming due dates</div>
              </div>
            ) : (
              upcomingDues.map(rec => {
                const days = daysUntil(rec.dueDate);
                const isUrgent = days < 0 || days <= 7;
                return (
                  <div key={rec.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      days < 0 ? 'bg-[#ff3d3d]/5 border-[#ff3d3d]/20' :
                      isUrgent ? 'bg-[#f5a623]/5 border-[#f5a623]/20' :
                      'bg-[#141920] border-[#252e3a]'
                    }`}>
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                      days < 0 ? 'bg-[#ff3d3d]/15' :
                      isUrgent ? 'bg-[#f5a623]/15' :
                      'bg-[#00d4ff]/15'
                    }`}>
                      <span className={`text-[10px] font-bold leading-none ${
                        days < 0 ? 'text-[#ff3d3d]' :
                        isUrgent ? 'text-[#f5a623]' :
                        'text-[#00d4ff]'
                      }`}>
                        {days < 0 ? `${Math.abs(days)}d` : `${days}d`}
                      </span>
                      <span className="text-[8px] text-[#5a6878]">{days < 0 ? 'over' : 'left'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-[#e2e8f0] truncate">{rec.taxType}</div>
                      <div className="text-[9px] text-[#5a6878] truncate">{rec.period}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-medium text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {formatCurrency(rec.amount)}
                      </div>
                      <div className="text-[9px] text-[#5a6878]">{formatDate(rec.dueDate)}</div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Compliance Summary */}
            <div className="mt-4 pt-3 border-t border-[#252e3a]">
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-2">Compliance Summary</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#00e676]/5 border border-[#00e676]/15 rounded-lg p-2 text-center">
                  <div className="text-[16px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {records.filter(r => r.status === 'Paid').length}
                  </div>
                  <div className="text-[9px] text-[#5a6878]">Paid</div>
                </div>
                <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/15 rounded-lg p-2 text-center">
                  <div className="text-[16px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {records.filter(r => r.status === 'Filed').length}
                  </div>
                  <div className="text-[9px] text-[#5a6878]">Filed</div>
                </div>
                <div className="bg-[#f5a623]/5 border border-[#f5a623]/15 rounded-lg p-2 text-center">
                  <div className="text-[16px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {records.filter(r => r.status === 'Pending').length}
                  </div>
                  <div className="text-[9px] text-[#5a6878]">Pending</div>
                </div>
                <div className="bg-[#ff3d3d]/5 border border-[#ff3d3d]/15 rounded-lg p-2 text-center">
                  <div className="text-[16px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {records.filter(r => r.status === 'Overdue').length}
                  </div>
                  <div className="text-[9px] text-[#5a6878]">Overdue</div>
                </div>
              </div>
            </div>

            {/* Tax Type Breakdown */}
            <div className="mt-4 pt-3 border-t border-[#252e3a]">
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-2">Tax Breakdown</div>
              <div className="space-y-1.5">
                {['GST', 'TDS', 'PF', 'ESI', 'Prof Tax', 'Income Tax'].map(t => {
                  const typeRecords = records.filter(r => r.taxType === t);
                  const total = typeRecords.reduce((s, r) => s + r.amount, 0);
                  if (typeRecords.length === 0) return null;
                  return (
                    <div key={t} className="flex items-center justify-between text-[10px]">
                      <span className="text-[#8899aa]">{t}</span>
                      <span className="text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {formatCurrency(total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Tax Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Tax Type *</label>
              <select value={form.taxType} onChange={e => updateForm('taxType', e.target.value)} className="vc-input appearance-none">
                {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Period *</label>
              <input type="text" value={form.period} onChange={e => updateForm('period', e.target.value)}
                placeholder="e.g. FY 2024-25 Q1" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => updateForm('amount', e.target.value)}
                placeholder="e.g. 250000" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Record
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Tax Record — {editTarget?.taxType} {editTarget?.period}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Tax Type *</label>
              <select value={form.taxType} onChange={e => updateForm('taxType', e.target.value)} className="vc-input appearance-none">
                {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Period *</label>
              <input type="text" value={form.period} onChange={e => updateForm('period', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => updateForm('amount', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Update Record
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Tax Record
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete the <strong className="text-[#f5a623]">{deleteTarget?.taxType}</strong> record for <strong className="text-[#e2e8f0]">{deleteTarget?.period}</strong>? This action cannot be undone.
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
