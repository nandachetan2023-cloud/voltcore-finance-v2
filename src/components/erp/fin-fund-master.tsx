'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PiggyBank, Plus, Loader2, Pencil, Check, X, Wallet, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Fund {
  id: number; fundCode: string; fundName: string; custodian: string | null;
  limitAmount: number; balance: number; branch: string | null; department: string | null;
  status: string; allocated: number; utilized: number; available: number; utilizationPct: number;
}

const EMPTY = { fundName: '', custodian: '', limitAmount: '', branch: '', department: '', status: 'Active' };

export default function FinFundMaster() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Fund | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/funds');
      const j = await r.json();
      if (j.success) setFunds(j.data || []);
    } catch { toast.error('Failed to load funds'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchFunds(); }, [fetchFunds]);

  const kpis = useMemo(() => {
    const active = funds.filter(f => f.status === 'Active');
    return {
      count: active.length,
      limit: active.reduce((s, f) => s + f.limitAmount, 0),
      allocated: active.reduce((s, f) => s + f.allocated, 0),
      utilized: active.reduce((s, f) => s + f.utilized, 0),
    };
  }, [funds]);

  const openNew = () => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (f: Fund) => { setEditTarget(f); setForm({ fundName: f.fundName, custodian: f.custodian || '', limitAmount: String(f.limitAmount), branch: f.branch || '', department: f.department || '', status: f.status }); setFormOpen(true); };

  const save = async () => {
    if (!form.fundName.trim()) { toast.error('Fund name is required'); return; }
    setSubmitting(true);
    try {
      const body = { ...form, limitAmount: Number(form.limitAmount) || 0, actor: getCurrentUserEmail() };
      const r = await fetch('/api/fin/funds', {
        method: editTarget ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget ? { ...body, id: editTarget.id } : body),
      });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Fund updated' : 'Fund created'); setFormOpen(false); await fetchFunds(); }
      else toast.error(j.error || 'Save failed');
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const fmt = (n: number) => '₹' + (n ?? 0).toLocaleString('en-IN');

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><PiggyBank size={18} className="text-[#f5a623]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Fund Master</h2>
            <p className="text-[11px] text-[#5a6878]">Petty cash accounts — custodian, sanctioned limit, branch/department and utilization</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8991a]"><Plus size={13} /> New Fund</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Active Funds</div><div className="text-[20px] font-bold text-[#e2e8f0]">{kpis.count}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Sanctioned</div><div className="text-[20px] font-bold text-[#f5a623]">{fmt(kpis.limit)}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Allocated</div><div className="text-[20px] font-bold text-[#00d4ff]">{fmt(kpis.allocated)}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Utilized</div><div className="text-[20px] font-bold text-[#00e676]">{fmt(kpis.utilized)}</div></div>
      </div>

      <div className="vc-panel overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-[#0f1318]">
            {['Fund Code', 'Fund Name', 'Custodian', 'Branch / Dept', 'Limit', 'Utilized', 'Available', 'Utilization', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {funds.map(f => (
              <tr key={f.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 text-[#f5a623] font-mono">{f.fundCode}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0]">{f.fundName}</td>
                <td className="py-2.5 px-3 text-[#8899aa]">{f.custodian || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa]">{[f.branch, f.department].filter(Boolean).join(' / ') || '—'}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#8899aa]">{fmt(f.limitAmount)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#ffab40]">{fmt(f.utilized)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#00e676]">{fmt(f.available)}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-[#252e3a] rounded-full overflow-hidden"><div className={`h-full ${f.utilizationPct >= 80 ? 'bg-[#ff3d3d]' : f.utilizationPct >= 50 ? 'bg-[#ffab40]' : 'bg-[#00e676]'}`} style={{ width: `${f.utilizationPct}%` }} /></div>
                    <span className="text-[9px] font-mono text-[#8899aa]">{f.utilizationPct}%</span>
                  </div>
                </td>
                <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${f.status === 'Active' ? 'bg-[#00e676]/10 text-[#00e676]' : f.status === 'Frozen' ? 'bg-[#ffab40]/10 text-[#ffab40]' : 'bg-[#5a6878]/10 text-[#5a6878]'}`}>{f.status}</span></td>
                <td className="py-2.5 px-3"><button onClick={() => openEdit(f)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button></td>
              </tr>
            ))}
            {funds.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">No funds yet — create the first petty cash fund.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-[#5a6878]"><AlertTriangle size={11} /> Funds are the sanctioned float accounts. Approved cash allocated and utilized is derived from vouchers linked to each fund.</div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? `Edit Fund ${editTarget.fundCode}` : 'New Fund'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Fund Name *</label><input value={form.fundName} onChange={e => setForm(f => ({ ...f, fundName: e.target.value }))} className="vc-input" placeholder="e.g. Head Office Petty Cash" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Custodian</label><input value={form.custodian} onChange={e => setForm(f => ({ ...f, custodian: e.target.value }))} className="vc-input" placeholder="Person holding the float" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Sanctioned Limit (₹)</label><input type="number" value={form.limitAmount || ''} onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))} className="vc-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Branch</label><input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} className="vc-input" placeholder="e.g. HO / BALCO" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Department</label><input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="vc-input" placeholder="e.g. Administration" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="vc-input appearance-none">
                <option value="Active">Active</option><option value="Frozen">Frozen</option><option value="Closed">Closed</option>
              </select></div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost text-[11px]">Cancel</button>
            <button onClick={save} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {editTarget ? 'Save Changes' : 'Create Fund'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
