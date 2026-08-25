'use client';
import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect, useFormValidation, required } from './_form-controls';

interface SiteRef { id: number; name: string; siteCode: string; }
interface PoRef { id: number; poNo: string; vendorName: string; }
interface Job {
  id: number; jobCode: string; siteId: number; poId: number | null; description: string | null; status: string;
  site?: SiteRef | null; po?: PoRef | null;
}
interface FormData { jobCode: string; siteId: string; poId: string; description: string; status: string; }

const JOB_COLUMNS: ExportColumn<Job>[] = [
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'Site Code', accessor: (r) => r.site?.siteCode ?? '' },
  { header: 'PO No.', accessor: (r) => r.po?.poNo ?? '' },
  { header: 'Description', accessor: (r) => r.description ?? '' },
  { header: 'Status', accessor: 'status' },
];

const JOB_IMPORT_FIELDS: ImportField[] = [
  { key: 'jobCode', label: 'Job Code', required: true },
  { key: 'siteCode', label: 'Site Code', required: true },
  { key: 'poNo', label: 'PO No.' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
];
const JOB_SAMPLE_ROW = { jobCode: 'JOB-2026-006', siteCode: 'SITE-001', poNo: 'PO/2025/0012', description: 'Boiler erection — Phase 1', status: 'Active' };
const JOB_STATUSES = ['All', 'Active', 'Completed', 'On Hold', 'Closed'];
const EMPTY: FormData = { jobCode: '', siteId: '', poId: '', description: '', status: 'Active' };

export default function FinJobs() {
  const [records, setRecords] = useState<Job[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [pos, setPos] = useState<PoRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filtered = records.filter(r => statusFilter === 'All' || r.status === statusFilter);
  const tc = useTableControls(filtered, (r) => `${r.jobCode} ${r.site?.name ?? ''} ${r.po?.poNo ?? ''} ${r.description ?? ''}`);
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllOnPage = () => setSelected(s => { const next = new Set(s); pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id)); return next; });
  const { errors, validate, clearError, setErrors } = useFormValidation<FormData>({
    siteId: required('Site'),
  });

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/fin/jobs');
      const j = await r.json();
      if (j.success) setRecords(j.data);
    } catch { toast.error('Failed to load jobs'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {});
    fetch('/api/fin/purchase-orders').then(r => r.json()).then(j => { if (j.success) setPos(j.data); }).catch(() => {});
  }, []);

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY); setErrors({}); setFormOpen(true); };
  const openEdit = (r: Job) => {
    setEditTarget(r);
    setForm({ jobCode: r.jobCode, siteId: String(r.siteId), poId: r.poId ? String(r.poId) : '', description: r.description || '', status: r.status });
    setErrors({});
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate(form)) return;
    setSubmitting(true);
    try {
      const payload = { ...form, siteId: Number(form.siteId), poId: form.poId ? Number(form.poId) : null };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/jobs', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/fin/jobs?id=${deleteTarget.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      const ids = [...selected].join(',');
      const r = await fetch(`/api/fin/jobs?ids=${ids}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} job${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Jobs"
        fields={JOB_IMPORT_FIELDS}
        keyField="jobCode"
        existingKeys={new Set(records.map(r => r.jobCode))}
        commitEndpoint="/api/fin/jobs/import"
        sampleRow={JOB_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Briefcase size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Job Master (PO-wise)</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="vc-input !w-auto !py-1 !px-2 ml-2 text-[11px] appearance-none">
            {JOB_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </select>
          <div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search jobs..." /></div>
          {selected.size > 0 && <div className="flex items-center gap-2 ml-2"><span className="text-[10px] text-[#8899aa]">{selected.size} selected</span><button onClick={() => setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button><button onClick={() => setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete</button></div>}
          <div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={JOB_COLUMNS} filename="fin-jobs" /></div>
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Job</button>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
            <th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>
            <SortableTh label="Job Code" sortKey="jobCode" accessor={(r: Job) => r.jobCode} sort={tc.sort} toggleSort={tc.toggleSort} />
            <SortableTh label="Site" sortKey="site" accessor={(r: Job) => r.site?.name} sort={tc.sort} toggleSort={tc.toggleSort} />
            <SortableTh label="PO No." sortKey="po" accessor={(r: Job) => r.po?.poNo} sort={tc.sort} toggleSort={tc.toggleSort} />
            <SortableTh label="Description" sortKey="description" accessor={(r: Job) => r.description} sort={tc.sort} toggleSort={tc.toggleSort} />
            <SortableTh label="Status" sortKey="status" accessor={(r: Job) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
            <th className="py-2 px-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {tc.pageItems.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} /></td>
                <td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.jobCode}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0]">{r.site?.name || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.po?.poNo || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa] max-w-[280px] truncate">{r.description || '—'}</td>
                <td className="py-2.5 px-3"><span className={`vc-badge ${r.status === 'Active' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Completed' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span></td>
                <td className="py-2.5 px-3"><div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                  <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                </div></td>
              </tr>
            ))}
            {tc.pageItems.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No matching jobs</td></tr>}
          </tbody>
        </table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg" onKeyDown={(e) => { if (e.key === 'Enter' && !(e.target as HTMLElement).closest('textarea')) { e.preventDefault(); handleSubmit(); } }}>
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Job' : 'New Job'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FormField label="Job Code" hint="Leave blank to auto-generate JOB-YYYY-NNN">
              <input autoFocus value={form.jobCode} onChange={e => setField('jobCode', e.target.value)} className="vc-input font-mono" placeholder="JOB-2026-006" />
            </FormField>
            <FormField label="Site" required error={errors.siteId}>
              <SearchableSelect value={form.siteId} onChange={v => setField('siteId', v)} options={sites.map(s => ({ value: String(s.id), label: s.name, sublabel: s.siteCode }))} placeholder="— Select site —" />
            </FormField>
            <FormField label="Linked Purchase Order" hint="Optional — ties this job to the PO that funds it">
              <SearchableSelect value={form.poId} onChange={v => setField('poId', v)} options={pos.map(p => ({ value: String(p.id), label: p.poNo, sublabel: p.vendorName }))} placeholder="— None —" />
            </FormField>
            <FormField label="Description">
              <input value={form.description} onChange={e => setField('description', e.target.value)} className="vc-input" placeholder="Boiler erection — Phase 1" />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={e => setField('status', e.target.value)} className="vc-input appearance-none">
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed">Closed</option>
              </select>
            </FormField>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Job</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.jobCode}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Job{selected.size === 1 ? '' : 's'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete {selected.size} selected job{selected.size === 1 ? '' : 's'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
