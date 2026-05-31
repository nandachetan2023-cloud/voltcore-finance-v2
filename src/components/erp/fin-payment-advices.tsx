'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';

interface Line { id?: number; billNo: string; amount: number; remarks: string; }
interface Party { id: number; name: string; code: string | null; }
interface Advice {
  id: number;
  adviceNo: string;
  partyId: number | null;
  party: Party | null;
  totalAmount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNo: string | null;
  notes: string | null;
  lines: Line[];
}
interface FormData {
  adviceNo: string;
  partyId: string;
  paymentDate: string;
  paymentMode: string;
  referenceNo: string;
  notes: string;
  lines: Line[];
}

const EMPTY: FormData = {
  adviceNo: '', partyId: '', paymentDate: new Date().toISOString().split('T')[0],
  paymentMode: 'Bank Transfer', referenceNo: '', notes: '', lines: [{ billNo: '', amount: 0, remarks: '' }],
};
const MODES = ['Bank Transfer', 'Online', 'Cash', 'Cheque', 'ONLINE/CASH', 'NEFT', 'RTGS', 'IMPS'];

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

export default function FinPaymentAdvices() {
  const [records, setRecords] = useState<Advice[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Advice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Advice | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const tc = useTableControls(records, (r) => `${r.adviceNo} ${r.party?.name ?? ''} ${r.paymentMode} ${r.referenceNo ?? ''} ${r.notes ?? ''}`);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const [aRes, pRes] = await Promise.all([fetch('/api/fin/payment-advices'), fetch('/api/fin/parties')]);
      const aJson = await aRes.json();
      if (aJson.success) setRecords(aJson.data);
      if (pRes.ok) { const pJson = await pRes.json(); if (pJson.success) setParties(pJson.data); }
    } catch { toast.error('Failed to fetch'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openNew = () => { setEditTarget(null); setForm({ ...EMPTY, lines: [{ billNo: '', amount: 0, remarks: '' }] }); setFormOpen(true); };
  const openEdit = (r: Advice) => {
    setEditTarget(r);
    setForm({
      adviceNo: r.adviceNo, partyId: r.partyId ? String(r.partyId) : '',
      paymentDate: r.paymentDate?.split('T')[0] || '', paymentMode: r.paymentMode,
      referenceNo: r.referenceNo || '', notes: r.notes || '',
      lines: r.lines.length ? r.lines.map(l => ({ id: l.id, billNo: l.billNo || '', amount: l.amount, remarks: l.remarks || '' })) : [{ billNo: '', amount: 0, remarks: '' }],
    });
    setFormOpen(true);
  };

  const setLine = (i: number, patch: Partial<Line>) => setForm(p => ({ ...p, lines: p.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) }));
  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { billNo: '', amount: 0, remarks: '' }] }));
  const removeLine = (i: number) => setForm(p => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((_, idx) => idx !== i) : p.lines }));
  const formTotal = form.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!form.adviceNo) { toast.error('Advice No is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        adviceNo: form.adviceNo,
        partyId: form.partyId ? Number(form.partyId) : null,
        totalAmount: formTotal,
        paymentDate: new Date(form.paymentDate),
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo || null,
        notes: form.notes || null,
        lines: form.lines
          .filter(l => l.billNo || l.amount || l.remarks)
          .map(l => ({ billNo: l.billNo || null, amount: Number(l.amount) || 0, remarks: l.remarks || null })),
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/payment-advices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/fin/payment-advices?id=${deleteTarget.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const grandTotal = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalLines = records.reduce((s, r) => s + r.lines.length, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Advices</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Line Items</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{totalLines}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Paid</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{fmt(grandTotal)}</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header"><FileText size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Payment Advices</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search advices..." /></div><button onClick={openNew} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Advice</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['', 'Advice No', 'Date', 'Supplier / Party', 'Mode', 'Reference', 'Lines', 'Total', ''].map((h, i) => <th key={i} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => (
            <React.Fragment key={r.id}>
              <tr className="hover:bg-[#141920]">
                <td className="py-2.5 px-3"><button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-[#5a6878] hover:text-[#f5a623]">{expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></td>
                <td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.adviceNo}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.paymentDate?.split('T')[0]}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] font-medium max-w-[200px] truncate">{r.party?.name || (r.notes?.match(/Supplier:\s*([^|]+)/)?.[1]?.trim()) || '—'}</td>
                <td className="py-2.5 px-3"><span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff]">{r.paymentMode}</span></td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono max-w-[140px] truncate">{r.referenceNo || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa] text-center">{r.lines.length}</td>
                <td className="py-2.5 px-3 text-[#00e676] font-mono font-medium">{fmt(r.totalAmount)}</td>
                <td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button><button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></div></td>
              </tr>
              {expanded === r.id && (
                <tr className="bg-[#0d1117]">
                  <td colSpan={9} className="px-6 py-3">
                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-2">Line Items</div>
                    <table className="w-full text-[10px]"><thead><tr className="text-[#5a6878]"><th className="text-left py-1 pr-3 font-semibold">Bill / Invoice No</th><th className="text-left py-1 pr-3 font-semibold">Remarks</th><th className="text-right py-1 font-semibold">Amount</th></tr></thead>
                      <tbody>{r.lines.map((l, i) => <tr key={l.id ?? i} className="border-t border-[#1a2028]"><td className="py-1.5 pr-3 text-[#f5a623] font-mono">{l.billNo || '—'}</td><td className="py-1.5 pr-3 text-[#8899aa]">{l.remarks || '—'}</td><td className="py-1.5 text-right text-[#e2e8f0] font-mono">{fmt(l.amount)}</td></tr>)}</tbody>
                    </table>
                    {r.notes && <div className="mt-2 text-[10px] text-[#5a6878]"><span className="font-semibold">Notes:</span> {r.notes}</div>}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {records.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No payment advices yet</td></tr>}
          {records.length > 0 && tc.pageItems.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No matching advices</td></tr>}
          </tbody>
        </table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div>
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Payment Advice' : 'New Payment Advice'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Advice No *</label><input value={form.adviceNo} onChange={e => setForm(p => ({ ...p, adviceNo: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Payment Date</label><input type="date" value={form.paymentDate} onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))} className="vc-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Party / Supplier</label><select value={form.partyId} onChange={e => setForm(p => ({ ...p, partyId: e.target.value }))} className="vc-input appearance-none"><option value="">— None —</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Payment Mode</label><select value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))} className="vc-input appearance-none">{MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reference No (Bank A/C, UTR...)</label><input value={form.referenceNo} onChange={e => setForm(p => ({ ...p, referenceNo: e.target.value }))} className="vc-input" /></div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Notes</label><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="vc-input" placeholder="Supplier / Bank / IFSC details..." /></div>

            {/* Line items editor */}
            <div className="border border-[#252e3a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold">Line Items</span>
                <button onClick={addLine} className="text-[#00d4ff] text-[10px] font-semibold flex items-center gap-1 hover:underline"><Plus size={11} /> Add Line</button>
              </div>
              <div className="space-y-2">
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.4fr_100px_28px] gap-2 items-center">
                    <input value={l.billNo} onChange={e => setLine(i, { billNo: e.target.value })} className="vc-input !py-1.5 text-[10px]" placeholder="Bill / Invoice No" />
                    <input value={l.remarks} onChange={e => setLine(i, { remarks: e.target.value })} className="vc-input !py-1.5 text-[10px]" placeholder="Remarks" />
                    <input type="number" value={l.amount || ''} onChange={e => setLine(i, { amount: Number(e.target.value) })} className="vc-input !py-1.5 text-[10px] text-right" placeholder="Amount" />
                    <button onClick={() => removeLine(i)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 disabled:opacity-30" disabled={form.lines.length <= 1}><X size={13} /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-[#252e3a]"><span className="text-[10px] text-[#5a6878] mr-2">Total:</span><span className="text-[12px] font-bold text-[#00e676] font-mono">{fmt(formTotal)}</span></div>
            </div>
          </div>
          <DialogFooter><button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Payment Advice</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.adviceNo}</strong> and its {deleteTarget?.lines.length} line item(s)? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
