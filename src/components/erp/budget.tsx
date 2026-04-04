'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target, TrendingUp, TrendingDown, AlertTriangle, Plus, Pencil,
  Trash2, Loader2, CheckCircle2, ArrowDownCircle, CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Types ────────────────────────────────────────── */
interface BudgetItem {
  id: string;
  category: string;
  description: string;
  planned: number;
  actual: number;
  period: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BudgetFormData {
  category: string;
  description: string;
  planned: string;
  actual: string;
  period: string;
  status: string;
}

const EMPTY_FORM: BudgetFormData = {
  category: '', description: '', planned: '', actual: '0', period: '', status: 'On Track',
};

const CATEGORIES = [
  'Salaries', 'Materials', 'Equipment', 'Travel', 'Admin',
  'Utilities', 'Training', 'Marketing', 'Maintenance', 'Contingency',
];
const STATUS_OPTIONS = ['On Track', 'Over Budget', 'Under Budget', 'Completed'];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s: string) {
  const m: Record<string, string> = {
    'On Track': 'bg-[#00e676]/15 text-[#00e676]',
    'Over Budget': 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    'Under Budget': 'bg-[#00d4ff]/15 text-[#00d4ff]',
    'Completed': 'bg-[#5a6878]/15 text-[#5a6878]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function getBarColor(pct: number): string {
  if (pct > 100) return '#ff3d3d';
  if (pct >= 80) return '#f5a623';
  return '#00e676';
}

/* ── Loading Skeleton ─────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-7 w-14 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-[#1e2630]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[22px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ── Progress Bar ─────────────────────────────────── */
function BudgetBar({ planned, actual }: { planned: number; actual: number }) {
  const pct = planned > 0 ? (actual / planned) * 100 : 0;
  const color = getBarColor(pct);
  const clampedPct = Math.min(pct, 100);

  return (
    <div className="w-full h-[6px] bg-[#1a2028] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clampedPct}%`, background: color }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function Budget() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);
  const [editTarget, setEditTarget] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState<BudgetFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/budget');
      const json = await res.json();
      if (json.success) setItems(json.data);
      else toast.error(json.error || 'Failed to fetch budget items');
    } catch {
      toast.error('Network error fetching budget items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Seed data on first empty load ── */
  useEffect(() => {
    if (!loading && items.length === 0) {
      seedData();
    }
  }, [loading]);

  const seedData = async () => {
    const seedItems = [
      { category: 'Salaries', description: 'Staff salaries, wages & overtime for all sites', planned: 4800000, actual: 4650000, period: 'FY 2024-25', status: 'On Track' },
      { category: 'Materials', description: 'Steel, cement, cables & construction materials', planned: 7200000, actual: 7850000, period: 'FY 2024-25', status: 'Over Budget' },
      { category: 'Equipment', description: 'Heavy machinery, tools & spares procurement', planned: 1500000, actual: 1320000, period: 'FY 2024-25', status: 'Under Budget' },
      { category: 'Travel', description: 'Site visits, client meetings & project travel', planned: 600000, actual: 580000, period: 'FY 2024-25', status: 'On Track' },
      { category: 'Admin', description: 'Office supplies, printing, communication & misc', planned: 400000, actual: 385000, period: 'FY 2024-25', status: 'On Track' },
      { category: 'Utilities', description: 'Electricity, water, internet & fuel for sites', planned: 900000, actual: 920000, period: 'FY 2024-25', status: 'On Track' },
      { category: 'Training', description: 'Safety training, skill development & certifications', planned: 350000, actual: 280000, period: 'FY 2024-25', status: 'Under Budget' },
      { category: 'Marketing', description: 'Business development, proposals & branding', planned: 500000, actual: 320000, period: 'FY 2024-25', status: 'Under Budget' },
      { category: 'Maintenance', description: 'Equipment maintenance, site upkeep & repairs', planned: 800000, actual: 890000, period: 'FY 2024-25', status: 'On Track' },
      { category: 'Contingency', description: 'Emergency reserves & unforeseen expenses', planned: 1000000, actual: 250000, period: 'FY 2024-25', status: 'Under Budget' },
      { category: 'Salaries', description: 'Contract labour wages & benefits', planned: 3600000, actual: 3520000, period: 'FY 2024-25', status: 'On Track' },
      { category: 'Materials', description: 'Electrical panels, switchgear & transformers', planned: 2800000, actual: 2950000, period: 'FY 2024-25', status: 'Over Budget' },
    ];

    for (const item of seedItems) {
      await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    }
    await fetchData();
  };

  /* ── Stats ── */
  const totalBudget = items.reduce((s, i) => s + i.planned, 0);
  const totalSpent = items.reduce((s, i) => s + i.actual, 0);
  const remaining = totalBudget - totalSpent;
  const variancePct = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0';

  /* ── Form helpers ── */
  const updateForm = (field: keyof BudgetFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.category || !form.description || !form.planned || !form.period) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget item created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create budget item');
      }
    } catch {
      toast.error('Network error creating budget item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.category || !form.description || !form.planned) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget item updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update budget item');
      }
    } catch {
      toast.error('Network error updating budget item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/budget', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget item deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting budget item');
    }
  };

  const openEditDialog = (item: BudgetItem) => {
    setEditTarget(item);
    setForm({
      category: item.category,
      description: item.description,
      planned: String(item.planned),
      actual: String(item.actual),
      period: item.period,
      status: item.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Target} label="Total Budget" value={formatCurrency(totalBudget)} color="#f5a623" />
        <StatCard icon={TrendingUp} label="Total Spent" value={formatCurrency(totalSpent)} color="#00d4ff" />
        <StatCard icon={ArrowDownCircle} label="Remaining" value={formatCurrency(remaining)} color="#00e676" />
        <StatCard icon={CircleDot} label="Variance %" value={`${variancePct}%`} color={Number(variancePct) > 100 ? '#ff3d3d' : Number(variancePct) >= 80 ? '#f5a623' : '#00e676'} />
      </div>

      {/* Overall Progress */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Target size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Overall Budget Utilization</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">
            {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
          </span>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-[#1a2028] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                  background: getBarColor((totalSpent / totalBudget) * 100),
                }}
              />
            </div>
            <span className="text-[12px] font-bold" style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: getBarColor((totalSpent / totalBudget) * 100),
            }}>
              {variancePct}%
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[9px] text-[#5a6878]">
            <span>0%</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00e676]" /> Under 80%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f5a623]" /> 80-100%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff3d3d]" /> Over 100%</span>
            </div>
            <span>100%+</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Target size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Budget Items</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{items.length} Items</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Category', 'Description', 'Planned', 'Actual', 'Variance', '% Used', 'Period', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center">
                      <Target className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No budget items found</div>
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const variance = item.planned - item.actual;
                    const pct = item.planned > 0 ? (item.actual / item.planned) * 100 : 0;
                    const isOverBudget = pct > 100;
                    return (
                      <tr key={item.id} className={`hover:bg-[#141920] transition-colors ${isOverBudget ? 'bg-[#ff3d3d]/5' : ''}`}>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-[#e2e8f0]">{item.category}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa] max-w-[180px] truncate">{item.description}</td>
                        <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {formatCurrency(item.planned)}
                        </td>
                        <td className="py-2.5 px-3 font-medium" style={{ fontFamily: "'Share Tech Mono', monospace", color: isOverBudget ? '#ff3d3d' : '#00e676' }}>
                          {formatCurrency(item.actual)}
                        </td>
                        <td className="py-2.5 px-3 font-medium" style={{
                          fontFamily: "'Share Tech Mono', monospace",
                          color: variance >= 0 ? '#00e676' : '#ff3d3d',
                        }}>
                          {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1">
                              <BudgetBar planned={item.planned} actual={item.actual} />
                            </div>
                            <span className="text-[10px] font-medium shrink-0" style={{
                              fontFamily: "'Share Tech Mono', monospace",
                              color: getBarColor(pct),
                            }}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{item.period}</td>
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge ${statusBadge(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditDialog(item)}
                              className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => { setDeleteTarget(item); setDeleteOpen(true); }}
                              className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {CATEGORIES.slice(0, 5).map(cat => {
          const catItems = items.filter(i => i.category === cat);
          const catPlanned = catItems.reduce((s, i) => s + i.planned, 0);
          const catActual = catItems.reduce((s, i) => s + i.actual, 0);
          const catPct = catPlanned > 0 ? (catActual / catPlanned) * 100 : 0;
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="vc-panel p-4">
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-2">{cat}</div>
              <div className="text-[16px] font-bold text-[#e2e8f0] mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {formatCurrency(catActual)}
              </div>
              <div className="text-[9px] text-[#5a6878] mb-2">of {formatCurrency(catPlanned)}</div>
              <BudgetBar planned={catPlanned} actual={catActual} />
              <div className="text-[10px] font-medium mt-1.5" style={{ fontFamily: "'Share Tech Mono', monospace", color: getBarColor(catPct) }}>
                {catPct.toFixed(0)}% used
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Budget Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Category *</label>
              <select value={form.category} onChange={e => updateForm('category', e.target.value)} className="vc-input appearance-none">
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description *</label>
              <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)}
                placeholder="Brief description of budget item" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Planned Amount (₹) *</label>
              <input type="number" value={form.planned} onChange={e => updateForm('planned', e.target.value)}
                placeholder="e.g. 500000" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Period *</label>
              <input type="text" value={form.period} onChange={e => updateForm('period', e.target.value)}
                placeholder="e.g. FY 2024-25" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Budget Item — {editTarget?.category}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Category *</label>
              <select value={form.category} onChange={e => updateForm('category', e.target.value)} className="vc-input appearance-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description *</label>
              <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Planned (₹) *</label>
                <input type="number" value={form.planned} onChange={e => updateForm('planned', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Actual (₹)</label>
                <input type="number" value={form.actual} onChange={e => updateForm('actual', e.target.value)} className="vc-input" />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Period *</label>
              <input type="text" value={form.period} onChange={e => updateForm('period', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Update Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Budget Item
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete the <strong className="text-[#f5a623]">{deleteTarget?.category}</strong> budget item — <strong className="text-[#e2e8f0]">{deleteTarget?.description}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
