'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package, IndianRupee, Clock, AlertTriangle, Plus, Pencil,
  Trash2, Loader2, CheckCircle2,
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
interface PurchaseOrder {
  id: string;
  poNo: string;
  vendor: string;
  item: string;
  amount: number;
  project: string;
  delivery: string;
  grn: string;
  status: string;
  createdAt: string;
}

interface POFormData {
  vendor: string;
  item: string;
  amount: number;
  project: string;
  delivery: string;
  grn: string;
  status: string;
}

const EMPTY_FORM: POFormData = {
  vendor: '', item: '', amount: 0, project: '', delivery: '', grn: 'Awaited', status: 'Open',
};

const GRN_OPTIONS = ['Awaited', 'Received', 'Partial'];
const STATUS_OPTIONS = ['Open', 'Partial', 'Closed', 'Overdue'];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    Open: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Partial: 'bg-[#f5a623]/15 text-[#f5a623]',
    Closed: 'bg-[#00e676]/15 text-[#00e676]',
    Overdue: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Cancelled: 'bg-[#5a6878]/15 text-[#5a6878]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function grnBadge(g: string) {
  const m: Record<string, string> = {
    Awaiting: 'bg-[#ffab40]/15 text-[#ffab40]',
    Received: 'bg-[#00e676]/15 text-[#00e676]',
    Partial: 'bg-[#f5a623]/15 text-[#f5a623]',
  };
  return m[g] || 'bg-[#5a6878]/15 text-[#5a6878]';
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
export default function Purchases() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [editTarget, setEditTarget] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<POFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/purchases');
      const json = await res.json();
      if (json.success) setOrders(json.data);
      else toast.error(json.error || 'Failed to fetch purchase orders');
    } catch {
      toast.error('Network error fetching purchase orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const openCount = orders.filter(o => o.status === 'Open' || o.status === 'Partial').length;
  const totalValue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.amount, 0);
  const pendingGrn = orders.filter(o => o.grn === 'Awaiting' || o.grn === 'Partial').length;
  const overdueCount = orders.filter(o => o.status === 'Overdue').length;

  /* ── Form helpers ── */
  const updateForm = (field: keyof POFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.vendor || !form.item || !form.amount || !form.project) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Purchase order created');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create PO');
      }
    } catch {
      toast.error('Network error creating PO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.vendor || !form.item) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Purchase order updated');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update PO');
      }
    } catch {
      toast.error('Network error updating PO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/purchases', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Purchase order deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting PO');
    }
  };

  const openEditDialog = (po: PurchaseOrder) => {
    setEditTarget(po);
    setForm({
      vendor: po.vendor, item: po.item, amount: po.amount,
      project: po.project, delivery: po.delivery, grn: po.grn, status: po.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Open POs" value={openCount} color="#f5a623" />
        <StatCard icon={IndianRupee} label="Total Value" value={`₹${(totalValue / 100000).toFixed(0)}L`} color="#00e676" />
        <StatCard icon={Clock} label="Pending GRN" value={pendingGrn} color="#00d4ff" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueCount} color="#ff3d3d" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Package size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Purchase Order Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{orders.length} Orders</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> Raise PO
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['PO No.', 'Vendor', 'Item', 'Amount', 'Project', 'Delivery', 'GRN', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center">
                      <Package className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No purchase orders found</div>
                    </td>
                  </tr>
                ) : (
                  orders.map(po => (
                    <tr key={po.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium">{po.poNo}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{po.vendor}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0]">{po.item}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">₹{po.amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{po.project}</td>
                      <td className="py-2.5 px-3 text-[#5a6878]">{po.delivery}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${grnBadge(po.grn)}`}>{po.grn}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${statusBadge(po.status)}`}>{po.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditDialog(po)}
                            className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { setDeleteTarget(po); setDeleteOpen(true); }}
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
              <Plus size={16} /> New Purchase Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Vendor *</label>
              <input type="text" value={form.vendor} onChange={e => updateForm('vendor', e.target.value)} placeholder="Vendor name" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Item *</label>
              <input type="text" value={form.item} onChange={e => updateForm('item', e.target.value)} placeholder="Item description" className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label>
                <input type="number" value={form.amount || ''} onChange={e => updateForm('amount', Number(e.target.value))} placeholder="0" className="vc-input" min="0" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Delivery Date *</label>
                <input type="date" value={form.delivery} onChange={e => updateForm('delivery', e.target.value)} className="vc-input" />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Project *</label>
              <input type="text" value={form.project} onChange={e => updateForm('project', e.target.value)} placeholder="Project name" className="vc-input" />
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
              Create PO
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit PO — {editTarget?.poNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Vendor *</label>
              <input type="text" value={form.vendor} onChange={e => updateForm('vendor', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Item *</label>
              <input type="text" value={form.item} onChange={e => updateForm('item', e.target.value)} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹)</label>
                <input type="number" value={form.amount || ''} onChange={e => updateForm('amount', Number(e.target.value))} className="vc-input" min="0" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Delivery Date</label>
                <input type="date" value={form.delivery} onChange={e => updateForm('delivery', e.target.value)} className="vc-input" />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Project</label>
              <input type="text" value={form.project} onChange={e => updateForm('project', e.target.value)} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">GRN Status</label>
                <select value={form.grn} onChange={e => updateForm('grn', e.target.value)} className="vc-input appearance-none">
                  {GRN_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">PO Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Update PO
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Purchase Order
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete PO <strong className="text-[#f5a623]">{deleteTarget?.poNo}</strong> ({deleteTarget?.item}) from <strong className="text-[#e2e8f0]">{deleteTarget?.vendor}</strong>? This action cannot be undone.
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
