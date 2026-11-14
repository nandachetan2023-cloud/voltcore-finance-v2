'use client';
import { useState, useEffect, useMemo } from 'react';
import { Scale, Plus, Loader2, CheckCircle2, AlertTriangle, Wallet, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface SiteRef { id: number; name: string; siteCode: string; responsiblePerson?: string | null; pettyCashLimit?: number | null; }
interface Recon {
  id: number; siteId: number | null; custodian: string | null; reconDate: string;
  openingCash: number; cashReceived: number; cashPaid: number; expectedCash: number;
  physicalCash: number; variance: number; shortage: number; excess: number;
  carryForward: number;
  remarks: string | null; status: string; verifiedBy: string | null; approvedBy: string | null;
  site?: { id: number; name: string; siteCode: string } | null;
}

const EMPTY = { siteId: '', custodian: '', reconDate: new Date().toISOString().split('T')[0], openingCash: '', cashReceived: '', cashPaid: '', physicalCash: '', remarks: '' };

export default function FinPettyCashReconciliation() {
  const [records, setRecords] = useState<Recon[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        fetch('/api/fin/petty-cash/reconciliations').then(x => x.json()),
        fetch('/api/fin/sites').then(x => x.json()),
      ]);
      if (r.success) setRecords(r.data || []);
      if (s.success) setSites(s.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const onSite = (id: string) => {
    const site = sites.find(s => String(s.id) === id);
    setForm(f => ({ ...f, siteId: id, custodian: site?.responsiblePerson || f.custodian }));
  };

  const opening = Number(form.openingCash) || 0;
  const received = Number(form.cashReceived) || 0;
  const paid = Number(form.cashPaid) || 0;
  const expected = Math.round((opening + received - paid) * 100) / 100;
  const physical = Number(form.physicalCash) || 0;
  const variance = Math.round((physical - expected) * 100) / 100;

  const save = async () => {
    if (!form.siteId) { toast.error('Site is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/fin/petty-cash/reconciliations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, openingCash: opening, cashReceived: received, cashPaid: paid, physicalCash: physical, createdBy: 'current' }),
      });
      const j = await res.json();
      if (j.success) { toast.success('Reconciliation saved'); setFormOpen(false); setForm(EMPTY); await fetchData(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const closePeriod = async (r: Recon) => {
    if (r.variance !== 0 && !r.remarks) { toast.error('Save a remark documenting the variance before closing this period'); return; }
    if (!window.confirm(`Close the period for ${new Date(r.reconDate).toLocaleDateString()}? Physical cash of ₹${fmt(r.physicalCash)} will carry forward to the next period.`)) return;
    try {
      const res = await fetch('/api/fin/petty-cash/reconciliations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, status: 'Closed' }),
      });
      const j = await res.json();
      if (j.success) { toast.success('Period closed — cash carried forward'); await fetchData(); }
      else toast.error(j.error || 'Failed to close');
    } catch { toast.error('Network error'); }
  };

  const fmt = (n: number) => (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center"><Scale size={18} className="text-[#a78bfa]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Cash Reconciliation</h2>
            <p className="text-[11px] text-[#5a6878]">Count physical cash, compare with expected balance, document variances</p>
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8991a]"><Plus size={13} /> New Reconciliation</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Reconciliations</div><div className="text-[20px] font-bold text-[#e2e8f0]">{records.length}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Shortage</div><div className="text-[20px] font-bold text-[#ff3d3d]">₹{fmt(records.reduce((s, r) => s + (r.shortage || 0), 0))}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Excess</div><div className="text-[20px] font-bold text-[#00e676]">₹{fmt(records.reduce((s, r) => s + (r.excess || 0), 0))}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Carry Forward</div><div className="text-[20px] font-bold text-[#00d4ff]">₹{fmt(records.reduce((s, r) => s + (r.carryForward || 0), 0))}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Unresolved</div><div className="text-[20px] font-bold text-[#f5a623]">{records.filter(r => r.status !== 'Closed' && r.status !== 'Approved').length}</div></div>
      </div>

      <div className="vc-panel overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-[#0f1318]">
            {['Date', 'Site', 'Custodian', 'Opening', 'Received', 'Paid', 'Expected', 'Physical', 'Variance', 'Carry Fwd', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.reconDate?.split('T')[0]}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0]">{r.site?.name || r.site?.siteCode || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa]">{r.custodian || '—'}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#8899aa]">₹{fmt(r.openingCash)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#00e676]">₹{fmt(r.cashReceived)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#ff3d3d]">₹{fmt(r.cashPaid)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">₹{fmt(r.expectedCash)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">₹{fmt(r.physicalCash)}</td>
                <td className={`py-2.5 px-3 text-right font-mono font-bold ${r.variance < 0 ? 'text-[#ff3d3d]' : r.variance > 0 ? 'text-[#00e676]' : 'text-[#8899aa]'}`}>₹{fmt(r.variance)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#00d4ff]">{r.carryForward ? `₹${fmt(r.carryForward)}` : '—'}</td>
                <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.status === 'Closed' || r.status === 'Approved' ? 'bg-[#00e676]/10 text-[#00e676]' : r.variance !== 0 ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' : 'bg-[#f5a623]/10 text-[#f5a623]'}`}>{r.status}</span></td>
                <td className="py-2.5 px-3">{r.status !== 'Closed' && <button onClick={() => closePeriod(r)} title="Close period — carry physical cash forward" className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Lock size={13} /></button>}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={12} className="py-10 text-center text-[#5a6878]">No reconciliations yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161c24] border border-[#a78bfa]/25 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">New Cash Reconciliation</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Site *</label>
                  <select className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.siteId} onChange={e => onSite(e.target.value)}>
                    <option value="">Select site…</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.siteCode})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Custodian</label>
                  <input className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.custodian} onChange={e => setForm(f => ({ ...f, custodian: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Reconciliation Date</label>
                <input type="date" className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.reconDate} onChange={e => setForm(f => ({ ...f, reconDate: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Opening Cash</label><input type="number" className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.openingCash} onChange={e => setForm(f => ({ ...f, openingCash: e.target.value }))} /></div>
                <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Cash Received</label><input type="number" className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.cashReceived} onChange={e => setForm(f => ({ ...f, cashReceived: e.target.value }))} /></div>
                <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Cash Paid</label><input type="number" className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.cashPaid} onChange={e => setForm(f => ({ ...f, cashPaid: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1117] border border-[#252e3a] rounded-lg p-3">
                  <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1">Expected Cash</div>
                  <div className="text-[16px] font-bold text-[#e2e8f0] font-mono">₹{fmt(expected)}</div>
                  <div className="text-[9px] text-[#5a6878] mt-1">Opening + Received − Paid</div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Physical Cash Counted</label>
                  <input type="number" className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0]" value={form.physicalCash} onChange={e => setForm(f => ({ ...f, physicalCash: e.target.value }))} />
                </div>
              </div>
              {variance !== 0 && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${variance < 0 ? 'bg-[#ff3d3d]/5 border-[#ff3d3d]/30 text-[#ff3d3d]' : 'bg-[#00e676]/5 border-[#00e676]/30 text-[#00e676]'}`}>
                  <AlertTriangle size={14} />
                  <span className="text-[11px] font-semibold">{variance < 0 ? `Shortage of ₹${fmt(Math.abs(variance))}` : `Excess of ₹${fmt(variance)}`} — must be documented before closing.</span>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Remarks / Variance Explanation</label>
                <textarea className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] min-h-[60px]" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFormOpen(false)} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save Reconciliation'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}