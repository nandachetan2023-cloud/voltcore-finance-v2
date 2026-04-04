'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileEdit, TrendingUp, TrendingDown, Scale, Plus, Pencil,
  Trash2, Loader2, AlertTriangle, BookOpen,
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
interface JournalEntry {
  id: string;
  entryNo: string;
  date: string;
  account: string;
  debit: number;
  credit: number;
  description?: string | null;
  reference?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface EntryFormData {
  date: string;
  account: string;
  debit: string;
  credit: string;
  description: string;
  reference: string;
  status: string;
}

const EMPTY_FORM: EntryFormData = {
  date: '', account: '', debit: '', credit: '', description: '', reference: '', status: 'Posted',
};

const STATUS_OPTIONS = ['Posted', 'Draft', 'Cancelled'];

const ACCOUNT_OPTIONS = [
  'Cash', 'Bank - HDFC', 'Bank - SBI', 'Bank - ICICI', 'Bank - Axis',
  'Petty Cash', 'Accounts Receivable', 'Accounts Payable',
  'Sales Revenue', 'Service Income', 'Interest Income',
  'Salary & Wages', 'Rent Expense', 'Office Supplies', 'Utilities',
  'Travel & Transport', 'Insurance', 'Depreciation', 'Tax Payable',
  'Equipment', 'Inventory', 'Retained Earnings',
];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    Posted: 'bg-[#00e676]/15 text-[#00e676]',
    Draft: 'bg-[#f5a623]/15 text-[#f5a623]',
    Cancelled: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
export default function JournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [editTarget, setEditTarget] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState<EntryFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/journal-entries');
      const json = await res.json();
      if (json.success) setEntries(json.data);
      else toast.error(json.error || 'Failed to fetch journal entries');
    } catch {
      toast.error('Network error fetching journal entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  const balance = totalDebit - totalCredit;

  /* ── Form helpers ── */
  const updateForm = (field: keyof EntryFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.date || !form.account) {
      toast.error('Date and Account are required');
      return;
    }
    if ((!form.debit || parseFloat(form.debit) === 0) && (!form.credit || parseFloat(form.credit) === 0)) {
      toast.error('At least one of Debit or Credit must be non-zero');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          account: form.account,
          debit: parseFloat(form.debit) || 0,
          credit: parseFloat(form.credit) || 0,
          description: form.description || null,
          reference: form.reference || null,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Journal entry created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create journal entry');
      }
    } catch {
      toast.error('Network error creating journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.date || !form.account) {
      toast.error('Date and Account are required');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/journal-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTarget.id,
          date: form.date,
          account: form.account,
          debit: parseFloat(form.debit) || 0,
          credit: parseFloat(form.credit) || 0,
          description: form.description || null,
          reference: form.reference || null,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Journal entry updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update journal entry');
      }
    } catch {
      toast.error('Network error updating journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/journal-entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Journal entry deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting journal entry');
    }
  };

  const openEditDialog = (entry: JournalEntry) => {
    setEditTarget(entry);
    setForm({
      date: entry.date,
      account: entry.account,
      debit: entry.debit ? String(entry.debit) : '',
      credit: entry.credit ? String(entry.credit) : '',
      description: entry.description || '',
      reference: entry.reference || '',
      status: entry.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Total Entries" value={entries.length} color="#f5a623" />
        <StatCard icon={TrendingUp} label="Total Debit" value={formatCurrency(totalDebit)} color="#00e676" />
        <StatCard icon={TrendingDown} label="Total Credit" value={formatCurrency(totalCredit)} color="#00d4ff" />
        <StatCard icon={Scale} label="Balance" value={formatCurrency(Math.abs(balance))} color={balance >= 0 ? '#00e676' : '#ff3d3d'} />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileEdit size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Journal Entries</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{entries.length} Entries</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Entry
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Entry No.', 'Date', 'Account', 'Debit', 'Credit', 'Description', 'Reference', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center">
                      <FileEdit className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No journal entries found</div>
                    </td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{entry.entryNo}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{entry.date}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{entry.account}</td>
                      <td className="py-2.5 px-3 text-[#00e676] font-medium text-right" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#00d4ff] font-medium text-right" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate">{entry.description || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{entry.reference || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${statusBadge(entry.status)}`}>{entry.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditDialog(entry)}
                            className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { setDeleteTarget(entry); setDeleteOpen(true); }}
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

        {/* Running Balance Footer */}
        {entries.length > 0 && (
          <div className="border-t border-[#252e3a] px-4 py-3 flex items-center justify-between bg-[#0d1017]">
            <div className="flex items-center gap-4">
              <span className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">Running Balance</span>
              <span className="text-[11px] text-[#5a6878]">|</span>
              <span className="text-[11px]">
                <span className="text-[#5a6878]">Dr: </span>
                <span className="text-[#00e676] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatCurrency(totalDebit)}</span>
              </span>
              <span className="text-[11px]">
                <span className="text-[#5a6878]">Cr: </span>
                <span className="text-[#00d4ff] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatCurrency(totalCredit)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Scale size={13} className={balance >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'} />
              <span className={`text-[13px] font-bold ${balance >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {balance >= 0 ? 'Dr ' : 'Cr '}{formatCurrency(Math.abs(balance))}
              </span>
              {balance === 0 && (
                <span className="vc-badge bg-[#00e676]/15 text-[#00e676] ml-2">Balanced</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Journal Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label>
                <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account *</label>
              <select value={form.account} onChange={e => updateForm('account', e.target.value)} className="vc-input appearance-none">
                <option value="">Select account...</option>
                {ACCOUNT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Debit (₹)</label>
                <input type="number" step="0.01" min="0" value={form.debit} onChange={e => updateForm('debit', e.target.value)}
                  placeholder="0.00" className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Credit (₹)</label>
                <input type="number" step="0.01" min="0" value={form.credit} onChange={e => updateForm('credit', e.target.value)}
                  placeholder="0.00" className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)}
                placeholder="Brief description..." className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reference</label>
              <input type="text" value={form.reference} onChange={e => updateForm('reference', e.target.value)}
                placeholder="Invoice/PO/Voucher No." className="vc-input" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Entry
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Entry — {editTarget?.entryNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label>
                <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account *</label>
              <select value={form.account} onChange={e => updateForm('account', e.target.value)} className="vc-input appearance-none">
                <option value="">Select account...</option>
                {ACCOUNT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Debit (₹)</label>
                <input type="number" step="0.01" min="0" value={form.debit} onChange={e => updateForm('debit', e.target.value)}
                  placeholder="0.00" className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Credit (₹)</label>
                <input type="number" step="0.01" min="0" value={form.credit} onChange={e => updateForm('credit', e.target.value)}
                  placeholder="0.00" className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)}
                placeholder="Brief description..." className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reference</label>
              <input type="text" value={form.reference} onChange={e => updateForm('reference', e.target.value)}
                placeholder="Invoice/PO/Voucher No." className="vc-input" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Update Entry
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Journal Entry
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete entry <strong className="text-[#f5a623]">{deleteTarget?.entryNo}</strong> for account <strong className="text-[#e2e8f0]">{deleteTarget?.account}</strong>? This action cannot be undone.
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
