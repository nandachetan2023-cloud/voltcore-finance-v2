'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, CheckCircle, RotateCcw, CheckCheck, Loader2, Eye, XCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface BankAccount {
  id: number; accountName: string; bankName: string; branch: string | null;
  accountNo: string; ifsc: string | null; type: string; balance: number;
  currency: string; status: string;
}
interface BankTransaction {
  id: number; bankAccountId: number; date: string; type: string | null; transactionType?: string | null;
  amount: number; balance: number; reference: string | null; party: string | null;
  description: string | null; category: string | null; status: string;
  reconciled: boolean;
}

const BR_COLUMNS: ExportColumn<BankTransaction>[] = [
  { header: 'Transaction Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Type', accessor: 'type' },
  { header: 'Transaction Type', accessor: 'transactionType' },
  { header: 'Party', accessor: 'party' },
  { header: 'Description', accessor: 'description' },
  { header: 'Category', accessor: 'category' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Balance', accessor: 'balance' },
  { header: 'Reference', accessor: 'reference' },
  { header: 'Reconciled', accessor: (r) => r.reconciled ? 'Yes' : 'No' },
  { header: 'Status', accessor: 'status' },
];

const BR_IMPORT_FIELDS: ImportField[] = [
  { key: 'date', label: 'Transaction Date', type: 'date', required: true },
  { key: 'type', label: 'Type (Credit/Debit)', required: true },
  { key: 'transactionType', label: 'Transaction Type' },
  { key: 'party', label: 'Party' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'balance', label: 'Balance', type: 'number' },
  { key: 'reference', label: 'Reference' },
  { key: 'status', label: 'Status' },
];

const BR_SAMPLE_ROW: Record<string, string | number> = {
  date: '2026-01-20',
  type: 'Credit',
  transactionType: 'Receipt',
  party: 'NTPC Ltd',
  description: 'Client payment',
  category: 'Receipt',
  amount: 3500000,
  balance: 14800000,
  reference: 'CHQ/987654',
  status: 'Unreconciled',
};
interface AccountData extends BankAccount {
  unreconciled: BankTransaction[];
  reconciled: BankTransaction[];
}

const fmtINR = (n: number) => '₹' + (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (d: string) => d?.split('T')[0] || '—';

function generateMockReconciliationData(): AccountData[] {
  return [
    {
      id: 1, accountName: 'Operating Account', bankName: 'State Bank of India', branch: 'Nehru Place Branch',
      accountNo: '38201234567', ifsc: 'SBIN0001234', type: 'Current', balance: 12500000,
      currency: 'INR', status: 'Active',
      unreconciled: [
        { id: 101, bankAccountId: 1, date: '2025-05-28T00:00:00', type: 'Debit', amount: -1200000, balance: 11300000, reference: 'UTR/NEFT/250528/001', party: 'Tata Projects Ltd', description: 'Payment for May billing', category: 'Vendor Payment', status: 'Unreconciled', reconciled: false },
        { id: 102, bankAccountId: 1, date: '2025-05-27T00:00:00', type: 'Credit', amount: 3500000, balance: 14800000, reference: 'CHQ/987654', party: 'NTPC Ltd', description: 'Client payment — Invoice INV/2024-25/003', category: 'Receipt', status: 'Unreconciled', reconciled: false },
        { id: 103, bankAccountId: 1, date: '2025-05-25T00:00:00', type: 'Debit', amount: -450000, balance: 11300000, reference: 'IMPS/250525/003', party: 'HDFC Insurance', description: 'Annual insurance premium', category: 'Insurance', status: 'Unreconciled', reconciled: false },
        { id: 104, bankAccountId: 1, date: '2025-05-22T00:00:00', type: 'Debit', amount: -85000, balance: 11750000, reference: 'NEFT/250522/004', party: 'BSNL', description: 'Telephone & internet charges', category: 'Utilities', status: 'Unreconciled', reconciled: false },
      ],
      reconciled: [
        { id: 201, bankAccountId: 1, date: '2025-05-20T00:00:00', type: 'Debit', amount: -800000, balance: 12550000, reference: 'UTR/RTGS/250520/005', party: 'BHEL', description: 'Partial payment — turbine spares', category: 'Vendor Payment', status: 'Reconciled', reconciled: true },
        { id: 202, bankAccountId: 1, date: '2025-05-18T00:00:00', type: 'Credit', amount: 1800000, balance: 13350000, reference: 'CHQ/987655', party: 'BALCO', description: 'Payment receipt', category: 'Receipt', status: 'Reconciled', reconciled: true },
      ],
    },
    {
      id: 2, accountName: 'Project Account — NTPC', bankName: 'HDFC Bank', branch: 'Connaught Place Branch',
      accountNo: '50109876543', ifsc: 'HDFC0005678', type: 'Current', balance: 8750000,
      currency: 'INR', status: 'Active',
      unreconciled: [
        { id: 105, bankAccountId: 2, date: '2025-05-26T00:00:00', type: 'Debit', amount: -2200000, balance: 6550000, reference: 'NEFT/250526/006', party: 'Larsen & Toubro Ltd', description: 'Progress payment — structural works', category: 'Vendor Payment', status: 'Unreconciled', reconciled: false },
        { id: 106, bankAccountId: 2, date: '2025-05-24T00:00:00', type: 'Credit', amount: 4200000, balance: 10750000, reference: 'RTGS/250524/007', party: 'NTPC Ltd', description: 'Milestone payment received', category: 'Receipt', status: 'Unreconciled', reconciled: false },
      ],
      reconciled: [
        { id: 203, bankAccountId: 2, date: '2025-05-15T00:00:00', type: 'Debit', amount: -1500000, balance: 8050000, reference: 'CHQ/004567', party: 'Adani Defence Systems', description: 'Security system payment', category: 'Vendor Payment', status: 'Reconciled', reconciled: true },
      ],
    },
    {
      id: 3, accountName: 'Fixed Deposit', bankName: 'Punjab National Bank', branch: 'Karol Bagh Branch',
      accountNo: 'FD-2024-78901', ifsc: 'PUNB0007890', type: 'FD', balance: 5000000,
      currency: 'INR', status: 'Active',
      unreconciled: [],
      reconciled: [],
    },
  ];
}

export default function FinBankReconciliation() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailTx, setDetailTx] = useState<BankTransaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetch_ = useCallback(async (includeReconciled = false) => {
    try {
      setLoading(true);
      const r = await fetch(`/api/fin/bank-reconciliation?includeReconciled=${includeReconciled}`);
      const j = await r.json();
      if (j.success && j.data?.length) { setAccounts(j.data); }
      else { setAccounts(generateMockReconciliationData()); toast.info('Sample data — no server records found'); }
    } catch { setAccounts(generateMockReconciliationData()); toast.info('Sample data — API unavailable'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const activeAccount = useMemo(() => accounts.find((a) => a.id === selectedId), [accounts, selectedId]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedId) setSelectedId(accounts[0].id);
  }, [accounts, selectedId]);

  const unreconciled = useMemo(() => activeAccount?.unreconciled ?? [], [activeAccount]);
  const reconciled = useMemo(() => activeAccount?.reconciled ?? [], [activeAccount]);

  const totalUnreconciled = useMemo(() => accounts.reduce((s, a) => s + a.unreconciled.reduce((x, t) => x + t.amount, 0), 0), [accounts]);
  const totalReconciled = useMemo(() => accounts.reduce((s, a) => s + a.reconciled.reduce((x, t) => x + t.amount, 0), 0), [accounts]);
  const diff = totalUnreconciled - totalReconciled;

  const unreconciledTc = useTableControls(unreconciled, (r) => `${r.date} ${r.type ?? ''} ${r.party ?? ''} ${r.description ?? ''} ${r.reference ?? ''} ${r.category ?? ''}`);
  const reconciledTc = useTableControls(reconciled, (r) => `${r.date} ${r.type ?? ''} ${r.party ?? ''} ${r.description ?? ''} ${r.reference ?? ''} ${r.category ?? ''}`);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = unreconciledTc.pageItems.map((t) => t.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); pageIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); pageIds.forEach((id) => n.add(id)); return n; });
    }
  };

  const reconcileSingle = async (id: number) => {
    setSubmitting(true);
    try {
      const r = await fetch('/api/fin/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id }),
      });
      const j = await r.json();
      if (j.success) { toast.success('Reconciled'); setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; }); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const reconcileSelected = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/fin/bank-reconciliation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: Array.from(selectedIds) }),
      });
      const j = await r.json();
      if (j.success) { toast.success(`${selectedIds.size} reconciled`); setSelectedIds(new Set()); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const reconcileAll = async () => {
    if (unreconciled.length === 0) return;
    setSubmitting(true);
    try {
      const ids = unreconciled.map((t) => t.id);
      const r = await fetch('/api/fin/bank-reconciliation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: ids }),
      });
      const j = await r.json();
      if (j.success) { toast.success(`${ids.length} reconciled`); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const unReconcile = async (id: number) => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/fin/bank-reconciliation?transactionId=${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Un-reconciled'); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const viewDetail = (tx: BankTransaction) => { setDetailTx(tx); setDetailOpen(true); };

  const totalUnrecCount = useMemo(() => accounts.reduce((s, a) => s + a.unreconciled.length, 0), [accounts]);

  if (loading && accounts.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;
  }

  if (importOpen && selectedId) {
    return (
      <ImportWizard
        title={`Bank Reconciliation — ${activeAccount?.accountName ?? ''}`}
        fields={BR_IMPORT_FIELDS}
        keyField="reference"
        existingKeys={new Set()}
        commitEndpoint={`/api/fin/bank-reconciliation/import?bankAccountId=${selectedId}`}
        sampleRow={BR_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={() => fetch_()}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[#f5a623]" />
          <span className="text-[14px] font-semibold text-[#e2e8f0]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>Bank Reconciliation</span>
          <span className="text-[10px] text-[#5a6878] bg-[#0f1318] px-2 py-0.5 rounded-full font-mono">{totalUnrecCount} unreconciled</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Unreconciled Amount</div>
          <div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtINR(totalUnreconciled)}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Reconciled Amount</div>
          <div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtINR(totalReconciled)}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Difference</div>
          <div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtINR(diff)}</div>
        </div>
      </div>

      {/* Account selector & actions */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <div className="flex items-center gap-2 flex-1">
            <select
              value={selectedId ?? ''}
              onChange={(e) => { setSelectedId(Number(e.target.value)); setSelectedIds(new Set()); }}
              className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.accountName} — {a.bankName} ({a.accountNo})</option>
              ))}
            </select>
            <div className="text-[10px] text-[#5a6878] font-mono">
              {activeAccount && (
                <>Bal: {fmtINR(activeAccount.balance)} | {activeAccount.unreconciled.length} pending</>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={reconcileSelected}
                disabled={submitting}
                className="vc-btn-primary flex items-center gap-1.5 text-[11px]"
              >
                <CheckCheck size={13} /> Reconcile Selected ({selectedIds.size})
              </button>
            )}
            <button
              onClick={reconcileAll}
              disabled={submitting || unreconciled.length === 0}
              className="vc-btn-primary flex items-center gap-1.5 text-[11px]"
            >
              <CheckCircle size={13} /> Reconcile All
            </button>
            <button
              onClick={() => fetch_(true)}
              className="vc-btn-ghost flex items-center gap-1 text-[11px]"
            >
              <RotateCcw size={12} /> Refresh
            </button>
            <button onClick={() => setImportOpen(true)} disabled={!selectedId} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"><Upload size={13} /> Import</button><ExportButton records={unreconciled} columns={BR_COLUMNS} filename="fin-bank-reconciliation" />
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Unreconciled panel */}
        <div className="vc-panel flex flex-col">
          <div className="vc-panel-header">
            <XCircle size={14} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Unreconciled Transactions</span>
            <span className="text-[10px] text-[#f5a623] font-mono ml-1">({unreconciled.length})</span>
            <div className="ml-auto"><SearchInput value={unreconciledTc.search} onChange={unreconciledTc.setSearch} placeholder="Filter..." /></div>
          </div>
          <div className="overflow-x-auto flex-1">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    <th className="text-left py-2 px-2 w-8">
                      <input
                        type="checkbox"
                        checked={unreconciledTc.pageItems.length > 0 && unreconciledTc.pageItems.every((t) => selectedIds.has(t.id))}
                        onChange={toggleSelectAll}
                        className="accent-[#f5a623]"
                      />
                    </th>
                    {['Date', 'Type', 'Txn Type', 'Party', 'Description', 'Amount', 'Reference', ''].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {unreconciledTc.pageItems.map((t) => (
                    <tr key={t.id} className="hover:bg-[#141920] cursor-pointer" onClick={() => viewDetail(t)}>
                      <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="accent-[#f5a623]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-[#8899aa] font-mono">{fmtDate(t.date)}</td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${t.type === 'Credit' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{t.type || '—'}</span></td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${t.transactionType === 'Receipt' ? 'bg-[#00e676]/15 text-[#00e676]' : t.transactionType === 'Contra' || t.transactionType === 'Transfer' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : t.transactionType === 'Payment' || t.transactionType === 'Charges' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : t.transactionType === 'Interest' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{t.transactionType || '—'}</span></td>
                      <td className="py-2.5 px-3 text-[#e2e8f0]">{t.party || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate">{t.description || '—'}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(t.amount)}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{t.reference || '—'}</td>
                      <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            onClick={() => reconcileSingle(t.id)}
                            disabled={submitting}
                            className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10"
                            title="Reconcile"
                          >
                            <CheckCheck size={13} />
                          </button>
                          <button
                            onClick={() => viewDetail(t)}
                            className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
                            title="View"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {unreconciledTc.pageItems.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">All reconciled</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={unreconciledTc.page} totalPages={unreconciledTc.totalPages} pageSize={unreconciledTc.pageSize} setPage={unreconciledTc.setPage} setPageSize={unreconciledTc.setPageSize} from={unreconciledTc.from} to={unreconciledTc.to} total={unreconciledTc.total} />
          </div>
        </div>

        {/* Reconciled panel */}
        <div className="vc-panel flex flex-col">
          <div className="vc-panel-header">
            <CheckCircle size={14} className="text-[#00e676]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Reconciled Transactions</span>
            <span className="text-[10px] text-[#00e676] font-mono ml-1">({reconciled.length})</span>
            <div className="ml-auto"><SearchInput value={reconciledTc.search} onChange={reconciledTc.setSearch} placeholder="Filter..." /></div>
          </div>
          <div className="overflow-x-auto flex-1">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    {['Date', 'Type', 'Txn Type', 'Party', 'Description', 'Amount', 'Reference', ''].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {reconciledTc.pageItems.map((t) => (
                    <tr key={t.id} className="hover:bg-[#141920] cursor-pointer opacity-80" onClick={() => viewDetail(t)}>
                      <td className="py-2.5 px-3 text-[#8899aa] font-mono">{fmtDate(t.date)}</td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${t.type === 'Credit' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{t.type || '—'}</span></td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${t.transactionType === 'Receipt' ? 'bg-[#00e676]/15 text-[#00e676]' : t.transactionType === 'Contra' || t.transactionType === 'Transfer' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : t.transactionType === 'Payment' || t.transactionType === 'Charges' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : t.transactionType === 'Interest' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{t.transactionType || '—'}</span></td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{t.party || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate">{t.description || '—'}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(t.amount)}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{t.reference || '—'}</td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); unReconcile(t.id); }}
                          disabled={submitting}
                          className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10"
                          title="Un-reconcile"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reconciledTc.pageItems.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No reconciled transactions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={reconciledTc.page} totalPages={reconciledTc.totalPages} pageSize={reconciledTc.pageSize} setPage={reconciledTc.setPage} setPageSize={reconciledTc.setPageSize} from={reconciledTc.from} to={reconciledTc.to} total={reconciledTc.total} />
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          {detailTx && (
            <div className="space-y-3">
              <DialogTitle className="text-[14px] font-semibold text-[#f5a623]">Transaction Detail</DialogTitle>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><span className="text-[#5a6878]">Date</span><div className="text-[#e2e8f0]">{fmtDate(detailTx.date)}</div></div>
                <div><span className="text-[#5a6878]">Type</span><div>{detailTx.type}</div></div>
                <div><span className="text-[#5a6878]">Party</span><div className="text-[#e2e8f0]">{detailTx.party || '—'}</div></div>
                <div><span className="text-[#5a6878]">Amount</span><div className="text-[#e2e8f0] font-mono">{fmtINR(detailTx.amount)}</div></div>
                <div className="col-span-2"><span className="text-[#5a6878]">Description</span><div className="text-[#e2e8f0]">{detailTx.description || '—'}</div></div>
                <div><span className="text-[#5a6878]">Reference</span><div className="text-[#e2e8f0] font-mono text-[11px]">{detailTx.reference || '—'}</div></div>
                <div><span className="text-[#5a6878]">Category</span><div className="text-[#e2e8f0]">{detailTx.category || '—'}</div></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
