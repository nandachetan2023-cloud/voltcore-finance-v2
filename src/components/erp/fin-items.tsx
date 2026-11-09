'use client';
import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Pencil, Trash2, Loader2, Upload, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface ItemCategory { id: number; code: string; name: string; itemCount?: number; }
interface Item { id: number; itemCode: string; name: string; description: string | null; categoryId: number | null; category?: { id: number; code: string; name: string } | null; uom: string; hsn: string | null; reorderLevel: number; rate: number; isActive: boolean; }
interface FormData { name: string; description: string; categoryId: string; uom: string; hsn: string; reorderLevel: string; rate: string; status: string; }

const EMPTY: FormData = { name: '', description: '', categoryId: '', uom: 'Nos', hsn: '', reorderLevel: '', rate: '', status: 'Active' };
const UOMS = ['Nos', 'MT', 'KG', 'Gm', 'Mtr', 'MM', 'Ltr', 'Box', 'Pkt', 'Roll', 'Set', 'Job', 'Day'];

const ITEM_COLUMNS: ExportColumn<Item>[] = [
  { header: 'Item Code', accessor: 'itemCode' },
  { header: 'Name', accessor: 'name' },
  { header: 'Description', accessor: (r) => r.description ?? '' },
  { header: 'Category', accessor: (r) => r.category?.name ?? '' },
  { header: 'UOM', accessor: 'uom' },
  { header: 'HSN', accessor: (r) => r.hsn ?? '' },
  { header: 'Reorder Level', accessor: 'reorderLevel' },
  { header: 'Rate', accessor: 'rate' },
  { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
];

const ITEM_IMPORT_FIELDS: ImportField[] = [
  { key: 'itemCode', label: 'Item Code' },
  { key: 'name', label: 'Name', required: true },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'uom', label: 'UOM' },
  { key: 'hsn', label: 'HSN' },
  { key: 'reorderLevel', label: 'Reorder Level', type: 'number' },
  { key: 'rate', label: 'Rate', type: 'number' },
  { key: 'status', label: 'Status' },
];
const ITEM_SAMPLE_ROW = { itemCode: '', name: '33kV XLPE Cable 3Cx400sqmm', description: 'HT cable for switchyard', category: 'ELC', uom: 'Mtr', hsn: '8544', reorderLevel: 500, rate: 4850, status: 'Active' };

export default function FinItems() {
  const [records, setRecords] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [catFilter, setCatFilter] = useState('All');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ code: '', name: '' });

  const filtered = records.filter(r => catFilter === 'All' || r.category?.code === catFilter);
  const tc = useTableControls(filtered, (r) => `${r.itemCode} ${r.name} ${r.description ?? ''} ${r.category?.name ?? ''} ${r.uom} ${r.hsn ?? ''}`);
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllOnPage = () => setSelected(s => { const next = new Set(s); pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id)); return next; });

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const [r, rc] = await Promise.all([fetch('/api/fin/items'), fetch('/api/fin/item-categories')]);
      const j = await r.json(); const jc = await rc.json();
      if (j.success) setRecords(j.data); else toast.error(j.error || 'Failed to load items');
      if (jc.success) setCategories(jc.data);
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (r: Item) => {
    setEditTarget(r);
    setForm({ name: r.name, description: r.description || '', categoryId: r.categoryId ? String(r.categoryId) : '', uom: r.uom || 'Nos', hsn: r.hsn || '', reorderLevel: String(r.reorderLevel ?? ''), rate: String(r.rate ?? ''), status: r.isActive ? 'Active' : 'Inactive' });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body: Record<string, unknown> = { name: form.name.trim(), description: form.description || null, uom: form.uom, hsn: form.hsn || null, reorderLevel: Number(form.reorderLevel) || 0, rate: Number(form.rate) || 0, status: form.status };
      if (editTarget) body.id = editTarget.id; else { body.itemCode = ''; body.categoryId = form.categoryId ? Number(form.categoryId) : null; }
      if (form.categoryId) body.categoryId = Number(form.categoryId);
      const res = await fetch('/api/fin/items', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : `Created — code ${j.data?.itemCode}`); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (ids: string) => {
    try {
      const res = await fetch(`/api/fin/items?ids=${ids}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? 1} item${(j.deleted ?? 1) === 1 ? '' : 's'}`); setDeleteOpen(false); setBulkDeleteOpen(false); setSelected(new Set()); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const addCategory = async () => {
    try {
      const res = await fetch('/api/fin/item-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) });
      const j = await res.json();
      if (j.success) { toast.success(`Category ${j.data.code} added`); setCatForm({ code: '', name: '' }); await fetch_(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const catBadge = (r: Item) => (
    <span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff]">{r.category ? `${r.category.code} — ${r.category.name}` : 'Uncategorised'}</span>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel"><div className="vc-panel-header"><Package size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Item Code Generator</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span><select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="vc-input !w-auto !py-1 !px-2 ml-2 text-[11px] appearance-none"><option value="All">All Categories</option>{categories.map(c => <option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}</select><button onClick={() => setCatOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] ml-2"><Tags size={13} /> Categories</button><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search items by code, name, HSN..." /></div>{selected.size > 0 && <div className="flex items-center gap-2 ml-2"><span className="text-[10px] text-[#8899aa]">{selected.size} selected</span><button onClick={() => setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button><button onClick={() => setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete</button></div>}<div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={ITEM_COLUMNS} filename="fin-items" /></div><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Item</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
          <th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>
          <SortableTh label="Code" sortKey="itemCode" accessor={(r: Item) => r.itemCode} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Name" sortKey="name" accessor={(r: Item) => r.name} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Category" sortKey="categoryId" accessor={(r: Item) => r.category?.name} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="UOM" sortKey="uom" accessor={(r: Item) => r.uom} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="HSN" sortKey="hsn" accessor={(r: Item) => r.hsn} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Reorder" sortKey="reorderLevel" accessor={(r: Item) => r.reorderLevel} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Rate" sortKey="rate" accessor={(r: Item) => r.rate} sort={tc.sort} toggleSort={tc.toggleSort} />
          <SortableTh label="Status" sortKey="isActive" accessor={(r: Item) => r.isActive} sort={tc.sort} toggleSort={tc.toggleSort} />
          <th className="py-2 px-3"></th>
        </tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => <tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} /></td><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.itemCode}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.name}{r.description && <span className="text-[#8899aa]"> — {r.description}</span>}</td><td className="py-2.5 px-3">{catBadge(r)}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.uom}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.hsn || '—'}</td><td className="py-2.5 px-3 text-center text-[#8899aa] font-mono">{r.reorderLevel || '—'}</td><td className="py-2.5 px-3 text-right text-[#8899aa] font-mono">{r.rate ? r.rate.toLocaleString('en-IN') : '—'}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.isActive ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button><button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></div></td></tr>)}{tc.pageItems.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-[#5a6878]">No matching items</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader><div className="space-y-4">
        <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Item Code</label><input value={editTarget?.itemCode ?? ''} readOnly placeholder={editTarget ? '' : 'Auto-generated'} className="vc-input opacity-60" /></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Category</label><select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} className="vc-input" disabled={!!editTarget}><option value="">— Uncategorised (ITM-) —</option>{categories.map(c => <option key={c.id} value={String(c.id)}>{c.code} — {c.name}</option>)}</select></div></div>
        <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="vc-input" placeholder="33kV XLPE Cable 3Cx400sqmm" /></div>
        <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="vc-input" /></div>
        <div className="grid grid-cols-3 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">UOM</label><select value={form.uom} onChange={e => setForm(p => ({ ...p, uom: e.target.value }))} className="vc-input">{UOMS.map(u => <option key={u}>{u}</option>)}</select></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">HSN Code</label><input value={form.hsn} onChange={e => setForm(p => ({ ...p, hsn: e.target.value }))} className="vc-input" placeholder="8544" /></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input"><option>Active</option><option>Inactive</option></select></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reorder Level</label><input type="number" value={form.reorderLevel} onChange={e => setForm(p => ({ ...p, reorderLevel: e.target.value }))} className="vc-input" min="0" /></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Rate (₹)</label><input type="number" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} className="vc-input" min="0" step="0.01" /></div></div>
        <p className="text-[10px] text-[#5a6878]">Code is assigned by the server per category segment (ELC-0001…); deleted codes are never reused. The code is immutable after creation so PRs and stock records always match.</p>
      </div><DialogFooter><button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button></DialogFooter></DialogContent></Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md"><DialogHeader><DialogTitle className="text-[#f5a623]">Item Categories</DialogTitle></DialogHeader><div className="space-y-3">
        <div className="space-y-1.5 max-h-40 overflow-y-auto">{categories.map(c => <div key={c.id} className="flex items-center gap-2 text-[11px] bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-2"><span className="text-[#f5a623] font-mono font-semibold">{c.code}</span><span className="text-[#e2e8f0]">{c.name}</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{c.itemCount ?? 0} items</span></div>)}</div>
        <div className="grid grid-cols-[90px_1fr_auto] gap-2 items-end"><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Code</label><input value={catForm.code} onChange={e => setCatForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="vc-input" maxLength={4} placeholder="ELC" /></div><div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Name</label><input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="vc-input" placeholder="Electrical" /></div><button onClick={addCategory} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5"><Plus size={13} /> Add</button></div>
        <p className="text-[10px] text-[#5a6878]">Every item in this category gets codes from the category segment (e.g. <span className="font-mono text-[#f5a623]">ELC-0001</span>…).</p>
      </div></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Item</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.itemCode} — {deleteTarget?.name}</strong>? Its code will not be reused by future items.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(String(deleteTarget?.id))} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Item{selected.size === 1 ? '' : 's'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete {selected.size} selected item{selected.size === 1 ? '' : 's'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete([...selected].join(','))} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {importOpen && (
        <ImportWizard
          title="Items"
          fields={ITEM_IMPORT_FIELDS}
          keyField="itemCode"
          existingKeys={new Set(records.map(r => r.itemCode))}
          commitEndpoint="/api/fin/items/import"
          sampleRow={ITEM_SAMPLE_ROW}
          onClose={() => setImportOpen(false)}
          onImported={fetch_}
        />
      )}
    </div>
  );
}
