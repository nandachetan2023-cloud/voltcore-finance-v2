'use client';
import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';

interface Party { id: number; name: string; }
interface Site { id: number; name: string; }
interface WorkOrder {
  id: number; partyId: number; siteId: number | null; workOrderNo: string; description: string | null;
  initiationDate: string | null; completionDate: string | null; bgAmount: number | null; bgSource: string | null;
  orderAmount: number; unexecutedAmount: number; bookedLastFY: number; bookedCurrentFY: number; toBeBookedEndFY: number;
  billRaisedAmount: number; receivedAgainstBill: number; workDoneNotBilled: number;
  extensionLetter: string | null; delayReason: string | null; subcontractedTo: string | null;
  financialYear: string | null; status: string; party?: Party; site?: Site;
}
interface FormData {
  partyId: number; siteId: number | null; workOrderNo: string; description: string;
  initiationDate: string; completionDate: string; bgAmount: number; bgSource: string;
  orderAmount: number; unexecutedAmount: number; bookedLastFY: number; bookedCurrentFY: number; toBeBookedEndFY: number;
  billRaisedAmount: number; receivedAgainstBill: number; workDoneNotBilled: number;
  extensionLetter: string; delayReason: string; subcontractedTo: string; financialYear: string; status: string;
}
const EMPTY: FormData = {
  partyId: 0, siteId: null, workOrderNo: '', description: '', initiationDate: '', completionDate: '',
  bgAmount: 0, bgSource: '', orderAmount: 0, unexecutedAmount: 0, bookedLastFY: 0, bookedCurrentFY: 0,
  toBeBookedEndFY: 0, billRaisedAmount: 0, receivedAgainstBill: 0, workDoneNotBilled: 0,
  extensionLetter: '', delayReason: '', subcontractedTo: '', financialYear: '', status: 'Active',
};
const STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled'];

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN'); }

export default function FinWorkOrders() {
  const [records, setRecords] = useState<WorkOrder[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const tc = useTableControls(records, (r) => `${r.workOrderNo} ${r.party?.name ?? ''} ${r.description ?? ''} ${r.financialYear ?? ''} ${r.status}`);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const [wo, p, s] = await Promise.all([fetch('/api/fin/work-orders'), fetch('/api/fin/parties'), fetch('/api/fin/sites')]);
      const [wj, pj, sj] = await Promise.all([wo.json(), p.json(), s.json()]);
      if (wj.success) setRecords(wj.data);
      if (pj.success) setParties(pj.data);
      if (sj.success) setSites(sj.data);
    } catch { toast.error('Failed to fetch'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openNew = () => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (r: WorkOrder) => {
    setEditTarget(r);
    setForm({
      partyId: r.partyId, siteId: r.siteId, workOrderNo: r.workOrderNo, description: r.description || '',
      initiationDate: r.initiationDate?.split('T')[0] || '', completionDate: r.completionDate?.split('T')[0] || '',
      bgAmount: r.bgAmount || 0, bgSource: r.bgSource || '', orderAmount: r.orderAmount, unexecutedAmount: r.unexecutedAmount,
      bookedLastFY: r.bookedLastFY, bookedCurrentFY: r.bookedCurrentFY, toBeBookedEndFY: r.toBeBookedEndFY,
      billRaisedAmount: r.billRaisedAmount, receivedAgainstBill: r.receivedAgainstBill, workDoneNotBilled: r.workDoneNotBilled,
      extensionLetter: r.extensionLetter || '', delayReason: r.delayReason || '', subcontractedTo: r.subcontractedTo || '',
      financialYear: r.financialYear || '', status: r.status,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.partyId || !form.workOrderNo) { toast.error('Party and Work Order No are required'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        siteId: form.siteId || null,
        initiationDate: form.initiationDate ? new Date(form.initiationDate) : null,
        completionDate: form.completionDate ? new Date(form.completionDate) : null,
        bgSource: form.bgSource || null, extensionLetter: form.extensionLetter || null,
        delayReason: form.delayReason || null, subcontractedTo: form.subcontractedTo || null,
        financialYear: form.financialYear || null, description: form.description || null,
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/work-orders', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/fin/work-orders?id=${deleteTarget.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const totalOrder = records.reduce((s, r) => s + r.orderAmount, 0);
  const totalBilled = records.reduce((s, r) => s + r.billRaisedAmount, 0);
  const totalUnexec = records.reduce((s, r) => s + r.unexecutedAmount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  const inputCls = 'vc-input';
  const lbl = 'text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Work Orders</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Order Value</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalOrder/10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Bill Raised</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalBilled/10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Unexecuted</div><div className="text-[20px] font-bold text-[#ffab40]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalUnexec/10000000).toFixed(2)} Cr</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><ClipboardList size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Work Orders (Orders in Hand)</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search work orders..." /></div><button onClick={openNew} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Work Order</button></div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Order No','Party','Description','Init Date','Order Amt','Unexecuted','Bill Raised','Received','FY','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono whitespace-nowrap">{r.workOrderNo}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[150px] truncate">{r.party?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate">{r.description||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.initiationDate?.split('T')[0]||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">{fmt(r.orderAmount)}</td><td className="py-2.5 px-3 text-[#ffab40] font-mono text-right whitespace-nowrap">{fmt(r.unexecutedAmount)}</td><td className="py-2.5 px-3 text-[#00d4ff] font-mono text-right whitespace-nowrap">{fmt(r.billRaisedAmount)}</td><td className="py-2.5 px-3 text-[#00e676] font-mono text-right whitespace-nowrap">{fmt(r.receivedAgainstBill)}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.financialYear||'—'}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Active'?'bg-[#00e676]/15 text-[#00e676]':r.status==='Completed'?'bg-[#00d4ff]/15 text-[#00d4ff]':r.status==='On Hold'?'bg-[#ffab40]/15 text-[#ffab40]':'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No matching work orders</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Work Order':'New Work Order'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Party / Company *</label><select value={form.partyId} onChange={e=>setForm(p=>({...p,partyId:Number(e.target.value)}))} className={`${inputCls} appearance-none`}><option value={0}>Select...</option>{parties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className={lbl}>Work Order No *</label><input value={form.workOrderNo} onChange={e=>setForm(p=>({...p,workOrderNo:e.target.value}))} className={inputCls}/></div>
          </div>
          <div><label className={lbl}>Description of Work</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className={inputCls}/></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Site</label><select value={form.siteId ?? 0} onChange={e=>setForm(p=>({...p,siteId:Number(e.target.value)||null}))} className={`${inputCls} appearance-none`}><option value={0}>— None —</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className={lbl}>Initiation Date</label><input type="date" value={form.initiationDate} onChange={e=>setForm(p=>({...p,initiationDate:e.target.value}))} className={inputCls}/></div>
            <div><label className={lbl}>Completion Date</label><input type="date" value={form.completionDate} onChange={e=>setForm(p=>({...p,completionDate:e.target.value}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Order Amount (₹)</label><input type="number" value={form.orderAmount||''} onChange={e=>setForm(p=>({...p,orderAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Unexecuted Amount</label><input type="number" value={form.unexecutedAmount||''} onChange={e=>setForm(p=>({...p,unexecutedAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Financial Year</label><input value={form.financialYear} onChange={e=>setForm(p=>({...p,financialYear:e.target.value}))} className={inputCls} placeholder="2024-25"/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Booked Last FY</label><input type="number" value={form.bookedLastFY||''} onChange={e=>setForm(p=>({...p,bookedLastFY:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Booked Current FY</label><input type="number" value={form.bookedCurrentFY||''} onChange={e=>setForm(p=>({...p,bookedCurrentFY:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>To Be Booked End FY</label><input type="number" value={form.toBeBookedEndFY||''} onChange={e=>setForm(p=>({...p,toBeBookedEndFY:Number(e.target.value)}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Bill Raised</label><input type="number" value={form.billRaisedAmount||''} onChange={e=>setForm(p=>({...p,billRaisedAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Received vs Bill</label><input type="number" value={form.receivedAgainstBill||''} onChange={e=>setForm(p=>({...p,receivedAgainstBill:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Work Done Not Billed</label><input type="number" value={form.workDoneNotBilled||''} onChange={e=>setForm(p=>({...p,workDoneNotBilled:Number(e.target.value)}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>BG Amount</label><input type="number" value={form.bgAmount||''} onChange={e=>setForm(p=>({...p,bgAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>BG Source (Bank/FD)</label><input value={form.bgSource} onChange={e=>setForm(p=>({...p,bgSource:e.target.value}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={`${inputCls} appearance-none`}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={lbl}>Subcontracted To</label><input value={form.subcontractedTo} onChange={e=>setForm(p=>({...p,subcontractedTo:e.target.value}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Extension Letter</label><input value={form.extensionLetter} onChange={e=>setForm(p=>({...p,extensionLetter:e.target.value}))} className={inputCls}/></div>
            <div><label className={lbl}>Delay Reason</label><input value={form.delayReason} onChange={e=>setForm(p=>({...p,delayReason:e.target.value}))} className={inputCls}/></div>
          </div>
        </div>
        <DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Work Order</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.workOrderNo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
