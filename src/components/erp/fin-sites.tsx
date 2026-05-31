'use client';
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface Site { id: number; siteCode: string; name: string; location: string | null; state: string | null; contactPerson: string | null; contactPhone: string | null; contactEmail: string | null; budget: number; status: string; }
interface FormData { siteCode: string; name: string; location: string; state: string; contactPerson: string; contactPhone: string; contactEmail: string; budget: number; status: string; }
const EMPTY: FormData = { siteCode: '', name: '', location: '', state: '', contactPerson: '', contactPhone: '', contactEmail: '', budget: 0, status: 'Active' };

export default function FinSites() {
  const [records, setRecords] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Site | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const fetch_ = useCallback(async () => { try { setLoading(true); const r = await fetch('/api/fin/sites'); const j = await r.json(); if (j.success) setRecords(j.data); } catch { toast.error('Failed to fetch'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (r: Site) => { setEditTarget(r); setForm({ siteCode: r.siteCode, name: r.name, location: r.location || '', state: r.state || '', contactPerson: r.contactPerson || '', contactPhone: r.contactPhone || '', contactEmail: r.contactEmail || '', budget: r.budget, status: r.status }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.siteCode || !form.name) { toast.error('Site code and name required'); return; }
    setSubmitting(true);
    try { const method = editTarget ? 'PUT' : 'POST'; const body = editTarget ? { id: editTarget.id, ...form } : form; const r = await fetch('/api/fin/sites', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/sites?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="vc-panel"><div className="vc-panel-header"><MapPin size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Finance Sites</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Site</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Code','Name','Location','State','Contact','Budget','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{records.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.siteCode}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.location||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.state||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.contactPerson||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(r.budget/100000).toFixed(1)}L</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Active'?'bg-[#00e676]/15 text-[#00e676]':'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}</tbody></table></div></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Site':'New Site'}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site Code *</label><input value={form.siteCode} onChange={e=>setForm(p=>({...p,siteCode:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">State</label><input value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Contact Person</label><input value={form.contactPerson} onChange={e=>setForm(p=>({...p,contactPerson:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Phone</label><input value={form.contactPhone} onChange={e=>setForm(p=>({...p,contactPhone:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Email</label><input value={form.contactEmail} onChange={e=>setForm(p=>({...p,contactEmail:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Budget (₹)</label><input type="number" value={form.budget||''} onChange={e=>setForm(p=>({...p,budget:Number(e.target.value)}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="vc-input appearance-none"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div></div></div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Site</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
