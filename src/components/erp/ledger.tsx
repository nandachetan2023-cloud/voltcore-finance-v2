'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, CheckCircle, AlertTriangle, ArrowDownCircle,
  ArrowUpCircle, Plus, Pencil, Trash2, Loader2,
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
interface LedgerAccount {
  id: string;
  accountCode: string;
  name: string;
  group: string;
  type: string;
  balance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface LedgerFormData {
  name: string;
  group: string;
  type: string;
  balance: string;
  status: string;
}

const EMPTY_FORM: LedgerFormData = {
  name: '', group: 'Current Assets', type: 'Asset', balance: '0', status: 'Active',
};

const GROUP_OPTIONS = ['Current Assets', 'Current Liabilities', 'Fixed Assets', 'Equity', 'Income', 'Direct Costs', 'Overheads'];
const TYPE_OPTIONS = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Frozen'];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    Active: 'bg-[#00e676]/15 text-[#00e676]',
    Inactive: 'bg-[#5a6878]/15 text-[#5a6878]',
    Frozen: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function groupBadge(g: string) {
  const m: Record<string, string> = {
    'Current Assets': 'bg-[#00d4ff]/15 text-[#00d4ff]',
    'Fixed Assets': 'bg-[#00d4ff]/25 text-[#00d4ff]',
    'Current Liabilities': 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Income: 'bg-[#00e676]/15 text-[#00e676]',
    'Direct Costs': 'bg-[#f5a623]/15 text-[#f5a623]',
    Overheads: 'bg-[#a78bfa]/15 text-[#a78bfa]',
    Equity: 'bg-[#b388ff]/15 text-[#b388ff]',
    Assets: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Liabilities: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Expense: 'bg-[#f5a623]/15 text-[#f5a623]',
  };
  return m[g] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function typeBadge(t: string) {
  const m: Record<string, string> = {
    Asset: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Liability: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Equity: 'bg-[#b388ff]/15 text-[#b388ff]',
    Revenue: 'bg-[#00e676]/15 text-[#00e676]',
    Expense: 'bg-[#f5a623]/15 text-[#f5a623]',
    Debit: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Credit: 'bg-[#00e676]/15 text-[#00e676]',
  };
  return m[t] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
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
export default function Ledger() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LedgerAccount | null>(null);
  const [editTarget, setEditTarget] = useState<LedgerAccount | null>(null);
  const [form, setForm] = useState<LedgerFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ledger');
      const json = await res.json();
      if (json.success) setAccounts(json.data);
      else toast.error(json.error || 'Failed to fetch ledger accounts');
    } catch {
      toast.error('Network error fetching ledger accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.status === 'Active').length;
  const totalDebitBalance = accounts.filter(a => a.type === 'Debit').reduce((s, a) => s + a.balance, 0);
  const totalCreditBalance = accounts.filter(a => a.type === 'Credit').reduce((s, a) => s + a.balance, 0);

  /* ── Form helpers ── */
  const updateForm = (field: keyof LedgerFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.group || !form.type) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Ledger account created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create ledger account');
      }
    } catch {
      toast.error('Network error creating ledger account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.name || !form.group || !form.type) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/ledger', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Ledger account updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update ledger account');
      }
    } catch {
      toast.error('Network error updating ledger account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/ledger', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Ledger account deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting ledger account');
    }
  };

  const openEditDialog = (acc: LedgerAccount) => {
    setEditTarget(acc);
    setForm({
      name: acc.name,
      group: acc.group,
      type: acc.type,
      balance: String(acc.balance),
      status: acc.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Total Accounts" value={totalAccounts} color="#f5a623" />
        <StatCard icon={CheckCircle} label="Active Accounts" value={activeAccounts} color="#00e676" />
        <StatCard icon={ArrowDownCircle} label="Total Debit Balance" value={formatCurrency(totalDebitBalance)} color="#ff3d3d" />
        <StatCard icon={ArrowUpCircle} label="Total Credit Balance" value={formatCurrency(totalCreditBalance)} color="#00d4ff" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <BookOpen size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Chart of Accounts</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{accounts.length} Accounts</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Account
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Code', 'Name', 'Group', 'Type', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <BookOpen className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No ledger accounts found</div>
                    </td>
                  </tr>
                ) : (
                  accounts.map(acc => (
                    <tr key={acc.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{acc.accountCode}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{acc.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${groupBadge(acc.group)}`}>{acc.group}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${typeBadge(acc.type)}`}>
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {formatCurrency(acc.balance)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${statusBadge(acc.status)}`}>{acc.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditDialog(acc)}
                            className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { setDeleteTarget(acc); setDeleteOpen(true); }}
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
              <Plus size={16} /> New Ledger Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account Name *</label>
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Cash in Hand" className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Group *</label>
                <select value={form.group} onChange={e => updateForm('group', e.target.value)} className="vc-input appearance-none">
                  {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type *</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Initial Balance</label>
                <input type="number" step="0.01" value={form.balance} onChange={e => updateForm('balance', e.target.value)} placeholder="0.00" className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Account
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Account — {editTarget?.accountCode}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account Name *</label>
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Group *</label>
                <select value={form.group} onChange={e => updateForm('group', e.target.value)} className="vc-input appearance-none">
                  {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type *</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Balance</label>
                <input type="number" step="0.01" value={form.balance} onChange={e => updateForm('balance', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
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
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Update Account
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Ledger Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete account <strong className="text-[#f5a623]">{deleteTarget?.accountCode}</strong> — <strong className="text-[#e2e8f0]">{deleteTarget?.name}</strong>? This action cannot be undone.
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
