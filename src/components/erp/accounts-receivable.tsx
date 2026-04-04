'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpCircle, AlertTriangle, Clock, CheckCircle2,
  Plus, Pencil, Trash2, Loader2, CalendarCheck, FileText,
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
interface ARRecord {
  id: string;
  invoiceNo: string;
  client: string;
  description: string | null;
  amount: number;
  dueDate: string;
  receivedDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ARFormData {
  client: string;
  description: string;
  amount: string;
  dueDate: string;
  status: string;
  receivedDate: string;
}

const EMPTY_FORM: ARFormData = {
  client: '', description: '', amount: '', dueDate: '', status: 'Pending', receivedDate: '',
};

const STATUS_OPTIONS = ['Pending', 'Approved', 'Received', 'Overdue', 'Partially Received', 'Cancelled'];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    Pending: 'bg-[#f5a623]/15 text-[#f5a623]',
    Approved: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Received: 'bg-[#00e676]/15 text-[#00e676]',
    Overdue: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Cancelled: 'bg-[#5a6878]/15 text-[#5a6878]',
    'Partially Received': 'bg-[#a78bfa]/15 text-[#a78bfa]',
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
export default function AccountsReceivable() {
  const [records, setRecords] = useState<ARRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ARRecord | null>(null);
  const [editTarget, setEditTarget] = useState<ARRecord | null>(null);
  const [form, setForm] = useState<ARFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts-receivable');
      const json = await res.json();
      if (json.success) setRecords(json.data);
      else toast.error(json.error || 'Failed to fetch accounts receivable');
    } catch {
      toast.error('Network error fetching accounts receivable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const totalInvoices = records.length;
  const totalReceivable = records.filter(r => ['Pending', 'Approved', 'Overdue', 'Partially Received'].includes(r.status)).reduce((s, r) => s + r.amount, 0);
  const overdueAmount = records.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.amount, 0);
  const collectedThisMonth = records
    .filter(r => {
      if (r.status !== 'Received' || !r.receivedDate) return false;
      const now = new Date();
      const received = new Date(r.receivedDate);
      return received.getMonth() === now.getMonth() && received.getFullYear() === now.getFullYear();
    })
    .reduce((s, r) => s + r.amount, 0);

  /* ── Form helpers ── */
  const updateForm = (field: keyof ARFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.client || !form.amount || !form.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/accounts-receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: form.client,
          description: form.description || undefined,
          amount: form.amount,
          dueDate: form.dueDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Invoice created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create invoice');
      }
    } catch {
      toast.error('Network error creating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.client || !form.amount || !form.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const updateData: Record<string, unknown> = {
        id: editTarget.id,
        client: form.client,
        description: form.description || null,
        amount: form.amount,
        dueDate: form.dueDate,
        status: form.status,
        receivedDate: form.status === 'Received' ? (form.receivedDate || new Date().toISOString().split('T')[0]) : null,
      };
      const res = await fetch('/api/accounts-receivable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Invoice updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update invoice');
      }
    } catch {
      toast.error('Network error updating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/accounts-receivable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Invoice deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting invoice');
    }
  };

  const openEditDialog = (rec: ARRecord) => {
    setEditTarget(rec);
    setForm({
      client: rec.client,
      description: rec.description || '',
      amount: String(rec.amount),
      dueDate: rec.dueDate,
      status: rec.status,
      receivedDate: rec.receivedDate || '',
    });
    setEditOpen(true);
  };

  const markAsReceived = async (rec: ARRecord) => {
    try {
      const res = await fetch('/api/accounts-receivable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rec.id,
          status: 'Received',
          receivedDate: new Date().toISOString().split('T')[0],
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Invoice ${rec.invoiceNo} marked as received`);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to mark as received');
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
        <StatCard icon={FileText} label="Total Invoices" value={totalInvoices} color="#f5a623" />
        <StatCard icon={ArrowUpCircle} label="Total Receivable" value={formatCurrency(totalReceivable)} color="#00d4ff" />
        <StatCard icon={AlertTriangle} label="Overdue" value={formatCurrency(overdueAmount)} color="#ff3d3d" />
        <StatCard icon={CalendarCheck} label="Collected This Month" value={formatCurrency(collectedThisMonth)} color="#00e676" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <ArrowUpCircle size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Accounts Receivable</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Invoices</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Invoice
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Invoice No.', 'Client', 'Description', 'Amount', 'Due Date', 'Received Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <ArrowUpCircle className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No invoices found</div>
                    </td>
                  </tr>
                ) : (
                  records.map(rec => (
                    <tr key={rec.id} className={`hover:bg-[#141920] transition-colors ${rec.status === 'Overdue' ? 'bg-[#ff3d3d]/5' : ''}`}>
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{rec.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{rec.client}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate">{rec.description || '—'}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {formatCurrency(rec.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{rec.dueDate}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{rec.receivedDate || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${statusBadge(rec.status)}`}>{rec.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {['Pending', 'Approved'].includes(rec.status) && (
                            <button onClick={() => markAsReceived(rec)}
                              className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 transition-all" title="Mark as Received">
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
              <Plus size={16} /> New Receivable Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Client *</label>
              <input type="text" value={form.client} onChange={e => updateForm('client', e.target.value)} placeholder="Client name" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Invoice description (optional)" className="vc-input" />
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
              Create Invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Invoice — {editTarget?.invoiceNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Client *</label>
              <input type="text" value={form.client} onChange={e => updateForm('client', e.target.value)} className="vc-input" />
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
              {form.status === 'Received' && (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Received Date</label>
                  <input type="date" value={form.receivedDate} onChange={e => updateForm('receivedDate', e.target.value)} className="vc-input" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Update Invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Invoice
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete invoice <strong className="text-[#f5a623]">{deleteTarget?.invoiceNo}</strong> from <strong className="text-[#e2e8f0]">{deleteTarget?.client}</strong>? This action cannot be undone.
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
