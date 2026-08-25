'use client';
import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect, DatalistField, CostingFields, useFormValidation, required } from './_form-controls';
import { Checkbox } from '@/components/ui/checkbox';

interface SiteRef { id: number; name: string; siteCode: string; }
interface Asset { id: number; assetCode: string; name: string; category: string; serialNo: string | null; acquisitionDate: string; cost: number; salvageValue: number; usefulLife: number; depreciationMethod: string; custodian: string | null; departmentCode: string | null; jobCode: string | null; poNo: string | null; costCenter: string | null; department: string | null; projectManager: string | null; finSiteId: number | null; status: string; site?: SiteRef | null; }
interface FormData { assetCode: string; name: string; category: string; serialNo: string; acquisitionDate: string; cost: number; salvageValue: number; usefulLife: number; depreciationMethod: string; custodian: string; departmentCode: string; finSiteId: string; status: string; jobCode: string; poNo: string; costCenter: string; department: string; projectManager: string; }
const EMPTY: FormData = { assetCode: '', name: '', category: 'Machinery', serialNo: '', acquisitionDate: '', cost: 0, salvageValue: 0, usefulLife: 5, depreciationMethod: 'Straight Line', custodian: '', departmentCode: '', finSiteId: '', status: 'Active', jobCode: '', poNo: '', costCenter: '', department: '', projectManager: '' };
const CATEGORIES = ['Machinery', 'Office', 'Vehicles', 'IT', 'Land', 'Buildings'];

const ASSET_COLUMNS: ExportColumn<Asset>[] = [
  { header: 'Asset Code', accessor: 'assetCode' },
  { header: 'Name', accessor: 'name' },
  { header: 'Category', accessor: 'category' },
  { header: 'Site Code', accessor: (r) => r.site?.siteCode ?? '' },
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Cost Center', accessor: 'costCenter' },
  { header: 'Department', accessor: (r) => r.departmentCode ?? '' },
  { header: 'Project Manager', accessor: 'projectManager' },
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
  { key: 'jobCode', label: 'Job Code' },
  { key: 'poNo', label: 'PO Number' },
  { key: 'costCenter', label: 'Cost Center', required: true },
  { key: 'department', label: 'Department' },
  { key: 'projectManager', label: 'Project Manager' },
  { key: 'status', label: 'Status' },
];
const ASSET_SAMPLE_ROW = { assetCode: 'FA/MAC/001', name: 'Hydraulic Crane — 50T', category: 'Machinery', serialNo: 'HC-50T-2023-001', acquisitionDate: '2023-04-15', cost: 8500000, salvageValue: 850000, usefulLife: 15, depreciationMethod: 'Straight Line', custodian: 'Rajesh Kumar', jobCode: 'JOB-2026-001', poNo: 'PO-1001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma', status: 'Active' };

function generateMockAssets(): Asset[] {
  return [
    { id: 1, assetCode: 'FA/MAC/001', name: 'Hydraulic Crane — 50T', category: 'Machinery', serialNo: 'HC-50T-2023-001', acquisitionDate: '2023-04-15T00:00:00', cost: 8500000, salvageValue: 850000, usefulLife: 15, depreciationMethod: 'Straight Line', custodian: 'Rajesh Kumar', departmentCode: 'Projects', jobCode: 'JOB-2026-001', poNo: 'PO-1001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma', finSiteId: null, status: 'Active' },
    { id: 2, assetCode: 'FA/VEH/002', name: 'Tata Prima 4040S Tipper', category: 'Vehicles', serialNo: 'TP-4040-2022-012', acquisitionDate: '2022-08-20T00:00:00', cost: 3200000, salvageValue: 320000, usefulLife: 10, depreciationMethod: 'Written Down Value', custodian: 'Ankit Verma', departmentCode: 'Operations', jobCode: 'JOB-2026-002', poNo: 'PO-1002', costCenter: 'CC-SIT-002', department: 'Operations', projectManager: 'A. Verma', finSiteId: null, status: 'Active' },
    { id: 3, assetCode: 'FA/OFC/003', name: 'Dell PowerEdge R750 Server', category: 'IT', serialNo: 'DELL-R750-2024-005', acquisitionDate: '2024-02-10T00:00:00', cost: 450000, salvageValue: 45000, usefulLife: 5, depreciationMethod: 'Straight Line', custodian: 'Suresh Mahto', departmentCode: 'IT', jobCode: 'JOB-2026-003', poNo: 'PO-1003', costCenter: 'CC-SIT-003', department: 'IT', projectManager: 'P. Iyer', finSiteId: null, status: 'Active' },
    { id: 4, assetCode: 'FA/MAC/004', name: 'Concrete Batching Plant — 60 m³/hr', category: 'Machinery', serialNo: 'CBP-60-2021-003', acquisitionDate: '2021-11-05T00:00:00', cost: 12000000, salvageValue: 1200000, usefulLife: 20, depreciationMethod: 'Straight Line', custodian: 'Prakash Sahu', departmentCode: 'Projects', jobCode: 'JOB-2026-004', poNo: 'PO-1004', costCenter: 'CC-SIT-004', department: 'Projects', projectManager: 'S. Rao', finSiteId: null, status: 'Active' },
    { id: 5, assetCode: 'FA/BLD/005', name: 'Site Office Building — Korba', category: 'Buildings', serialNo: null, acquisitionDate: '2020-06-01T00:00:00', cost: 25000000, salvageValue: 2500000, usefulLife: 30, depreciationMethod: 'Straight Line', custodian: 'Deepak Mishra', departmentCode: 'Site Execution', jobCode: 'JOB-2026-005', poNo: 'PO-1005', costCenter: 'CC-SIT-005', department: 'Site Execution', projectManager: 'M. Khan', finSiteId: null, status: 'Active' },
    { id: 6, assetCode: 'FA/OFC/006', name: 'HP LaserJet Enterprise M612', category: 'Office', serialNo: 'HP-M612-2024-008', acquisitionDate: '2024-05-22T00:00:00', cost: 85000, salvageValue: 8500, usefulLife: 5, depreciationMethod: 'Written Down Value', custodian: 'Amit Singh', departmentCode: 'Finance', jobCode: 'JOB-2026-006', poNo: 'PO-1006', costCenter: 'CC-SIT-006', department: 'Finance', projectManager: 'P. Iyer', finSiteId: null, status: 'Active' },
    { id: 7, assetCode: 'FA/VEH/007', name: 'Mahindra Bolero Pickup', category: 'Vehicles', serialNo: 'MB-PUP-2023-015', acquisitionDate: '2023-09-10T00:00:00', cost: 1100000, salvageValue: 110000, usefulLife: 8, depreciationMethod: 'Straight Line', custodian: 'Manoj Rao', departmentCode: 'Procurement', jobCode: 'JOB-2026-007', poNo: 'PO-1007', costCenter: 'CC-SIT-007', department: 'Procurement', projectManager: 'A. Verma', finSiteId: null, status: 'Active' },
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
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filtered = records.filter(r => statusFilter === 'All' || r.status === statusFilter);
  const tc = useTableControls(filtered, (r) => `${r.assetCode} ${r.name} ${r.category} ${r.serialNo ?? ''} ${r.custodian ?? ''} ${r.status} ${r.site?.name ?? ''}`);
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllOnPage = () => setSelected(s => { const next = new Set(s); pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id)); return next; });
  const ASSET_STATUSES = ['All', ...new Set(records.map(r => r.status).filter(Boolean))];

  const fetch_ = useCallback(async () => { try { setLoading(true); const r = await fetch('/api/fin/assets'); const j = await r.json(); if (j.success && j.data?.length) { setRecords(j.data); } else { setRecords(generateMockAssets()); toast.info('Sample data — no server records found'); } } catch { setRecords(generateMockAssets()); toast.info('Sample data — API unavailable'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {}); }, []);

  const { errors: formErrors, validate: validateForm, clearError, setErrors: setFormErrors } = useFormValidation<FormData>({
    assetCode: required('Asset Code'),
    name: required('Name'),
    acquisitionDate: required('Acquisition Date'),
    finSiteId: required('Site Code'),
    jobCode: required('Job Code'),
    poNo: required('PO Number'),
    costCenter: required('Cost Center'),
    department: required('Department'),
    projectManager: required('Project Manager'),
  });
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const openEdit = (r: Asset) => { setEditTarget(r); setForm({ assetCode: r.assetCode, name: r.name, category: r.category, serialNo: r.serialNo || '', acquisitionDate: r.acquisitionDate?.split('T')[0] || '', cost: r.cost, salvageValue: r.salvageValue, usefulLife: r.usefulLife, depreciationMethod: r.depreciationMethod, custodian: r.custodian || '', departmentCode: r.departmentCode || '', finSiteId: r.finSiteId ? String(r.finSiteId) : '', status: r.status, jobCode: r.jobCode || '', poNo: r.poNo || '', costCenter: r.costCenter || '', department: r.department || r.departmentCode || '', projectManager: r.projectManager || '' }); setFormErrors({}); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!validateForm(form)) { toast.error('Please fix the highlighted fields'); return; }
    setSubmitting(true);
    try {
      const siteId = form.finSiteId ? Number(form.finSiteId) : null;
      const { finSiteId, ...rest } = form;
      const payload = { ...rest, siteId, finSiteId: siteId, departmentCode: form.department || null, jobCode: form.jobCode || null, poNo: form.poNo || null, costCenter: form.costCenter || null, projectManager: form.projectManager || null, acquisitionDate: new Date(form.acquisitionDate) };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/assets', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/assets?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      const ids = [...selected].join(',');
      const r = await fetch(`/api/fin/assets?ids=${ids}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} asset${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

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

      <div className="vc-panel"><div className="vc-panel-header"><Package size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Fixed Asset Register</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="ml-2 vc-input w-auto text-[11px] py-1"><option value="All">All Statuses</option>{ASSET_STATUSES.filter(s=>s!=='All').map(s=><option key={s} value={s}>{s}</option>)}</select><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search assets..." /></div><div className="flex items-center gap-2 ml-2">{selected.size>0&&<button onClick={()=>setBulkDeleteOpen(true)} className="vc-btn-danger flex items-center gap-1.5 text-[11px]"><Trash2 size={13} /> Delete ({selected.size})</button>}<button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={ASSET_COLUMNS} filename="fin-assets" /></div><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormErrors({}); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Asset</button></div>
        <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
        <th className="w-8 px-2"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} className="border-[#2a3542] data-[state=checked]:bg-[#f5a623] data-[state=checked]:border-[#f5a623]" /></th>
        <SortableTh label="Code" sortKey="assetCode" accessor={(r: Asset) => r.assetCode} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Name" sortKey="name" accessor={(r: Asset) => r.name} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Category" sortKey="category" accessor={(r: Asset) => r.category} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Site" sortKey="site" accessor={(r: Asset) => r.site?.siteCode} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Serial No" sortKey="serialNo" accessor={(r: Asset) => r.serialNo} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Acquired" sortKey="acquisitionDate" accessor={(r: Asset) => r.acquisitionDate} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Cost" sortKey="cost" accessor={(r: Asset) => r.cost} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
        <SortableTh label="Life (Yrs)" sortKey="usefulLife" accessor={(r: Asset) => r.usefulLife} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
        <SortableTh label="Status" sortKey="status" accessor={(r: Asset) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
        <th className="py-2 px-3"></th>
      </tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className={`hover:bg-[#141920] ${selected.has(r.id)?'bg-[#f5a623]/5':''}`}><td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={()=>toggleRow(r.id)} className="border-[#2a3542] data-[state=checked]:bg-[#f5a623] data-[state=checked]:border-[#f5a623]" /></td><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.assetCode}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.category}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.site?.siteCode||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.serialNo||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.acquisitionDate?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(r.cost ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.usefulLife}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Active'?'bg-[#00e676]/15 text-[#00e676]':'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No matching assets</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg" onKeyDown={e => { if (e.key === 'Enter' && !(e.target as HTMLElement).matches('textarea, select')) { e.preventDefault(); handleSubmit(); } }}>
        <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Asset':'New Fixed Asset'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Asset Code" required error={formErrors.assetCode}><input value={form.assetCode} onChange={e=>setField('assetCode', e.target.value)} className="vc-input" autoFocus/></FormField>
            <FormField label="Name" required error={formErrors.name}><input value={form.name} onChange={e=>setField('name', e.target.value)} className="vc-input"/></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Category"><select value={form.category} onChange={e=>setField('category', e.target.value)} className="vc-input appearance-none">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="Serial No"><input value={form.serialNo} onChange={e=>setField('serialNo', e.target.value)} className="vc-input"/></FormField>
            <FormField label="Acquisition Date" required error={formErrors.acquisitionDate}><input type="date" value={form.acquisitionDate} onChange={e=>setField('acquisitionDate', e.target.value)} className="vc-input"/></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Cost (₹)"><input type="number" value={form.cost||''} onChange={e=>setField('cost', Number(e.target.value))} className="vc-input"/></FormField>
            <FormField label="Salvage Value"><input type="number" value={form.salvageValue||''} onChange={e=>setField('salvageValue', Number(e.target.value))} className="vc-input"/></FormField>
            <FormField label="Useful Life (Yrs)"><input type="number" value={form.usefulLife} onChange={e=>setField('usefulLife', Number(e.target.value))} className="vc-input"/></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Depreciation Method"><select value={form.depreciationMethod} onChange={e=>setField('depreciationMethod', e.target.value)} className="vc-input appearance-none"><option value="Straight Line">Straight Line</option><option value="Double Declining">Double Declining</option></select></FormField>
            <FormField label="Custodian"><input value={form.custodian} onChange={e=>setField('custodian', e.target.value)} className="vc-input"/></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Site">
              <SearchableSelect value={form.finSiteId} onChange={v => setField('finSiteId', v)} options={sites.map(s=>({ value: String(s.id), label: s.name, sublabel: s.siteCode }))} placeholder="— Unassigned —"/>
            </FormField>
            <FormField label="Cost Center" required error={formErrors.costCenter}><input value={form.costCenter} onChange={e=>setField('costCenter', e.target.value)} className="vc-input" placeholder="e.g. CC-SIT-001"/></FormField>
            <FormField label="Department"><input value={form.departmentCode} onChange={e=>setField('departmentCode', e.target.value)} className="vc-input" placeholder="e.g. Electrical"/></FormField>
          </div>
        </div>
        <DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Asset</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} asset{selected.size===1?'':'s'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete the selected asset{selected.size===1?'':'s'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost" onClick={()=>setSelected(new Set())}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete {selected.size}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
