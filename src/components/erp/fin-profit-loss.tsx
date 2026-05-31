'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Loader2, Upload, Trash2, Search, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface PLEntry {
  id: number; site: string; month: string; side: string;
  category: string; particular: string; amount: number;
}

interface Summary { sites: string[]; months: string[]; totalDebit: number; totalCredit: number; netPL: number; }

export default function FinProfitLoss() {
  const [records, setRecords] = useState<PLEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({ sites: [], months: [], totalDebit: 0, totalCredit: 0, netPL: 0 });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [siteFilter, setSiteFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('dashboard');

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (siteFilter !== 'all') params.set('site', siteFilter);
      if (monthFilter !== 'all') params.set('month', monthFilter);
      const res = await fetch(`/api/fin/profit-loss?${params}`);
      const json = await res.json();
      if (json.success) { setRecords(json.data); setSummary(json.summary); }
    } catch { toast.error('Failed to fetch P&L data'); }
    finally { setLoading(false); }
  }, [siteFilter, monthFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImporting(true);
    let totalImported = 0;
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('file', files[i]);
      try {
        const res = await fetch('/api/fin/profit-loss/import', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) { totalImported += json.summary.entries; }
        else toast.error(`${files[i].name}: ${json.error}`);
      } catch { toast.error(`${files[i].name}: Network error`); }
    }
    toast.success(`Imported ${totalImported} P&L entries from ${files.length} file(s)`);
    setImporting(false);
    e.target.value = '';
    await fetch_();
  };

  const handleDeleteSite = async (site: string) => {
    try { const r = await fetch(`/api/fin/profit-loss?site=${encodeURIComponent(site)}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success(`Deleted ${site} data`); await fetch_(); } }
    catch { toast.error('Delete failed'); }
  };

  // Derived data for dashboard
  const debitEntries = records.filter(r => r.side === 'debit');
  const creditEntries = records.filter(r => r.side === 'credit');

  // Group by category
  const debitByCategory = debitEntries.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + r.amount; return acc; }, {} as Record<string, number>);
  const creditByCategory = creditEntries.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + r.amount; return acc; }, {} as Record<string, number>);

  // Group by site for comparison
  const bySite = summary.sites.map(site => {
    const siteRecords = records.filter(r => r.site === site);
    const dr = siteRecords.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0);
    const cr = siteRecords.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0);
    return { site, debit: dr, credit: cr, net: cr - dr };
  });

  // Filtered table
  const filteredTable = records.filter(r => search === '' || r.particular.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Expenses</div><div className="text-[18px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(summary.totalDebit / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Income</div><div className="text-[18px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(summary.totalCredit / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: summary.netPL >= 0 ? '#00e676' : '#ff3d3d' }} /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{summary.netPL >= 0 ? 'Net Profit' : 'Net Loss'}</div><div className={`text-[18px] font-bold ${summary.netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(Math.abs(summary.netPL) / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Sites</div><div className="text-[18px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{summary.sites.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Months</div><div className="text-[18px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{summary.months.length}</div></div>
      </div>

      {/* Controls */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <BarChart3 size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Profit &amp; Loss Account</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === 'dashboard' ? 'table' : 'dashboard')} className="vc-btn-ghost text-[11px]">{viewMode === 'dashboard' ? 'Table View' : 'Dashboard'}</button>
            <label className="vc-btn-primary flex items-center gap-1.5 cursor-pointer">{importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Import P&amp;L Files<input type="file" accept=".xlsx,.xls" multiple onChange={handleImport} className="hidden" disabled={importing} /></label>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[140px]">
            <option value="all">All Sites</option>
            {summary.sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]">
            <option value="all">All Months</option>
            {summary.months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {viewMode === 'table' && (
            <div className="relative flex-1 min-w-[180px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search particulars..." className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg pl-9 pr-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
          )}
        </div>

        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <div className="p-4 space-y-5">
            {/* Site-wise P&L comparison */}
            {bySite.length > 0 && (
              <div>
                <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Site-wise Profit &amp; Loss</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bySite.map(s => (
                    <div key={s.site} className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[12px] font-semibold text-[#e2e8f0]">{s.site}</span>
                        <button onClick={() => handleDeleteSite(s.site)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete site data"><Trash2 size={12} /></button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]"><span className="text-[#5a6878]">Expenses</span><span className="text-[#ff3d3d] font-mono">&#8377;{(s.debit / 100000).toFixed(2)} L</span></div>
                        <div className="flex items-center justify-between text-[11px]"><span className="text-[#5a6878]">Income</span><span className="text-[#00e676] font-mono">&#8377;{(s.credit / 100000).toFixed(2)} L</span></div>
                        <div className="border-t border-[#252e3a] pt-2 flex items-center justify-between text-[11px]">
                          <span className="text-[#5a6878] font-semibold">{s.net >= 0 ? 'Profit' : 'Loss'}</span>
                          <span className={`font-mono font-semibold ${s.net >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{s.net >= 0 ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}&#8377;{(Math.abs(s.net) / 100000).toFixed(2)} L</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Expenses by category */}
              <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-4">
                <h3 className="text-[12px] font-semibold text-[#ff3d3d] mb-3 flex items-center gap-2"><TrendingDown size={14} /> Expenses by Category</h3>
                <div className="space-y-2">
                  {Object.entries(debitByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-[11px] text-[#8899aa] truncate max-w-[200px]">{cat || 'Uncategorized'}</span>
                      <span className="text-[11px] text-[#e2e8f0] font-mono">&#8377;{(amt / 100000).toFixed(2)} L</span>
                    </div>
                  ))}
                  {Object.keys(debitByCategory).length === 0 && <div className="text-[11px] text-[#5a6878]">No expense data</div>}
                </div>
              </div>
              {/* Income by category */}
              <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-4">
                <h3 className="text-[12px] font-semibold text-[#00e676] mb-3 flex items-center gap-2"><TrendingUp size={14} /> Income by Category</h3>
                <div className="space-y-2">
                  {Object.entries(creditByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-[11px] text-[#8899aa] truncate max-w-[200px]">{cat || 'Uncategorized'}</span>
                      <span className="text-[11px] text-[#e2e8f0] font-mono">&#8377;{(amt / 100000).toFixed(2)} L</span>
                    </div>
                  ))}
                  {Object.keys(creditByCategory).length === 0 && <div className="text-[11px] text-[#5a6878]">No income data</div>}
                </div>
              </div>
            </div>

            {records.length === 0 && <div className="text-center py-10 text-[#5a6878] text-[12px]">No P&amp;L data. Click &quot;Import P&amp;L Files&quot; to upload your 5 site Excel files.</div>}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
                {['Site', 'Month', 'Side', 'Category', 'Particular', 'Amount'].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {filteredTable.slice(0, 100).map(r => (
                  <tr key={r.id} className="hover:bg-[#141920]">
                    <td className="py-2 px-3 text-[#e2e8f0] font-medium">{r.site}</td>
                    <td className="py-2 px-3 text-[#8899aa]">{r.month}</td>
                    <td className="py-2 px-3"><span className={`vc-badge ${r.side === 'debit' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#00e676]/15 text-[#00e676]'}`}>{r.side === 'debit' ? 'Expense' : 'Income'}</span></td>
                    <td className="py-2 px-3 text-[#8899aa]">{r.category}</td>
                    <td className="py-2 px-3 text-[#e2e8f0]">{r.particular}</td>
                    <td className="py-2 px-3 text-right font-mono"><span className={r.side === 'debit' ? 'text-[#ff3d3d]' : 'text-[#00e676]'}>&#8377;{r.amount.toLocaleString('en-IN')}</span></td>
                  </tr>
                ))}
                {filteredTable.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-[#5a6878]">No entries found.</td></tr>}
                {filteredTable.length > 100 && <tr><td colSpan={6} className="py-3 text-center text-[#5a6878] text-[10px]">Showing first 100 of {filteredTable.length} entries. Use filters to narrow down.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
