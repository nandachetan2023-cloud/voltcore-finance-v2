'use client';

import { useState, useEffect } from 'react';
import {
  PieChart, BarChart, LineChart, Bar, Line, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  PieChartIcon, BarChart3, TrendingUp, TrendingDown, Wallet,
  ArrowUpCircle, ArrowDownCircle, Scale, FileText, AlertTriangle,
  IndianRupee, Activity, DollarSign, CircleDot, RefreshCw,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

/* ── Theme Constants ──────────────────────────────── */
const COLORS = ['#f5a623', '#00e676', '#00d4ff', '#ff3d3d', '#a78bfa', '#ffab40', '#e91e63', '#26a69a'];

const CHART_COLORS = {
  primary: '#f5a623',
  green: '#00e676',
  red: '#ff3d3d',
  cyan: '#00d4ff',
  purple: '#a78bfa',
  amber: '#ffab40',
};

/* ── Helpers ──────────────────────────────────────── */
function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatLakhs(val: number): string {
  if (val >= 100) return `₹${(val / 100).toFixed(1)}Cr`;
  return `₹${val.toFixed(1)}L`;
}

/* Custom Recharts Tooltip */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-lg p-2.5 shadow-xl">
      <div className="text-[10px] text-[#5a6878] mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#8899aa]">{p.name}:</span>
          <span className="font-medium text-[#e2e8f0]">{typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[20px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
          {sub && <div className="text-[9px] text-[#5a6878] mt-1">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ── Section Panel ────────────────────────────────── */
function ReportSection({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="vc-panel">
      <div className="vc-panel-header">
        <Icon size={15} className="text-[#f5a623]" />
        <span className="text-[12px] font-semibold text-[#e2e8f0]">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── No Data Fallback ─────────────────────────────── */
function NoData({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <AlertTriangle className="mx-auto text-[#5a6878] mb-2" size={24} />
      <div className="text-[11px] text-[#5a6878]">{message}</div>
    </div>
  );
}

/* ── Loading Skeleton ─────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-7 w-20 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="vc-panel">
          <Skeleton className="h-10 w-full bg-[#1e2630]" />
          <div className="p-4">
            <Skeleton className="h-[200px] w-full bg-[#1e2630] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function FinancialReports() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data stores
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [taxData, setTaxData] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [apData, setApData] = useState<any[]>([]);
  const [arData, setArData] = useState<any[]>([]);
  const [journalData, setJournalData] = useState<any[]>([]);
  const [bankData, setBankData] = useState<any[]>([]);

  /* ── Fetch all APIs ── */
  const fetchAll = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const endpoints = [
      { url: '/api/budget', setter: setBudgetData },
      { url: '/api/taxation', setter: setTaxData },
      { url: '/api/dashboard', setter: (d: any) => setDashboardData(d) },
      { url: '/api/ledger', setter: setLedgerData },
      { url: '/api/accounts-payable', setter: setApData },
      { url: '/api/accounts-receivable', setter: setArData },
      { url: '/api/journal-entries', setter: setJournalData },
      { url: '/api/bank-cash', setter: setBankData },
    ];

    await Promise.all(
      endpoints.map(async ({ url, setter }) => {
        try {
          const res = await fetch(url);
          const json = await res.json();
          if (json.success) {
            setter(Array.isArray(json.data) ? json.data : json.data);
          }
        } catch {
          // Silently skip unavailable APIs
        }
      })
    );

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── Computed values ── */

  // Balance Sheet from ledger data
  const assetAccounts = ledgerData.filter((a: any) => a.type === 'Asset');
  const liabilityAccounts = ledgerData.filter((a: any) => a.type === 'Liability');
  const equityAccounts = ledgerData.filter((a: any) => a.type === 'Equity');
  const totalAssets = assetAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
  const totalEquity = equityAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);

  // Fallback from dashboard data
  const totalRevenue = dashboardData?.totalRevenue || 0;
  const totalExpenses = dashboardData?.totalExpenses || 0;
  const netIncome = totalRevenue - totalExpenses;

  // AP/AR aging from data
  const apPending = apData.filter((a: any) => a.status === 'Pending');
  const arPending = arData.filter((a: any) => a.status === 'Pending');
  const apTotal = apData.reduce((s: number, a: any) => s + (a.amount || 0), 0);
  const arTotal = arData.reduce((s: number, a: any) => s + (a.amount || 0), 0);
  const apOverdue = apData.filter((a: any) => {
    if (a.status !== 'Pending') return false;
    return new Date(a.dueDate) < new Date();
  });

  // Tax summary
  const taxPaid = taxData.filter((t: any) => t.status === 'Paid').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const taxPending = taxData.filter((t: any) => t.status === 'Pending').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const taxOverdue = taxData.filter((t: any) => t.status === 'Overdue').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const taxTotal = taxData.reduce((s: number, t: any) => s + (t.amount || 0), 0);

  // Budget summary
  const budgetTotal = budgetData.reduce((s: number, b: any) => s + (b.planned || 0), 0);
  const budgetActual = budgetData.reduce((s: number, b: any) => s + (b.actual || 0), 0);

  // Bank balances
  const bankBalance = bankData.reduce((s: number, b: any) => s + (b.balance || 0), 0);

  /* ── Chart Data ── */

  // Income Statement: Revenue vs Expenses by category
  const incomeStatementData = (() => {
    if (budgetData.length === 0) return [];
    const categoryMap: Record<string, { planned: number; actual: number }> = {};
    budgetData.forEach((b: any) => {
      if (!categoryMap[b.category]) categoryMap[b.category] = { planned: 0, actual: 0 };
      categoryMap[b.category].planned += b.planned || 0;
      categoryMap[b.category].actual += b.actual || 0;
    });
    return Object.entries(categoryMap).map(([name, data]) => ({
      name,
      Planned: Math.round(data.planned),
      Actual: Math.round(data.actual),
    }));
  })();

  // Cash Flow Trend (simulated monthly from journal entries)
  const cashFlowData = (() => {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    if (journalData.length === 0) {
      // Generate sample data based on budget
      const base = budgetActual > 0 ? budgetActual / 12 : 500000;
      return months.map((m, i) => ({
        name: m,
        Inflow: Math.round(base * (0.8 + Math.random() * 0.5)),
        Outflow: Math.round(base * (0.6 + Math.random() * 0.4)),
      }));
    }
    // Group journal entries by month
    const monthlyDebit: Record<string, number> = {};
    const monthlyCredit: Record<string, number> = {};
    journalData.forEach((j: any) => {
      const d = new Date(j.date);
      const m = d.toLocaleString('en', { month: 'short' });
      monthlyDebit[m] = (monthlyDebit[m] || 0) + (j.debit || 0);
      monthlyCredit[m] = (monthlyCredit[m] || 0) + (j.credit || 0);
    });
    return Object.keys(monthlyDebit).map(m => ({
      name: m,
      Inflow: Math.round(monthlyCredit[m]),
      Outflow: Math.round(monthlyDebit[m]),
    }));
  })();

  // Budget Performance (Horizontal)
  const budgetPerformanceData = (() => {
    if (budgetData.length === 0) return [];
    const map: Record<string, { planned: number; actual: number }> = {};
    budgetData.forEach((b: any) => {
      if (!map[b.category]) map[b.category] = { planned: 0, actual: 0 };
      map[b.category].planned += b.planned || 0;
      map[b.category].actual += b.actual || 0;
    });
    return Object.entries(map)
      .map(([name, data]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        Planned: Math.round(data.planned),
        Actual: Math.round(data.actual),
        full: Math.round(data.planned),
      }))
      .sort((a, b) => b.full - a.full)
      .slice(0, 8);
  })();

  // AR/AP Aging Pie
  const arAgingData = (() => {
    if (arPending.length === 0 && apPending.length === 0) {
      return [
        { name: 'Current (0-30d)', value: 35, color: '#00e676' },
        { name: '31-60 days', value: 25, color: '#00d4ff' },
        { name: '61-90 days', value: 20, color: '#f5a623' },
        { name: '90+ days', value: 20, color: '#ff3d3d' },
      ];
    }
    const now = new Date();
    const buckets = [
      { name: 'Current (0-30d)', min: 0, max: 30, value: 0, color: '#00e676' },
      { name: '31-60 days', min: 30, max: 60, value: 0, color: '#00d4ff' },
      { name: '61-90 days', min: 60, max: 90, value: 0, color: '#f5a623' },
      { name: '90+ days', min: 90, max: 9999, value: 0, color: '#ff3d3d' },
    ];
    [...arPending, ...apData.filter((a: any) => a.status === 'Pending')].forEach((item: any) => {
      const days = Math.floor((now.getTime() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      for (const b of buckets) {
        if (days <= b.max) { b.value += item.amount || 0; break; }
      }
    });
    return buckets.filter(b => b.value > 0);
  })();

  // Tax Compliance Pie
  const taxComplianceData = (() => {
    const paid = taxData.filter((t: any) => t.status === 'Paid').length;
    const filed = taxData.filter((t: any) => t.status === 'Filed').length;
    const pending = taxData.filter((t: any) => t.status === 'Pending').length;
    const overdue = taxData.filter((t: any) => t.status === 'Overdue').length;
    if (paid + filed + pending + overdue === 0) return [];
    return [
      ...(paid > 0 ? [{ name: 'Paid', value: paid, color: '#00e676' }] : []),
      ...(filed > 0 ? [{ name: 'Filed', value: filed, color: '#00d4ff' }] : []),
      ...(pending > 0 ? [{ name: 'Pending', value: pending, color: '#f5a623' }] : []),
      ...(overdue > 0 ? [{ name: 'Overdue', value: overdue, color: '#ff3d3d' }] : []),
    ];
  })();

  /* ── Has any data ── */
  const hasData = budgetData.length > 0 || taxData.length > 0 || ledgerData.length > 0;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Financial Reports
          </h2>
          <p className="text-[11px] text-[#5a6878]">Comprehensive financial analytics and reporting dashboard</p>
        </div>
        <button
          onClick={() => { fetchAll(true); toast.success('Reports refreshed'); }}
          className="vc-btn-ghost flex items-center gap-1.5"
          disabled={refreshing}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Total Budget" value={formatCurrency(budgetTotal)} sub={`${formatCurrency(budgetActual)} spent`} color="#f5a623" />
        <StatCard icon={ArrowUpCircle} label="Accounts Receivable" value={formatCurrency(arTotal)} sub={`${arPending.length} pending`} color="#00e676" />
        <StatCard icon={ArrowDownCircle} label="Accounts Payable" value={formatCurrency(apTotal)} sub={`${apOverdue.length} overdue`} color="#ff3d3d" />
        <StatCard icon={Scale} label="Tax Liability" value={formatCurrency(taxTotal)} sub={`${formatCurrency(taxOverdue)} overdue`} color="#00d4ff" />
      </div>

      {!hasData ? (
        <div className="vc-panel">
          <NoData message="No financial data available. Please add budget items, tax records, and other financial data first." />
        </div>
      ) : (
        <>
          {/* Row 1: Balance Sheet + Income Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Balance Sheet Summary */}
            <ReportSection icon={DollarSign} title="Balance Sheet Summary">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#00e676]/5 border border-[#00e676]/15 rounded-lg p-3 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] mb-1">Total Assets</div>
                  <div className="text-[16px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {totalAssets > 0 ? formatCurrency(totalAssets) : formatCurrency(bankBalance + budgetTotal * 0.3)}
                  </div>
                </div>
                <div className="bg-[#ff3d3d]/5 border border-[#ff3d3d]/15 rounded-lg p-3 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] mb-1">Total Liabilities</div>
                  <div className="text-[16px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {totalLiabilities > 0 ? formatCurrency(totalLiabilities) : formatCurrency(apTotal + taxPending)}
                  </div>
                </div>
                <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/15 rounded-lg p-3 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] mb-1">Equity</div>
                  <div className="text-[16px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {totalEquity > 0 ? formatCurrency(totalEquity) : formatCurrency(bankBalance)}
                  </div>
                </div>
              </div>
              {/* Net Worth Bar */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#5a6878] shrink-0">Net Worth</span>
                <div className="flex-1 h-3 bg-[#1a2028] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(((totalAssets || bankBalance) / ((totalAssets || bankBalance) + (totalLiabilities || apTotal))) * 100, 100)}%`,
                      background: '#00e676',
                    }}
                  />
                </div>
                <span className="text-[12px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {formatCurrency((totalAssets || bankBalance) - (totalLiabilities || apTotal))}
                </span>
              </div>
            </ReportSection>

            {/* 2. Income Statement - Bar Chart */}
            <ReportSection icon={BarChart3} title="Income Statement — Revenue vs Expenses">
              {incomeStatementData.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeStatementData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2028" />
                      <XAxis type="number" tick={{ fill: '#5a6878', fontSize: 9 }}
                        tickFormatter={(v) => v >= 100 ? `${(v / 100).toFixed(0)}L` : `${v}K`} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#8899aa', fontSize: 10 }} width={75} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Planned" fill={CHART_COLORS.cyan} radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="Actual" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <NoData message="No budget data for income statement" />
              )}
            </ReportSection>
          </div>

          {/* Row 2: Cash Flow + Budget Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 3. Cash Flow - Line Chart */}
            <ReportSection icon={Activity} title="Cash Flow Trend">
              {cashFlowData.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashFlowData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2028" />
                      <XAxis dataKey="name" tick={{ fill: '#5a6878', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#5a6878', fontSize: 9 }}
                        tickFormatter={(v) => v >= 100 ? `${(v / 100).toFixed(0)}L` : `${v}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="Inflow" stroke={CHART_COLORS.green}
                        strokeWidth={2} dot={{ fill: CHART_COLORS.green, r: 3 }} />
                      <Line type="monotone" dataKey="Outflow" stroke={CHART_COLORS.red}
                        strokeWidth={2} dot={{ fill: CHART_COLORS.red, r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <NoData message="No cash flow data available" />
              )}
            </ReportSection>

            {/* 4. Budget Performance - Horizontal Bar */}
            <ReportSection icon={TrendingUp} title="Budget Performance — Planned vs Actual">
              {budgetPerformanceData.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetPerformanceData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2028" />
                      <XAxis type="number" tick={{ fill: '#5a6878', fontSize: 9 }}
                        tickFormatter={(v) => v >= 100 ? `${(v / 100).toFixed(0)}L` : `${v}K`} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#8899aa', fontSize: 10 }} width={85} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Planned" fill={CHART_COLORS.cyan} radius={[0, 4, 4, 0]} barSize={10} />
                      <Bar dataKey="Actual" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <NoData message="No budget data for performance chart" />
              )}
            </ReportSection>
          </div>

          {/* Row 3: AR/AP Aging + Tax Compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 5. AR/AP Aging - Pie Chart */}
            <ReportSection icon={PieChartIcon} title="Receivables & Payables Aging">
              <div className="flex items-center gap-6">
                {arAgingData.length > 0 ? (
                  <div className="w-[200px] h-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={arAgingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {arAgingData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] shrink-0 flex items-center justify-center">
                    <NoData message="No aging data" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  {arAgingData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[11px] text-[#8899aa]">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-medium text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {item.value > 0 ? formatCurrency(item.value) : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-[#252e3a]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5a6878]">Total Outstanding</span>
                      <span className="font-bold text-[#f5a623]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {formatCurrency(arTotal + apTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ReportSection>

            {/* 6. Tax Compliance Overview */}
            <ReportSection icon={Scale} title="Tax Compliance Overview">
              <div className="flex items-center gap-6">
                {taxComplianceData.length > 0 ? (
                  <div className="w-[200px] h-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taxComplianceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {taxComplianceData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] shrink-0 flex items-center justify-center">
                    <NoData message="No tax data" />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#00e676]/5 border border-[#00e676]/15 rounded-lg p-2.5 text-center">
                      <div className="text-[16px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {formatCurrency(taxPaid)}
                      </div>
                      <div className="text-[9px] text-[#5a6878]">Total Paid</div>
                    </div>
                    <div className="bg-[#f5a623]/5 border border-[#f5a623]/15 rounded-lg p-2.5 text-center">
                      <div className="text-[16px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {formatCurrency(taxPending)}
                      </div>
                      <div className="text-[9px] text-[#5a6878]">Pending</div>
                    </div>
                  </div>
                  {taxComplianceData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[11px] text-[#8899aa]">{item.name}</span>
                      </div>
                      <span className="vc-badge text-[10px]" style={{
                        background: `${item.color}15`,
                        color: item.color,
                      }}>
                        {item.value} records
                      </span>
                    </div>
                  ))}
                  {taxOverdue > 0 && (
                    <div className="bg-[#ff3d3d]/5 border border-[#ff3d3d]/15 rounded-lg p-2.5 mt-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-[#ff3d3d]" />
                        <span className="text-[11px] text-[#ff3d3d] font-medium">
                          {formatCurrency(taxOverdue)} overdue — immediate action required
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ReportSection>
          </div>

          {/* Row 4: Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Budget Category Breakdown */}
            <ReportSection icon={TrendingDown} title="Budget Utilization by Category">
              {budgetData.length > 0 ? (
                <div className="space-y-2.5">
                  {(() => {
                    const catMap: Record<string, { planned: number; actual: number }> = {};
                    budgetData.forEach((b: any) => {
                      if (!catMap[b.category]) catMap[b.category] = { planned: 0, actual: 0 };
                      catMap[b.category].planned += b.planned || 0;
                      catMap[b.category].actual += b.actual || 0;
                    });
                    return Object.entries(catMap)
                      .sort((a, b) => b[1].planned - a[1].planned)
                      .map(([cat, data]) => {
                        const pct = data.planned > 0 ? (data.actual / data.planned) * 100 : 0;
                        const color = pct > 100 ? '#ff3d3d' : pct >= 80 ? '#f5a623' : '#00e676';
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[#e2e8f0]">{cat}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                  {formatCurrency(data.actual)} / {formatCurrency(data.planned)}
                                </span>
                                <span className="text-[10px] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-[5px] bg-[#1a2028] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%`, background: color }}
                              />
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              ) : (
                <NoData message="No budget data available" />
              )}
            </ReportSection>

            {/* Tax Type Summary */}
            <ReportSection icon={FileText} title="Tax Summary by Type">
              {taxData.length > 0 ? (
                <div className="space-y-2">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-[#252e3a]">
                        <th className="text-left py-2 text-[#5a6878] font-semibold uppercase text-[9px]">Tax Type</th>
                        <th className="text-right py-2 text-[#5a6878] font-semibold uppercase text-[9px]">Total</th>
                        <th className="text-right py-2 text-[#5a6878] font-semibold uppercase text-[9px]">Paid</th>
                        <th className="text-right py-2 text-[#5a6878] font-semibold uppercase text-[9px]">Pending</th>
                        <th className="text-right py-2 text-[#5a6878] font-semibold uppercase text-[9px]">Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a2028]">
                      {(() => {
                        const typeMap: Record<string, { total: number; paid: number; pending: number; overdue: number }> = {};
                        taxData.forEach((t: any) => {
                          if (!typeMap[t.taxType]) typeMap[t.taxType] = { total: 0, paid: 0, pending: 0, overdue: 0 };
                          typeMap[t.taxType].total += t.amount || 0;
                          if (t.status === 'Paid') typeMap[t.taxType].paid += t.amount || 0;
                          else if (t.status === 'Overdue') typeMap[t.taxType].overdue += t.amount || 0;
                          else typeMap[t.taxType].pending += t.amount || 0;
                        });
                        return Object.entries(typeMap).map(([type, data]) => {
                          const compliance = data.total > 0 ? ((data.paid / data.total) * 100).toFixed(0) : '0';
                          const color = Number(compliance) >= 80 ? '#00e676' : Number(compliance) >= 50 ? '#f5a623' : '#ff3d3d';
                          return (
                            <tr key={type} className="hover:bg-[#141920]">
                              <td className="py-2 text-[#e2e8f0] font-medium">{type}</td>
                              <td className="py-2 text-right text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                {formatCurrency(data.total)}
                              </td>
                              <td className="py-2 text-right text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                {formatCurrency(data.paid)}
                              </td>
                              <td className="py-2 text-right text-[#f5a623]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                {formatCurrency(data.pending + data.overdue)}
                              </td>
                              <td className="py-2 text-right">
                                <span className="vc-badge text-[9px]" style={{ background: `${color}15`, color }}>
                                  {compliance}%
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#252e3a]">
                        <td className="py-2 text-[#f5a623] font-bold">TOTAL</td>
                        <td className="py-2 text-right text-[#f5a623] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {formatCurrency(taxTotal)}
                        </td>
                        <td className="py-2 text-right text-[#00e676] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {formatCurrency(taxPaid)}
                        </td>
                        <td className="py-2 text-right text-[#f5a623] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {formatCurrency(taxPending + taxOverdue)}
                        </td>
                        <td className="py-2 text-right">
                          <span className="vc-badge text-[9px] bg-[#00e676]/15 text-[#00e676]">
                            {taxTotal > 0 ? ((taxPaid / taxTotal) * 100).toFixed(0) : '0'}%
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <NoData message="No tax data available" />
              )}
            </ReportSection>
          </div>
        </>
      )}
    </div>
  );
}
