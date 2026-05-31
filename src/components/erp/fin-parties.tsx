'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface Party { id: number; code: string | null; name: string; gstin: string | null; pan: string | null; address: string | null; state: string | null; stateCode: string | null; isActive: boolean; }
interface FormData { code: string; name: string; gstin: string; pan: string; address: string; state: string; stateCode: string; }
const EMPTY: FormData = { code: '', name: '', gstin: '', pan: '', address: '', state: '', stateCode: '' };

export default function FinParties() {
  const [records, setRecords] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Party | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const fetch_ = useCallback(async () => { try { setLoading(true); const r = await fetch('/api/fin/parties'); const j = await r.json(); if (j.success) setRecords(j.data); } catch { toast.error('Failed to fetch'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (r: Party) => { setEditTarget(r); setForm({ code: r.code || '', name: r.name, gstin: r.gstin || '', pan: r.pan || '', address: r.address || '', state: r.state || '', stateCode: r.stateCode || '' }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSubmitting(true);
    try { const method = editTarget ? 'PUT' : 'POST'; const body = editTarget ? { id: editTarget.id, ...form } : form; const r = await fetch('/api/fin/parties', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/parties?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="vc-panel"><div className="vc-panel-header"><Users size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Party Master (Clients/Vendors)</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Party</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Code','Name','GSTIN','PAN','State','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{records.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.code||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.gstin||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.pan||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.state||'—'}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.isActive?'bg-[#00e676]/15 text-[#00e676]':'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{r.isActive?'Active':'Inactive'}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}</tbody></table></div></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Party':'New Party'}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Code</label><input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">GSTIN</label><input value={form.gstin} onChange={e=>setForm(p=>({...p,gstin:e.target.value}))} className="vc-input" placeholder="22AAAAA0000A1Z5"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">PAN</label><input value={form.pan} onChange={e=>setForm(p=>({...p,pan:e.target.value}))} className="vc-input" placeholder="AAAAA0000A"/></div></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Address</label><input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className="vc-input"/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">State</label><input value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">State Code</label><input value={form.stateCode} onChange={e=>setForm(p=>({...p,stateCode:e.target.value}))} className="vc-input" placeholder="27"/></div></div></div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Party</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
