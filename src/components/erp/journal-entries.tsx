'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, Trash2, Search, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface JournalEntry {
  id: number; entryNo: string; date: string; account: string;
  accountName: string | null; debit: number; credit: number;
  description: string | null; reference: string | null;
  voucherType: string | null; status: string;
}

export default function JournalEntries() {
  const [records, setRecords] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [search, setSearch] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    try { setLoading(true); const res = await fetch('/api/journal-entries'); const json = await res.json(); if (json.success) setRecords(json.data); }
    catch { toast.error('Failed to fetch journal entries'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, voucherFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { const r = await fetch(`/api/journal-entries?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Entry deleted'); setDeleteOpen(false); await fetchData(); } else toast.error(j.error || 'Failed'); }
    catch { toast.error('Network error'); }
  };

  const handleExport = () => { window.open('/api/journal-entries?format=csv', '_blank'); };

  // Filter + paginate
  const filtered = records.filter(r => {
    const matchSearch = search === '' ||
      r.entryNo.toLowerCase().includes(search.toLowerCase()) ||
      (r.accountName || r.account).toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.reference || '').toLowerCase().includes(search.toLowerCase());
    const matchVoucher = voucherFilter === 'all' || r.voucherType === voucherFilter;
    return matchSearch && matchVoucher;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
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

  return (
    <div className="space-y-4">
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
          <div className={`text-[18px] font-bold ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{Math.abs(totalDebit - totalCredit) < 0.01 ? 'Balanced' : `&#8377;${Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')}`}</div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">General Ledger — Journal Entries</span>
          <button onClick={handleExport} className="vc-btn-ghost flex items-center gap-1.5 ml-auto" title="Export CSV"><Download size={13} /> Export</button>
        </div>

        {/* Search + Filter bar */}
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
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
                {['Entry No', 'Date', 'Account', 'Description', 'Reference', 'Voucher', 'Debit', 'Credit', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                ))}
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
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{r.debit > 0 ? <span className="text-[#00e676]">&#8377;{r.debit.toLocaleString('en-IN')}</span> : <span className="text-[#5a6878]">—</span>}</td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{r.credit > 0 ? <span className="text-[#ff3d3d]">&#8377;{r.credit.toLocaleString('en-IN')}</span> : <span className="text-[#5a6878]">—</span>}</td>
                  <td className="py-2.5 px-3"><button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-[#5a6878]">{search || voucherFilter !== 'all' ? 'No entries match your filters.' : 'No journal entries yet.'}</td></tr>}
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
            <span className="text-[#5a6878]">Dr: <span className="text-[#00e676] font-semibold">&#8377;{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
            <span className="text-[#5a6878]">Cr: <span className="text-[#ff3d3d] font-semibold">&#8377;{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Journal Entry</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete entry <strong className="text-[#f5a623]">{deleteTarget?.entryNo}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
