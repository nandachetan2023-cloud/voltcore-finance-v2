'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Loader2, Search, Filter, Wallet, TrendingUp, TrendingDown, Scale, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

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
const STATUSES = ['Active', 'Inactive'];

const LEDGER_COLUMNS: ExportColumn<LedgerAccount>[] = [
  { header: 'Account Code', accessor: 'accountCode' },
  { header: 'Name', accessor: 'name' },
  { header: 'Parent Account', accessor: 'parentAccount' },
  { header: 'Group', accessor: 'group' },
  { header: 'Type', accessor: 'type' },
  { header: 'Balance', accessor: 'balance' },
  { header: 'Status', accessor: 'status' },
];

const LEDGER_IMPORT_FIELDS: ImportField[] = [
  { key: 'accountCode', label: 'Account Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'group', label: 'Group' },
  { key: 'type', label: 'Type' },
  { key: 'parentAccount', label: 'Parent Account' },
  { key: 'balance', label: 'Balance', type: 'number' },
  { key: 'status', label: 'Status' },
];
const LEDGER_SAMPLE_ROW = { accountCode: '4001', name: 'Project Revenue', group: 'Income', type: 'Income', parentAccount: '', balance: 5000000, status: 'Active' };

const GROUP_META: Record<string, { color: string; icon: typeof Wallet }> = {
  Assets: { color: '#00d4ff', icon: Wallet },
  Liabilities: { color: '#ff3d3d', icon: Scale },
  Income: { color: '#00e676', icon: TrendingUp },
  Expense: { color: '#f5a623', icon: TrendingDown },
};

function generateMockLedger(): LedgerAccount[] {
  return [
    { id: 1, accountCode: '1001', name: 'Cash in Hand', group: 'Assets', type: 'Debit', parentAccount: null, balance: 2500000, status: 'Active' },
    { id: 2, accountCode: '1002', name: 'Bank Account — SBI', group: 'Assets', type: 'Debit', parentAccount: null, balance: 18500000, status: 'Active' },
    { id: 3, accountCode: '2001', name: 'Accounts Payable', group: 'Liabilities', type: 'Credit', parentAccount: null, balance: 6844000, status: 'Active' },
    { id: 4, accountCode: '2002', name: 'GST Payable', group: 'Liabilities', type: 'Credit', parentAccount: null, balance: 3200000, status: 'Active' },
    { id: 5, accountCode: '3001', name: 'Revenue — NTPC', group: 'Income', type: 'Credit', parentAccount: null, balance: 12500000, status: 'Active' },
    { id: 6, accountCode: '3002', name: 'Revenue — BALCO', group: 'Income', type: 'Credit', parentAccount: null, balance: 8200000, status: 'Active' },
    { id: 7, accountCode: '4001', name: 'Material Expense', group: 'Expense', type: 'Debit', parentAccount: null, balance: 9100000, status: 'Active' },
    { id: 8, accountCode: '4002', name: 'Salary Expense', group: 'Expense', type: 'Debit', parentAccount: null, balance: 7500000, status: 'Active' },
  ];
}

const inr = (n: number) => `\u20B9${(n ?? 0).toLocaleString('en-IN')}`;
const inrL = (n: number) => `\u20B9${(n / 100000).toFixed(2)} L`;

export default function Ledger() {
  const [records, setRecords] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LedgerAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LedgerAccount | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ledger');
      const json = await res.json();
      if (json.success && json.data?.length) { setRecords(json.data); }
      else { setRecords(generateMockLedger()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockLedger()); toast.info('Sample data — API unavailable'); }
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
    if (!form.accountCode.trim() || !form.name.trim()) { toast.error('Account code and name are required'); return; }
    // Guard against duplicate codes (client-side; API enforces uniqueness too)
    const dup = records.find(r => r.accountCode.toLowerCase() === form.accountCode.trim().toLowerCase() && r.id !== editTarget?.id);
    if (dup) { toast.error(`Account code "${form.accountCode}" already exists`); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const payload = { ...form, accountCode: form.accountCode.trim(), name: form.name.trim(), parentAccount: form.parentAccount.trim() || null };
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
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

  const groupColor = (g: string | null) => GROUP_META[g || '']?.color || '#8899aa';

  /* ── Derived data: totals per group + filtered list ── */
  const totals = useMemo(() => {
    const acc: Record<string, number> = { Assets: 0, Liabilities: 0, Income: 0, Expense: 0 };
    records.forEach(r => { if (r.group && acc[r.group] !== undefined) acc[r.group] += r.balance || 0; });
    return acc;
  }, [records]);

  // Existing account codes/names available as parent options (exclude self when editing)
  const parentOptions = useMemo(
    () => records.filter(r => r.id !== editTarget?.id).map(r => ({ code: r.accountCode, name: r.name })),
    [records, editTarget],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r => {
      const matchSearch = q === '' ||
        r.accountCode.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.parentAccount || '').toLowerCase().includes(q);
      const matchGroup = groupFilter === 'all' || r.group === groupFilter;
      return matchSearch && matchGroup;
    });
  }, [records, search, groupFilter]);

  const filteredTotal = filtered.reduce((s, r) => s + (r.balance || 0), 0);
  const netPosition = (totals.Assets + totals.Income) - (totals.Liabilities + totals.Expense);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Ledger Accounts"
        fields={LEDGER_IMPORT_FIELDS}
        keyField="accountCode"
        existingKeys={new Set(records.map(r => r.accountCode))}
        commitEndpoint="/api/ledger/import"
        sampleRow={LEDGER_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* KPI Cards — balance by accounting group */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {GROUPS.map(g => {
          const meta = GROUP_META[g];
          const Icon = meta.icon;
          const count = records.filter(r => r.group === g).length;
          return (
            <div key={g} className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: meta.color }} />
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} style={{ color: meta.color }} />
                <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">{g}</span>
                <span className="ml-auto text-[9px] text-[#5a6878] font-mono">{count} a/c</span>
              </div>
              <div className="text-[18px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: meta.color }}>{inrL(totals[g])}</div>
            </div>
          );
        })}
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <BookOpen size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Chart of Accounts</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-2">{records.length} Accounts</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={LEDGER_COLUMNS} filename="ledger" />
            <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5">
              <Plus size={13} /> New Account
            </button>
          </div>
        </div>

        {/* Search + group filter */}
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search code, account name, parent..."
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg pl-9 pr-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-[#5a6878]" />
            {['all', ...GROUPS].map(f => (
              <button key={f} onClick={() => setGroupFilter(f)}
                className={`px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all ${groupFilter === f ? 'bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/30' : 'text-[#5a6878] hover:text-[#e2e8f0] border border-transparent'}`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          {(search || groupFilter !== 'all') && <button onClick={() => { setSearch(''); setGroupFilter('all'); }} className="text-[11px] text-[#f5a623] hover:underline">Clear</button>}
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Code', 'Account Name', 'Parent', 'Group', 'Type', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap ${h === 'Balance' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.accountCode}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td>
                    <td className="py-2.5 px-3 text-[#5a6878] font-mono whitespace-nowrap">{r.parentAccount || '—'}</td>
                    <td className="py-2.5 px-3 font-medium" style={{ color: groupColor(r.group) }}>{r.group || '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{r.type || '—'}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">{inr(r.balance)}</td>
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
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-[#5a6878]">{search || groupFilter !== 'all' ? 'No accounts match your filters.' : 'No ledger accounts yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer totals bar */}
        <div className="px-4 py-3 border-t border-[#252e3a] flex items-center justify-between bg-[#0a0d12] flex-wrap gap-3">
          <span className="text-[11px] text-[#5a6878]">
            Showing <span className="text-[#e2e8f0] font-medium">{filtered.length}</span> of {records.length} accounts
          </span>
          <div className="flex items-center gap-6 text-[12px] font-mono">
            <span className="text-[#5a6878]">Filtered total: <span className="text-[#e2e8f0] font-semibold">{inr(filteredTotal)}</span></span>
            <span className="text-[#5a6878]">Net position: <span className={`font-semibold ${netPosition >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{inr(netPosition)}</span></span>
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Account' : 'New Ledger Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account Code *</label>
                <input value={form.accountCode} onChange={e => setForm(p => ({ ...p, accountCode: e.target.value }))} className="vc-input" placeholder="e.g. 1001" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input appearance-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
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
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Parent Account</label>
              <select value={form.parentAccount} onChange={e => setForm(p => ({ ...p, parentAccount: e.target.value }))} className="vc-input appearance-none">
                <option value="">— None (top-level) —</option>
                {parentOptions.map(o => <option key={o.code} value={o.code}>{o.code} — {o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Opening Balance (&#8377;)</label>
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
