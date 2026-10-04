'use client';
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect } from './_form-controls';

interface CustomerRef { id: number; name: string; }
interface Site { id: number; siteCode: string; name: string; location: string | null; state: string | null; contactPerson: string | null; contactPhone: string | null; contactEmail: string | null; budget: number; customerId: number | null; startDate: string | null; endDate: string | null; status: string; customer?: CustomerRef | null; }
interface FormData { siteCode: string; name: string; location: string; state: string; contactPerson: string; contactPhone: string; contactEmail: string; budget: number; customerId: string; startDate: string; endDate: string; status: string; }
const EMPTY: FormData = { siteCode: '', name: '', location: '', state: '', contactPerson: '', contactPhone: '', contactEmail: '', budget: 0, customerId: '', startDate: '', endDate: '', status: 'Active' };

const SITE_COLUMNS: ExportColumn<Site>[] = [
  { header: 'Site Code', accessor: 'siteCode' },
  { header: 'Name', accessor: 'name' },
  { header: 'Location', accessor: 'location' },
  { header: 'State', accessor: 'state' },
  { header: 'Contact Person', accessor: 'contactPerson' },
  { header: 'Contact Phone', accessor: 'contactPhone' },
  { header: 'Contact Email', accessor: 'contactEmail' },
  { header: 'Budget', accessor: 'budget' },
  { header: 'Customer', accessor: (r) => r.customer?.name ?? '' },
  { header: 'Start Date', accessor: (r) => r.startDate?.split('T')[0] ?? '' },
  { header: 'End Date', accessor: (r) => r.endDate?.split('T')[0] ?? '' },
  { header: 'Status', accessor: 'status' },
];

const SITE_IMPORT_FIELDS: ImportField[] = [
  { key: 'siteCode', label: 'Site Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'location', label: 'Location' },
  { key: 'state', label: 'State' },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'contactPhone', label: 'Contact Phone' },
  { key: 'contactEmail', label: 'Contact Email' },
  { key: 'budget', label: 'Budget', type: 'number' },
  { key: 'status', label: 'Status' },
];
const SITE_SAMPLE_ROW = { siteCode: 'NTPC-UP-01', name: 'NTPC Rihand Dam Project', location: 'Rihand Nagar', state: 'Uttar Pradesh', contactPerson: 'Rajesh Kumar', contactPhone: '+91-9876543210', contactEmail: 'rajesh@ntpc.in', budget: 4500000, status: 'Active' };

function generateMockSites(): Site[] {
  return [
    { id: 1, siteCode: 'NTPC-UP-01', name: 'NTPC Rihand Dam Project', location: 'Rihand Nagar', state: 'Uttar Pradesh', contactPerson: 'Rajesh Kumar', contactPhone: '+91-9876543210', contactEmail: 'rajesh@ntpc.in', budget: 45000000, customerId: null, startDate: null, endDate: null, customer: null, status: 'Active' },
    { id: 2, siteCode: 'BALCO-CG-02', name: 'BALCO Aluminium Smelter', location: 'Korba', state: 'Chhattisgarh', contactPerson: 'Ankit Verma', contactPhone: '+91-9876543211', contactEmail: 'ankit@balco.in', budget: 32000000, customerId: null, startDate: null, endDate: null, customer: null, status: 'Active' },
    { id: 3, siteCode: 'CIL-JH-03', name: 'Coal India Eastern Coalfield', location: 'Dhanbad', state: 'Jharkhand', contactPerson: 'Suresh Mahto', contactPhone: '+91-9876543212', contactEmail: 'suresh@coalindia.in', budget: 28000000, customerId: null, startDate: null, endDate: null, customer: null, status: 'Active' },
    { id: 4, siteCode: 'VED-OD-04', name: 'Vedanta Jharsuguda Smelter', location: 'Jharsuguda', state: 'Odisha', contactPerson: 'Prakash Sahu', contactPhone: '+91-9876543213', contactEmail: 'prakash@vedanta.in', budget: 51000000, customerId: null, startDate: null, endDate: null, customer: null, status: 'Active' },
    { id: 5, siteCode: 'HIN-MP-05', name: 'Hindalco Mahan Aluminium', location: 'Singrauli', state: 'Madhya Pradesh', contactPerson: 'Deepak Mishra', contactPhone: '+91-9876543214', contactEmail: 'deepak@hindalco.in', budget: 38000000, customerId: null, startDate: null, endDate: null, customer: null, status: 'Active' },
    { id: 6, siteCode: 'TATA-JH-06', name: 'Tata Steel Bhamapah Project', location: 'Bhamapah', state: 'Jharkhand', contactPerson: 'Amit Singh', contactPhone: '+91-9876543215', contactEmail: 'amit@tata.in', budget: 62000000, customerId: null, startDate: null, endDate: null, customer: null, status: 'Active' },
    { id: 7, siteCode: 'JSW-KA-07', name: 'JSW Steel Vijayanagar Plant', location: 'Bellary', state: 'Karnataka', contactPerson: 'Manoj Rao', contactPhone: '+91-9876543216', contactEmail: 'manoj@jsw.in', budget: 41000000, customerId: null, startDate: null, endDate: null, customer: null, status: 'Active' },
  ];
}

export default function FinSites() {
  const [records, setRecords] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Site | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerRef[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filtered = records.filter(r => statusFilter === 'All' || r.status === statusFilter);
  const tc = useTableControls(filtered, (r) => `${r.siteCode} ${r.name} ${r.location ?? ''} ${r.state ?? ''} ${r.contactPerson ?? ''} ${r.customer?.name ?? ''} ${r.status}`);
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllOnPage = () => setSelected(s => {
    const next = new Set(s);
    pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id));
    return next;
  });

  const fetch_ = useCallback(async () => { try { setLoading(true); const r = await fetch('/api/fin/sites'); const j = await r.json(); if (j.success && j.data?.length) { setRecords(j.data); } else { setRecords(generateMockSites()); toast.info('Sample data — no server records found'); } } catch { setRecords(generateMockSites()); toast.info('Sample data — API unavailable'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { fetch('/api/fin/parties').then(r => r.json()).then(j => { if (j.success) setCustomers(j.data.filter((p: any) => p.partyType === 'Customer' || p.partyType === 'Other')); }).catch(() => {}); }, []);

  const openEdit = (r: Site) => { setEditTarget(r); setForm({ siteCode: r.siteCode, name: r.name, location: r.location || '', state: r.state || '', contactPerson: r.contactPerson || '', contactPhone: r.contactPhone || '', contactEmail: r.contactEmail || '', budget: r.budget, customerId: r.customerId ? String(r.customerId) : '', startDate: r.startDate?.split('T')[0] || '', endDate: r.endDate?.split('T')[0] || '', status: r.status }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Site name is required'); return; }
    setSubmitting(true);
    try {
      const { customerId, startDate, endDate, ...rest } = form;
      const payload = {
        ...rest,
        customerId: customerId ? Number(customerId) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/sites', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/sites?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      const ids = [...selected].join(',');
      const r = await fetch(`/api/fin/sites?ids=${ids}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} site${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Sites"
        fields={SITE_IMPORT_FIELDS}
        keyField="siteCode"
        existingKeys={new Set(records.map(r => r.siteCode))}
        commitEndpoint="/api/fin/sites/import"
        sampleRow={SITE_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel"><div className="vc-panel-header"><MapPin size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Finance Sites</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="vc-input !w-auto !py-1 !px-2 ml-2 text-[11px] appearance-none"><option value="All">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search sites..." /></div>{selected.size>0&&<div className="flex items-center gap-2 ml-2"><span className="text-[10px] text-[#8899aa]">{selected.size} selected</span><button onClick={()=>setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button><button onClick={()=>setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete</button></div>}<div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={SITE_COLUMNS} filename="fin-sites" /></div><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Site</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
          <th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>
          <SortableTh label="Code" sortKey="siteCode" accessor={(r: Site) => r.siteCode} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Name" sortKey="name" accessor={(r: Site) => r.name} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Location" sortKey="location" accessor={(r: Site) => r.location} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="State" sortKey="state" accessor={(r: Site) => r.state} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Customer" sortKey="customer" accessor={(r: Site) => r.customer?.name} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Contact Person" sortKey="contactPerson" accessor={(r: Site) => r.contactPerson} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Phone" sortKey="contactPhone" accessor={(r: Site) => r.contactPhone} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Email" sortKey="contactEmail" accessor={(r: Site) => r.contactEmail} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Start / End" sortKey="startDate" accessor={(r: Site) => r.startDate} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Budget" sortKey="budget" accessor={(r: Site) => r.budget} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
          <SortableTh label="Status" sortKey="status" accessor={(r: Site) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
          <th className="py-2 px-3"></th>
        </tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={()=>toggleRow(r.id)} /></td><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.siteCode}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.location||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.state||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.customer?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.contactPerson||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{r.contactPhone||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.contactEmail||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{r.startDate?.split('T')[0]||'—'} → {r.endDate?.split('T')[0]||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(r.budget/100000).toFixed(1)}L</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Active'?'bg-[#00e676]/15 text-[#00e676]':'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={13} className="py-8 text-center text-[#5a6878]">No matching sites</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Site':'New Site'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Site Code" hint="Generated automatically when you save"><input value={form.siteCode} readOnly className="vc-input opacity-60" placeholder="Auto-generated on save"/></FormField>
            <FormField label="Name" required><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="vc-input" placeholder="JSG Steel Plant"/></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Location"><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} className="vc-input" placeholder="Jharsuguda"/></FormField>
            <FormField label="State"><input value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} className="vc-input"/></FormField>
          </div>
          <FormField label="Customer" hint="Links this site/project to its owning customer">
            <SearchableSelect value={form.customerId} onChange={v => setForm(p => ({ ...p, customerId: v }))} options={customers.map(c => ({ value: String(c.id), label: c.name }))} placeholder="— Select customer —"/>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date"><input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} className="vc-input"/></FormField>
            <FormField label="End Date"><input type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} className="vc-input"/></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Contact Person"><input value={form.contactPerson} onChange={e=>setForm(p=>({...p,contactPerson:e.target.value}))} className="vc-input"/></FormField>
            <FormField label="Phone"><input value={form.contactPhone} onChange={e=>setForm(p=>({...p,contactPhone:e.target.value}))} className="vc-input"/></FormField>
            <FormField label="Email"><input value={form.contactEmail} onChange={e=>setForm(p=>({...p,contactEmail:e.target.value}))} className="vc-input"/></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Budget (₹)"><input type="number" value={form.budget||''} onChange={e=>setForm(p=>({...p,budget:Number(e.target.value)}))} className="vc-input"/></FormField>
            <FormField label="Status"><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="vc-input appearance-none"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></FormField>
          </div>
        </div>
        <DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Site</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Site{selected.size === 1 ? '' : 's'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete {selected.size} selected site{selected.size === 1 ? '' : 's'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
