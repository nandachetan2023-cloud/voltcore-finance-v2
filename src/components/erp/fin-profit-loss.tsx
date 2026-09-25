'use client';
import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { TrendingUp, BarChart3, FileText, Printer, Plus, Pencil, Trash2, X, PieChart, Layers, Eye, Loader2, Wallet, Receipt, Banknote, CalendarRange, Building2, CheckCircle2, Clock3 } from 'lucide-react';
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
  jobCode?: string | null;
  poNo?: string | null;
  customer?: string | null;
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
  jobWise?: { jobCode: string; income: number; expense: number; netPL: number }[];
  poWise?: { poNo: string; income: number; expense: number; netPL: number }[];
  customerWise?: { customer: string; income: number; expense: number; netPL: number }[];
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

const PERIOD_OPTIONS = [
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'fy', label: 'FY' },
  { key: 'all', label: 'All' },
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]['key'];

const BUDGET_FACTORS: Record<string, number> = {
  'Sales Accounts': 0.92,
  'Direct Incomes': 1.05,
  'Indirect Incomes': 1.1,
  'Purchase Accounts': 0.9,
  'Direct Expenses': 1.15,
  'Indirect Expenses': 1.2,
};

const DONUT_COLORS = ['#00d4ff', '#f5a623', '#a855f7'];

const MONTH_NUM: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function parseMonth(m: string): { num: number; year: number; q: number; fy: string } {
  const mm = m.match(/([A-Za-z]{3})/);
  const yy = m.match(/(\d{2,4})/);
  const mon = mm ? mm[1] : 'Jan';
  let year = yy ? parseInt(yy[1], 10) : 2026;
  if (year < 100) year += 2000;
  const num = MONTH_NUM[mon] || 1;
  const q = num <= 3 ? 1 : num <= 6 ? 2 : num <= 9 ? 3 : 4;
  const fyStart = num >= 4 ? year : year - 1;
  return { num, year, q, fy: `FY ${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}` };
}

const budgetOf = (label: string, actual: number) => Math.round(actual * (BUDGET_FACTORS[label] ?? 1));

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
const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return sign + '₹' + (abs / 1e7).toFixed(1) + ' Cr';
  if (abs >= 1e5) return sign + '₹' + (abs / 1e5).toFixed(1) + ' L';
  if (abs >= 1e3) return sign + '₹' + (abs / 1e3).toFixed(1) + ' K';
  return sign + '₹' + abs.toFixed(0);
};
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
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-[#0f1318] rounded-full h-2 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, backgroundColor: color }} />
    </div>
  );
}

function KpiCard({ label, value, sub, valueColor, accent, icon, spark }: { label: string; value: string; sub: string; valueColor: string; accent: string; icon: ReactNode; spark?: number[] }) {
  const max = spark && spark.length ? Math.max(...spark, 1) : 1;
  return (
    <div className="vc-stat-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">{label}</span>
        {icon}
      </div>
      <div className="text-[20px] font-bold" style={{ color: valueColor, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="text-[9px] text-[#5a6878] truncate">{sub}</span>
        {spark && spark.length > 0 && (
          <div className="flex items-end gap-[2px] h-5">
            {spark.slice(-6).map((v, i) => (
              <div key={i} className="w-[6px] rounded-sm" style={{ height: `${Math.max((v / max) * 100, 8)}%`, backgroundColor: valueColor, opacity: 0.7 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Donut({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const arcs = segments.reduce<{ label: string; value: number; color: string; dash: number; offset: number }[]>((acc, seg) => {
    const frac = total > 0 ? seg.value / total : 0;
    const dash = frac * c;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ ...seg, dash, offset });
    return acc;
  }, []);
  return (
    <div className="flex items-center gap-4">
      <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
        <g transform="rotate(-90 48 48)">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#0f1318" strokeWidth="14" />
          {arcs.map(seg => (
            <circle key={seg.label} cx="48" cy="48" r={r} fill="none" stroke={seg.color} strokeWidth="14" strokeDasharray={`${seg.dash} ${c - seg.dash}`} strokeDashoffset={-seg.offset} />
          ))}
        </g>
        <text x="48" y="51" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="'Barlow Condensed', sans-serif" fontWeight="bold">{fmtShort(total)}</text>
      </svg>
      <div className="flex-1 min-w-0 space-y-1.5">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-[10px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[#8899aa] truncate">{seg.label}</span>
            <span className="text-[#e2e8f0] font-mono ml-auto">{total > 0 ? pct((seg.value / total) * 100) : '0.00%'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StmtSection({ title, color }: { title: string; color?: string }) {
  return (
    <tr>
      <td colSpan={5} className="py-2 px-3 bg-[#0f1318] text-[10px] font-bold uppercase tracking-wider" style={{ color: color || '#f5a623' }}>
        {title}
      </td>
    </tr>
  );
}

function StmtRow({ label, actual, budget, indent, strong, color }: { label: string; actual: number; budget: number; indent?: boolean; strong?: boolean; color?: string }) {
  const variance = actual - budget;
  const varPct = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;
  return (
    <tr className="hover:bg-[#141920]">
      <td className={`py-2 px-3 text-[11px] ${indent ? 'pl-8' : ''} ${strong ? 'font-bold text-[#e2e8f0]' : 'text-[#8899aa]'}`}>{label}</td>
      <td className={`py-2 px-3 text-right font-mono ${strong ? 'font-bold' : ''} ${color || 'text-[#e2e8f0]'}`}>{fmtINR(actual)}</td>
      <td className="py-2 px-3 text-right font-mono text-[#5a6878]">{fmtINR(budget)}</td>
      <td className={`py-2 px-3 text-right font-mono ${variance >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{variance >= 0 ? '+' : '−'}{fmtINR(Math.abs(variance))}</td>
      <td className={`py-2 px-3 text-right font-mono ${varPct >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{varPct >= 0 ? '+' : ''}{varPct.toFixed(1)}%</td>
    </tr>
  );
}

export default function FinProfitLoss() {
  const [records, setRecords] = useState<PLEntry[]>([]);
  const [summary, setSummary] = useState<PLSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'statement' | 'table'>('dashboard');
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>('all');
  const [dashboardSite, setDashboardSite] = useState<string>('all');

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

  const sortedMonths = useMemo(() => {
    const uniq = [...new Set(records.map(r => r.month))];
    return uniq.sort((a, b) => {
      const pa = parseMonth(a);
      const pb = parseMonth(b);
      return pa.year - pb.year || pa.num - pb.num || a.localeCompare(b);
    });
  }, [records]);

  const latestParsed = useMemo(() => (sortedMonths.length ? parseMonth(sortedMonths[sortedMonths.length - 1]) : null), [sortedMonths]);

  const periodRange = useMemo(() => {
    if (!latestParsed) return { set: new Set<string>(), label: 'All periods' };
    if (periodFilter === 'month') return { set: new Set([sortedMonths[sortedMonths.length - 1]]), label: sortedMonths[sortedMonths.length - 1] };
    if (periodFilter === 'quarter') {
      const set = new Set<string>();
      sortedMonths.forEach(m => { const p = parseMonth(m); if (p.year === latestParsed.year && p.q === latestParsed.q) set.add(m); });
      return { set, label: `Q${latestParsed.q} ${latestParsed.year}` };
    }
    if (periodFilter === 'fy') {
      const set = new Set<string>();
      sortedMonths.forEach(m => { if (parseMonth(m).fy === latestParsed.fy) set.add(m); });
      return { set, label: latestParsed.fy };
    }
    return { set: new Set(sortedMonths), label: 'All periods' };
  }, [periodFilter, sortedMonths, latestParsed]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => periodRange.set.has(r.month) && (dashboardSite === 'all' || r.site === dashboardSite));
  }, [records, periodRange, dashboardSite]);

  const fCredit = filteredRecords.filter(r => r.side === 'credit').reduce((s, r) => s + r.amount, 0);
  const fDebit = filteredRecords.filter(r => r.side === 'debit').reduce((s, r) => s + r.amount, 0);
  const fNet = fCredit - fDebit;
  const fMargin = fCredit > 0 ? (fNet / fCredit) * 100 : 0;

  const cogs = filteredRecords.filter(r => r.category === 'Purchase Accounts' && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
  const gross = fCredit - cogs;
  const grossPct = fCredit > 0 ? (gross / fCredit) * 100 : 0;
  const opEx = filteredRecords.filter(r => ['Direct Expenses', 'Indirect Expenses'].includes(r.category) && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
  const opExPct = fCredit > 0 ? (opEx / fCredit) * 100 : 0;

  const trend = useMemo(() => {
    return sortedMonths
      .map(m => {
        const income = filteredRecords.filter(r => r.month === m && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
        const expense = filteredRecords.filter(r => r.month === m && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
        return { month: m, income, expense, netPL: income - expense };
      })
      .filter(t => t.income > 0 || t.expense > 0);
  }, [sortedMonths, filteredRecords]);

  const siteWise = useMemo(() => {
    const sites = [...new Set(filteredRecords.map(r => r.site).filter(Boolean))].sort();
    return sites
      .map(site => {
        const income = filteredRecords.filter(r => r.site === site && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
        const expense = filteredRecords.filter(r => r.site === site && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
        return { site, income, expense, netPL: income - expense };
      })
      .sort((a, b) => b.netPL - a.netPL);
  }, [filteredRecords]);

  const jobWise = useMemo(() => {
    const jobs = [...new Set(filteredRecords.map(r => r.jobCode).filter(Boolean))].sort() as string[];
    return jobs
      .map(jobCode => {
        const income = filteredRecords.filter(r => r.jobCode === jobCode && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
        const expense = filteredRecords.filter(r => r.jobCode === jobCode && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
        return { jobCode, income, expense, netPL: income - expense };
      })
      .sort((a, b) => b.netPL - a.netPL);
  }, [filteredRecords]);

  const poWise = useMemo(() => {
    const poNos = [...new Set(filteredRecords.map(r => r.poNo).filter(Boolean))].sort() as string[];
    return poNos
      .map(poNo => {
        const income = filteredRecords.filter(r => r.poNo === poNo && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
        const expense = filteredRecords.filter(r => r.poNo === poNo && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
        return { poNo, income, expense, netPL: income - expense };
      })
      .sort((a, b) => b.netPL - a.netPL);
  }, [filteredRecords]);

  const customerWise = useMemo(() => {
    const customers = [...new Set(filteredRecords.map(r => r.customer).filter(Boolean))].sort() as string[];
    return customers
      .map(customer => {
        const income = filteredRecords.filter(r => r.customer === customer && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
        const expense = filteredRecords.filter(r => r.customer === customer && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
        return { customer, income, expense, netPL: income - expense };
      })
      .sort((a, b) => b.netPL - a.netPL);
  }, [filteredRecords]);

  const fSourceAgg = useMemo(() => {
    const agg: Record<string, { debit: number; credit: number }> = {};
    filteredRecords.forEach(r => {
      if (!agg[r.source]) agg[r.source] = { debit: 0, credit: 0 };
      agg[r.source][r.side as 'debit' | 'credit'] += r.amount;
    });
    return agg;
  }, [filteredRecords]);

  const revenueRows = useMemo(() => {
    return CREDIT_CATEGORIES.map(cat => {
      const actual = filteredRecords.filter(r => r.category === cat && r.side === 'credit').reduce((s, r) => s + r.amount, 0);
      return { label: cat, actual, budget: budgetOf(cat, actual) };
    });
  }, [filteredRecords]);

  const opRows = useMemo(() => {
    return DEBIT_CATEGORIES.filter(c => c !== 'Purchase Accounts').map(cat => {
      const actual = filteredRecords.filter(r => r.category === cat && r.side === 'debit').reduce((s, r) => s + r.amount, 0);
      return { label: cat, actual, budget: budgetOf(cat, actual) };
    });
  }, [filteredRecords]);

  const revenueBudget = revenueRows.reduce((s, r) => s + r.budget, 0);
  const cogsBudget = budgetOf('Purchase Accounts', cogs);
  const grossBudget = revenueBudget - cogsBudget;
  const opBudget = opRows.reduce((s, r) => s + r.budget, 0);
  const netBudget = grossBudget - opBudget;
  const netVar = fNet - netBudget;
  const netVarPct = netBudget !== 0 ? (netVar / Math.abs(netBudget)) * 100 : 0;

  const expenseSegs = DEBIT_CATEGORIES.map((cat, i) => ({
    label: cat,
    value: filteredRecords.filter(r => r.category === cat && r.side === 'debit').reduce((s, r) => s + r.amount, 0),
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  })).filter(s => s.value > 0);
  const expenseTotal = expenseSegs.reduce((s, seg) => s + seg.value, 0);

  const reconItems = [
    { key: 'invoice', label: 'Invoices', kind: 'credit' as const },
    { key: 'credit_note', label: 'Credit Notes', kind: 'debit' as const },
    { key: 'expense_claim', label: 'Expense Claims', kind: 'debit' as const },
    { key: 'petty_cash', label: 'Petty Cash', kind: 'debit' as const },
    { key: 'payment_advice', label: 'Payment Advices', kind: 'debit' as const },
  ];

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
          {/* Filter bar */}
          <div className="vc-panel p-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-[#0f1318] border border-[#252e3a] rounded-lg p-0.5">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPeriodFilter(opt.key)}
                    className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all ${
                      periodFilter === opt.key ? 'bg-[#f5a623] text-[#0a0d12]' : 'text-[#5a6878] hover:text-[#e2e8f0]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarRange size={13} className="text-[#5a6878]" />
                <select value={dashboardSite} onChange={e => setDashboardSite(e.target.value)} className={sc + ' !py-1.5 text-[10px]'}>
                  <option value="all">All Sites</option>
                  {siteWise.map(sw => <option key={sw.site} value={sw.site}>{sw.site}</option>)}
                </select>
              </div>
              <div className="flex-1" />
              <span className="text-[10px] text-[#5a6878] font-mono">{periodRange.label} · {filteredRecords.length} entries</span>
              <button onClick={() => { setPeriodFilter('all'); setDashboardSite('all'); }} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
                <X size={12} /> Reset
              </button>
              <button onClick={() => window.print()} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
                <Printer size={12} /> Print
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Total Revenue"
              value={fmtShort(fCredit)}
              sub={`${trend.length} months · ${pct(fMargin)} margin`}
              valueColor="#00e676"
              accent="#00e676"
              icon={<Wallet size={14} className="text-[#00e676]" />}
              spark={trend.map(t => t.income)}
            />
            <KpiCard
              label="COGS"
              value={fmtShort(cogs)}
              sub={`${pct(fCredit > 0 ? (cogs / fCredit) * 100 : 0)} of revenue`}
              valueColor="#00d4ff"
              accent="#00d4ff"
              icon={<Receipt size={14} className="text-[#00d4ff]" />}
              spark={trend.map(t => filteredRecords.filter(r => r.month === t.month && r.category === 'Purchase Accounts' && r.side === 'debit').reduce((s, r) => s + r.amount, 0))}
            />
            <KpiCard
              label="Gross Margin"
              value={fmtShort(gross)}
              sub={`${pct(grossPct)} GM`}
              valueColor={gross >= 0 ? '#00e676' : '#ff3d3d'}
              accent={gross >= 0 ? '#00e676' : '#ff3d3d'}
              icon={<TrendingUp size={14} className={gross >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'} />}
            />
            <KpiCard
              label="Operating Expenses"
              value={fmtShort(opEx)}
              sub={`${pct(opExPct)} of revenue`}
              valueColor="#f5a623"
              accent="#f5a623"
              icon={<Layers size={14} className="text-[#f5a623]" />}
              spark={trend.map(t => filteredRecords.filter(r => r.month === t.month && ['Direct Expenses', 'Indirect Expenses'].includes(r.category) && r.side === 'debit').reduce((s, r) => s + r.amount, 0))}
            />
            <KpiCard
              label="Net Profit"
              value={fmtShort(fNet)}
              sub={`${pct(fMargin)} margin`}
              valueColor={fNet >= 0 ? '#00e676' : '#ff3d3d'}
              accent={fNet >= 0 ? '#00e676' : '#ff3d3d'}
              icon={<Banknote size={14} className={fNet >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'} />}
              spark={trend.map(t => t.netPL)}
            />
          </div>

          {/* Main grid: statement + sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              {/* Profitability Trend */}
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <BarChart3 size={14} className="text-[#00d4ff]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">Profitability Trend</span>
                  <div className="flex items-center gap-3 ml-2 text-[9px] text-[#5a6878]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00e676]" /> Income</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff3d3d]" /> Expense</span>
                  </div>
                </div>
                <div className="p-4">
                  {trend.length === 0 ? (
                    <div className="text-[11px] text-[#5a6878] text-center py-8">No data for selected period</div>
                  ) : (
                    <div className="flex items-end gap-3 h-40">
                      {(() => {
                        const max = Math.max(...trend.map(t => t.income), ...trend.map(t => t.expense), 1);
                        const last6 = trend.slice(-6);
                        return last6.map((t, i) => {
                          const isLast = i === last6.length - 1;
                          return (
                            <div key={t.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                              <div className="flex items-end justify-center gap-1 w-full h-32">
                                <div className="w-[9px] rounded-t" title={fmtINR(t.income)} style={{ height: `${(t.income / max) * 100}%`, backgroundColor: '#00e676', opacity: isLast ? 1 : 0.55 }} />
                                <div className="w-[9px] rounded-t" title={fmtINR(t.expense)} style={{ height: `${(t.expense / max) * 100}%`, backgroundColor: '#ff3d3d', opacity: isLast ? 1 : 0.55 }} />
                              </div>
                              <span className={`text-[9px] whitespace-nowrap ${isLast ? 'text-[#f5a623] font-semibold' : 'text-[#5a6878]'}`}>{t.month}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* P&L Detailed Statement */}
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <FileText size={14} className="text-[#f5a623]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">P&L Detailed Statement</span>
                  <span className="text-[10px] text-[#5a6878] ml-auto">Period: {periodRange.label}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-[#0f1318]">
                        <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Account Category</th>
                        <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Actual</th>
                        <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Budget</th>
                        <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Variance</th>
                        <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Var %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a2028]">
                      <StmtSection title="Revenue" color="#00e676" />
                      {revenueRows.filter(r => r.actual > 0).map(r => (
                        <StmtRow key={r.label} label={r.label} actual={r.actual} budget={r.budget} indent color="#00e676" />
                      ))}
                      <StmtSection title="Direct Costs (COGS)" color="#00d4ff" />
                      {cogs > 0 && <StmtRow label="Purchase Accounts" actual={cogs} budget={cogsBudget} indent color="#00d4ff" />}
                      <StmtRow label="GROSS PROFIT" actual={gross} budget={grossBudget} strong color={gross >= 0 ? '#00e676' : '#ff3d3d'} />
                      <StmtSection title="Operating Expenses" color="#f5a623" />
                      {opRows.filter(r => r.actual > 0).map(r => (
                        <StmtRow key={r.label} label={r.label} actual={r.actual} budget={r.budget} indent color="#f5a623" />
                      ))}
                      <tr className="bg-[#0f1318] border-t-2 border-[#f5a623]">
                        <td className="py-3 px-3 text-[13px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>NET PROFIT</td>
                        <td className="py-3 px-3 text-right font-mono text-[14px] font-bold text-[#f5a623]">{fNet >= 0 ? '+' : '−'}{fmtINR(Math.abs(fNet))}</td>
                        <td className="py-3 px-3 text-right font-mono text-[12px] text-[#8899aa]">{fmtINR(netBudget)}</td>
                        <td className={`py-3 px-3 text-right font-mono text-[12px] font-bold ${netVar >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{netVar >= 0 ? '+' : '−'}{fmtINR(Math.abs(netVar))}</td>
                        <td className={`py-3 px-3 text-right font-mono text-[12px] font-bold ${netVarPct >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{netVarPct >= 0 ? '+' : ''}{netVarPct.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Expense Distribution */}
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <PieChart size={14} className="text-[#ff3d3d]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">Expense Distribution</span>
                </div>
                <div className="p-4">
                  {expenseTotal === 0 ? (
                    <div className="text-[11px] text-[#5a6878] text-center py-6">No expenses recorded</div>
                  ) : (
                    <Donut segments={expenseSegs} total={expenseTotal} />
                  )}
                </div>
              </div>

              {/* Site Performance */}
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <BarChart3 size={14} className="text-[#00e676]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">Site Performance (GM %)</span>
                </div>
                <div className="p-4 space-y-3">
                  {siteWise.length === 0 && <div className="text-[11px] text-[#5a6878] text-center py-4">No site data</div>}
                  {siteWise.slice(0, 6).map(sw => {
                    const gm = sw.income > 0 ? (sw.netPL / sw.income) * 100 : 0;
                    const color = gm >= 15 ? '#00e676' : gm >= 0 ? '#f5a623' : '#ff3d3d';
                    return (
                      <div key={sw.site} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#8899aa] truncate pr-2">{sw.site}</span>
                          <span className="text-[#e2e8f0] font-mono">{gm.toFixed(1)}%</span>
                        </div>
                        <SourceBar value={Math.max(gm, 0)} max={30} color={color} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reconciliation Status */}
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <CheckCircle2 size={14} className="text-[#00e676]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">Reconciliation Status</span>
                </div>
                <div className="p-3">
                  {reconItems.map(item => {
                    const amt = fSourceAgg[item.key]?.[item.kind] || 0;
                    const ok = amt > 0;
                    return (
                      <div key={item.key} className="flex items-center gap-3 py-2 border-b border-[#1a2028] last:border-0">
                        {ok ? <CheckCircle2 size={14} className="text-[#00e676] shrink-0" /> : <Clock3 size={14} className="text-[#5a6878] shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[#e2e8f0] truncate">{item.label}</div>
                          <div className="text-[9px] text-[#5a6878]">{ok ? 'Reconciled' : 'No records'}</div>
                        </div>
                        <span className="text-[10px] font-mono text-[#8899aa]">{ok ? fmtShort(amt) : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Performance by Site table */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <Building2 size={14} className="text-[#a855f7]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Performance by Site</span>
              <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-2">{siteWise.length}</span>
              <span className="text-[10px] text-[#5a6878] ml-auto">Margin thresholds: ≥15% Healthy · 0–15% Watch · &lt;0% Critical</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#0f1318]">
                    {['Site', 'Contract Value', 'Cost to Date', 'Current P&L', 'Margin', 'Status', ''].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {siteWise.map(sw => {
                    const gm = sw.income > 0 ? (sw.netPL / sw.income) * 100 : 0;
                    const status = gm >= 15
                      ? { label: 'ACTIVE', cls: 'bg-[#00e676]/15 text-[#00e676]' }
                      : gm >= 0
                        ? { label: 'WATCH', cls: 'bg-[#f5a623]/15 text-[#f5a623]' }
                        : { label: 'CRITICAL', cls: 'bg-[#ff3d3d]/15 text-[#ff3d3d]' };
                    return (
                      <tr key={sw.site} className="hover:bg-[#141920]">
                        <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate">{sw.site}</td>
                        <td className="py-2.5 px-3 text-[#00e676] font-mono whitespace-nowrap">{fmtShort(sw.income)}</td>
                        <td className="py-2.5 px-3 text-[#ff3d3d] font-mono whitespace-nowrap">{fmtShort(sw.expense)}</td>
                        <td className={`py-2.5 px-3 font-mono font-medium whitespace-nowrap ${sw.netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                          {sw.netPL >= 0 ? '+' : '−'}{fmtShort(Math.abs(sw.netPL))}
                        </td>
                        <td className={`py-2.5 px-3 font-mono whitespace-nowrap ${gm >= 0 ? 'text-[#00d4ff]' : 'text-[#f5a623]'}`}>{gm.toFixed(1)}%</td>
                        <td className="py-2.5 px-3"><span className={`vc-badge text-[9px] ${status.cls}`}>{status.label}</span></td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => { setDashboardSite(sw.site); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="flex items-center gap-1 text-[10px] text-[#00d4ff] hover:text-[#0099cc]"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {siteWise.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-[#5a6878]">No site data for selected period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance by Job / PO / Customer */}
          {[
            { title: 'Performance by Job', icon: Layers, rows: jobWise, keyField: 'jobCode' as const, emptyNote: 'No job-tagged transactions for selected period — jobCode not present on every source (e.g. expense claims).' },
            { title: 'Performance by PO', icon: FileText, rows: poWise, keyField: 'poNo' as const, emptyNote: 'No PO-tagged transactions for selected period — poNo is only tracked on invoices and credit notes today.' },
            { title: 'Performance by Customer', icon: Building2, rows: customerWise, keyField: 'customer' as const, emptyNote: 'No customer-tagged transactions for selected period — party linkage is missing on credit notes and expense claims today.' },
          ].map(({ title, icon: Icon, rows, keyField, emptyNote }) => (
            <div className="vc-panel" key={title}>
              <div className="vc-panel-header">
                <Icon size={14} className="text-[#a855f7]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">{title}</span>
                <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-2">{rows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-[#0f1318]">
                      {[title.replace('Performance by ', ''), 'Income', 'Expense', 'Net P&L', 'Margin'].map(h => (
                        <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a2028]">
                    {rows.map((row: any) => {
                      const gm = row.income > 0 ? (row.netPL / row.income) * 100 : 0;
                      return (
                        <tr key={row[keyField]} className="hover:bg-[#141920]">
                          <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate font-mono">{row[keyField]}</td>
                          <td className="py-2.5 px-3 text-[#00e676] font-mono whitespace-nowrap">{fmtShort(row.income)}</td>
                          <td className="py-2.5 px-3 text-[#ff3d3d] font-mono whitespace-nowrap">{fmtShort(row.expense)}</td>
                          <td className={`py-2.5 px-3 font-mono font-medium whitespace-nowrap ${row.netPL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                            {row.netPL >= 0 ? '+' : '−'}{fmtShort(Math.abs(row.netPL))}
                          </td>
                          <td className={`py-2.5 px-3 font-mono whitespace-nowrap ${gm >= 0 ? 'text-[#00d4ff]' : 'text-[#f5a623]'}`}>{gm.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-[#5a6878] text-[10px] max-w-md mx-auto">{emptyNote}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
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
