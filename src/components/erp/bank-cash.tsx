'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Landmark, Wallet, TrendingUp, CheckCircle, Plus, Pencil,
  Trash2, Loader2, AlertTriangle, Building2, CreditCard,
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
interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNo: string;
  type: string;
  balance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountFormData {
  accountName: string;
  bankName: string;
  accountNo: string;
  type: string;
  balance: string;
  status: string;
}

const EMPTY_FORM: AccountFormData = {
  accountName: '', bankName: '', accountNo: '', type: 'Current', balance: '', status: 'Active',
};

const CREATE_FORM: AccountFormData = {
  accountName: '', bankName: '', accountNo: '', type: 'Current', balance: '0', status: 'Active',
};

const TYPE_OPTIONS = ['Current', 'Savings', 'Cash', 'OD', 'FD'];
const STATUS_OPTIONS = ['Active', 'Dormant', 'Closed'];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    Active: 'bg-[#00e676]/15 text-[#00e676]',
    Dormant: 'bg-[#f5a623]/15 text-[#f5a623]',
    Closed: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function typeIcon(type: string) {
  const m: Record<string, string> = {
    Current: 'text-[#00d4ff]',
    Savings: 'bg-[#00e676]/15 text-[#00e676]',
    Cash: 'bg-[#f5a623]/15 text-[#f5a623]',
    OD: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    FD: 'bg-[#a78bfa]/15 text-[#a78bfa]',
  };
  return m[type] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function typeBadge(type: string) {
  const m: Record<string, string> = {
    Current: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Savings: 'bg-[#00e676]/15 text-[#00e676]',
    Cash: 'bg-[#f5a623]/15 text-[#f5a623]',
    OD: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    FD: 'bg-[#a78bfa]/15 text-[#a78bfa]',
  };
  return m[type] || 'bg-[#5a6878]/15 text-[#5a6878]';
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
          {Array.from({ length: 4 }).map((_, i) => (
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
export default function BankCash() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<AccountFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bank-cash');
      const json = await res.json();
      if (json.success) setAccounts(json.data);
      else toast.error(json.error || 'Failed to fetch bank accounts');
    } catch {
      toast.error('Network error fetching bank accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const activeAccounts = accounts.filter(a => a.status === 'Active').length;
  const highestBalance = accounts.length > 0
    ? Math.max(...accounts.map(a => a.balance || 0))
    : 0;

  /* ── Form helpers ── */
  const updateForm = (field: keyof AccountFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.accountName || !form.bankName || !form.accountNo) {
      toast.error('Account Name, Bank Name, and Account No. are required');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/bank-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: form.accountName,
          bankName: form.bankName,
          accountNo: form.accountNo,
          type: form.type,
          balance: parseFloat(form.balance) || 0,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Bank account created successfully');
        setCreateOpen(false);
        setForm(CREATE_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create bank account');
      }
    } catch {
      toast.error('Network error creating bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.accountName || !form.bankName || !form.accountNo) {
      toast.error('Account Name, Bank Name, and Account No. are required');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/bank-cash', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTarget.id,
          accountName: form.accountName,
          bankName: form.bankName,
          accountNo: form.accountNo,
          type: form.type,
          balance: parseFloat(form.balance) || 0,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Bank account updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update bank account');
      }
    } catch {
      toast.error('Network error updating bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/bank-cash', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Bank account deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting bank account');
    }
  };

  const openEditDialog = (acc: BankAccount) => {
    setEditTarget(acc);
    setForm({
      accountName: acc.accountName,
      bankName: acc.bankName,
      accountNo: acc.accountNo,
      type: acc.type,
      balance: String(acc.balance),
      status: acc.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Total Balance Banner */}
      <div className="vc-panel" style={{ background: 'var(--vc-bg3)' }}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f5a623]/10 flex items-center justify-center">
              <Wallet size={24} className="text-[#f5a623]" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Liquid Assets</div>
              <div className="text-[28px] font-bold leading-none text-[#f5a623]"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {formatCurrency(totalBalance)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">Active Accounts</div>
            <div className="text-[20px] font-bold text-[#00e676]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {activeAccounts} <span className="text-[12px] text-[#5a6878] font-normal">of {accounts.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Landmark} label="Total Accounts" value={accounts.length} color="#f5a623" />
        <StatCard icon={Wallet} label="Total Balance" value={formatCurrency(totalBalance)} color="#00e676" />
        <StatCard icon={CheckCircle} label="Active Accounts" value={activeAccounts} color="#00d4ff" />
        <StatCard icon={TrendingUp} label="Highest Balance" value={formatCurrency(highestBalance)} color="#a78bfa" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Building2 size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Bank & Cash Accounts</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{accounts.length} Accounts</span>
          <button onClick={() => { setForm(CREATE_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Account
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Account Name', 'Bank', 'Account No.', 'Type', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <Landmark className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No bank accounts found</div>
                    </td>
                  </tr>
                ) : (
                  accounts.map(acc => (
                    <tr key={acc.id} className={`hover:bg-[#141920] transition-colors ${acc.status === 'Closed' ? 'opacity-50' : ''}`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#f5a623]/10 flex items-center justify-center shrink-0">
                            {acc.type === 'Cash' ? <Wallet size={13} className="text-[#f5a623]" /> :
                              acc.type === 'FD' ? <CreditCard size={13} className="text-[#a78bfa]" /> :
                              <Landmark size={13} className="text-[#00d4ff]" />}
                          </div>
                          <span className="text-[#e2e8f0] font-medium">{acc.accountName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{acc.bankName}</td>
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{acc.accountNo}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${typeBadge(acc.type)}`}>{acc.type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#00e676] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
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

        {/* Balance Footer */}
        {accounts.length > 0 && (
          <div className="border-t border-[#252e3a] px-4 py-3 flex items-center justify-between bg-[#0d1017]">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-[#f5a623]" />
              <span className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">Net Position</span>
            </div>
            <span className="text-[16px] font-bold text-[#f5a623]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Bank / Cash Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account Name *</label>
              <input type="text" value={form.accountName} onChange={e => updateForm('accountName', e.target.value)}
                placeholder="e.g. Operating Account" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Bank Name *</label>
              <input type="text" value={form.bankName} onChange={e => updateForm('bankName', e.target.value)}
                placeholder="e.g. HDFC Bank" className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account No. *</label>
                <input type="text" value={form.accountNo} onChange={e => updateForm('accountNo', e.target.value)}
                  placeholder="e.g. 1234567890" className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Initial Balance (₹)</label>
              <input type="number" step="0.01" min="0" value={form.balance} onChange={e => updateForm('balance', e.target.value)}
                placeholder="0.00" className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
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
              <Pencil size={16} /> Edit Account — {editTarget?.accountName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account Name *</label>
              <input type="text" value={form.accountName} onChange={e => updateForm('accountName', e.target.value)}
                className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Bank Name *</label>
              <input type="text" value={form.bankName} onChange={e => updateForm('bankName', e.target.value)}
                className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account No. *</label>
                <input type="text" value={form.accountNo} onChange={e => updateForm('accountNo', e.target.value)}
                  className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Balance (₹)</label>
              <input type="number" step="0.01" min="0" value={form.balance} onChange={e => updateForm('balance', e.target.value)}
                className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
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
              <AlertTriangle size={16} /> Delete Bank Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete <strong className="text-[#f5a623]">{deleteTarget?.accountName}</strong> at <strong className="text-[#e2e8f0]">{deleteTarget?.bankName}</strong> ({deleteTarget?.accountNo})? This action cannot be undone.
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
