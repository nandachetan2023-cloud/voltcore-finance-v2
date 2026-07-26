'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface Party { id: number; code: string | null; name: string; shortName: string | null; partyType: string; gstin: string | null; pan: string | null; address: string | null; state: string | null; stateCode: string | null; contact: string | null; udyam: string | null; tdsSection: string | null; tdsRate: number; gstTreatment: string; isActive: boolean; }
interface FormData { code: string; name: string; shortName: string; partyType: string; gstin: string; pan: string; address: string; state: string; stateCode: string; contact: string; udyam: string; tdsSection: string; tdsRate: number; gstTreatment: string; }

const PARTY_COLUMNS: ExportColumn<Party>[] = [
  { header: 'Party Code', accessor: 'code' },
  { header: 'Name', accessor: 'name' },
  { header: 'Short Name', accessor: 'shortName' },
  { header: 'Type', accessor: 'partyType' },
  { header: 'GSTIN', accessor: 'gstin' },
  { header: 'PAN', accessor: 'pan' },
  { header: 'Contact', accessor: 'contact' },
  { header: 'State', accessor: 'state' },
  { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
];
const EMPTY: FormData = { code: '', name: '', shortName: '', partyType: 'Other', gstin: '', pan: '', address: '', state: '', stateCode: '', contact: '', udyam: '', tdsSection: '', tdsRate: 0, gstTreatment: 'Unregistered' };

const PARTY_IMPORT_FIELDS: ImportField[] = [
  { key: 'code', label: 'Party Code' },
  { key: 'name', label: 'Name', required: true },
  { key: 'shortName', label: 'Short Name' },
  { key: 'partyType', label: 'Type' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'pan', label: 'PAN' },
  { key: 'contact', label: 'Contact' },
  { key: 'address', label: 'Address' },
  { key: 'state', label: 'State' },
  { key: 'stateCode', label: 'State Code' },
  { key: 'udyam', label: 'Udyam' },
  { key: 'tdsSection', label: 'TDS Section' },
  { key: 'tdsRate', label: 'TDS Rate', type: 'number' },
  { key: 'gstTreatment', label: 'GST Treatment' },
  { key: 'status', label: 'Status' },
];
const PARTY_SAMPLE_ROW = { code: 'V001', name: 'Tata Steel Limited', shortName: 'Tata Steel', partyType: 'Customer', gstin: '21AAAAA0000A1Z5', pan: 'AAAAA0000A', contact: '9876543210', address: 'Jamshedpur, Jharkhand', state: 'Jharkhand', stateCode: '20', udyam: 'UDYAM-JH-01-0001234', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', status: 'Active' };

export default function FinParties() {
  const [records, setRecords] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Party | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const tc = useTableControls(records, (r) => `${r.code ?? ''} ${r.name} ${r.shortName ?? ''} ${r.partyType} ${r.gstin ?? ''} ${r.pan ?? ''} ${r.contact ?? ''} ${r.state ?? ''}`);

  const generateMockParties = (): Party[] => [
    { id: 1, code: 'V001', name: 'Tata Steel Limited', shortName: 'Tata Steel', partyType: 'Customer', gstin: '21AAAAA0000A1Z5', pan: 'AAAAA0000A', address: 'Jamshedpur, Jharkhand', state: 'Jharkhand', stateCode: '20', contact: '9876543210', udyam: 'UDYAM-JH-01-0001234', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true },
    { id: 2, code: 'V002', name: 'Larsen & Toubro Ltd', shortName: 'L&T', partyType: 'Customer', gstin: '27BBBBB1111B1Z3', pan: 'BBBBB1111B', address: 'Mumbai, Maharashtra', state: 'Maharashtra', stateCode: '27', contact: '9876543211', udyam: 'UDYAM-MH-01-0005678', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true },
    { id: 3, code: 'V003', name: 'NTPC Limited', shortName: 'NTPC', partyType: 'Customer', gstin: '07CCCCC2222C1Z1', pan: 'CCCCC2222C', address: 'New Delhi', state: 'Delhi', stateCode: '07', contact: '9876543212', udyam: null, tdsSection: '194I', tdsRate: 10, gstTreatment: 'Registered', isActive: true },
    { id: 4, code: 'C001', name: 'BALCO Industries', shortName: 'BALCO', partyType: 'Customer', gstin: '22DDDDD3333D1Z9', pan: 'DDDDD3333D', address: 'Korba, Chhattisgarh', state: 'Chhattisgarh', stateCode: '22', contact: '9876543213', udyam: null, tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true },
    { id: 5, code: 'C002', name: 'Coal India Limited', shortName: 'CIL', partyType: 'Customer', gstin: '19EEEEE4444E1Z7', pan: 'EEEEE4444E', address: 'Kolkata, West Bengal', state: 'West Bengal', stateCode: '19', contact: '9876543214', udyam: null, tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true },
    { id: 6, code: 'V004', name: 'Hindalco Industries', shortName: 'Hindalco', partyType: 'Vendor', gstin: '09FFFFF5555F1Z5', pan: 'FFFFF5555F', address: 'Noida, Uttar Pradesh', state: 'Uttar Pradesh', stateCode: '09', contact: '9876543215', udyam: 'UDYAM-UP-01-0009012', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true },
    { id: 7, code: 'V005', name: 'Vedanta Limited', shortName: 'Vedanta', partyType: 'Vendor', gstin: '23GGGGG6666G1Z3', pan: 'GGGGG6666G', address: 'Raipur, Chhattisgarh', state: 'Chhattisgarh', stateCode: '23', contact: '9876543216', udyam: null, tdsSection: '194C', tdsRate: 1, gstTreatment: 'Registered', isActive: true },
    { id: 8, code: 'S001', name: 'Ramesh Transport Services', shortName: 'Ramesh Trans', partyType: 'Vendor', gstin: '24HHHHH7777H1Z1', pan: 'HHHHH7777H', address: 'Raipur, Chhattisgarh', state: 'Chhattisgarh', stateCode: '22', contact: '9876543217', udyam: 'UDYAM-CT-01-0003456', tdsSection: '194C', tdsRate: 1, gstTreatment: 'Registered', isActive: true },
    { id: 9, code: 'E001', name: 'Sunil Verma (Employee Advance)', shortName: 'Sunil Verma', partyType: 'Employee', gstin: null, pan: 'IIIII8888I', address: 'Mumbai, Maharashtra', state: 'Maharashtra', stateCode: '27', contact: '9876543218', udyam: null, tdsSection: '192', tdsRate: 10, gstTreatment: 'Unregistered', isActive: true },
    { id: 10, code: 'H001', name: 'M/s Kumar & Associates', shortName: 'Kumar Assoc', partyType: 'Advance Holder', gstin: null, pan: 'JJJJJ9999J', address: 'Patna, Bihar', state: 'Bihar', stateCode: '10', contact: '9876543219', udyam: null, tdsSection: '194C', tdsRate: 2, gstTreatment: 'Unregistered', isActive: true },
  ];
  const fetch_ = useCallback(async () => { try { setLoading(true); const r = await fetch('/api/fin/parties'); const j = await r.json(); if (j.success && j.data?.length > 0) setRecords(j.data); else { setRecords(generateMockParties()); toast.info('Sample data — no server records found'); } } catch { setRecords(generateMockParties()); toast.info('Sample data — API unavailable'); } finally { setLoading(false); } }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (r: Party) => { setEditTarget(r); setForm({ code: r.code || '', name: r.name, shortName: r.shortName || '', partyType: r.partyType || 'Other', gstin: r.gstin || '', pan: r.pan || '', address: r.address || '', state: r.state || '', stateCode: r.stateCode || '', contact: r.contact || '', udyam: r.udyam || '', tdsSection: r.tdsSection || '', tdsRate: r.tdsRate || 0, gstTreatment: r.gstTreatment || 'Unregistered' }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    if (/^\d+\.?\d*$/.test(form.name.trim())) { toast.error('Name cannot be only numbers'); return; }
    setSubmitting(true);
    try { const method = editTarget ? 'PUT' : 'POST'; const body = editTarget ? { id: editTarget.id, ...form } : form; const r = await fetch('/api/fin/parties', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/parties?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Parties"
        fields={PARTY_IMPORT_FIELDS}
        keyField="name"
        existingKeys={new Set(records.map(r => r.name))}
        commitEndpoint="/api/fin/parties/import"
        sampleRow={PARTY_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel"><div className="vc-panel-header"><Users size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Party Master (Clients/Vendors)</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search parties..." /></div><div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={PARTY_COLUMNS} filename="fin-parties" /></div><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Party</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Code','Name','Type','GSTIN','PAN','Contact','State','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.code||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.partyType==='Customer'?'bg-[#00e676]/15 text-[#00e676]':r.partyType==='Vendor'?'bg-[#00d4ff]/15 text-[#00d4ff]':r.partyType==='Employee'?'bg-[#a78bfa]/15 text-[#a78bfa]':'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.partyType}</span></td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.gstin||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.pan||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.contact||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.state||'—'}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.isActive?'bg-[#00e676]/15 text-[#00e676]':'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{r.isActive?'Active':'Inactive'}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No matching parties</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Party':'New Party'}</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Code</label><input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Short Name</label><input value={form.shortName} onChange={e=>setForm(p=>({...p,shortName:e.target.value}))} className="vc-input"/></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Party Type</label><select value={form.partyType} onChange={e=>setForm(p=>({...p,partyType:e.target.value}))} className="vc-input"><option value="Customer">Customer</option><option value="Vendor">Vendor</option><option value="Employee">Employee</option><option value="Advance Holder">Advance Holder</option><option value="Other">Other</option></select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">GST Treatment</label><select value={form.gstTreatment} onChange={e=>setForm(p=>({...p,gstTreatment:e.target.value}))} className="vc-input"><option value="Unregistered">Unregistered</option><option value="Registered">Registered</option><option value="Composition">Composition</option></select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Contact</label><input value={form.contact} onChange={e=>setForm(p=>({...p,contact:e.target.value}))} className="vc-input" placeholder="Phone"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">GSTIN</label><input value={form.gstin} onChange={e=>setForm(p=>({...p,gstin:e.target.value}))} className="vc-input" placeholder="22AAAAA0000A1Z5"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">PAN</label><input value={form.pan} onChange={e=>setForm(p=>({...p,pan:e.target.value}))} className="vc-input" placeholder="AAAAA0000A"/></div></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Address</label><input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className="vc-input"/></div><div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">State</label><input value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} className="vc-input"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">State Code</label><input value={form.stateCode} onChange={e=>setForm(p=>({...p,stateCode:e.target.value}))} className="vc-input" placeholder="27"/></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Udyam No.</label><input value={form.udyam} onChange={e=>setForm(p=>({...p,udyam:e.target.value}))} className="vc-input" placeholder="UDYAM-XX-00-0000000"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">TDS Section</label><select value={form.tdsSection} onChange={e=>setForm(p=>({...p,tdsSection:e.target.value}))} className="vc-input"><option value="">None</option><option value="192">192 – Salary</option><option value="194A">194A – Interest</option><option value="194C">194C – Contract</option><option value="194I">194I – Rent</option><option value="194J">194J – Professional Fees</option><option value="194Q">194Q – Purchase</option></select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">TDS Rate (%)</label><input type="number" value={form.tdsRate} onChange={e=>setForm(p=>({...p,tdsRate:Number(e.target.value)||0}))} className="vc-input" min="0" step="0.1"/></div></div></div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Party</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
