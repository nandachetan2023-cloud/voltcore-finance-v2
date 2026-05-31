'use client';
import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface PettyCash { id: number; voucherNo: string; date: string; description: string; amount: number; type: string; category: string | null; authorizedBy: string | null; balance: number; }
interface FormData { voucherNo: string; date: string; description: string; amount: number; type: string; category: string; authorizedBy: string; }
const EMPTY: FormData = { voucherNo: '', date: new Date().toISOString().split('T')[0], description: '', amount: 0, type: 'Debit', category: '', authorizedBy: '' };

export default function FinPettyCash() {
  const [records, setRecords] = useState<PettyCash[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PettyCash | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PettyCash | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const fetch_ = useCallback(async () => { try { setLoading(true); const r = await fetch('/api/fin/petty-cash'); const j = await r.json(); if (j.success) setRecords(j.data); } catch { toast.error('Failed to fetch'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (r: PettyCash) => { setEditTarget(r); setForm({ voucherNo: r.voucherNo, date: r.date?.split('T')[0] || '', description: r.description, amount: r.amount, type: r.type, category: r.category || '', authorizedBy: r.authorizedBy || '' }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.voucherNo || !form.description || !form.amount) { toast.error('Voucher No, description and amount required'); return; }
    setSubmitting(true);
    try { const method = editTarget ? 'PUT' : 'POST'; const body = editTarget ? { id: editTarget.id, ...form, date: new Date(form.date) } : { ...form, date: new Date(form.date) }; const r = await fetch('/api/fin/petty-cash', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/petty-cash?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  const totalDebit = records.filter(r => r.type === 'Debit').reduce((s, r) => s + r.amount, 0);
  const totalCredit = records.filter(r => r.type === 'Credit').reduce((s, r) => s + r.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Cash In</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{totalCredit.toLocaleString('en-IN')}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Cash Out</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{totalDebit.toLocaleString('en-IN')}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Entries</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.length}</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><Wallet size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Petty Cash Vouchers</span><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-auto"><Plus size={13} /> New Voucher</button></div>
        <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Voucher','Date','Description','Type','Category','Amount','Authorized By',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{records.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.voucherNo}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate">{r.description}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.type==='Credit'?'bg-[#00e676]/15 text-[#00e676]':'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{r.type}</span></td><td className="py-2.5 px-3 text-[#8899aa]">{r.category||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">₹{r.amount.toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.authorizedBy||'—'}</td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}</tbody></table></div></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Voucher':'New Petty Cash Voucher'}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Voucher No *</label><input value={form.voucherNo} onChange={e=>setForm(p=>({...p,voucherNo:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className="vc-input"/></div></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description *</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="vc-input"/></div><div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label><input type="number" value={form.amount||''} onChange={e=>setForm(p=>({...p,amount:Number(e.target.value)}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type</label><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className="vc-input appearance-none"><option value="Debit">Debit (Out)</option><option value="Credit">Credit (In)</option></select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Category</label><input value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="vc-input" placeholder="Travel, Office..."/></div></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Authorized By</label><input value={form.authorizedBy} onChange={e=>setForm(p=>({...p,authorizedBy:e.target.value}))} className="vc-input"/></div></div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Voucher</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.voucherNo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
