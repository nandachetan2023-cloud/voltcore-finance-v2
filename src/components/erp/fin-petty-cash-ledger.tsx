'use client';
import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface PettyCash {
  id: number; voucherNo: string; date: string; description: string; amount: number;
  type: string; category: string | null; siteId: number | null; site?: { name: string; siteCode: string } | null;
  paymentMode: string | null; approvalStatus: string; authorizedBy: string | null;
  balance: number; referenceNo: string | null;
}

export default function FinPettyCashLedger() {
  const [records, setRecords] = useState<PettyCash[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState('All');

  useEffect(() => {
    fetch('/api/fin/petty-cash').then(r => r.json()).then(j => {
      if (j.success) setRecords(j.data || []);
      else { setRecords([]); toast.info('No server records'); }
    }).catch(() => { setRecords([]); }).finally(() => setLoading(false));
  }, []);

  const sites = useMemo(() => [...new Set(records.map(r => r.site?.name).filter(Boolean))] as string[], [records]);

  const filtered = useMemo(() => siteFilter === 'All' ? records : records.filter(r => r.site?.name === siteFilter), [records, siteFilter]);

  const ledger = useMemo(() => {
    const chrono = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    const out: (PettyCash & { debit: number; credit: number; running: number })[] = [];
    for (const r of chrono) {
      const debit = r.type === 'Debit' ? r.amount : 0;
      const credit = r.type === 'Credit' ? r.amount : 0;
      running = Math.round((running + credit - debit) * 100) / 100;
      out.push({ ...r, debit, credit, running });
    }
    return out;
  }, [filtered]);

  const fmt = (n: number) => (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center"><BookOpen size={18} className="text-[#00d4ff]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Petty Cash Ledger</h2>
            <p className="text-[11px] text-[#5a6878]">Double-entry style running balance of all posted petty cash transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0]">
            <option value="All">All Sites</option>
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="vc-panel overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-[#0f1318]">
            {['Date', 'Voucher No', 'Reference', 'Description', 'Category', 'Site', 'Debit', 'Credit', 'Running Balance', 'Status'].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {ledger.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td>
                <td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.voucherNo}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.referenceNo || '—'}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0]">{r.description}</td>
                <td className="py-2.5 px-3 text-[#8899aa]">{r.category || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa]">{r.site?.name || '—'}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#ff3d3d]">{r.debit ? `₹${fmt(r.debit)}` : '—'}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#00e676]">{r.credit ? `₹${fmt(r.credit)}` : '—'}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#e2e8f0]">₹{fmt(r.running)}</td>
                <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.approvalStatus === 'Approved' ? 'bg-[#00e676]/10 text-[#00e676]' : r.approvalStatus === 'Rejected' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' : 'bg-[#f5a623]/10 text-[#f5a623]'}`}>{r.approvalStatus}</span></td>
              </tr>
            ))}
            {ledger.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">No ledger entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}