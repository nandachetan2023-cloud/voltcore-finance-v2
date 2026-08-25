'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, Trash2, Search, Filter, Upload, Send, CheckCircle2, XCircle, History } from 'lucide-react';
import { SortableTh } from './_table-controls';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { getCurrentUserEmail } from '@/lib/current-user';

interface JournalEntry {
  id: number; entryId: number; entryNo: string; date: string; account: string;
  accountName: string | null; debit: number; credit: number;
  description: string | null; reference: string | null;
  voucherType: string | null; status: string;
  submittedBy?: string | null; submittedAt?: string | null;
  approvedBy?: string | null; approvedAt?: string | null;
  rejectionReason?: string | null;
}

interface ApprovalLog { id: number; status: string; action: string; makerId: string | null; checkerId: string | null; comments: string | null; createdAt: string; }

const statusBadge = (s: string) => {
  if (s === 'Posted') return 'bg-[#00e676]/15 text-[#00e676]';
  if (s === 'Pending') return 'bg-[#f5a623]/15 text-[#f5a623]';
  if (s === 'Rejected') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
  return 'bg-[#5a6878]/15 text-[#5a6878]'; // Draft / Reversed
};

const JE_COLUMNS: ExportColumn<JournalEntry>[] = [
  { header: 'Entry No', accessor: 'entryNo' },
  { header: 'Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Account', accessor: 'account' },
  { header: 'Account Name', accessor: 'accountName' },
  { header: 'Description', accessor: 'description' },
  { header: 'Reference', accessor: 'reference' },
  { header: 'Voucher Type', accessor: 'voucherType' },
  { header: 'Debit', accessor: 'debit' },
  { header: 'Credit', accessor: 'credit' },
  { header: 'Status', accessor: 'status' },
];

const JE_IMPORT_FIELDS: ImportField[] = [
  { key: 'entryNo', label: 'Entry No', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'account', label: 'Account', required: true },
  { key: 'accountName', label: 'Account Name' },
  { key: 'description', label: 'Description' },
  { key: 'reference', label: 'Reference' },
  { key: 'voucherType', label: 'Voucher Type' },
  { key: 'debit', label: 'Debit', type: 'number' },
  { key: 'credit', label: 'Credit', type: 'number' },
  { key: 'status', label: 'Status' },
];
const JE_SAMPLE_ROW = { entryNo: 'JE-2026-001', date: '2026-01-31', account: 'Project Revenue', accountName: 'Revenue', description: 'Monthly revenue', reference: 'INV-001', voucherType: 'Journal', debit: 0, credit: 2950000, status: 'Posted' };

function generateMockJournal(): JournalEntry[] {
  return [
    { id: 1, entryId: 1, entryNo: 'JE/2024-25/001', date: '2025-01-10T00:00:00', account: '1002', accountName: 'Bank Account — SBI', debit: 5310000, credit: 0, description: 'Receipt from NTPC — INV/001', reference: 'AR/2024-25/001', voucherType: 'Receipt', status: 'Posted' },
    { id: 2, entryId: 2, entryNo: 'JE/2024-25/002', date: '2025-01-12T00:00:00', account: '4001', accountName: 'Material Expense', debit: 0, credit: 3200000, description: 'ABB India — HT panel supply', reference: 'AP/2024-25/001', voucherType: 'Payment', status: 'Posted' },
    { id: 3, entryId: 3, entryNo: 'JE/2024-25/003', date: '2025-01-15T00:00:00', account: '1001', accountName: 'Cash in Hand', debit: 250000, credit: 0, description: 'Petty cash withdrawal', reference: 'PC/001', voucherType: 'Contra', status: 'Posted' },
    { id: 4, entryId: 4, entryNo: 'JE/2024-25/004', date: '2025-02-01T00:00:00', account: '3001', accountName: 'Revenue — NTPC', debit: 0, credit: 4500000, description: 'Monthly billing — NTPC Jan 2025', reference: 'AR/2024-25/002', voucherType: 'Journal', status: 'Draft' },
    { id: 5, entryId: 5, entryNo: 'JE/2024-25/005', date: '2025-02-05T00:00:00', account: '4002', accountName: 'Salary Expense', debit: 7500000, credit: 0, description: 'Feb 2025 salary — all sites', reference: 'PAY/02-2025', voucherType: 'Payment', status: 'Pending' },
  ];
}

export default function JournalEntries() {
  const [records, setRecords] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [search, setSearch] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<JournalEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [historyTarget, setHistoryTarget] = useState<JournalEntry | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ApprovalLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/journal-entries');
      const json = await res.json();
      if (json.success && json.data?.length) { setRecords(json.data); }
      else { setRecords(generateMockJournal()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockJournal()); toast.info('Sample data — API unavailable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const onDataChanged = () => fetchData();
    window.addEventListener('finance:data-changed', onDataChanged);
    return () => window.removeEventListener('finance:data-changed', onDataChanged);
  }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, voucherFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { const r = await fetch(`/api/journal-entries?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Entry deleted'); setDeleteOpen(false); await fetchData(); } else toast.error(j.error || 'Failed'); }
    catch { toast.error('Network error'); }
  };

  const runApprovalAction = async (entryId: number, action: 'submit' | 'approve' | 'reject', comments?: string) => {
    setApprovalSubmitting(true);
    try {
      const r = await fetch('/api/journal-entries/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, action, comments, actor: getCurrentUserEmail() }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(action === 'submit' ? 'Submitted for approval' : action === 'approve' ? 'Entry posted' : 'Entry rejected');
        setRejectTarget(null); setRejectReason('');
        await fetchData();
      } else toast.error(j.error || 'Action failed');
    } catch { toast.error('Network error'); }
    finally { setApprovalSubmitting(false); }
  };

  const openHistory = async (r: JournalEntry) => {
    setHistoryTarget(r);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/journal-entries/approve?id=${r.entryId}`);
      const j = await res.json();
      setHistoryLogs(j.success ? j.data : []);
    } catch { setHistoryLogs([]); }
    finally { setHistoryLoading(false); }
  };

  // Filter + sort + paginate
  const filtered = records.filter(r => {
    const matchSearch = search === '' ||
      r.entryNo.toLowerCase().includes(search.toLowerCase()) ||
      (r.accountName || r.account).toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.reference || '').toLowerCase().includes(search.toLowerCase());
    const matchVoucher = voucherFilter === 'all' || r.voucherType === voucherFilter;
    return matchSearch && matchVoucher;
  });

  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc'; accessor?: (r: JournalEntry) => unknown }>({ key: null, dir: 'asc' });
  const toggleSort = (key: string, accessor: (r: JournalEntry) => unknown) => {
    setSort(prev => prev.key !== key ? { key, dir: 'asc', accessor } : prev.dir === 'asc' ? { key, dir: 'desc', accessor } : { key: null, dir: 'asc' });
  };
  const sorted = sort.key && sort.accessor ? [...filtered].sort((a, b) => {
    const av = sort.accessor!(a); const bv = sort.accessor!(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).toLowerCase() < String(bv).toLowerCase() ? -1 : String(av).toLowerCase() > String(bv).toLowerCase() ? 1 : 0;
    return sort.dir === 'desc' ? -cmp : cmp;
  }) : filtered;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  const totalDebit = filtered.reduce((s, r) => s + r.debit, 0);
  const totalCredit = filtered.reduce((s, r) => s + r.credit, 0);
  const voucherTypes = [...new Set(records.map(r => r.voucherType).filter(Boolean))] as string[];

  const voucherColor = (v: string | null) => {
    if (v === 'Payment') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    if (v === 'Receipt') return 'bg-[#00e676]/15 text-[#00e676]';
    if (v === 'Journal') return 'bg-[#00d4ff]/15 text-[#00d4ff]';
    if (v === 'Contra') return 'bg-[#a78bfa]/15 text-[#a78bfa]';
    return 'bg-[#5a6878]/15 text-[#5a6878]';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Journal Entries"
        fields={JE_IMPORT_FIELDS}
        keyField="entryNo"
        existingKeys={new Set(records.map(r => r.entryNo))}
        commitEndpoint="/api/journal-entries/import"
        sampleRow={JE_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Debit</div>
          <div className="text-[18px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalDebit / 100000).toFixed(2)} L</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Credit</div>
          <div className="text-[18px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalCredit / 100000).toFixed(2)} L</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Entries</div>
          <div className="text-[18px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{filtered.length}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Balance</div>
          <div className={`text-[18px] font-bold ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{Math.abs(totalDebit - totalCredit) < 0.01 ? 'Balanced' : `&#8377;${(Math.abs(totalDebit - totalCredit) ?? 0).toLocaleString('en-IN')}`}</div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">General Ledger — Journal Entries</span>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={JE_COLUMNS} filename="journal-entries" />
        </div>

        {/* Search + Filter bar */}
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <div className="relative w-1/2 min-w-[110px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search entry no, account, description, reference..."
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg pl-9 pr-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-[#5a6878]" />
            {['all', ...voucherTypes].map(f => (
              <button key={f} onClick={() => setVoucherFilter(f)}
                className={`px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all ${voucherFilter === f ? 'bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/30' : 'text-[#5a6878] hover:text-[#e2e8f0] border border-transparent'}`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          {(search || voucherFilter !== 'all') && <button onClick={() => { setSearch(''); setVoucherFilter('all'); }} className="text-[11px] text-[#f5a623] hover:underline">Clear</button>}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0f1318]">
                <SortableTh label="Entry No" sortKey="entryNo" accessor={(r: JournalEntry) => r.entryNo} sort={sort} toggleSort={toggleSort} />
                <SortableTh label="Date" sortKey="date" accessor={(r: JournalEntry) => r.date} sort={sort} toggleSort={toggleSort} />
                <SortableTh label="Account" sortKey="account" accessor={(r: JournalEntry) => r.accountName || r.account} sort={sort} toggleSort={toggleSort} />
                <SortableTh label="Description" sortKey="description" accessor={(r: JournalEntry) => r.description} sort={sort} toggleSort={toggleSort} />
                <SortableTh label="Reference" sortKey="reference" accessor={(r: JournalEntry) => r.reference} sort={sort} toggleSort={toggleSort} />
                <SortableTh label="Voucher" sortKey="voucherType" accessor={(r: JournalEntry) => r.voucherType} sort={sort} toggleSort={toggleSort} />
                <SortableTh label="Debit" sortKey="debit" accessor={(r: JournalEntry) => r.debit} sort={sort} toggleSort={toggleSort} align="right" />
                <SortableTh label="Credit" sortKey="credit" accessor={(r: JournalEntry) => r.credit} sort={sort} toggleSort={toggleSort} align="right" />
                <SortableTh label="Status" sortKey="status" accessor={(r: JournalEntry) => r.status} sort={sort} toggleSort={toggleSort} />
                <th className="py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2028]">
              {paged.map(r => (
                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.entryNo}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{typeof r.date === 'string' ? r.date.split('T')[0] : ''}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.accountName || r.account}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] max-w-[220px] truncate">{r.description || '—'}</td>
                  <td className="py-2.5 px-3 text-[#5a6878] font-mono">{r.reference || '—'}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${voucherColor(r.voucherType)}`}>{r.voucherType || '—'}</span></td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{r.debit > 0 ? <span className="text-[#00e676]">&#8377;{(r.debit ?? 0).toLocaleString('en-IN')}</span> : <span className="text-[#5a6878]">—</span>}</td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{r.credit > 0 ? <span className="text-[#ff3d3d]">&#8377;{(r.credit ?? 0).toLocaleString('en-IN')}</span> : <span className="text-[#5a6878]">—</span>}</td>
                  <td className="py-2.5 px-3"><button onClick={() => openHistory(r)} className={`vc-badge ${statusBadge(r.status)} cursor-pointer`} title="View approval history"><History size={10} className="mr-1" />{r.status}</button></td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      {(r.status === 'Draft' || r.status === 'Rejected') && <button onClick={() => runApprovalAction(r.entryId, 'submit')} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10 disabled:opacity-50" title="Submit for approval"><Send size={13} /></button>}
                      {r.status === 'Pending' && <>
                        <button onClick={() => runApprovalAction(r.entryId, 'approve')} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 disabled:opacity-50" title="Approve &amp; Post"><CheckCircle2 size={13} /></button>
                        <button onClick={() => { setRejectTarget(r); setRejectReason(''); }} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 disabled:opacity-50" title="Reject"><XCircle size={13} /></button>
                      </>}
                      <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">{search || voucherFilter !== 'all' ? 'No entries match your filters.' : 'No journal entries yet.'}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#252e3a] flex items-center justify-between">
            <span className="text-[11px] text-[#5a6878]">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded text-[11px] bg-[#0a0d12] border border-[#252e3a] text-[#e2e8f0] hover:border-[#f5a623] disabled:opacity-40">Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pn = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded text-[11px] font-medium ${page === pn ? 'bg-[#f5a623] text-[#0a0d12]' : 'bg-[#0a0d12] border border-[#252e3a] text-[#8899aa] hover:border-[#f5a623]'}`}>{pn}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded text-[11px] bg-[#0a0d12] border border-[#252e3a] text-[#e2e8f0] hover:border-[#f5a623] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

        {/* Footer totals bar */}
        <div className="px-4 py-3 border-t border-[#252e3a] flex items-center justify-between bg-[#0a0d12]">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#5a6878]">Period: <span className="text-[#e2e8f0] font-medium">FY 2024-25</span></span>
            <span className="text-[#5a6878]">Status: <span className="text-[#00e676] font-medium">Period Open</span></span>
          </div>
          <div className="flex items-center gap-6 text-[12px] font-mono">
            <span className="text-[#5a6878]">Dr: <span className="text-[#00e676] font-semibold">&#8377;{(totalDebit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
            <span className="text-[#5a6878]">Cr: <span className="text-[#ff3d3d] font-semibold">&#8377;{(totalCredit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Journal Entry</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete entry <strong className="text-[#f5a623]">{deleteTarget?.entryNo}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#ff3d3d] flex items-center gap-2"><XCircle size={16} /> Reject Entry {rejectTarget?.entryNo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason for Rejection *</label><textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="vc-input min-h-[80px]" placeholder="Explain what needs to be fixed before resubmission..." /></div>
          </div>
          <DialogFooter>
            <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="vc-btn-ghost text-[11px]">Cancel</button>
            <button onClick={() => rejectTarget && runApprovalAction(rejectTarget.entryId, 'reject', rejectReason)} disabled={!rejectReason.trim() || approvalSubmitting} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg px-4 py-2 text-[11px] font-semibold disabled:opacity-50">{approvalSubmitting ? 'Rejecting...' : 'Reject Entry'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyTarget} onOpenChange={(o) => { if (!o) setHistoryTarget(null); }}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#f5a623] flex items-center gap-2"><History size={16} /> Approval History — {historyTarget?.entryNo}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {historyLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#f5a623]" size={20} /></div>
              : historyLogs.length === 0 ? <div className="text-[11px] text-[#5a6878] text-center py-6">No approval history yet</div>
              : historyLogs.map(log => (
                <div key={log.id} className="border border-[#252e3a] rounded-lg p-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`vc-badge ${statusBadge(log.status)}`}>{log.action}</span>
                    <span className="text-[10px] text-[#5a6878]">{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[11px] text-[#8899aa] mt-1">{log.makerId || log.checkerId || 'System'}</div>
                  {log.comments && <div className="text-[11px] text-[#e2e8f0] mt-1 italic">"{log.comments}"</div>}
                </div>
              ))}
          </div>
          <DialogFooter><button onClick={() => setHistoryTarget(null)} className="vc-btn-ghost text-[11px]">Close</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
