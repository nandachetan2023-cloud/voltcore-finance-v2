'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Loader2, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface SiteRef { id: number; name: string; siteCode: string; }
interface BudgetItem { id: number; category: string; description: string; planned: number; actual: number; variance: number; period: string; month: string | null; siteId: number | null; status: string; site?: SiteRef | null; }
interface FormData { category: string; description: string; planned: number; actual: number; period: string; siteId: string; status: string; }

const BUDGET_COLUMNS: ExportColumn<BudgetItem>[] = [
  { header: 'Category', accessor: 'category' },
  { header: 'Description', accessor: 'description' },
  { header: 'Planned', accessor: 'planned' },
  { header: 'Actual', accessor: 'actual' },
  { header: 'Variance', accessor: 'variance' },
  { header: 'Utilization %', accessor: (r) => r.planned > 0 ? ((r.actual / r.planned) * 100).toFixed(1) : '0' },
  { header: 'Period', accessor: 'period' },
  { header: 'Month', accessor: 'month' },
  { header: 'Status', accessor: 'status' },
];

const EMPTY_FORM: FormData = { category: '', description: '', planned: 0, actual: 0, period: 'FY 2024-25', siteId: '', status: 'On Track' };

const BUDGET_IMPORT_FIELDS: ImportField[] = [
  { key: 'category', label: 'Category', required: true },
  { key: 'description', label: 'Description', required: true },
  { key: 'planned', label: 'Planned', type: 'number' },
  { key: 'actual', label: 'Actual', type: 'number' },
  { key: 'period', label: 'Period' },
  { key: 'month', label: 'Month' },
  { key: 'status', label: 'Status' },
];
const BUDGET_SAMPLE_ROW = { category: 'Manpower', description: 'Skilled labour charges', planned: 4500000, actual: 3800000, period: 'FY 2024-25', month: 'April', status: 'On Track' };

function generateMockBudget(): BudgetItem[] {
  return [
    { id: 1, category: 'Manpower', description: 'Skilled & unskilled labour charges', planned: 4500000, actual: 3800000, variance: 700000, period: 'FY 2024-25', month: null, siteId: null, status: 'On Track' },
    { id: 2, category: 'Material', description: 'Electrical panels, cables, transformers', planned: 8200000, actual: 9100000, variance: -900000, period: 'FY 2024-25', month: null, siteId: null, status: 'Over Budget' },
    { id: 3, category: 'Equipment', description: 'DG sets, cranes, compressors', planned: 3500000, actual: 2800000, variance: 700000, period: 'FY 2024-25', month: null, siteId: null, status: 'Under Budget' },
    { id: 4, category: 'Travel', description: 'Staff travel & site visits', planned: 1200000, actual: 950000, variance: 250000, period: 'FY 2024-25', month: null, siteId: null, status: 'On Track' },
    { id: 5, category: 'Subcontract', description: 'Specialized testing & commissioning', planned: 6000000, actual: 5200000, variance: 800000, period: 'FY 2024-25', month: null, siteId: null, status: 'On Track' },
    { id: 6, category: 'Overhead', description: 'Office rent, utilities, admin', planned: 1800000, actual: 1950000, variance: -150000, period: 'FY 2024-25', month: null, siteId: null, status: 'Over Budget' },
  ];
}

export default function Budget() {
  const [records, setRecords] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sites, setSites] = useState<SiteRef[]>([]);

  useEffect(() => { fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {}); }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/budget');
      const json = await res.json();
      if (json.success && json.data?.length) { setRecords(json.data); }
      else { setRecords(generateMockBudget()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockBudget()); toast.info('Sample data — API unavailable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (r: BudgetItem) => {
    setEditTarget(r);
    setForm({ category: r.category, description: r.description, planned: r.planned, actual: r.actual, period: r.period, siteId: r.siteId ? String(r.siteId) : '', status: r.status });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description) { toast.error('Category and description are required'); return; }
    setSubmitting(true);
    try {
      const variance = form.planned - form.actual;
      const { siteId, ...rest } = form;
      const payload = { ...rest, siteId: siteId ? Number(siteId) : null, variance };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const res = await fetch('/api/budget', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Budget updated' : 'Budget item created'); setFormOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Operation failed'); }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/budget?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { toast.success('Budget item deleted'); setDeleteOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Network error'); }
  };

  const totalPlanned = records.reduce((s, r) => s + r.planned, 0);
  const totalActual = records.reduce((s, r) => s + r.actual, 0);
  const utilization = totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(1) : '0';

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Budget Items"
        fields={BUDGET_IMPORT_FIELDS}
        keyField="category"
        existingKeys={new Set(records.map(r => r.category))}
        commitEndpoint="/api/budget/import"
        sampleRow={BUDGET_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Planned</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalPlanned / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Actual</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalActual / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Utilization</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{utilization}%</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Target size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Budget Items</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Items</span>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
          <ExportButton records={records} columns={BUDGET_COLUMNS} filename="budget" />
          <button onClick={() => { setEditTarget(null); setForm(EMPTY_FORM); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Item</button>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['Category', 'Description', 'Site', 'Planned', 'Actual', 'Variance', 'Utilization', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {records.map(r => {
                const util = r.planned > 0 ? ((r.actual / r.planned) * 100).toFixed(0) : '0';
                return (
                  <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#f5a623] font-medium">{r.category}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] max-w-[200px] truncate">{r.description}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.site?.siteCode || '—'}</td>
                    <td className="py-2.5 px-3 text-[#00d4ff] font-mono">₹{(r.planned / 100000).toFixed(1)}L</td>
                    <td className="py-2.5 px-3 text-[#f5a623] font-mono">₹{(r.actual / 100000).toFixed(1)}L</td>
                    <td className="py-2.5 px-3 font-mono"><span className={r.variance >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}>{r.variance >= 0 ? '+' : ''}₹{(r.variance / 100000).toFixed(1)}L</span></td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-[5px] bg-[#0a0d12] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(Number(util), 100)}%`, backgroundColor: Number(util) > 100 ? '#ff3d3d' : '#00e676' }} />
                        </div>
                        <span className="text-[9px] text-[#8899aa]">{util}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3"><span className={`vc-badge ${r.status === 'On Track' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Over Budget' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#00d4ff]/15 text-[#00d4ff]'}`}>{r.status}</span></td>
                    <td className="py-2.5 px-3"><div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                      <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div></div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Budget Item' : 'New Budget Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Category *</label><input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="vc-input" placeholder="e.g. Manpower" /></div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description *</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="vc-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Planned (₹)</label><input type="number" value={form.planned || ''} onChange={e => setForm(p => ({ ...p, planned: Number(e.target.value) }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Actual (₹)</label><input type="number" value={form.actual || ''} onChange={e => setForm(p => ({ ...p, actual: Number(e.target.value) }))} className="vc-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Period</label><input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site</label><select value={form.siteId} onChange={e => setForm(p => ({ ...p, siteId: e.target.value }))} className="vc-input appearance-none"><option value="">— Company-wide —</option>{sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input appearance-none"><option value="On Track">On Track</option><option value="Over Budget">Over Budget</option><option value="Under Budget">Under Budget</option></select></div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Budget Item</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.category}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
