'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface TaxRecord { id: number; taxType: string; period: string; amount: number; dueDate: string; paidDate: string | null; paymentRef: string | null; status: string; remarks: string | null; }
interface FormData { taxType: string; period: string; amount: number; dueDate: string; status: string; remarks: string; }

const EMPTY_FORM: FormData = { taxType: 'GST', period: '', amount: 0, dueDate: '', status: 'Pending', remarks: '' };
const TAX_TYPES = ['GST', 'TDS', 'PF', 'ESI', 'Professional Tax', 'Advance Tax'];

export default function Taxation() {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TaxRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try { setLoading(true); const res = await fetch('/api/taxation'); const json = await res.json(); if (json.success) setRecords(json.data); }
    catch { toast.error('Failed to fetch tax records'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (r: TaxRecord) => {
    setEditTarget(r);
    setForm({ taxType: r.taxType, period: r.period, amount: r.amount, dueDate: r.dueDate?.split('T')[0] || '', status: r.status, remarks: r.remarks || '' });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.taxType || !form.period || !form.dueDate) { toast.error('Tax type, period, and due date are required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...form, dueDate: new Date(form.dueDate) } : { ...form, dueDate: new Date(form.dueDate) };
      const res = await fetch('/api/taxation', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Tax record updated' : 'Tax record created'); setFormOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Operation failed'); }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/taxation?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { toast.success('Tax record deleted'); setDeleteOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Network error'); }
  };

  const totalPending = records.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
  const totalFiled = records.filter(r => r.status === 'Filed').reduce((s, r) => s + r.amount, 0);

  const statusBadge = (s: string) => {
    if (s === 'Filed' || s === 'Paid') return 'bg-[#00e676]/15 text-[#00e676]';
    if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40]';
    if (s === 'Overdue') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    return 'bg-[#5a6878]/15 text-[#5a6878]';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending Tax Liability</div><div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalPending / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Filed / Paid</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalFiled / 100000).toFixed(2)} L</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Receipt size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Tax Records</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Records</span>
          <button onClick={() => { setEditTarget(null); setForm(EMPTY_FORM); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Record</button>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['Tax Type', 'Period', 'Amount', 'Due Date', 'Paid Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#f5a623] font-medium">{r.taxType}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.period}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.dueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.paidDate?.split('T')[0] || '—'}</td>
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
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Tax Record' : 'New Tax Record'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Tax Type *</label><select value={form.taxType} onChange={e => setForm(p => ({ ...p, taxType: e.target.value }))} className="vc-input appearance-none">{TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Period *</label><input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="vc-input" placeholder="e.g. Jan 2025" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label><input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Due Date *</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="vc-input" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input appearance-none"><option value="Pending">Pending</option><option value="Filed">Filed</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option></select></div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Remarks</label><input value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className="vc-input" /></div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Tax Record</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.taxType} — {deleteTarget?.period}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
