'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, AlertCircle, TrendingDown,
  ArrowUpRight, Package, Banknote,
  Calendar, Users, FileText, PieChart as PieIcon, Plus, Loader2, ClipboardList, Wallet, Receipt, BarChart3
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { useERPStore } from '@/store/erp-store';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#f5a623' },
};

/* ── Types ────────────────────────────────────────── */
interface DashboardData {
  kpis: {
    totalRevenue: number; totalInvoiced: number;
    accountsReceivablePending: number; accountsReceivableReceived: number; accountsReceivableOverdue: number;
    accountsPayablePending: number; accountsPayablePaid: number; accountsPayableOverdue: number;
    totalBankBalance: number; totalExpenses: number;
    totalBudgetPlanned: number; totalBudgetActual: number; budgetVariance: number;
    totalWorkOrderValue: number; totalWorkOrderBilled: number; totalWorkOrderUnexecuted: number; totalWorkOrderReceived: number; activeWorkOrders: number;
    totalPaymentAdvices: number;
    pettyCashIn: number; pettyCashOut: number; pettyCashBalance: number;
    totalSiteInvoiceValue: number; totalSiteInvoiceCount: number;
    totalPOValue: number; openPOCount: number; openPOValue: number;
    activeVendorCount: number;
  };
  alerts: { type: string; desc: string; amount: string; urgent: boolean }[];
  moduleCounts: Record<string, number>;
  apSummary: { pending: number; paid: number; overdue: number; total: number };
  arSummary: { pending: number; received: number; overdue: number; total: number };
  monthlyTrends: { month: string; revenue: number; expenses: number; cashIn: number; cashOut: number }[];
}

function fmtCr(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

export default function FinancialHome() {
  const { setActiveModule } = useERPStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/finance-dashboard');
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load');
      } catch (e: any) {
        setError(e?.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;
  if (error || !data) return (
    <div className="p-6 text-center text-[#ff3d3d]">
      <AlertCircle size={32} className="mx-auto mb-2" />
      <p>{error || 'No data available'}</p>
      <button className="vc-btn-primary mt-3" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const k = data.kpis;
  const arOutstanding = k.accountsReceivablePending + k.accountsReceivableOverdue;
  const kpis = [
    { label: 'Site Invoices', value: fmtCr(k.totalSiteInvoiceValue), icon: Receipt, change: `${k.totalSiteInvoiceCount} invoices`, isPositive: true },
    { label: 'Outstanding AR', value: fmtCr(arOutstanding), icon: TrendingDown, change: `${fmtCr(k.accountsReceivableOverdue)} overdue`, isPositive: k.accountsReceivableOverdue === 0 },
    { label: 'Bank Balance', value: fmtCr(k.totalBankBalance), icon: Banknote, change: `${data.moduleCounts.bankCash} accounts`, isPositive: true },
    { label: 'Pending Alerts', value: String(data.alerts.length), icon: AlertCircle, change: `${data.alerts.filter(a => a.urgent).length} urgent`, isPositive: data.alerts.length === 0 },
  ];

  // Chart data
  const arApData = [
    { name: 'AR Received', value: data.arSummary.received, color: '#00e676' },
    { name: 'AR Pending', value: data.arSummary.pending, color: '#f5a623' },
    { name: 'AP Paid', value: data.apSummary.paid, color: '#00d4ff' },
    { name: 'AP Pending', value: data.apSummary.pending, color: '#ff3d3d' },
  ].filter(d => d.value > 0);
  const arApTotal = arApData.reduce((s, d) => s + d.value, 0);

  const moduleBars = [
    { name: 'Work Orders', value: k.totalWorkOrderValue, color: '#00d4ff' },
    { name: 'Site Invoices', value: k.totalSiteInvoiceValue, color: '#a78bfa' },
    { name: 'AR Total', value: data.arSummary.total, color: '#00e676' },
    { name: 'AP Total', value: data.apSummary.total, color: '#ff3d3d' },
    { name: 'Pay Advices', value: k.totalPaymentAdvices, color: '#f5a623' },
  ];
  const crFmt = (v: number) => v >= 10000000 ? (v / 10000000).toFixed(1) + 'Cr' : v >= 100000 ? (v / 100000).toFixed(0) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v);

  const workOrderPct = k.totalWorkOrderValue > 0 ? (k.totalWorkOrderBilled / k.totalWorkOrderValue) * 100 : 0;
  const apPct = (k.accountsPayablePaid + k.accountsPayablePending) > 0
    ? (k.accountsPayablePaid / (k.accountsPayablePaid + k.accountsPayablePending)) * 100 : 0;

  const summaryRows = [
    { icon: ClipboardList, label: 'Work Orders (Order Value)', value: fmtCr(k.totalWorkOrderValue), right: `${fmtCr(k.totalWorkOrderBilled)} billed`, rightColor: '#00e676' },
    { icon: Package, label: 'Purchase Orders Raised', value: fmtCr(k.totalPOValue), right: `${k.openPOCount} open`, rightColor: '#f5a623' },
    { icon: Banknote, label: 'Payment Advices', value: fmtCr(k.totalPaymentAdvices), right: `${data.moduleCounts.paymentAdvices} advices`, rightColor: '#00d4ff' },
    { icon: Wallet, label: 'Petty Cash Balance', value: fmtCr(k.pettyCashBalance), right: `${fmtCr(k.pettyCashOut)} spent`, rightColor: '#ff3d3d' },
    { icon: Receipt, label: 'Site Invoices', value: fmtCr(k.totalSiteInvoiceValue), right: `${k.totalSiteInvoiceCount} invoices`, rightColor: '#a78bfa' },
    { icon: Users, label: 'Active Parties / Vendors', value: String(k.activeVendorCount), right: 'Stable', rightColor: '#f5a623' },
  ];

  const quickLinks = [
    { label: 'Accounts Payable', icon: Package, badge: data.moduleCounts.accountsPayable, module: 'accounts-payable' },
    { label: 'Accounts Receivable', icon: DollarSign, badge: data.moduleCounts.accountsReceivable, module: 'accounts-receivable' },
    { label: 'Work Orders', icon: ClipboardList, badge: data.moduleCounts.workOrders, module: 'fin-work-orders' },
    { label: 'Payment Advices', icon: FileText, badge: data.moduleCounts.paymentAdvices, module: 'fin-payment-advices' },
    { label: 'Petty Cash', icon: Wallet, badge: data.moduleCounts.pettyCash, module: 'fin-petty-cash' },
    { label: 'Bank & Cash', icon: Banknote, badge: data.moduleCounts.bankCash, module: 'bank-cash' },
    { label: 'Budget', icon: PieIcon, badge: data.moduleCounts.budget, module: 'budget' },
  ];

  return (
    <div className="text-[#e2e8f0]">
      {/* Header Banner */}
      <div className="h-32 bg-gradient-to-r from-[#f5a623]/10 to-[#e8891a]/10 border-b border-[#252e3a] relative overflow-hidden rounded-xl mb-6">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 w-64 h-64 bg-[#f5a623] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-[#e8891a] rounded-full blur-3xl" />
        </div>
        <div className="relative h-full flex items-center px-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[#f5a623] tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              FINANCIAL OVERVIEW
            </h1>
            <p className="text-[#8899aa] text-sm tracking-wider">VoltCore Engineering Pvt Ltd • Period: FY 2024-25</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: kpi.isPositive ? '#00e676' : '#ff3d3d' }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{kpi.label}</div>
                  <div className="text-[22px] font-bold leading-none text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{kpi.value}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#f5a623]/10">
                  <Icon size={18} className="text-[#f5a623]" />
                </div>
              </div>
              <div className={`flex items-center gap-1 mt-2 text-[10px] font-medium ${kpi.isPositive ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                {kpi.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {kpi.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row — AR/AP donut + Module comparison bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AR vs AP Donut */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon size={16} className="text-[#f5a623]" />
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Receivables vs Payables</span>
          </div>
          {arApData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-[#5a6878] text-xs">No AR/AP data</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-[150px] h-[150px] shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={arApData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={2} dataKey="value" stroke="none">
                      {arApData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => fmtCr(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-[#5a6878]">Total</span>
                  <span className="text-[12px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{fmtCr(arApTotal)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {arApData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm" style={{ background: d.color }} /><span className="text-[11px] text-[#8899aa]">{d.name}</span></div>
                    <span className="text-[11px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{fmtCr(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Module value comparison — spans 2 cols */}
        <div className="lg:col-span-2 bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#f5a623]" />
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Finance Module Values</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleBars} barSize={36}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={44} tickFormatter={crFmt} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => fmtCr(Number(v))} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {moduleBars.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#161c24] border border-[#252e3a]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
                <FileText size={20} className="text-[#f5a623]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#e2e8f0]">Quick Actions</div>
                <div className="text-[#8899aa] text-xs">Create invoice, payment, voucher</div>
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <button onClick={() => setActiveModule('fin-invoices')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] text-sm hover:bg-[#f5a623]/20 transition-colors">
                <Plus size={16} />
                Create Invoice
              </button>
              <button onClick={() => setActiveModule('accounts-payable')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#252e3a] border border-[#252e3a] text-[#e2e8f0] text-sm hover:bg-[#2a3545] transition-colors">
                <Plus size={16} />
                Payment
              </button>
              <button onClick={() => setActiveModule('create-journal-entry')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#252e3a] border border-[#252e3a] text-[#e2e8f0] text-sm hover:bg-[#2a3545] transition-colors">
                <Plus size={16} />
                Voucher
              </button>
            </div>
          </div>

          {/* Financial Summary — live data from all modules */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
              <PieIcon size={20} className="text-[#f5a623]" />
              Financial Summary
            </h2>

            <div className="space-y-4">
              {summaryRows.map((row, i) => {
                const Icon = row.icon;
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#0a0d12]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[#252e3a] flex items-center justify-center">
                        <Icon size={20} className="text-[#8899aa]" />
                      </div>
                      <div>
                        <div className="text-sm text-[#8899aa]">{row.label}</div>
                        <div className="text-lg font-semibold text-[#e2e8f0]">{row.value}</div>
                      </div>
                    </div>
                    <div className="font-medium text-sm" style={{ color: row.rightColor }}>{row.right}</div>
                  </div>
                );
              })}
            </div>

            {/* progress bars */}
            <div className="mt-5 space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#8899aa]">Work Order Billing Progress</span>
                  <span className="text-[#00e676] font-mono">{workOrderPct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-[6px] bg-[#0a0d12] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#00e676]" style={{ width: `${Math.min(workOrderPct, 100)}%` }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#8899aa]">AP Payment Progress</span>
                  <span className="text-[#00d4ff] font-mono">{apPct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-[6px] bg-[#0a0d12] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#00d4ff]" style={{ width: `${Math.min(apPct, 100)}%` }} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Alerts & Quick Links */}
        <div className="space-y-6">
          {/* Alerts — live from overdue AR/AP */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-[#f5a623]" />
                Alerts
              </div>
              <span className="text-xs bg-[#ff3d3d] text-white px-2 py-1 rounded-full">{data.alerts.length}</span>
            </h2>

            <div className="space-y-3">
              {data.alerts.length === 0 && <div className="text-center text-[#5a6878] text-xs py-4">No alerts — all clear</div>}
              {data.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${alert.urgent ? 'bg-[#ff3d3d]/10 border border-[#ff3d3d]/30' : 'bg-[#0a0d12] border border-[#252e3a]'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${alert.urgent ? 'bg-[#ff3d3d]/20 text-[#ff3d3d]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                      <AlertCircle size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${alert.urgent ? 'text-[#ff3d3d]' : 'text-[#f59e0b]'} capitalize`}>{alert.type}</span>
                        <span className="text-xs text-[#8899aa]">{alert.amount}</span>
                      </div>
                      <p className="text-xs text-[#e2e8f0] mt-1 truncate">{alert.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links — live counts */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-[#f5a623]" />
              Quick Links
            </h2>

            <div className="space-y-3">
              {quickLinks.map((link, i) => {
                const Icon = link.icon;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveModule(link.module as any)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0d12] hover:bg-[#252e3a] transition-colors group cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center group-hover:bg-[#f5a623]/20 transition-colors">
                      <Icon size={18} className="text-[#f5a623]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#e2e8f0]">{link.label}</div>
                      <div className="flex items-center gap-2 text-[#8899aa] text-xs">
                        <span>{link.badge} items</span>
                      </div>
                    </div>
                    <ArrowUpRight size={16} className="text-[#5a6878] group-hover:text-[#f5a623] transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last Updated */}
          <div className="p-4 rounded-lg bg-[#161c24] border border-[#252e3a]">
            <div className="flex items-center gap-2 text-xs text-[#8899aa]">
              <Calendar size={14} />
              Last Updated: {new Date().toLocaleDateString('en-IN')}
            </div>
            <div className="text-[#00e676] text-xs mt-1">✓ Synced with all finance modules</div>
          </div>
        </div>
      </div>
    </div>
  );
}
