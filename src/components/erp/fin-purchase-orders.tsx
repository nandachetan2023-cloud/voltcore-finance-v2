'use client';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface PO { id: number; poNo: string; vendorName: string; siteId: number; jobCode: string | null; date: string; totalAmount: number; status: string; site?: { name: string }; descriptionOfWork: string | null; }
interface Site { id: number; name: string; }
interface FormData { poNo: string; vendorId: string; vendorName: string; siteId: number; jobCode: string; date: string; descriptionOfWork: string; totalAmount: number; status: string; }
const EMPTY: FormData = { poNo: '', vendorId: '', vendorName: '', siteId: 0, jobCode: '', date: '', descriptionOfWork: '', totalAmount: 0, status: 'Draft' };

function generateMockPOs(): PO[] {
  return [
    { id: 1, poNo: 'PO/2024-25/001', vendorName: 'Bharat Heavy Electricals Ltd', siteId: 1, jobCode: null, date: '2024-11-15T00:00:00', totalAmount: 18500000, status: 'Approved', site: { name: 'NTPC Rihand Dam Project' }, descriptionOfWork: 'Turbine maintenance and overhaul' },
    { id: 2, poNo: 'PO/2024-25/002', vendorName: 'Tata Projects Ltd', siteId: 2, jobCode: null, date: '2024-12-01T00:00:00', totalAmount: 32000000, status: 'Approved', site: { name: 'BALCO Aluminium Smelter' }, descriptionOfWork: 'Expansion of potline capacity' },
    { id: 3, poNo: 'PO/2024-25/003', vendorName: 'Larsen & Toubro Ltd', siteId: 3, jobCode: null, date: '2025-01-10T00:00:00', totalAmount: 45000000, status: 'Draft', site: { name: 'Coal India Eastern Coalfield' }, descriptionOfWork: 'Coal handling plant upgradation' },
    { id: 4, poNo: 'PO/2024-25/004', vendorName: 'Adani Defence Systems', siteId: 4, jobCode: null, date: '2025-02-20T00:00:00', totalAmount: 12500000, status: 'Approved', site: { name: 'Vedanta Jharsuguda Smelter' }, descriptionOfWork: 'Security infrastructure setup' },
    { id: 5, poNo: 'PO/2024-25/005', vendorName: 'Reliance Infrastructure', siteId: 5, jobCode: null, date: '2025-03-05T00:00:00', totalAmount: 8750000, status: 'Pending', site: { name: 'Hindalco Mahan Aluminium' }, descriptionOfWork: 'Electrical substation commissioning' },
    { id: 6, poNo: 'PO/2024-25/006', vendorName: 'UltraTech Cement Ltd', siteId: 6, jobCode: null, date: '2025-04-12T00:00:00', totalAmount: 22000000, status: 'Approved', site: { name: 'Tata Steel Bhamapah Project' }, descriptionOfWork: 'Cement plant civil works' },
  ];
}

const PO_COLUMNS: ExportColumn<PO>[] = [
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Vendor', accessor: 'vendorName' },
  { header: 'Site', accessor: (r: any) => r.site?.name || '' },
  { header: 'Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'Description', accessor: 'descriptionOfWork' },
  { header: 'Amount', accessor: 'totalAmount' },
  { header: 'Status', accessor: 'status' },
];

const PO_IMPORT_FIELDS: ImportField[] = [
  { key: 'poNo', label: 'PO No', required: true },
  { key: 'vendorName', label: 'Vendor', required: true },
  { key: 'siteId', label: 'Site ID', type: 'number' },
  { key: 'jobCode', label: 'Job Code' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'descriptionOfWork', label: 'Description' },
  { key: 'totalAmount', label: 'Amount', type: 'number' },
  { key: 'status', label: 'Status' },
];
const PO_SAMPLE_ROW = { poNo: 'PO-2026-001', vendorName: 'Siemens India Ltd', siteId: 1, jobCode: 'JOB-2026-001', date: '2026-01-05', descriptionOfWork: 'Circuit Breaker supply', totalAmount: 850000, status: 'Active' };

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
  const [importOpen, setImportOpen] = useState(false);
  const tc = useTableControls(records, (r) => `${r.poNo} ${r.vendorName} ${r.site?.name ?? ''} ${r.descriptionOfWork ?? ''} ${r.status}`);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/purchase-orders');
      const rj = await r.json();
      if (rj.success && rj.data?.length) { setRecords(rj.data); }
      else { setRecords(generateMockPOs()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockPOs()); toast.info('Sample data — API unavailable'); }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda' }, { id: 2, name: 'TPP NTPC Barh' }, { id: 3, name: 'HO Mumbai' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda' }, { id: 2, name: 'TPP NTPC Barh' }, { id: 3, name: 'HO Mumbai' }]); }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (r: PO) => { setEditTarget(r); setForm({ poNo: r.poNo, vendorId: '', vendorName: r.vendorName, siteId: r.siteId, jobCode: r.jobCode || '', date: r.date?.split('T')[0] || '', descriptionOfWork: r.descriptionOfWork || '', totalAmount: r.totalAmount, status: r.status }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.poNo || !form.vendorName || !form.siteId || !form.date) { toast.error('PO No, Vendor, Site, Date required'); return; }
    setSubmitting(true);
    try { const method = editTarget ? 'PUT' : 'POST'; const body = editTarget ? { id: editTarget.id, ...form, date: new Date(form.date) } : { ...form, date: new Date(form.date) }; const r = await fetch('/api/fin/purchase-orders', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/purchase-orders?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Purchase Orders"
        fields={PO_IMPORT_FIELDS}
        keyField="poNo"
        existingKeys={new Set(records.map(r => r.poNo))}
        commitEndpoint="/api/fin/purchase-orders/import"
        sampleRow={PO_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel"><div className="vc-panel-header"><ShoppingCart size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Purchase Orders</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search POs..." /></div><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
          <ExportButton records={records} columns={PO_COLUMNS} filename="fin-purchase-orders" /><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New PO</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['PO No','Vendor','Site','Job Code','Date','Description','Amount','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.poNo}</td><td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendorName}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.site?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate">{r.descriptionOfWork||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(r.totalAmount ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Approved'?'bg-[#00e676]/15 text-[#00e676]':r.status==='Draft'?'bg-[#5a6878]/15 text-[#5a6878]':'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No matching purchase orders</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit PO':'New Purchase Order'}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">PO No *</label><input value={form.poNo} onChange={e=>setForm(p=>({...p,poNo:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Vendor Name *</label><input value={form.vendorName} onChange={e=>setForm(p=>({...p,vendorName:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label><select value={form.siteId} onChange={e=>setForm(p=>({...p,siteId:Number(e.target.value)}))} className="vc-input appearance-none"><option value={0}>Select...</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className="vc-input"/></div></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description of Work</label><input value={form.descriptionOfWork} onChange={e=>setForm(p=>({...p,descriptionOfWork:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Job Code</label><input value={form.jobCode} onChange={e=>setForm(p=>({...p,jobCode:e.target.value}))} placeholder="JOB-2026-001" className="vc-input"/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Total Amount (₹)</label><input type="number" value={form.totalAmount||''} onChange={e=>setForm(p=>({...p,totalAmount:Number(e.target.value)}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="vc-input appearance-none"><option value="Draft">Draft</option><option value="Approved">Approved</option><option value="Closed">Closed</option></select></div></div></div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete PO</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.poNo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
