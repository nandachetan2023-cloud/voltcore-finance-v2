'use client';

import { useState, useEffect } from 'react';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Landmark, TrendingDown,
  Target, BarChart3, PieChart as PieIcon, Activity, ArrowRightLeft, IndianRupee,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts';

// ── Color palette (VoltCore dark theme) ──
const COLORS = ['#f5a623', '#00e676', '#00d4ff', '#ff3d3d', '#a78bfa', '#ffab40', '#22d3ee', '#f472b6'];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#f5a623' },
};

// ── Formatters ──
function formatCr(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

function formatCurrency(n: number): string {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

// ── Interfaces ──
interface KPIs {
  totalRevenue: number;
  totalInvoiced: number;
  accountsReceivablePending: number;
  accountsReceivableReceived: number;
  accountsReceivableOverdue: number;
  accountsPayablePending: number;
  accountsPayablePaid: number;
  accountsPayableOverdue: number;
  totalBankBalance: number;
  totalExpenses: number;
  totalExpensesPending: number;
  totalExpensesApproved: number;
  totalPayrollPaid: number;
  totalPayrollPending: number;
  totalPayrollGross: number;
  totalPOValue: number;
  totalPOOpen: number;
  totalBudgetPlanned: number;
  totalBudgetActual: number;
  budgetVariance: number;
}

interface MonthlyTrend {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  payroll: number;
  cashIn: number;
  cashOut: number;
}

interface Summary { pending: number; paid: number; received: number; overdue: number; total: number; }

interface BudgetItem { category: string; description: string; planned: number; actual: number; period: string; status: string; }
interface BankAccount { accountName: string; bankName: string; accountNo: string; type: string; balance: number; status: string; }
interface JournalEntry { entryNo: string; date: string; account: string; debit: number; credit: number; description: string; reference?: string; status: string; }

// ── Stat Card ──
function StatCard({ icon: Icon, label, value, change, changeLabel, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  changeLabel?: string;
  color: string;
}) {
  return (
    <div className="vc-stat-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[22px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
          {change && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`text-[10px] font-semibold ${changeLabel === 'overdue' ? 'text-[#ff3d3d]' : 'text-[#00e676]'}`}>
                {change}
              </span>
              {changeLabel && <span className="text-[9px] text-[#5a6878]">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── Donut Chart ──
function DonutChart({ data, title, centerLabel }: {
  data: { name: string; value: number; color: string }[];
  title: string;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <PieIcon size={14} className="text-[#f5a623]" />
        <span className="text-[12px] font-semibold text-[#e2e8f0]">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-[130px] h-[130px] shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          {centerLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] text-[#5a6878]">Total</span>
              <span className="text-[12px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {centerLabel}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-[6px]">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[8px] h-[8px] rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-[#8899aa] truncate max-w-[110px]">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {formatCr(d.value)}
                </span>
                <span className="text-[9px] text-[#5a6878]">({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cash Flow Card ──
function CashFlowCard({ trends, bankAccounts }: { trends: MonthlyTrend[]; bankAccounts: BankAccount[] }) {
  const currentMonth = trends[trends.length - 1];
  const netCashFlow = currentMonth ? currentMonth.cashIn - currentMonth.cashOut : 0;

  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-[#f5a623]" />
        <span className="text-[12px] font-semibold text-[#e2e8f0]">Cash Flow Summary</span>
      </div>

      {/* Cash flow mini stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#0a0d12] rounded-lg p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-[#5a6878] mb-1">Inflow</div>
          <div className="text-[13px] font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {formatCr(currentMonth?.cashIn || 0)}
          </div>
        </div>
        <div className="bg-[#0a0d12] rounded-lg p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-[#5a6878] mb-1">Outflow</div>
          <div className="text-[13px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {formatCr(currentMonth?.cashOut || 0)}
          </div>
        </div>
        <div className="bg-[#0a0d12] rounded-lg p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-[#5a6878] mb-1">Net Flow</div>
          <div className="text-[13px] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: netCashFlow >= 0 ? '#00e676' : '#ff3d3d' }}>
            {netCashFlow >= 0 ? '+' : ''}{formatCr(netCashFlow)}
          </div>
        </div>
      </div>

      {/* Mini bar chart - Cash In vs Cash Out */}
      <div className="h-[120px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trends} barSize={14} barGap={2}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={40} tickFormatter={(v) => v >= 10000000 ? (v/10000000).toFixed(1)+'Cr' : v >= 100000 ? (v/100000).toFixed(0)+'L' : String(v)} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(value: any, name: any) => [formatCr(Number(value)), String(name)]} />
            <Bar dataKey="cashIn" name="Cash In" fill="#00e676" radius={[3, 3, 0, 0]} opacity={0.8} />
            <Bar dataKey="cashOut" name="Cash Out" fill="#ff3d3d" radius={[3, 3, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bank accounts list */}
      <div className="border-t border-[#252e3a] pt-3">
        <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-2">Bank Accounts</div>
        <div className="space-y-2">
          {bankAccounts.map((acc, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[#0a0d12] flex items-center justify-center shrink-0">
                  <Landmark size={12} className="text-[#00d4ff]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-[#e2e8f0] truncate">{acc.bankName}</div>
                  <div className="text-[9px] text-[#5a6878]">{acc.type}</div>
                </div>
              </div>
              <div className="text-[12px] font-semibold text-[#00e676] shrink-0" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {formatCr(acc.balance)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton Loader ──
function Skeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 h-[100px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 h-[280px]" />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──
export default function FinanceDashboard() {
  const [data, setData] = useState<{
    kpis: KPIs;
    monthlyTrends: MonthlyTrend[];
    apSummary: Summary;
    arSummary: Summary;
    budgetItems: BudgetItem[];
    bankAccounts: BankAccount[];
    recentTransactions: JournalEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/finance-dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load');
        }
      } catch (e: any) {
        setError(e.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <Skeleton />;
  if (error || !data) return (
    <div className="p-4 text-center text-[#ff3d3d]">
      <p>{error || 'No data available'}</p>
      <button className="vc-btn-primary mt-2" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const { kpis, monthlyTrends, apSummary, arSummary, budgetItems, bankAccounts, recentTransactions } = data;

  // Budget chart data
  const budgetChartData = budgetItems.map(b => ({
    name: b.category.length > 12 ? b.category.substring(0, 12) + '..' : b.category,
    fullName: b.category,
    planned: b.planned,
    actual: b.actual,
    variance: b.planned - b.actual,
    isOverBudget: b.actual > b.planned,
  }));

  // AR vs AP donut data
  const arApData = [
    { name: 'AR Received', value: arSummary.received, color: '#00e676' },
    { name: 'AR Pending', value: arSummary.pending, color: '#f5a623' },
    { name: 'AP Paid', value: apSummary.paid, color: '#00d4ff' },
    { name: 'AP Pending', value: apSummary.pending, color: '#ff3d3d' },
  ];

  // Expense category distribution (from budget actuals)
  const expenseDonutData = budgetItems.map((b, i) => ({
    name: b.category.length > 16 ? b.category.substring(0, 16) + '..' : b.category,
    value: b.actual,
    color: COLORS[i % COLORS.length],
  }));

  // Revenue vs Expenses trend
  const revenueExpenseTrend = monthlyTrends.map(t => ({
    month: t.month,
    revenue: t.revenue,
    expenses: t.expenses,
  }));

  return (
    <div className="p-4 space-y-4">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Finance Dashboard
            </h2>
            <p className="text-[11px] text-[#5a6878]">Finance › Overview & Financial Insights</p>
          </div>
        </div>
        <div className="text-[10px] text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          Last updated: {new Date().toLocaleDateString('en-IN')}
        </div>
      </div>

      {/* ── Row 1: 6 KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Wallet}
          label="Total Revenue"
          value={formatCr(kpis.totalRevenue)}
          change={formatCr(kpis.totalInvoiced)}
          changeLabel="invoiced"
          color="#00e676"
        />
        <StatCard
          icon={ArrowDownCircle}
          label="Accounts Receivable"
          value={formatCr(kpis.accountsReceivablePending)}
          change={formatCr(kpis.accountsReceivableOverdue)}
          changeLabel="overdue"
          color="#f5a623"
        />
        <StatCard
          icon={ArrowUpCircle}
          label="Accounts Payable"
          value={formatCr(kpis.accountsPayablePending)}
          change={formatCr(kpis.accountsPayableOverdue)}
          changeLabel="overdue"
          color="#ff3d3d"
        />
        <StatCard
          icon={Landmark}
          label="Bank Balance"
          value={formatCr(kpis.totalBankBalance)}
          change={`${bankAccounts.length} accounts`}
          changeLabel="active"
          color="#00d4ff"
        />
        <StatCard
          icon={TrendingDown}
          label="Monthly Expenses"
          value={formatCr(kpis.totalExpensesApproved + kpis.totalExpensesPending)}
          change={formatCr(kpis.totalExpensesPending)}
          changeLabel="pending"
          color="#a78bfa"
        />
        <StatCard
          icon={Target}
          label="Budget Variance"
          value={formatCr(kpis.budgetVariance)}
          change={kpis.budgetVariance >= 0 ? 'Under budget' : 'Over budget'}
          changeLabel={kpis.budgetVariance >= 0 ? 'healthy' : 'warning'}
          color="#ffab40"
        />
      </div>

      {/* ── Row 2: Revenue vs Expenses Chart + AR/AP Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue vs Expenses Bar Chart - spans 2 cols */}
        <div className="lg:col-span-2 bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Revenue vs Expenses (6 Months)</span>
            </div>
            <div className="flex items-center gap-3 text-[9px]">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#00e676]" />Revenue</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#ff3d3d]" />Expenses</div>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueExpenseTrend} barSize={28} barGap={6}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 10 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8899aa', fontSize: 10 }}
                  width={50}
                  tickFormatter={(v) => {
                    if (v >= 10000000) return (v / 10000000).toFixed(1) + 'Cr';
                    if (v >= 100000) return (v / 100000).toFixed(0) + 'L';
                    if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                    return String(v);
                  }}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value: any, name: any) => [formatCr(Number(value)), String(name)]} />
                <Bar dataKey="revenue" name="Revenue" fill="#00e676" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="expenses" name="Expenses" fill="#ff3d3d" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AR vs AP Donut */}
        <DonutChart
          data={arApData}
          title="Receivables vs Payables"
          centerLabel={formatCr(arSummary.total + apSummary.total)}
        />
      </div>

      {/* ── Row 3: Budget Planned vs Actual + Expense Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget Planned vs Actual - spans 2 cols */}
        <div className="lg:col-span-2 bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Budget: Planned vs Actual</span>
            </div>
            <div className="flex items-center gap-3 text-[9px]">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#00d4ff]" />Planned</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#f5a623]" />Actual</div>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetChartData} barSize={18} barGap={4} layout="vertical">
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8899aa', fontSize: 9 }}
                  tickFormatter={(v) => {
                    if (v >= 10000000) return (v / 10000000).toFixed(1) + 'Cr';
                    if (v >= 100000) return (v / 100000).toFixed(0) + 'L';
                    if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                    return String(v);
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8899aa', fontSize: 9 }}
                  width={100}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: any, name: any) => [formatCr(Number(value)), String(name)]}
                  labelFormatter={(label: any) => {
                    const item = budgetChartData.find(d => d.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar dataKey="planned" name="Planned" fill="#00d4ff" radius={[0, 4, 4, 0]} opacity={0.7} />
                <Bar dataKey="actual" name="Actual" fill="#f5a623" radius={[0, 4, 4, 0]} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Donut */}
        <DonutChart data={expenseDonutData} title="Expense Distribution" centerLabel={formatCr(kpis.totalBudgetActual)} />
      </div>

      {/* ── Row 4: Cash Flow + Recent Transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Flow Summary */}
        <CashFlowCard trends={monthlyTrends} bankAccounts={bankAccounts} />

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft size={14} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Recent Journal Entries</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#161c24]">
                <tr className="text-left text-[#5a6878] border-b border-[#252e3a]">
                  <th className="pb-2 font-medium">Entry No</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Account</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Debit</th>
                  <th className="pb-2 font-medium text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((entry) => (
                  <tr key={entry.entryNo} className="border-b border-[#252e3a]/50 hover:bg-[#141920]">
                    <td className="py-2 text-[#f5a623] font-mono">{entry.entryNo}</td>
                    <td className="py-2 text-[#8899aa] font-mono">{entry.date}</td>
                    <td className="py-2 text-[#e2e8f0] max-w-[100px] truncate">{entry.account}</td>
                    <td className="py-2 text-[#8899aa] max-w-[180px] truncate">{entry.description}</td>
                    <td className="py-2 text-right">
                      {entry.debit > 0 ? (
                        <span className="text-[#00e676] font-mono">{formatCurrency(entry.debit)}</span>
                      ) : (
                        <span className="text-[#5a6878]">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {entry.credit > 0 ? (
                        <span className="text-[#ff3d3d] font-mono">{formatCurrency(entry.credit)}</span>
                      ) : (
                        <span className="text-[#5a6878]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#5a6878]">No journal entries found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 5: Financial Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee size={14} className="text-[#00e676]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Total Payroll</span>
          </div>
          <div className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {formatCr(kpis.totalPayrollGross)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-[#5a6878]">Paid: {formatCr(kpis.totalPayrollPaid)}</span>
            <span className="text-[9px] text-[#f5a623]">Pending: {formatCr(kpis.totalPayrollPending)}</span>
          </div>
        </div>

        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Open POs</span>
          </div>
          <div className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {formatCr(kpis.totalPOOpen)}
          </div>
          <div className="text-[9px] text-[#5a6878] mt-1">Total PO Value: {formatCr(kpis.totalPOValue)}</div>
        </div>

        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-[#f5a623]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Budget Utilization</span>
          </div>
          <div className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {kpis.totalBudgetPlanned > 0 ? ((kpis.totalBudgetActual / kpis.totalBudgetPlanned) * 100).toFixed(1) : 0}%
          </div>
          <div className="w-full h-[6px] bg-[#0a0d12] rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${kpis.totalBudgetPlanned > 0 ? Math.min((kpis.totalBudgetActual / kpis.totalBudgetPlanned) * 100, 100) : 0}%`,
                backgroundColor: kpis.totalBudgetActual > kpis.totalBudgetPlanned ? '#ff3d3d' : '#00e676',
              }}
            />
          </div>
          <div className="text-[9px] text-[#5a6878] mt-1">Planned: {formatCr(kpis.totalBudgetPlanned)} | Actual: {formatCr(kpis.totalBudgetActual)}</div>
        </div>

        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-[#a78bfa]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Net Position</span>
          </div>
          <div className="text-[18px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: (kpis.totalRevenue - kpis.totalExpenses - kpis.accountsPayablePending) >= 0 ? '#00e676' : '#ff3d3d' }}>
            {formatCr(kpis.totalRevenue - kpis.totalExpenses - kpis.accountsPayablePending)}
          </div>
          <div className="text-[9px] text-[#5a6878] mt-1">Revenue - Expenses - AP Pending</div>
        </div>
      </div>
    </div>
  );
}
