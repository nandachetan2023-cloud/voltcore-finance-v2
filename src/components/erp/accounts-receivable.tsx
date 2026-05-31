'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowDownCircle, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useERPStore } from '@/store/erp-store';

interface ARRecord {
  id: number; invoiceNo: string; client: string; clientCode: string | null;
  description: string | null; amount: number; tax: number; totalAmount: number;
  dueDate: string; receivedDate: string | null; status: string;
}

interface FormData {
  invoiceNo: string; client: string; clientCode: string; description: string;
  amount: number; tax: number; totalAmount: number; dueDate: string; status: string;
}

const EMPTY_FORM: FormData = { invoiceNo: '', client: '', clientCode: '', description: '', amount: 0, tax: 0, totalAmount: 0, dueDate: '', status: 'Pending' };

export default function AccountsReceivable() {
  const [records, setRecords] = useState<ARRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ARRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ARRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) { setEditTarget(null); setForm(EMPTY_FORM); setFormOpen(true); } }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try { setLoading(true); const res = await fetch('/api/accounts-receivable'); const json = await res.json(); if (json.success) setRecords(json.data); }
    catch { toast.error('Failed to fetch AR records'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (r: ARRecord) => {
    setEditTarget(r);
    setForm({ invoiceNo: r.invoiceNo, client: r.client, clientCode: r.clientCode || '', description: r.description || '', amount: r.amount, tax: r.tax, totalAmount: r.totalAmount, dueDate: r.dueDate?.split('T')[0] || '', status: r.status });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.invoiceNo || !form.client || !form.dueDate) { toast.error('Invoice No, Client, and Due Date are required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...form, dueDate: new Date(form.dueDate) } : { ...form, dueDate: new Date(form.dueDate) };
      const res = await fetch('/api/accounts-receivable', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Record updated' : 'Record created'); setFormOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Operation failed'); }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/accounts-receivable?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { toast.success('Record deleted'); setDeleteOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Network error'); }
  };

  const statusBadge = (s: string) => {
    if (s === 'Received') return 'bg-[#00e676]/15 text-[#00e676]';
    if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40]';
    if (s === 'Overdue') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    if (s === 'Partially Received') return 'bg-[#00d4ff]/15 text-[#00d4ff]';
    return 'bg-[#5a6878]/15 text-[#5a6878]';
  };

  const totalPending = records.filter(r => r.status === 'Pending' || r.status === 'Partially Received').reduce((s, r) => s + r.totalAmount, 0);
  const totalReceived = records.filter(r => r.status === 'Received').reduce((s, r) => s + r.totalAmount, 0);
  const totalOverdue = records.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.totalAmount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending</div><div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalPending / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Received</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalReceived / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Overdue</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalOverdue / 100000).toFixed(2)} L</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <ArrowDownCircle size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Accounts Receivable</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Invoices</span>
          <button onClick={() => { setEditTarget(null); setForm(EMPTY_FORM); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Invoice</button>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['Invoice No', 'Client', 'Amount', 'Tax', 'Total', 'Due Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{r.invoiceNo}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.client}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{r.tax.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">₹{r.totalAmount.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.dueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3"><div className="flex items-center gap-1">
                    <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                    <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Invoice' : 'New AR Invoice'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Invoice No *</label><input value={form.invoiceNo} onChange={e => setForm(p => ({ ...p, invoiceNo: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Client Code</label><input value={form.clientCode} onChange={e => setForm(p => ({ ...p, clientCode: e.target.value }))} className="vc-input" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Client *</label><input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} className="vc-input" /></div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="vc-input" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹)</label><input type="number" value={form.amount || ''} onChange={e => { const a = Number(e.target.value); setForm(p => ({ ...p, amount: a, totalAmount: a + p.tax })); }} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Tax (₹)</label><input type="number" value={form.tax || ''} onChange={e => { const t = Number(e.target.value); setForm(p => ({ ...p, tax: t, totalAmount: p.amount + t })); }} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Total (₹)</label><input type="number" value={form.totalAmount || ''} readOnly className="vc-input opacity-60" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Due Date *</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input appearance-none"><option value="Pending">Pending</option><option value="Received">Received</option><option value="Partially Received">Partially Received</option><option value="Overdue">Overdue</option></select></div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Invoice</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.invoiceNo}</strong> from {deleteTarget?.client}?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
