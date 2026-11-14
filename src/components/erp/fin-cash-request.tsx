'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Banknote, Plus, Loader2, Check, XCircle, SendHorizonal, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface SiteRef { id: number; name: string; siteCode: string; }
interface CashRequest {
  id: number; requestNo: string; employeeName: string; amount: number; purpose: string;
  neededBy: string | null; status: string; requestedBy: string | null; approvedBy: string | null;
  rejectedReason: string | null; site: { id: number; name: string; siteCode: string } | null;
  createdAt: string; voucherId: number | null;
}

const EMPTY = { employeeName: '', amount: '', purpose: '', siteId: '', neededBy: '' };

export default function FinCashRequest() {
  const [requests, setRequests] = useState<CashRequest[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CashRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch('/api/fin/cash-requests'),
        fetch('/api/fin/sites'),
      ]);
      const [rJson, sJson] = await Promise.all([rRes.json(), sRes.json()]);
      if (rJson.success) setRequests(rJson.data || []);
      if (sJson.success) setSites(sJson.data || []);
    } catch { toast.error('Failed to load cash requests'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const kpis = useMemo(() => ({
    pending: requests.filter(r => r.status === 'Pending').length,
    approved: requests.filter(r => r.status === 'Approved').length,
    disbursed: requests.filter(r => r.status === 'Disbursed').length,
    disbursedAmount: requests.filter(r => r.status === 'Disbursed').reduce((s, r) => s + r.amount, 0),
  }), [requests]);

  const save = async () => {
    if (!form.employeeName.trim() || !form.purpose.trim() || !(Number(form.amount) > 0)) { toast.error('Employee, amount and purpose are required'); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/fin/cash-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), siteId: form.siteId ? Number(form.siteId) : null, actor: getCurrentUserEmail() }),
      });
      const j = await r.json();
      if (j.success) { toast.success(`Cash request ${j.data.requestNo} created`); setFormOpen(false); setForm(EMPTY); await fetchAll(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const runAction = async (id: number, action: 'approve' | 'reject' | 'disburse', comments?: string) => {
    setActionId(id);
    try {
      const r = await fetch('/api/fin/cash-requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, comments, actor: getCurrentUserEmail() }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(action === 'approve' ? 'Request approved' : action === 'reject' ? 'Request rejected' : 'Cash disbursed against request');
        setRejectTarget(null); setRejectReason('');
        await fetchAll();
      } else toast.error(j.error || 'Action failed');
    } catch { toast.error('Network error'); }
    finally { setActionId(null); }
  };

  const fmt = (n: number) => '₹' + (n ?? 0).toLocaleString('en-IN');
  const statusBadge = (s: string) => {
    if (s === 'Approved') return 'bg-[#00d4ff]/15 text-[#00d4ff]';
    if (s === 'Disbursed') return 'bg-[#00e676]/15 text-[#00e676]';
    if (s === 'Rejected') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    return 'bg-[#ffab40]/15 text-[#ffab40]'; // Pending
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center"><Banknote size={18} className="text-[#00d4ff]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Cash Requests</h2>
            <p className="text-[11px] text-[#5a6878]">Employees request petty cash — approval — disbursement against the fund</p>
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8991a]"><Plus size={13} /> New Request</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending</div><div className="text-[20px] font-bold text-[#ffab40]">{kpis.pending}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Awaiting Disbursement</div><div className="text-[20px] font-bold text-[#00d4ff]">{kpis.approved}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Disbursed</div><div className="text-[20px] font-bold text-[#00e676]">{kpis.disbursed}</div></div>
        <div className="vc-stat-card"><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Disbursed</div><div className="text-[20px] font-bold text-[#00e676]">{fmt(kpis.disbursedAmount)}</div></div>
      </div>

      <div className="vc-panel overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-[#0f1318]">
            {['Request', 'Date', 'Employee', 'Site', 'Amount', 'Purpose', 'Needed By', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.requestNo}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.createdAt?.split('T')[0]}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0]">{r.employeeName}</td>
                <td className="py-2.5 px-3 text-[#8899aa]">{r.site?.name || '—'}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{fmt(r.amount)}</td>
                <td className="py-2.5 px-3 text-[#8899aa] max-w-[220px] truncate" title={r.purpose}>{r.purpose}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.neededBy?.split('T')[0] || '—'}</td>
                <td className="py-2.5 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusBadge(r.status)}`}>{r.status}</span>
                  {r.status === 'Rejected' && r.rejectedReason && <span className="block text-[8.5px] text-[#ff3d3d] mt-0.5 max-w-[200px] truncate" title={r.rejectedReason}>{r.rejectedReason}</span>}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1">
                    {r.status === 'Pending' && (<>
                      <button onClick={() => runAction(r.id, 'approve')} disabled={actionId === r.id} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 disabled:opacity-50" title="Approve"><Check size={13} /></button>
                      <button onClick={() => { setRejectTarget(r); setRejectReason(''); }} disabled={actionId === r.id} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 disabled:opacity-50" title="Reject"><XCircle size={13} /></button>
                    </>)}
                    {r.status === 'Approved' && (
                      <button onClick={() => runAction(r.id, 'disburse')} disabled={actionId === r.id} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 disabled:opacity-50" title="Disburse cash — creates a Credit voucher"><SendHorizonal size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-[#5a6878]">No cash requests yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-[#5a6878]"><AlertTriangle size={11} /> Disbursing creates a Credit voucher in Petty Cash and marks the request Disbursed. Segregation of Duties is enforced server-side.</div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#f5a623]">New Cash Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Employee Name *</label><input value={form.employeeName} onChange={e => setForm(f => ({ ...f, employeeName: e.target.value }))} className="vc-input" placeholder="Who needs the cash" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label><input type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Needed By</label><input type="date" value={form.neededBy} onChange={e => setForm(f => ({ ...f, neededBy: e.target.value }))} className="vc-input" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site</label>
              <select value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))} className="vc-input appearance-none">
                <option value="">— Optional —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Purpose *</label><textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} className="vc-input min-h-[70px]" placeholder="What the cash is for" /></div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost text-[11px]">Cancel</button>
            <button onClick={save} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Submit Request</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#ff3d3d] flex items-center gap-2"><XCircle size={16} /> Reject Request {rejectTarget?.requestNo}</DialogTitle></DialogHeader>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="vc-input min-h-[80px]" placeholder="Reason for rejection..." />
          <DialogFooter>
            <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="vc-btn-ghost text-[11px]">Cancel</button>
            <button onClick={() => rejectTarget && runAction(rejectTarget.id, 'reject', rejectReason)} disabled={!rejectReason.trim() || actionId === rejectTarget?.id} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg px-4 py-2 text-[11px] font-semibold disabled:opacity-50">{actionId === rejectTarget?.id ? 'Rejecting...' : 'Reject Request'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
