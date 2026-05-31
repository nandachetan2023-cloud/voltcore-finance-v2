'use client';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface PO { id: number; poNo: string; vendorName: string; siteId: number; date: string; totalAmount: number; status: string; site?: { name: string }; descriptionOfWork: string | null; }
interface Site { id: number; name: string; }
interface FormData { poNo: string; vendorId: string; vendorName: string; siteId: number; date: string; descriptionOfWork: string; totalAmount: number; status: string; }
const EMPTY: FormData = { poNo: '', vendorId: '', vendorName: '', siteId: 0, date: '', descriptionOfWork: '', totalAmount: 0, status: 'Draft' };

export default function FinPurchaseOrders() {
  const [records, setRecords] = useState<PO[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PO | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const fetch_ = useCallback(async () => { try { setLoading(true); const [po, s] = await Promise.all([fetch('/api/fin/purchase-orders'), fetch('/api/fin/sites')]); const [pj, sj] = await Promise.all([po.json(), s.json()]); if (pj.success) setRecords(pj.data); if (sj.success) setSites(sj.data); } catch { toast.error('Failed to fetch'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (r: PO) => { setEditTarget(r); setForm({ poNo: r.poNo, vendorId: '', vendorName: r.vendorName, siteId: r.siteId, date: r.date?.split('T')[0] || '', descriptionOfWork: r.descriptionOfWork || '', totalAmount: r.totalAmount, status: r.status }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.poNo || !form.vendorName || !form.siteId || !form.date) { toast.error('PO No, Vendor, Site, Date required'); return; }
    setSubmitting(true);
    try { const method = editTarget ? 'PUT' : 'POST'; const body = editTarget ? { id: editTarget.id, ...form, date: new Date(form.date) } : { ...form, date: new Date(form.date) }; const r = await fetch('/api/fin/purchase-orders', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/purchase-orders?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="vc-panel"><div className="vc-panel-header"><ShoppingCart size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Purchase Orders</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New PO</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['PO No','Vendor','Site','Date','Description','Amount','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{records.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.poNo}</td><td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendorName}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.site?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate">{r.descriptionOfWork||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{r.totalAmount.toLocaleString('en-IN')}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Approved'?'bg-[#00e676]/15 text-[#00e676]':r.status==='Draft'?'bg-[#5a6878]/15 text-[#5a6878]':'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}</tbody></table></div></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit PO':'New Purchase Order'}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">PO No *</label><input value={form.poNo} onChange={e=>setForm(p=>({...p,poNo:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Vendor Name *</label><input value={form.vendorName} onChange={e=>setForm(p=>({...p,vendorName:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label><select value={form.siteId} onChange={e=>setForm(p=>({...p,siteId:Number(e.target.value)}))} className="vc-input appearance-none"><option value={0}>Select...</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className="vc-input"/></div></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description of Work</label><input value={form.descriptionOfWork} onChange={e=>setForm(p=>({...p,descriptionOfWork:e.target.value}))} className="vc-input"/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Total Amount (₹)</label><input type="number" value={form.totalAmount||''} onChange={e=>setForm(p=>({...p,totalAmount:Number(e.target.value)}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="vc-input appearance-none"><option value="Draft">Draft</option><option value="Approved">Approved</option><option value="Closed">Closed</option></select></div></div></div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete PO</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.poNo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
