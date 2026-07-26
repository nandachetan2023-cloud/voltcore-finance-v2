'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, FileText, Download, Printer, Plus, Upload, Pencil, Trash2, Search, Filter, X, ChevronRight, ChevronDown, PieChart, Layers, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface PLEntry {
  id: string | number;
  source: string;
  sourceId?: number;
  site: string;
  month: string;
  side: string;
  category: string;
  particular: string;
  amount: number;
}

interface PLForm {
  site: string;
  month: string;
  side: string;
  category: string;
  particular: string;
  amount: number;
}

interface PLSummary {
  sites: string[];
  months: string[];
  totalDebit: number;
  totalCredit: number;
  netPL: number;
  siteWise: { site: string; income: number; expense: number; netPL: number }[];
  catAgg: Record<string, { debit: number; credit: number }>;
  monthlyTrend: { month: string; income: number; expense: number; netPL: number }[];
  sourceAgg: Record<string, { debit: number; credit: number }>;
}

interface ApiResponse {
  success: boolean;
  data: PLEntry[];
  summary: PLSummary;
}

const DEBIT_CATEGORIES = ['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses'];
const CREDIT_CATEGORIES = ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes'];
const ALL_CATEGORIES = [...CREDIT_CATEGORIES, ...DEBIT_CATEGORIES];

const SOURCE_LABELS: Record<string, string> = {
  invoice: 'Invoices',
  credit_note: 'Credit Notes',
  expense_claim: 'Expense Claims',
  petty_cash: 'Petty Cash',
  payment_advice: 'Payment Advices',
  manual: 'Manual Entries',
};

const SOURCE_COLORS: Record<string, string> = {
  invoice: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  credit_note: 'bg-[#f5a623]/15 text-[#f5a623]',
  expense_claim: 'bg-[#a855f7]/15 text-[#a855f7]',
  petty_cash: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  payment_advice: 'bg-[#00e676]/15 text-[#00e676]',
  manual: 'bg-[#5a6878]/15 text-[#5a6878]',
};

const SOURCE_BAR_COLORS: Record<string, string> = {
  invoice: '#00d4ff',
  credit_note: '#f5a623',
  expense_claim: '#a855f7',
  petty_cash: '#ff3d3d',
  payment_advice: '#00e676',
  manual: '#5a6878',
};

const EMPTY_FORM: PLForm = {
  site: '',
  month: '',
  side: 'debit',
  category: 'Purchase Accounts',
  particular: '',
  amount: 0,
};

const fmtINR = (n: number) => '₹' + (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const pct = (n: number) => (n ?? 0).toFixed(2) + '%';
const isNumericId = (id: string | number) => typeof id === 'number';

const ic = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 placeholder:text-[#5a6878] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]";
const sc = ic + " appearance-none cursor-pointer";

const EXPORT_COLUMNS: ExportColumn<PLEntry>[] = [
  { header: 'ID', accessor: (r) => String(r.id) },
  { header: 'Source', accessor: (r) => SOURCE_LABELS[r.source] || r.source },
  { header: 'Site', accessor: 'site' },
  { header: 'Month', accessor: 'month' },
  { header: 'Side', accessor: 'side' },
  { header: 'Category', accessor: 'category' },
  { header: 'Particular', accessor: 'particular' },
  { header: 'Amount', accessor: 'amount' },
];

function generateMockData(): { data: PLEntry[]; summary: PLSummary } {
  const sitesList = ['NTPC Rihand Dam Project', 'BALCO Aluminium Smelter', 'Coal India Eastern Coalfield', 'Vedanta Jharsuguda Smelter', 'Hindalco Mahan Aluminium'];
  const monthsList = ['Jan 2026', 'Feb 2026', 'Mar 2026'];
  const incomeCats = ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes'];
  const expenseCats = ['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses'];
  const sources = ['invoice', 'expense_claim', 'petty_cash', 'payment_advice', 'manual'];
  const data: PLEntry[] = [];
  let id = 1;

  sitesList.forEach((site, si) => {
    monthsList.forEach((month, mi) => {
      incomeCats.forEach((cat) => {
        const src = sources[(si + mi) % sources.length];
        const amt = Math.round((80000 + Math.random() * 400000 + si * 80000 + mi * 60000) / 100) * 100;
        data.push({
          id: src === 'manual' ? id++ : `inv-${si}-${mi}-${cat.slice(0, 3)}`,
          source: src,
          site,
          month,
          side: 'credit',
          category: cat,
          particular: `${cat} — ${site} (${month})`,
          amount: amt,
        });
      });
      expenseCats.forEach((cat) => {
        const src = sources[(si + mi + 2) % sources.length];
        const amt = Math.round((40000 + Math.random() * 250000 + si * 40000 + mi * 30000) / 100) * 100;
        data.push({
          id: src === 'manual' ? id++ : `exp-${si}-${mi}-${cat.slice(0, 3)}`,
          source: src,
          site,
          month,
          side: 'debit',
          category: cat,
          particular: `${cat} — ${site} (${month})`,
          amount: amt,
        });
      });
    });
  });

  data.push({ id: id++, source: 'manual', site: sitesList[0], month: 'Feb 2026', side: 'credit', category: 'Sales Accounts', particular: 'Manual — Consulting fees', amount: 75000 });
  data.push({ id: id++, source: 'manual', site: sitesList[1], month: 'Feb 2026', side: 'debit', category: 'Purchase Accounts', particular: 'Manual — Stationery supplies', amount: 12500 });
  data.push({ id: id++, source: 'manual', site: sitesList[2], month: 'Mar 2026', side: 'credit', category: 'Indirect Incomes', particular: 'Manual — Interest received', amount: 8500 });

  const totalCredit = data.filter(d => d.side === 'credit').reduce((s, d) => s + d.amount, 0);
  const totalDebit = data.filter(d => d.side === 'debit').reduce((s, d) => s + d.amount, 0);
  const netPL = totalCredit - totalDebit;

  const siteWise = sitesList.map(site => {
    const income = data.filter(d => d.site === site && d.side === 'credit').reduce((s, d) => s + d.amount, 0);
    const expense = data.filter(d => d.site === site && d.side === 'debit').reduce((s, d) => s + d.amount, 0);
    return { site, income, expense, netPL: income - expense };
  });

  const catAgg: Record<string, { debit: number; credit: number }> = {};
  ALL_CATEGORIES.forEach(cat => {
    catAgg[cat] = {
      debit: data.filter(d => d.category === cat && d.side === 'debit').reduce((s, d) => s + d.amount, 0),
      credit: data.filter(d => d.category === cat && d.side === 'credit').reduce((s, d) => s + d.amount, 0),
    };
  });

  const monthlyTrend = monthsList.map(month => {
    const income = data.filter(d => d.month === month && d.side === 'credit').reduce((s, d) => s + d.amount, 0);
    const expense = data.filter(d => d.month === month && d.side === 'debit').reduce((s, d) => s + d.amount, 0);
    return { month, income, expense, netPL: income - expense };
  });

  const sourceKeys = ['invoice', 'credit_note', 'expense_claim', 'petty_cash', 'payment_advice', 'manual'];
  const sourceAgg: Record<string, { debit: number; credit: number }> = {};
  sourceKeys.forEach(src => {
    sourceAgg[src] = {
      debit: data.filter(d => d.source === src && d.side === 'debit').reduce((s, d) => s + d.amount, 0),
      credit: data.filter(d => d.source === src && d.side === 'credit').reduce((s, d) => s + d.amount, 0),
    };
  });

  return {
    data,
    summary: { sites: sitesList, months: monthsList, totalDebit, totalCredit, netPL, siteWise, catAgg, monthlyTrend, sourceAgg },
  };
}

function SourceBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-[#0f1318] rounded-full h-2 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, backgroundColor: color }} />
    </div>
  );
}

function BarIndicator({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#8899aa]">{label}</span>
        <span className="text-[#e2e8f0] font-mono">{fmtINR(amount)}</span>
      </div>
      <SourceBar value={amount} max={max} color={color} />
    </div>
  );
}

export default function FinProfitLoss() {
  const [records, setRecords] = useState<PLEntry[]>([]);
  const [summary, setSummary] = useState<PLSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'statement' | 'table'>('dashboard');
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PLEntry | null>(null);
  const [form, setForm] = useState<PLForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PLEntry | null>(null);

  const [sideFilter, setSideFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/profit-loss');
      const j: ApiResponse = await r.json();
      if (j.success && j.data?.length) {
        setRecords(j.data);
        setSummary(j.summary);
      } else {
        const mock = generateMockData();
        setRecords(mock.data);
        setSummary(mock.summary);
        toast.info('Sample data — no server records found');
      }
    } catch {
      const mock = generateMockData();
      setRecords(mock.data);
      setSummary(mock.summary);
      toast.info('Sample data — API unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const manualEntries = useMemo(() => records.filter(r => isNumericId(r.id)), [records]);

  const siteFilteredRecords = useMemo(() => {
    if (!selectedSite) return records;
    return records.filter(r => r.site === selectedSite);
  }, [records, selectedSite]);

  const tableRecords = useMemo(() => {
    let filtered = [...records];
    if (siteFilter !== 'all') filtered = filtered.filter(r => r.site === siteFilter);
    if (sideFilter !== 'all') filtered = filtered.filter(r => r.side === sideFilter);
    if (catFilter !== 'all') filtered = filtered.filter(r => r.category === catFilter);
    return filtered;
  }, [records, siteFilter, sideFilter, catFilter]);

  const tc = useTableControls(tableRecords, (r) => `${r.particular} ${r.site} ${r.category} ${r.month} ${r.source}`);

  const incomeCategories = useMemo(() => {
    if (!summary) return [];
    return CREDIT_CATEGORIES.map(cat => ({
      category: cat,
      amount: summary.catAgg[cat]?.credit || 0,
    }));
  }, [summary]);

  const expenseCategories = useMemo(() => {
    if (!summary) return [];
    return DEBIT_CATEGORIES.map(cat => ({
      category: cat,
      amount: summary.catAgg[cat]?.debit || 0,
    }));
  }, [summary]);

  const totalIncome = summary?.totalCredit ?? 0;
  const totalExpenses = summary?.totalDebit ?? 0;
  const netPL = summary?.netPL ?? 0;
  const profitMargin = totalIncome > 0 ? (netPL / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) : 0;

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setFormErr('');
    setFormOpen(true);
  };

  const openEdit = (r: PLEntry) => {
    setEditTarget(r);
    setForm({
      site: r.site,
      month: r.month,
      side: r.side,
      category: r.category,
      particular: r.particular,
      amount: r.amount,
    });
    setFormErr('');
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.site) { setFormErr('Site is required'); return; }
    if (!form.month) { setFormErr('Month is required'); return; }
    if (!form.particular) { setFormErr('Particular is required'); return; }
    if (!form.amount || form.amount <= 0) { setFormErr('Amount must be greater than 0'); return; }
    setFormErr('');
    setSubmitting(true);
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const res = await fetch('/api/fin/profit-loss', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(editTarget ? 'Entry updated' : 'Entry created');
        setFormOpen(false);
        await fetch_();
      } else {
        setFormErr(json.error || 'Failed to save');
      }
    } catch {
      setFormErr('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/fin/profit-loss?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Entry deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetch_();
      } else {
        toast.error(json.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const totalSites = summary?.sites?.length ?? 0;

  if (loading && records.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded bg-[#252e3a] animate-pulse" />
          <div className="w-40 h-5 rounded bg-[#252e3a] animate-pulse" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="vc-stat-card h-20 animate-pulse">
              <div className="h-3 w-24 bg-[#252e3a] rounded mb-3" />
              <div className="h-6 w-28 bg-[#252e3a] rounded" />
            </div>
          ))}
        </div>
        <div className="vc-panel h-64 animate-pulse">
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-[#f5a623]" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#f5a623]" />
          <span className="text-[14px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Profit & Loss</span>
          {summary && (
            <span className="text-[10px] text-[#5a6878] bg-[#0f1318] px-2 py-0.5 rounded-full font-mono">
              {summary.sites.length} sites · {summary.months.length} months
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0f1318] rounded-lg border border-[#252e3a] p-0.5">
            {(['dashboard', 'statement', 'table'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-[#f5a623] text-[#0a0d12]'
                    : 'text-[#5a6878] hover:text-[#e2e8f0]'
                }`}
              >
                {mode === 'dashboard' ? 'Dashboard' : mode === 'statement' ? 'P&L Statement' : 'Table'}
              </button>
            ))}
          </div>
          <button onClick={() => fetch_()} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]" title="Refresh">
            <Loader2 size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <ExportButton records={records} columns={EXPORT_COLUMNS} filename="fin-profit-loss" format="xlsx" label="XLSX" />
          <ExportButton records={records} columns={EXPORT_COLUMNS} filename="fin-profit-loss" format="csv" label="CSV" />
        </div>
      </div>

      {/* === DASHBOARD VIEW === */}
      {viewMode === 'dashboard' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-3">
            <div className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Income</div>
              <div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(totalIncome)}</div>
              <div className="text-[9px] text-[#5a6878] mt-1">{summary?.months?.length ?? 0} months</div>
            </div>
            <div className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" />
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Expenses</div>
              <div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(totalExpenses)}</div>
              <div className="text-[9px] text-[#5a6878] mt-1">{records.filter(r => r.side === 'debit').length} entries</div>
            </div>
            <div className="vc-stat-card relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${netPL >= 0 ? 'bg-[#00e676]' : 'bg-[#ff3d3d]'}`} />
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Net Profit / Loss</div>
              <div className={`text-[20px] font-bold flex items-center gap-1.5 ${netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {netPL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {fmtINR(Math.abs(netPL))}
              </div>
              <div className="text-[9px] text-[#5a6878] mt-1">{netPL >= 0 ? 'Profit' : 'Loss'}</div>
            </div>
            <div className="vc-stat-card relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${profitMargin >= 0 ? 'bg-[#00d4ff]' : 'bg-[#f5a623]'}`} />
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Profit Margin</div>
              <div className={`text-[20px] font-bold ${profitMargin >= 0 ? 'text-[#00d4ff]' : 'text-[#f5a623]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{pct(profitMargin)}</div>
              <div className="text-[9px] text-[#5a6878] mt-1">Ratio: {expenseRatio.toFixed(2)}x</div>
            </div>
            <div className="vc-stat-card relative overflow-hidden cursor-pointer hover:bg-[#1a2332] transition-colors" onClick={() => setViewMode('table')}>
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a855f7]" />
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Sites</div>
              <div className="text-[20px] font-bold text-[#a855f7]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{totalSites}</div>
              <div className="text-[9px] text-[#5a6878] mt-1">Click to drill down →</div>
            </div>
          </div>

          {/* Source Breakdown + Site-wise P&L */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source Breakdown */}
            <div className="vc-panel">
              <div className="vc-panel-header">
                <PieChart size={14} className="text-[#f5a623]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">Income by Source</span>
              </div>
              <div className="p-3 space-y-3">
                {summary && ['invoice', 'credit_note', 'expense_claim', 'petty_cash', 'payment_advice', 'manual'].map(src => {
                  const val = summary.sourceAgg[src]?.credit || 0;
                  return (
                    <BarIndicator
                      key={src}
                      label={SOURCE_LABELS[src] || src}
                      amount={val}
                      max={totalIncome}
                      color={SOURCE_BAR_COLORS[src] || '#5a6878'}
                    />
                  );
                })}
                {totalIncome === 0 && <div className="text-[11px] text-[#5a6878] text-center py-4">No income data</div>}
              </div>
            </div>

            {/* Expenses by Source */}
            <div className="vc-panel">
              <div className="vc-panel-header">
                <PieChart size={14} className="text-[#ff3d3d]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">Expenses by Source</span>
              </div>
              <div className="p-3 space-y-3">
                {summary && ['invoice', 'credit_note', 'expense_claim', 'petty_cash', 'payment_advice', 'manual'].map(src => {
                  const val = summary.sourceAgg[src]?.debit || 0;
                  return (
                    <BarIndicator
                      key={src}
                      label={SOURCE_LABELS[src] || src}
                      amount={val}
                      max={totalExpenses}
                      color={SOURCE_BAR_COLORS[src] || '#5a6878'}
                    />
                  );
                })}
                {totalExpenses === 0 && <div className="text-[11px] text-[#5a6878] text-center py-4">No expense data</div>}
              </div>
            </div>
          </div>

          {/* Site-wise P&L Cards */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <Layers size={14} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Site-wise Profit & Loss</span>
              {selectedSite && (
                <button onClick={() => setSelectedSite(null)} className="ml-2 flex items-center gap-1 text-[10px] text-[#f5a623] hover:text-[#d48f1a]">
                  <X size={12} /> Clear filter
                </button>
              )}
            </div>
            <div className="p-3">
              {selectedSite ? (
                /* Category drill-down for selected site */
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{selectedSite}</span>
                    <span className="text-[10px] text-[#5a6878]">{siteFilteredRecords.length} entries</span>
                  </div>
                  {ALL_CATEGORIES.map(cat => {
                    const entries = siteFilteredRecords.filter(r => r.category === cat);
                    if (entries.length === 0) return null;
                    const total = entries.reduce((s, r) => s + r.amount, 0);
                    const isExpanded = expandedCats.has(cat);
                    const isCredit = CREDIT_CATEGORIES.includes(cat);
                    return (
                      <div key={cat} className="border border-[#252e3a] rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCat(cat)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-[#0f1318] hover:bg-[#141920] transition-colors text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={12} className="text-[#5a6878]" /> : <ChevronRight size={12} className="text-[#5a6878]" />}
                            <span className="text-[#e2e8f0] font-medium">{cat}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#5a6878] text-[10px]">{entries.length} entries</span>
                            <span className={`font-mono ${isCredit ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{fmtINR(total)}</span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="divide-y divide-[#252e3a]">
                            {entries.map(entry => (
                              <div key={entry.id} className="flex items-center justify-between px-3 py-1.5 pl-8 text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className={`vc-badge text-[9px] ${SOURCE_COLORS[entry.source] || 'bg-[#5a6878]/15 text-[#5a6878]'}`}>
                                    {SOURCE_LABELS[entry.source] || entry.source}
                                  </span>
                                  <span className="text-[#8899aa]">{entry.particular}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[#5a6878] text-[10px] font-mono">{entry.month}</span>
                                  <span className={`font-mono ${entry.side === 'credit' ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{fmtINR(entry.amount)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Site-wise cards grid */
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {summary?.siteWise.map(sw => {
                    const margin = sw.income > 0 ? (sw.netPL / sw.income) * 100 : 0;
                    const incomePct = (sw.income / totalIncome) * 100;
                    const expensePct = (sw.expense / totalExpenses) * 100;
                    return (
                      <button
                        key={sw.site}
                        onClick={() => setSelectedSite(sw.site)}
                        className="vc-stat-card text-left hover:bg-[#1a2332] transition-colors cursor-pointer"
                      >
                        <div className="text-[11px] font-semibold text-[#e2e8f0] truncate mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{sw.site}</div>
                        <div className="space-y-1.5 mb-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#00e676]">Income</span>
                            <span className="text-[#8899aa] font-mono">{fmtINR(sw.income)}</span>
                          </div>
                          <div className="w-full bg-[#0f1318] rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full bg-[#00e676]" style={{ width: `${Math.min(incomePct, 100)}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#ff3d3d]">Expense</span>
                            <span className="text-[#8899aa] font-mono">{fmtINR(sw.expense)}</span>
                          </div>
                          <div className="w-full bg-[#0f1318] rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full bg-[#ff3d3d]" style={{ width: `${Math.min(expensePct, 100)}%` }} />
                          </div>
                        </div>
                        <div className={`text-[13px] font-bold ${sw.netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {sw.netPL >= 0 ? '+' : ''}{fmtINR(sw.netPL)}
                        </div>
                        <div className={`text-[9px] ${margin >= 0 ? 'text-[#00d4ff]' : 'text-[#f5a623]'}`}>{pct(margin)} margin</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Monthly Trend Table */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <BarChart3 size={14} className="text-[#00d4ff]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Monthly Trend</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#0f1318]">
                    <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Month</th>
                    <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Income</th>
                    <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Expenses</th>
                    <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Net P/L</th>
                    {summary?.sites.map(site => (
                      <th key={site} className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] max-w-[100px] truncate">{site}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {summary?.monthlyTrend.map(mt => {
                    const mIncome = records.filter(r => r.month === mt.month && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
                    const mExpense = records.filter(r => r.month === mt.month && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
                    const mNet = mIncome - mExpense;
                    return (
                      <tr key={mt.month} className="hover:bg-[#141920]">
                        <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{mt.month}</td>
                        <td className="py-2.5 px-3 text-[#00e676] font-mono text-right">{fmtINR(mt.income)}</td>
                        <td className="py-2.5 px-3 text-[#ff3d3d] font-mono text-right">{fmtINR(mt.expense)}</td>
                        <td className={`py-2.5 px-3 font-mono text-right font-medium ${mt.netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                          {mt.netPL >= 0 ? '+' : ''}{fmtINR(mt.netPL)}
                        </td>
                        {summary?.sites.map(site => {
                          const sIncome = records.filter(r => r.month === mt.month && r.site === site && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
                          const sExpense = records.filter(r => r.month === mt.month && r.site === site && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
                          const sNet = sIncome - sExpense;
                          return (
                            <td key={site} className={`py-2.5 px-3 font-mono text-right text-[10px] ${sNet >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                              {sNet >= 0 ? '+' : ''}{fmtINR(sNet)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === P&L STATEMENT VIEW (CA-style) === */}
      {viewMode === 'statement' && summary && (
        <div className="vc-panel max-w-3xl mx-auto">
          <div className="vc-panel-header">
            <FileText size={14} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Profit & Loss Statement</span>
            <span className="text-[10px] text-[#5a6878] ml-auto">For the period {summary.months[0]} – {summary.months[summary.months.length - 1]}</span>
          </div>
          <div className="p-4 space-y-4">
            {/* Income Section */}
            <div>
              <div className="flex items-center justify-between border-b border-[#252e3a] pb-2 mb-2">
                <span className="text-[13px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>INCOME</span>
                <span className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider">Amount</span>
              </div>
              <div className="space-y-1.5">
                {CREDIT_CATEGORIES.map(cat => {
                  const amount = summary.catAgg[cat]?.credit || 0;
                  if (amount === 0) return null;
                  return (
                    <div key={cat} className="flex items-center justify-between py-1 text-[12px]">
                      <span className="text-[#8899aa] pl-4">{cat}</span>
                      <span className="text-[#e2e8f0] font-mono">{fmtINR(amount)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between py-2 mt-2 border-t border-[#252e3a]">
                <span className="text-[13px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Total Income</span>
                <span className="text-[14px] font-bold text-[#00e676] font-mono" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(totalIncome)}</span>
              </div>
            </div>

            {/* Expense Section */}
            <div>
              <div className="flex items-center justify-between border-b border-[#252e3a] pb-2 mb-2">
                <span className="text-[13px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>EXPENSES</span>
                <span className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider">Amount</span>
              </div>
              <div className="space-y-1.5">
                {DEBIT_CATEGORIES.map(cat => {
                  const amount = summary.catAgg[cat]?.debit || 0;
                  if (amount === 0) return null;
                  return (
                    <div key={cat} className="flex items-center justify-between py-1 text-[12px]">
                      <span className="text-[#8899aa] pl-4">{cat}</span>
                      <span className="text-[#e2e8f0] font-mono">{fmtINR(amount)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between py-2 mt-2 border-t border-[#252e3a]">
                <span className="text-[13px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Total Expenses</span>
                <span className="text-[14px] font-bold text-[#ff3d3d] font-mono" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(totalExpenses)}</span>
              </div>
            </div>

            {/* Gross Profit / Loss */}
            <div className="border-t border-[#252e3a] pt-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-[#8899aa] pl-4">Gross Profit / Loss</span>
                <span className={`text-[12px] font-mono font-medium ${netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                  {netPL >= 0 ? '' : '('}{fmtINR(Math.abs(netPL))}{netPL < 0 ? ')' : ''}
                </span>
              </div>
            </div>

            {/* Net Profit / Loss */}
            <div className="border-t-2 border-[#f5a623] pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Net {netPL >= 0 ? 'Profit' : 'Loss'}
                </span>
                <span className={`text-[16px] font-bold font-mono ${netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {netPL >= 0 ? '' : '('}{fmtINR(Math.abs(netPL))}{netPL < 0 ? ')' : ''}
                </span>
              </div>
            </div>

            {/* Additional info */}
            <div className="border-t border-[#252e3a] pt-3 grid grid-cols-3 gap-3 text-[10px]">
              <div className="text-[#5a6878]">Profit Margin: <span className={`font-semibold ${profitMargin >= 0 ? 'text-[#00d4ff]' : 'text-[#f5a623]'}`}>{pct(profitMargin)}</span></div>
              <div className="text-[#5a6878]">Expense/Income Ratio: <span className="text-[#e2e8f0] font-semibold">{expenseRatio.toFixed(2)}x</span></div>
              <div className="text-[#5a6878]">Sites: <span className="text-[#e2e8f0] font-semibold">{totalSites}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* === TABLE VIEW === */}
      {viewMode === 'table' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <FileText size={14} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">All Entries</span>
            <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-2">{tableRecords.length}</span>
            <div className="flex items-center gap-2 ml-3">
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded px-2 py-1.5 text-[10px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value="all">All Sites</option>
                {summary?.sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={sideFilter} onChange={e => setSideFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded px-2 py-1.5 text-[10px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value="all">All Sides</option>
                <option value="credit">Income</option>
                <option value="debit">Expense</option>
              </select>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded px-2 py-1.5 text-[10px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search entries..." />
            <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 text-[11px] ml-2">
              <Plus size={13} /> Add Entry
            </button>
          </div>

          {/* Legend */}
          <div className="px-3 py-2 bg-[#0f1318] border-b border-[#252e3a] flex items-center gap-4 text-[10px]">
            <span className="text-[#5a6878] font-semibold uppercase tracking-wider">Source Legend:</span>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <span key={key} className={`vc-badge ${SOURCE_COLORS[key] || 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{label}</span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    {['Source', 'Site', 'Month', 'Side', 'Category', 'Particular', 'Amount', ''].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {tc.pageItems.map(entry => {
                    const isManual = isNumericId(entry.id);
                    return (
                      <tr key={entry.id} className="hover:bg-[#141920]">
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge text-[9px] ${SOURCE_COLORS[entry.source] || 'bg-[#5a6878]/15 text-[#5a6878]'}`}>
                            {SOURCE_LABELS[entry.source] || entry.source}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[140px] truncate">{entry.site}</td>
                        <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{entry.month}</td>
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge ${entry.side === 'credit' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>
                            {entry.side === 'credit' ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa] max-w-[120px] truncate">{entry.category}</td>
                        <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate">{entry.particular}</td>
                        <td className={`py-2.5 px-3 font-mono font-medium whitespace-nowrap ${entry.side === 'credit' ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                          {entry.side === 'credit' ? '' : '−'}{fmtINR(entry.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          {isManual ? (
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(entry)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                              <button onClick={() => { setDeleteTarget(entry); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                            </div>
                          ) : (
                            <span className="text-[#5a6878] text-[9px] italic">Auto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {tableRecords.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-[#5a6878]">No entries found</td></tr>
                  )}
                  {tableRecords.length > 0 && tc.pageItems.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-[#5a6878]">No matching entries</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
          </div>
        </div>
      )}

      {/* === Create/Edit Dialog === */}
      <Dialog open={formOpen} onOpenChange={(o: boolean) => { if (!submitting) { setFormOpen(o); if (!o) setFormErr(''); } }}>
        <DialogContent className="bg-[#0f1318] border border-[#1a2028] text-[#e2e8f0] sm:max-w-lg max-h-[90vh] !p-0 !gap-0 grid-rows-[auto_1fr_auto]">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-[#f5a623] text-base flex items-center gap-2">
              {editTarget ? <Pencil size={16} /> : <Plus size={16} />}
              {editTarget ? 'Edit' : 'Add'} P&L Entry
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-4 py-4 min-h-0 space-y-3">
            {formErr && (
              <div className="mb-3 px-4 py-2 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 text-[#ff3d3d] text-[12px] flex items-center gap-2">
                <span>⚠</span> {formErr}
              </div>
            )}

            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Site <span className="text-[#ff3d3d]">*</span></label>
              <select value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} className={sc}>
                <option value="">Select site</option>
                {summary?.sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Month <span className="text-[#ff3d3d]">*</span></label>
              <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className={sc}>
                <option value="">Select month</option>
                {summary?.months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Side</label>
              <select value={form.side} onChange={e => setForm({ ...form, side: e.target.value })} className={sc}>
                <option value="debit">Expense (Debit)</option>
                <option value="credit">Income (Credit)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={sc}>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Particular <span className="text-[#ff3d3d]">*</span></label>
              <input value={form.particular} onChange={e => setForm({ ...form, particular: e.target.value })} placeholder="Description of entry" className={ic} />
            </div>

            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Amount <span className="text-[#ff3d3d]">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#5a6878]">₹</span>
                <input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value === '' ? 0 : (Number(e.target.value) || 0) })} placeholder="0" className={ic + ' w-full pl-8'} min={0} step={1} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 px-4 pb-4 pt-3 border-t border-[#1a2028]">
            <button onClick={() => setFormOpen(false)} disabled={submitting} className="px-4 py-2 text-[12px] font-medium text-[#8899aa] hover:text-[#e2e8f0] bg-[#1a2028] rounded-lg hover:bg-[#252e3a] disabled:opacity-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-1.5 px-5 py-2 bg-[#f5a623] text-[#0a0d12] rounded-lg text-[12px] font-semibold hover:bg-[#d48f1a] disabled:opacity-50 transition-colors">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {!submitting && (editTarget ? <Pencil size={14} /> : <Plus size={14} />)}
              {editTarget ? 'Update' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Delete Dialog === */}
      <AlertDialog open={deleteOpen} onOpenChange={(o: boolean) => { if (!o) setDeleteTarget(null); setDeleteOpen(o); }}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete entry for <strong className="text-[#f5a623]">{deleteTarget?.particular}</strong> ({fmtINR(deleteTarget?.amount ?? 0)})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
