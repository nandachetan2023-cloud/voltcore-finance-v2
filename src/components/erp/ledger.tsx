'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface LedgerAccount {
  id: number;
  accountCode: string;
  name: string;
  group: string | null;
  type: string | null;
  parentAccount: string | null;
  balance: number;
  status: string;
}

interface FormData {
  accountCode: string;
  name: string;
  group: string;
  type: string;
  parentAccount: string;
  balance: number;
  status: string;
}

const EMPTY_FORM: FormData = { accountCode: '', name: '', group: 'Assets', type: 'Debit', parentAccount: '', balance: 0, status: 'Active' };
const GROUPS = ['Assets', 'Liabilities', 'Income', 'Expense'];
const TYPES = ['Debit', 'Credit'];

export default function Ledger() {
  const [records, setRecords] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LedgerAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LedgerAccount | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ledger');
      const json = await res.json();
      if (json.success) setRecords(json.data);
    } catch { toast.error('Failed to fetch ledger accounts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (r: LedgerAccount) => {
    setEditTarget(r);
    setForm({ accountCode: r.accountCode, name: r.name, group: r.group || 'Assets', type: r.type || 'Debit', parentAccount: r.parentAccount || '', balance: r.balance, status: r.status });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.accountCode || !form.name) { toast.error('Account code and name are required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...form } : form;
      const res = await fetch('/api/ledger', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(editTarget ? 'Account updated' : 'Account created');
        setFormOpen(false);
        await fetchData();
      } else { toast.error(json.error || 'Operation failed'); }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/ledger?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { toast.success('Account deleted'); setDeleteOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Network error'); }
  };

  const groupColor = (g: string | null) => {
    if (g === 'Assets') return 'text-[#00d4ff]';
    if (g === 'Liabilities') return 'text-[#ff3d3d]';
    if (g === 'Income') return 'text-[#00e676]';
    if (g === 'Expense') return 'text-[#f5a623]';
    return 'text-[#8899aa]';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <BookOpen size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Chart of Accounts</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Accounts</span>
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Account
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Code', 'Account Name', 'Group', 'Type', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{r.accountCode}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td>
                    <td className={`py-2.5 px-3 font-medium ${groupColor(r.group)}`}>{r.group || '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{r.type || '—'}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{r.balance.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3">
                      <span className={`vc-badge ${r.status === 'Active' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                        <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Account' : 'New Ledger Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account Code *</label>
              <input value={form.accountCode} onChange={e => setForm(p => ({ ...p, accountCode: e.target.value }))} className="vc-input" placeholder="e.g. 1001" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="vc-input" placeholder="e.g. Cash" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Group</label>
                <select value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))} className="vc-input appearance-none">
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="vc-input appearance-none">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Opening Balance (₹)</label>
              <input type="number" value={form.balance || ''} onChange={e => setForm(p => ({ ...p, balance: Number(e.target.value) }))} className="vc-input" placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {editTarget ? 'Update' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete <strong className="text-[#f5a623]">{deleteTarget?.accountCode} - {deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
