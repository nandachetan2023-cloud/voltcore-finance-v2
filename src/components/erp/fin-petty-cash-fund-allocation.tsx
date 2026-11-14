'use client';
import { useState, useEffect, useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Loader2, Wallet, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface FundRecord {
  id: number; date: string; description: string; amount: number; type: string;
  category: string | null; siteId: number | null; paymentMode: string | null;
  remarks: string | null; linkedType: string;
  site?: { id: number; name: string; siteCode: string } | null;
}
interface SiteRef { id: number; name: string; siteCode: string; responsiblePerson?: string | null; }
interface FundRef { id: number; fundCode: string; fundName: string; status: string; }

const EMPTY = { direction: 'toFinance', siteId: '', fundId: '', amount: '', mode: 'CASH', note: '', date: new Date().toISOString().slice(0, 10) };

export default function FinPettyCashFundAllocation() {
  const [records, setRecords] = useState<FundRecord[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [funds, setFunds] = useState<FundRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [j, s, f] = await Promise.all([
        fetch('/api/fin/petty-cash').then(r => r.json()),
        fetch('/api/fin/sites').then(r => r.json()),
        fetch('/api/fin/funds').then(r => r.json()),
      ]);
      if (j.success) setRecords(j.data || []);
      if (s.success) setSites(s.data || []);
      if (f.success) setFunds((f.data || []).filter((x: FundRef) => x.status === 'Active'));
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const allocations = records.filter(r => r.type === 'Credit' && (r.category === 'HO FUND' || r.category === 'SITE FUND'));
  const expenses = records.filter(r => r.type === 'Debit');

  const financeBalance = useMemo(
    () => Math.round((allocations.filter(r => r.category === 'HO FUND').reduce((s, r) => s + r.amount, 0) - allocations.filter(r => r.category === 'SITE FUND').reduce((s, r) => s + r.amount, 0)) * 100) / 100,
    [allocations],
  );
  const siteBalances = useMemo(
    () => sites.map(s => {
      const allocated = allocations.filter(r => r.category === 'SITE FUND' && r.siteId === s.id).reduce((sum, r) => sum + r.amount, 0);
      const spent = expenses.filter(r => r.siteId === s.id).reduce((sum, r) => sum + r.amount, 0);
      return { ...s, allocated, spent, balance: Math.round((allocated - spent) * 100) / 100 };
    }),
    [sites, allocations, expenses],
  );
  const totalAllocated = allocations.filter(r => r.category === 'SITE FUND').reduce((s, r) => s + r.amount, 0);
  const hoReceived = allocations.filter(r => r.category === 'HO FUND').reduce((s, r) => s + r.amount, 0);

  const fmt = (n: number) => (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const save = async () => {
    const amt = Number(form.amount) || 0;
    if (amt <= 0) { toast.error('Amount must be greater than zero'); return; }
    if (form.direction === 'toSite' && amt > financeBalance) { toast.error('Insufficient Finance balance'); return; }
    if (form.direction === 'toSite' && !form.siteId) { toast.error('Site is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/fin/petty-cash', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          description: form.note || (form.direction === 'toFinance' ? 'HO → Finance fund transfer' : 'Finance → Site fund transfer'),
          amount: amt, type: 'Credit',
          category: form.direction === 'toFinance' ? 'HO FUND' : 'SITE FUND',
          siteId: form.direction === 'toFinance' ? null : Number(form.siteId),
          fundId: form.fundId ? Number(form.fundId) : null,
          paymentMode: form.mode,
          linkedType: 'Fund',
          remarks: form.note || null,
        }),
      });
      const j = await res.json();
      if (j.success) { toast.success('Fund allocation recorded'); setFormOpen(false); setForm(EMPTY); await fetchData(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><Wallet size={18} className="text-[#f5a623]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Fund Allocation</h2>
            <p className="text-[11px] text-[#5a6878]">HO → Finance → Site fund chain. Site balances = allocations less paid expenses.</p>
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8991a]"><Plus size={13} /> Record Allocation</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">HO → Finance Received</div><div className="text-[22px] font-bold text-[#00e676] font-mono">₹{fmt(hoReceived)}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Finance Available Balance</div><div className="text-[22px] font-bold text-[#e2e8f0] font-mono">₹{fmt(financeBalance)}</div><div className="text-[9px] text-[#5a6878] mt-1">Received − allocated to sites</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Site Allocations</div><div className="text-[22px] font-bold text-[#00d4ff] font-mono">₹{fmt(totalAllocated)}</div></div>
      </div>

      <div className="vc-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-[#252e3a] flex items-center gap-2"><Building2 size={14} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Site Balances</span></div>
        <table className="w-full text-[11px]">
          <thead><tr className="bg-[#0f1318]">
            {['Site', 'Funds Allocated', 'Paid Expenses', 'Available Balance', 'Pending Actions'].map(h => <th key={h} className="text-left py-2.5 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {siteBalances.filter(s => s.allocated > 0 || s.spent > 0).map(s => (
              <tr key={s.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-4 font-semibold text-[#e2e8f0]">{s.name}</td>
                <td className="py-2.5 px-4 text-right font-mono text-[#00d4ff]">₹{fmt(s.allocated)}</td>
                <td className="py-2.5 px-4 text-right font-mono text-[#ff3d3d]">₹{fmt(s.spent)}</td>
                <td className={`py-2.5 px-4 text-right font-mono font-bold ${s.balance < 0 ? 'text-[#ff3d3d]' : 'text-[#e2e8f0]'}`}>₹{fmt(s.balance)}</td>
                <td className="py-2.5 px-4"><button onClick={() => { setForm(f => ({ ...f, direction: 'toSite', siteId: String(s.id) })); setFormOpen(true); }} className="text-[#f5a623] hover:underline text-[11px]">Allocate more →</button></td>
              </tr>
            ))}
            {siteBalances.filter(s => s.allocated > 0 || s.spent > 0).length === 0 && <tr><td colSpan={5} className="py-8 text-center text-[#5a6878]">No allocations yet — record a HO → Finance transfer first.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="vc-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-[#252e3a]"><span className="text-[12px] font-semibold text-[#e2e8f0]">Fund Transfer History</span></div>
        <table className="w-full text-[11px]">
          <thead><tr className="bg-[#0f1318]">
            {['Date', 'Direction', 'Site', 'Note', 'Mode', 'Amount'].map(h => <th key={h} className="text-left py-2.5 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {[...allocations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-4 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td>
                <td className="py-2.5 px-4">{r.category === 'HO FUND'
                  ? <span className="flex items-center gap-1.5 text-[#00e676]"><ArrowDownLeft size={13} />HO → Finance</span>
                  : <span className="flex items-center gap-1.5 text-[#00d4ff]"><ArrowUpRight size={13} />Finance → {r.site?.name || 'Site'}</span>}</td>
                <td className="py-2.5 px-4 text-[#e2e8f0]">{r.site?.name || '—'}</td>
                <td className="py-2.5 px-4 text-[#8899aa]">{r.remarks || r.description}</td>
                <td className="py-2.5 px-4 text-[#8899aa]">{r.paymentMode || '—'}</td>
                <td className="py-2.5 px-4 text-right font-mono text-[#e2e8f0]">₹{fmt(r.amount)}</td>
              </tr>
            ))}
            {allocations.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#5a6878]">No fund transfers recorded.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161c24] border border-[#f5a623]/25 rounded-xl p-4 max-w-md w-full">
            <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">Record Fund Allocation</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Transfer Direction</label>
                <select className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
                  <option value="toFinance">HO → Finance</option>
                  <option value="toSite">Finance → Site</option>
                </select>
              </div>
              {funds.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Fund (optional)</label>
                  <select className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.fundId} onChange={e => setForm(f => ({ ...f, fundId: e.target.value }))}>
                    <option value="">— Unlinked —</option>
                    {funds.map(x => <option key={x.id} value={x.id}>{x.fundCode} — {x.fundName}</option>)}
                  </select>
                </div>
              )}
              {form.direction === 'toSite' && (
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Site *</label>
                  <select className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}>
                    <option value="">Select site…</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Date</label><input type="date" className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Mode</label><select className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}><option>CASH</option><option>ONLINE</option><option>BANK TRANSFER</option></select></div>
              </div>
              <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Amount (₹)</label><input type="number" min="1" step="0.01" className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Reference / Note</label><input className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Voucher or purpose" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFormOpen(false)} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save Allocation'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}