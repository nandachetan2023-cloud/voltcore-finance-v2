'use client';
import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface SiteRef { id: number; name: string; siteCode: string; }
interface Asset { id: number; assetCode: string; name: string; category: string; serialNo: string | null; acquisitionDate: string; cost: number; salvageValue: number; usefulLife: number; depreciationMethod: string; custodian: string | null; departmentCode: string | null; finSiteId: number | null; status: string; site?: SiteRef | null; }
interface FormData { assetCode: string; name: string; category: string; serialNo: string; acquisitionDate: string; cost: number; salvageValue: number; usefulLife: number; depreciationMethod: string; custodian: string; departmentCode: string; finSiteId: string; status: string; }
const EMPTY: FormData = { assetCode: '', name: '', category: 'Machinery', serialNo: '', acquisitionDate: '', cost: 0, salvageValue: 0, usefulLife: 5, depreciationMethod: 'Straight Line', custodian: '', departmentCode: '', finSiteId: '', status: 'Active' };
const CATEGORIES = ['Machinery', 'Office', 'Vehicles', 'IT', 'Land', 'Buildings'];

const ASSET_COLUMNS: ExportColumn<Asset>[] = [
  { header: 'Asset Code', accessor: 'assetCode' },
  { header: 'Name', accessor: 'name' },
  { header: 'Category', accessor: 'category' },
  { header: 'Serial No', accessor: 'serialNo' },
  { header: 'Purchase Date', accessor: (r) => r.acquisitionDate?.split('T')[0] ?? '' },
  { header: 'Cost', accessor: 'cost' },
  { header: 'Salvage Value', accessor: 'salvageValue' },
  { header: 'Useful Life (Yrs)', accessor: 'usefulLife' },
  { header: 'Depreciation Method', accessor: 'depreciationMethod' },
  { header: 'Custodian', accessor: 'custodian' },
  { header: 'Status', accessor: 'status' },
];

const ASSET_IMPORT_FIELDS: ImportField[] = [
  { key: 'assetCode', label: 'Asset Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'category', label: 'Category' },
  { key: 'serialNo', label: 'Serial No' },
  { key: 'acquisitionDate', label: 'Purchase Date', required: true, type: 'date' },
  { key: 'cost', label: 'Cost', type: 'number' },
  { key: 'salvageValue', label: 'Salvage Value', type: 'number' },
  { key: 'usefulLife', label: 'Useful Life (Yrs)', type: 'number' },
  { key: 'depreciationMethod', label: 'Depreciation Method' },
  { key: 'custodian', label: 'Custodian' },
  { key: 'status', label: 'Status' },
];
const ASSET_SAMPLE_ROW = { assetCode: 'FA/MAC/001', name: 'Hydraulic Crane — 50T', category: 'Machinery', serialNo: 'HC-50T-2023-001', acquisitionDate: '2023-04-15', cost: 8500000, salvageValue: 850000, usefulLife: 15, depreciationMethod: 'Straight Line', custodian: 'Rajesh Kumar', status: 'Active' };

function generateMockAssets(): Asset[] {
  return [
    { id: 1, assetCode: 'FA/MAC/001', name: 'Hydraulic Crane — 50T', category: 'Machinery', serialNo: 'HC-50T-2023-001', acquisitionDate: '2023-04-15T00:00:00', cost: 8500000, salvageValue: 850000, usefulLife: 15, depreciationMethod: 'Straight Line', custodian: 'Rajesh Kumar', departmentCode: null, finSiteId: null, status: 'Active' },
    { id: 2, assetCode: 'FA/VEH/002', name: 'Tata Prima 4040S Tipper', category: 'Vehicles', serialNo: 'TP-4040-2022-012', acquisitionDate: '2022-08-20T00:00:00', cost: 3200000, salvageValue: 320000, usefulLife: 10, depreciationMethod: 'Written Down Value', custodian: 'Ankit Verma', departmentCode: null, finSiteId: null, status: 'Active' },
    { id: 3, assetCode: 'FA/OFC/003', name: 'Dell PowerEdge R750 Server', category: 'IT', serialNo: 'DELL-R750-2024-005', acquisitionDate: '2024-02-10T00:00:00', cost: 450000, salvageValue: 45000, usefulLife: 5, depreciationMethod: 'Straight Line', custodian: 'Suresh Mahto', departmentCode: null, finSiteId: null, status: 'Active' },
    { id: 4, assetCode: 'FA/MAC/004', name: 'Concrete Batching Plant — 60 m³/hr', category: 'Machinery', serialNo: 'CBP-60-2021-003', acquisitionDate: '2021-11-05T00:00:00', cost: 12000000, salvageValue: 1200000, usefulLife: 20, depreciationMethod: 'Straight Line', custodian: 'Prakash Sahu', departmentCode: null, finSiteId: null, status: 'Active' },
    { id: 5, assetCode: 'FA/BLD/005', name: 'Site Office Building — Korba', category: 'Buildings', serialNo: null, acquisitionDate: '2020-06-01T00:00:00', cost: 25000000, salvageValue: 2500000, usefulLife: 30, depreciationMethod: 'Straight Line', custodian: 'Deepak Mishra', departmentCode: null, finSiteId: null, status: 'Active' },
    { id: 6, assetCode: 'FA/OFC/006', name: 'HP LaserJet Enterprise M612', category: 'Office', serialNo: 'HP-M612-2024-008', acquisitionDate: '2024-05-22T00:00:00', cost: 85000, salvageValue: 8500, usefulLife: 5, depreciationMethod: 'Written Down Value', custodian: 'Amit Singh', departmentCode: null, finSiteId: null, status: 'Active' },
    { id: 7, assetCode: 'FA/VEH/007', name: 'Mahindra Bolero Pickup', category: 'Vehicles', serialNo: 'MB-PUP-2023-015', acquisitionDate: '2023-09-10T00:00:00', cost: 1100000, salvageValue: 110000, usefulLife: 8, depreciationMethod: 'Straight Line', custodian: 'Manoj Rao', departmentCode: null, finSiteId: null, status: 'Active' },
  ];
}

export default function FinAssets() {
  const [records, setRecords] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const tc = useTableControls(records, (r) => `${r.assetCode} ${r.name} ${r.category} ${r.serialNo ?? ''} ${r.custodian ?? ''} ${r.status} ${r.site?.name ?? ''}`);

  const fetch_ = useCallback(async () => { try { setLoading(true); const r = await fetch('/api/fin/assets'); const j = await r.json(); if (j.success && j.data?.length) { setRecords(j.data); } else { setRecords(generateMockAssets()); toast.info('Sample data — no server records found'); } } catch { setRecords(generateMockAssets()); toast.info('Sample data — API unavailable'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {}); }, []);

  const openEdit = (r: Asset) => { setEditTarget(r); setForm({ assetCode: r.assetCode, name: r.name, category: r.category, serialNo: r.serialNo || '', acquisitionDate: r.acquisitionDate?.split('T')[0] || '', cost: r.cost, salvageValue: r.salvageValue, usefulLife: r.usefulLife, depreciationMethod: r.depreciationMethod, custodian: r.custodian || '', departmentCode: r.departmentCode || '', finSiteId: r.finSiteId ? String(r.finSiteId) : '', status: r.status }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.assetCode || !form.name || !form.acquisitionDate) { toast.error('Asset code, name, and acquisition date required'); return; }
    setSubmitting(true);
    try {
      const siteId = form.finSiteId ? Number(form.finSiteId) : null;
      const { finSiteId, ...rest } = form;
      const payload = { ...rest, siteId, finSiteId: siteId, acquisitionDate: new Date(form.acquisitionDate) };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/assets', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/assets?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  const totalCost = records.reduce((s, r) => s + r.cost, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Assets"
        fields={ASSET_IMPORT_FIELDS}
        keyField="assetCode"
        existingKeys={new Set(records.map(r => r.assetCode))}
        commitEndpoint="/api/fin/assets/import"
        sampleRow={ASSET_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Assets</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Cost</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalCost/100000).toFixed(1)}L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Active</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.filter(r=>r.status==='Active').length}</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><Package size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Fixed Asset Register</span><div className="ml-auto"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search assets..." /></div><div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={ASSET_COLUMNS} filename="fin-assets" /></div><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Asset</button></div>
        <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Code','Name','Category','Site','Serial No','Acquired','Cost','Life (Yrs)','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.assetCode}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.category}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.site?.siteCode||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.serialNo||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.acquisitionDate?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(r.cost ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.usefulLife}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Active'?'bg-[#00e676]/15 text-[#00e676]':'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={10} className="py-8 text-center text-[#5a6878]">No matching assets</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Asset':'New Fixed Asset'}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Asset Code *</label><input value={form.assetCode} onChange={e=>setForm(p=>({...p,assetCode:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="vc-input appearance-none">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Serial No</label><input value={form.serialNo} onChange={e=>setForm(p=>({...p,serialNo:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Acquisition Date *</label><input type="date" value={form.acquisitionDate} onChange={e=>setForm(p=>({...p,acquisitionDate:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Cost (₹)</label><input type="number" value={form.cost||''} onChange={e=>setForm(p=>({...p,cost:Number(e.target.value)}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Salvage Value</label><input type="number" value={form.salvageValue||''} onChange={e=>setForm(p=>({...p,salvageValue:Number(e.target.value)}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Useful Life (Yrs)</label><input type="number" value={form.usefulLife} onChange={e=>setForm(p=>({...p,usefulLife:Number(e.target.value)}))} className="vc-input"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Depreciation Method</label><select value={form.depreciationMethod} onChange={e=>setForm(p=>({...p,depreciationMethod:e.target.value}))} className="vc-input appearance-none"><option value="Straight Line">Straight Line</option><option value="Double Declining">Double Declining</option></select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Custodian</label><input value={form.custodian} onChange={e=>setForm(p=>({...p,custodian:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site</label><select value={form.finSiteId} onChange={e=>setForm(p=>({...p,finSiteId:e.target.value}))} className="vc-input appearance-none"><option value="">— Unassigned —</option>{sites.map(s=><option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Department</label><input value={form.departmentCode} onChange={e=>setForm(p=>({...p,departmentCode:e.target.value}))} className="vc-input" placeholder="e.g. Electrical"/></div></div></div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Asset</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
