'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownCircle, AlertTriangle, Clock, CheckCircle2,
  Plus, Pencil, Trash2, Loader2, CalendarCheck,
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
interface APRecord {
  id: string;
  billNo: string;
  vendor: string;
  description: string | null;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface APFormData {
  vendor: string;
  description: string;
  amount: string;
  dueDate: string;
  status: string;
  paidDate: string;
}

const EMPTY_FORM: APFormData = {
  vendor: '', description: '', amount: '', dueDate: '', status: 'Pending', paidDate: '',
};

const STATUS_OPTIONS = ['Pending', 'Approved', 'Paid', 'Overdue', 'Partially Paid', 'Cancelled'];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    Pending: 'bg-[#f5a623]/15 text-[#f5a623]',
    Approved: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Paid: 'bg-[#00e676]/15 text-[#00e676]',
    Overdue: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Cancelled: 'bg-[#5a6878]/15 text-[#5a6878]',
    'Partially Paid': 'bg-[#a78bfa]/15 text-[#a78bfa]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  return `₹${val.toLocaleString('en-IN')}`;
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

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function AccountsPayable() {
  const [records, setRecords] = useState<APRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<APRecord | null>(null);
  const [editTarget, setEditTarget] = useState<APRecord | null>(null);
  const [form, setForm] = useState<APFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts-payable');
      const json = await res.json();
      if (json.success) setRecords(json.data);
      else toast.error(json.error || 'Failed to fetch accounts payable');
    } catch {
      toast.error('Network error fetching accounts payable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const totalBills = records.length;
  const totalPayable = records.filter(r => ['Pending', 'Approved', 'Overdue', 'Partially Paid'].includes(r.status)).reduce((s, r) => s + r.amount, 0);
  const overdueAmount = records.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.amount, 0);
  const paidThisMonth = records
    .filter(r => {
      if (r.status !== 'Paid' || !r.paidDate) return false;
      const now = new Date();
      const paid = new Date(r.paidDate);
      return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear();
    })
    .reduce((s, r) => s + r.amount, 0);

  /* ── Form helpers ── */
  const updateForm = (field: keyof APFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.vendor || !form.amount || !form.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/accounts-payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: form.vendor,
          description: form.description || undefined,
          amount: form.amount,
          dueDate: form.dueDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Bill created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create bill');
      }
    } catch {
      toast.error('Network error creating bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.vendor || !form.amount || !form.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const updateData: Record<string, unknown> = {
        id: editTarget.id,
        vendor: form.vendor,
        description: form.description || null,
        amount: form.amount,
        dueDate: form.dueDate,
        status: form.status,
        paidDate: form.status === 'Paid' ? (form.paidDate || new Date().toISOString().split('T')[0]) : null,
      };
      const res = await fetch('/api/accounts-payable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Bill updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update bill');
      }
    } catch {
      toast.error('Network error updating bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/accounts-payable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Bill deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting bill');
    }
  };

  const openEditDialog = (rec: APRecord) => {
    setEditTarget(rec);
    setForm({
      vendor: rec.vendor,
      description: rec.description || '',
      amount: String(rec.amount),
      dueDate: rec.dueDate,
      status: rec.status,
      paidDate: rec.paidDate || '',
    });
    setEditOpen(true);
  };

  const markAsPaid = async (rec: APRecord) => {
    try {
      const res = await fetch('/api/accounts-payable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rec.id,
          status: 'Paid',
          paidDate: new Date().toISOString().split('T')[0],
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Bill ${rec.billNo} marked as paid`);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to mark as paid');
      }
    } catch {
      toast.error('Network error');
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowDownCircle} label="Total Bills" value={totalBills} color="#f5a623" />
        <StatCard icon={Clock} label="Total Payable" value={formatCurrency(totalPayable)} color="#00d4ff" />
        <StatCard icon={AlertTriangle} label="Overdue Amount" value={formatCurrency(overdueAmount)} color="#ff3d3d" />
        <StatCard icon={CalendarCheck} label="Paid This Month" value={formatCurrency(paidThisMonth)} color="#00e676" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <ArrowDownCircle size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Accounts Payable</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Bills</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Bill
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Bill No.', 'Vendor', 'Description', 'Amount', 'Due Date', 'Paid Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <ArrowDownCircle className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No bills found</div>
                    </td>
                  </tr>
                ) : (
                  records.map(rec => (
                    <tr key={rec.id} className={`hover:bg-[#141920] transition-colors ${rec.status === 'Overdue' ? 'bg-[#ff3d3d]/5' : ''}`}>
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{rec.billNo}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{rec.vendor}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate">{rec.description || '—'}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {formatCurrency(rec.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{rec.dueDate}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{rec.paidDate || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${statusBadge(rec.status)}`}>{rec.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {['Pending', 'Approved'].includes(rec.status) && (
                            <button onClick={() => markAsPaid(rec)}
                              className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 transition-all" title="Mark as Paid">
                              <CheckCircle2 size={13} />
                            </button>
                          )}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Bill
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Vendor *</label>
              <input type="text" value={form.vendor} onChange={e => updateForm('vendor', e.target.value)} placeholder="Vendor name" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Bill description (optional)" className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount *</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => updateForm('amount', e.target.value)} placeholder="0.00" className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Due Date *</label>
                <input type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} className="vc-input" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Bill
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Bill — {editTarget?.billNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Vendor *</label>
              <input type="text" value={form.vendor} onChange={e => updateForm('vendor', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount *</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => updateForm('amount', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Due Date *</label>
                <input type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} className="vc-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.status === 'Paid' && (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Paid Date</label>
                  <input type="date" value={form.paidDate} onChange={e => updateForm('paidDate', e.target.value)} className="vc-input" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Update Bill
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Bill
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete bill <strong className="text-[#f5a623]">{deleteTarget?.billNo}</strong> from <strong className="text-[#e2e8f0]">{deleteTarget?.vendor}</strong>? This action cannot be undone.
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
